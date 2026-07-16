// ── route.ts ─────────────────────────────────────────────
// POST /api/events/register — create a registration + tickets, then redirect to Stripe checkout
//
// data:  events, event_registrations, registration_tickets (members for identity lookup)
// deps:  stripe (checkout session)
// notes: caller may be anonymous; member detection is best-effort via auth cookie
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { isMembershipActive } from '@/lib/membership'
import { eventRegisterSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { fail, failValidation } from '@/lib/api-response'
import { isRateLimited } from '@/lib/rate-limit'

// ponytail: in-memory rate limit — per-instance backstop only. the real gate is the
// Vercel Firewall rate-limit rule on this path (global, runs at the edge). kept generous
// so shared campus-NAT bursts (many attendees, one egress IP) aren't throttled.
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

export async function POST(req: Request) {
  // ── rate limiting ─────────────────────────────────────────
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`register:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
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
    return failValidation(parsed.error)
  }

  const { event_id, tickets } = parsed.data
  const admin = createAdminClient()

  // ── resolve caller identity (optional — non-members don't need to be logged in) ──
  // respects rls — only returns session for the authenticated caller
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let member: { id: string; membership_status: string; membership_expires_at: string | null; first_name: string; last_name: string; contact_email: string | null } | null = null

  if (user?.email) {
    // bypass rls — needed to look up the member row regardless of their auth state
    const { data } = await admin
      .from('members')
      .select('id, membership_status, membership_expires_at, first_name, last_name, contact_email')
      .eq('email', user.email)
      .maybeSingle()
    member = data
  }

  // effective active membership (status + expiry) gates member pricing and restrictions
  const isMember = isMembershipActive(member)

  // ── member-specific restrictions ───────────────────────────────────────────
  // fetched once here (unique constraint guarantees at most one row per member+event)
  // and reused below in the update/insert block instead of re-querying for the stale-row check
  let memberExistingRegistration: { id: string; payment_status: string } | null = null

  if (isMember) {
    if (tickets.length > 1) {
      return fail('Members may only purchase one ticket per event.', 400)
    }

    // prevent buying a second ticket for the same event; only a confirmed paid ticket blocks retry
    // bypass rls — admin client needed to query all registrations across members
    const { data: existing } = await admin
      .from('event_registrations')
      .select('id, payment_status')
      .eq('member_id', member!.id)
      .eq('event_id', event_id)
      .maybeSingle()

    if (existing?.payment_status === 'paid') {
      return fail('You are already registered for this event.', 409)
    }

    memberExistingRegistration = existing
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
    return fail('Event not found or not available.', 404)
  }

  if (event.registration_closes_at && new Date() > new Date(event.registration_closes_at)) {
    return fail('Registration has closed for this event.', 400)
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
    // check for any non-paid row for this member+event (pending from abandonment, or failed/expired).
    // active members: reuse the row already fetched above (guaranteed non-paid — a paid
    // row would have 409'd already) instead of re-querying. non-active members: fetch fresh,
    // since the isMember block above never ran for them.
    const existingRow = isMember
      ? memberExistingRegistration
      : (await admin
          .from('event_registrations')
          .select('id')
          .eq('member_id', member.id)
          .eq('event_id', event_id)
          .neq('payment_status', 'paid')
          .maybeSingle()).data

    if (existingRow) {
      // update the stale row with the current attempt's ticket info.
      // .neq('payment_status', 'paid') re-verifies the condition atomically at the write,
      // not just at the read above — closes the race where the row gets paid (e.g. a
      // concurrent tab's webhook fires) between the SELECT and this UPDATE
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
        .neq('payment_status', 'paid')
        .select('id')
        .maybeSingle()

      if (updateError) {
        console.error('Registration update error:', updateError)
        return fail('Failed to update registration.', 500)
      }

      if (!updated) {
        // lost the race — the row was paid between the read above and this update
        return fail('You are already registered for this event.', 409)
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
        return fail('Failed to create registration.', 500)
      }

      registration = inserted
    }
  } else {
    // unauthenticated guest — dedupe on (event_id, lower(guest_email)) so one person can't
    // resubmit this form repeatedly and mint unlimited tickets for a free event. exact-match
    // lookup first (cheap, handles the common case); the partial unique index
    // (unique_guest_event_registration) is the authoritative backstop for case-variant
    // emails or races, caught via 23505 below.
    const { data: existingGuestRow } = await admin
      .from('event_registrations')
      .select('id, payment_status')
      .eq('event_id', event_id)
      .is('member_id', null)
      .eq('guest_email', tickets[0].email)
      .maybeSingle()

    // security: 'paid' AND 'pending' both reject with the SAME generic message. a guest
    // row is located by attacker-suppliable email alone — anyone who knows a victim's
    // email could otherwise overwrite their live in-flight registration (names, attendee
    // emails, ticket count) and delete its ticket rows. only a 'failed' row (killed by the
    // checkout.session.expired webhook — genuinely dead, no live stripe session) is safe
    // to reuse in place; the legitimate owner of a 'pending' row still has their open
    // checkout link and doesn't need this endpoint to resume it.
    if (existingGuestRow?.payment_status === 'paid' || existingGuestRow?.payment_status === 'pending') {
      return fail('This email already has a registration for this event.', 409)
    }

    if (existingGuestRow) {
      // 'failed' row from a stripe-expired abandoned attempt — safe to reuse in place.
      // .eq('payment_status', 'failed') re-verifies the condition atomically at the write,
      // not just at the read above — closes the race where the row flips to pending/paid
      // (e.g. a webhook fires) between the SELECT and this UPDATE
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
        .eq('id', existingGuestRow.id)
        .eq('payment_status', 'failed')
        .select('id')
        .maybeSingle()

      if (updateError) {
        console.error('Registration update error:', updateError)
        return fail('Failed to update registration.', 500)
      }

      if (!updated) {
        // lost the race — the row is no longer 'failed' (e.g. a webhook just fulfilled it)
        return fail('This email already has a registration for this event.', 409)
      }

      registration = updated
      // must be set — the ticket-insert-failure cleanup below only deletes the row
      // when !isUpsert; this row pre-existed and isn't ours to delete on failure
      isUpsert = true

      // remove stale ticket rows from the prior attempt; fresh ones are inserted below
      await admin.from('registration_tickets').delete().eq('registration_id', registration.id)
    } else {
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

      if (insertError) {
        // 23505 = unique_violation — a case-variant email or a race slipped past the
        // exact-match lookup above and hit unique_guest_event_registration
        if (insertError.code === '23505') {
          return fail('This email already has a registration for this event.', 409)
        }
        console.error('Registration insert error:', insertError)
        return fail('Failed to create registration.', 500)
      }

      if (!inserted) {
        console.error('Registration insert error: no row returned')
        return fail('Failed to create registration.', 500)
      }

      registration = inserted
    }
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
    return fail('Failed to create tickets.', 500)
  }

  // ── free events skip Stripe entirely ───────────────────────────────────────
  if (totalAmount === 0) {
    // registration already marked paid above; redirect to success page without stripe.
    // members land on /member/orders, guests land on /events — same split as the
    // paid path below, so the post-registration card is always the same width as
    // wherever the member would normally view it (order history).
    const freeSuccessUrl = isMember
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/member/orders?success=true`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/events?success=true`
    return NextResponse.json({ url: freeSuccessUrl })
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
  // security: this write must succeed and block the redirect — the webhook now requires an
  // exact stripe_checkout_session_id match before fulfilling (see stripe-webhook/route.ts), so
  // a silently-failed write here would leave the row unfulfillable even after a real payment.
  const { error: sessionIdError } = await admin
    .from('event_registrations')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', registration.id)

  if (sessionIdError) {
    console.error('[register] stripe_checkout_session_id write failed for registration', registration.id, sessionIdError)
    // cancel the now-orphaned stripe session so it can't later pay for an unfulfillable row
    await stripe.checkout.sessions.expire(session.id).catch(err =>
      console.error('[register] failed to expire orphaned session', session.id, err)
    )
    return fail('Failed to prepare checkout. Please try again.', 500)
  }

  return NextResponse.json({ url: session.url })
}
