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
import { headers } from 'next/headers'

// ponytail: in-memory rate limit — per-instance backstop only. the real gate is the
// Vercel Firewall rate-limit rule on this path (global, runs at the edge). kept generous
// so shared campus-NAT bursts (many attendees, one egress IP) aren't throttled.
const ipHits = new Map<string, number[]>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  hits.push(now)
  ipHits.set(ip, hits)
  return hits.length > RATE_LIMIT
}

export async function POST(req: Request) {
  // ── rate limiting ─────────────────────────────────────────
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    console.warn('[security] rate-limit hit', { route: '/api/events/register', ip, ts: new Date().toISOString() })
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

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

    // prevent buying a second ticket for the same event; only a confirmed paid ticket blocks retry
    // bypass rls — admin client needed to query all registrations across members
    const { data: existing } = await admin
      .from('event_registrations')
      .select('id')
      .eq('member_id', member!.id)
      .eq('event_id', event_id)
      .eq('payment_status', 'paid')
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

  // ── create or update registration ──────────────────────────────────────────
  // bypass rls — admin client for all writes below
  // for any authenticated user (member or not): if a non-paid row already exists for this
  // (member_id, event_id) pair from a prior abandoned or stripe-expired attempt, update it
  // in place rather than inserting — avoids a 23505 unique_violation on (member_id, event_id).
  // free events are immediately marked paid to skip stripe entirely.
  //
  // ⚠ limitation: a pending row from a live concurrent checkout session in another tab is
  // indistinguishable from an abandoned one — no stripe session id is stored at creation time.
  // this is an accepted trade-off; session-level tracking can be revisited later if needed.
  let registration: { id: string }
  let isUpsert = false

  if (member) {
    // check for any non-paid row for this member+event (pending from abandonment, or failed/expired)
    const { data: existingRow } = await admin
      .from('event_registrations')
      .select('id')
      .eq('member_id', member.id)
      .eq('event_id', event_id)
      .neq('payment_status', 'paid')
      .maybeSingle()

    if (existingRow) {
      // update the stale row with the current attempt's ticket info
      const { data: updated, error: updateError } = await admin
        .from('event_registrations')
        .update({
          guest_fname: tickets[0].fname,
          guest_lname: tickets[0].lname,
          guest_email: tickets[0].email,
          num_tickets: tickets.length,
          amt_expected: totalAmount,
          payment_status: totalAmount === 0 ? 'paid' : 'pending',
        })
        .eq('id', existingRow.id)
        .select('id')
        .single()

      if (updateError || !updated) {
        console.error('Registration update error:', updateError)
        return NextResponse.json({ error: 'Failed to update registration.' }, { status: 500 })
      }

      registration = updated
      isUpsert = true

      // remove stale ticket rows from the prior attempt; fresh ones are inserted below
      await admin.from('registration_tickets').delete().eq('registration_id', registration.id)
    } else {
      // no prior row — insert fresh
      const { data: inserted, error: insertError } = await admin
        .from('event_registrations')
        .insert({
          member_id: member.id,
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

      if (insertError || !inserted) {
        console.error('Registration insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create registration.' }, { status: 500 })
      }

      registration = inserted
    }
  } else {
    // unauthenticated guest — member_id is null; postgres unique constraints treat null as distinct,
    // so there is no collision risk and a plain insert is always safe here
    const { data: inserted, error: insertError } = await admin
      .from('event_registrations')
      .insert({
        member_id: null,
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

    if (insertError || !inserted) {
      console.error('Registration insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create registration.' }, { status: 500 })
    }

    registration = inserted
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
    // on a fresh insert, delete the registration row to avoid orphaned records.
    // on an upsert, leave the row in place — the member can retry and the next attempt
    // will update it and insert fresh ticket rows.
    if (!isUpsert) {
      await admin.from('event_registrations').delete().eq('id', registration.id)
    }
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
  // {CHECKOUT_SESSION_ID} is a stripe template literal — stripe substitutes the real session id at redirect
  // time; do not replace this string manually. the events page resolves tickets from it after payment.
  const successUrl = isMember
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/member/orders?success=true`
    : `${process.env.NEXT_PUBLIC_SITE_URL}/events?success=true&sid={CHECKOUT_SESSION_ID}`

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

  // save the stripe session id immediately so the success page can resolve tickets by session id
  // before the webhook fires. for upserts this also replaces the stale abandoned session id.
  await admin
    .from('event_registrations')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', registration.id)

  return NextResponse.json({ url: session.url })
}
