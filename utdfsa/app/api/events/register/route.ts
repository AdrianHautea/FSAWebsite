// ── route.ts ─────────────────────────────────────────────
// POST /api/events/register — create a registration + tickets, then redirect to Stripe checkout
//
// data:  events, event_registrations, registration_tickets (members for identity lookup)
// deps:  stripe (checkout session)
// notes: caller may be anonymous; member detection is best-effort via auth cookie
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { eventRegisterSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================

  // ── request validation ────────────────────────────────────
  const body = await req.json().catch(() => null)
  const parsed = eventRegisterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { event_id, tickets } = parsed.data
  const admin = createAdminClient()

  // ── resolve caller identity (optional — non-members don't need to be logged in) ──
  // respects rls — only returns session for the authenticated caller
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let member: { id: string; membership_status: string; first_name: string; last_name: string; contact_email: string | null } | null = null

  if (user?.email) {
    // bypass rls — needed to look up the member row regardless of their auth state
    const { data } = await admin
      .from('members')
      .select('id, membership_status, first_name, last_name, contact_email')
      .eq('email', user.email)
      .maybeSingle()
    member = data
  }

  // active membership status gates member-specific pricing and restrictions
  const isMember = member?.membership_status === 'active'

  // ── member-specific restrictions ───────────────────────────────────────────
  if (isMember) {
    if (tickets.length > 1) {
      return NextResponse.json(
        { error: 'Members may only purchase one ticket per event.' },
        { status: 400 }
      )
    }

    // prevent buying a second ticket for the same event; exclude failed payments so retry is allowed
    // bypass rls — admin client needed to query all registrations across members
    const { data: existing } = await admin
      .from('event_registrations')
      .select('id')
      .eq('member_id', member!.id)
      .eq('event_id', event_id)
      .neq('payment_status', 'failed')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You are already registered for this event.' },
        { status: 409 }
      )
    }
  }

  // ── fetch event ─────────────────────────────────────────────────────────────
  // bypass rls — admin client; only returns the event if is_active is true
  const { data: event } = await admin
    .from('events')
    .select('id, name, price_cents_members, price_cents_nonmembers, eb_price_members, eb_price_nonmembers, eb_deadline, is_active, registration_closes_at')
    .eq('id', event_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!event) {
    return NextResponse.json({ error: 'Event not found or not available.' }, { status: 404 })
  }

  if (event.registration_closes_at && new Date() > new Date(event.registration_closes_at)) {
    return NextResponse.json({ error: 'Registration has closed for this event.' }, { status: 400 })
  }

  // ── pricing ─────────────────────────────────────────────────────────────────
  // early bird applies only when a deadline and both early-bird prices are set,
  // and the current server time is before that deadline
  const isEarlyBird =
    event.eb_deadline != null &&
    event.eb_price_members != null &&
    event.eb_price_nonmembers != null &&
    new Date() < new Date(event.eb_deadline)

  // select the correct price tier based on membership and early-bird status; values are already in cents
  const pricePerTicket = isEarlyBird
    ? (isMember ? event.eb_price_members! : event.eb_price_nonmembers!)
    : (isMember ? event.price_cents_members : event.price_cents_nonmembers)

  // total is price per ticket multiplied by ticket count
  const totalAmount = pricePerTicket * tickets.length

  // ── create registration ─────────────────────────────────────────────────────
  // bypass rls — officer action; inserts into event_registrations
  // free events are immediately marked paid to skip stripe entirely
  const { data: registration, error: regError } = await admin
    .from('event_registrations')
    .insert({
      member_id: member?.id ?? null,
      event_id,
      payment_status: totalAmount === 0 ? 'paid' : 'pending',
      num_tickets: tickets.length,
      amt_expected: totalAmount,
      guest_fname: tickets[0].fname,
      guest_lname: tickets[0].lname,
      guest_email: tickets[0].email,
    })
    .select('id')
    .single()

  if (regError || !registration) {
    console.error('Registration insert error:', regError)
    return NextResponse.json({ error: 'Failed to create registration.' }, { status: 500 })
  }

  // ── create one ticket row per attendee ──────────────────────────────────────
  // each attendee gets a unique uuid as their qr_code — scanned at event entry
  // bypass rls — inserting into registration_tickets on behalf of the caller
  const ticketRows = tickets.map(t => ({
    registration_id: registration.id,
    qr_code: crypto.randomUUID(),
    attendee_fname: t.fname,
    attendee_lname: t.lname,
    attendee_email: t.email,
    checked_in: false,
  }))

  const { error: ticketError } = await admin.from('registration_tickets').insert(ticketRows)

  if (ticketError) {
    // roll back the registration row if ticket insert fails to avoid orphaned records
    await admin.from('event_registrations').delete().eq('id', registration.id)
    console.error('Ticket insert error:', ticketError)
    return NextResponse.json({ error: 'Failed to create tickets.' }, { status: 500 })
  }

  // ── free events skip Stripe entirely ───────────────────────────────────────
  if (totalAmount === 0) {
    // registration already marked paid above; redirect to success page without stripe
    return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_SITE_URL}/events?success=true` })
  }

  // ── create Stripe checkout ─────────────────────────────────────────────────
  // prefer stored contact_email over login email so members use their preferred address
  const customerEmail = member?.contact_email ?? user?.email ?? tickets[0].email
  // members land on /member/orders after payment; guests land on /events
  const successUrl = isMember
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/member/orders?success=true`
    : `${process.env.NEXT_PUBLIC_SITE_URL}/events?success=true`

  // creates a hosted checkout session; returns a url to redirect the browser to
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: isEarlyBird ? `${event.name} — Early Bird` : event.name,
          description: isMember ? 'Member rate' : 'General admission',
        },
        unit_amount: pricePerTicket,
      },
      quantity: tickets.length,
    }],
    mode: 'payment',
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events`,
    metadata: {
      // stripe-webhook uses these fields to route the completed payment correctly
      type: 'event_ticket',
      member_id: member?.id ?? '',
      registration_id: registration.id,
    },
  })

  return NextResponse.json({ url: session.url })
}
