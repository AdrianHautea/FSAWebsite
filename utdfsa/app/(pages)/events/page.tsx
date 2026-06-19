import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import EventsPageClient from './EventsPageClient'
import type { Event } from '@/types/database'
import QRCode from 'qrcode'

// ── page ──────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; sid?: string }>
}) {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================
  const { success, sid } = await searchParams
  const admin = createAdminClient()

  // visible events — base order ascending; client re-sorts into upcoming/past
  const { data: allEvents } = await admin
    .from('events')
    .select('*')
    .eq('is_visible', true)
    .order('event_date', { ascending: true })

  // resolve caller (page is public — members get different display)
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let member: {
    id: string
    membership_status: string
    first_name: string
    last_name: string
    email: string
    contact_email: string | null
  } | null = null
  let registeredEventIds = new Set<string>()

  if (user?.email) {
    const { data } = await admin
      .from('members')
      .select('id, membership_status, first_name, last_name, email, contact_email')
      .eq('email', user.email)
      .maybeSingle()
    member = data

    // only fetch existing registrations for active (paid) members
    if (member?.membership_status === 'active') {
      const { data: regs } = await admin
        .from('event_registrations')
        .select('event_id')
        .eq('member_id', member.id)
        .eq('payment_status', 'paid')
      registeredEventIds = new Set(
        (regs ?? []).map(r => r.event_id).filter(Boolean) as string[]
      )
    }
  }

  const isMember = member?.membership_status === 'active'

  // when a non-member purchase completes, stripe substitutes ?sid=<checkout_session_id> in the success url.
  // the session id is only delivered to the browser that completed checkout, so it functions as
  // an access token — no additional ownership check is needed for guests who have no auth account.
  // if payment is confirmed (webhook has fired), fetch the ticket rows and pre-generate qr data urls.
  // if the webhook hasn't fired yet, ticketQRs stays undefined and the email fallback text shows.
  type TicketQR = { attendee_fname: string; attendee_lname: string; attendee_email: string; qr_data_url: string }
  let ticketQRs: TicketQR[] | undefined = undefined

  if (success && sid) {
    const { data: reg } = await admin
      .from('event_registrations')
      .select('id')
      .eq('stripe_checkout_session_id', sid)
      .eq('payment_status', 'paid')
      .maybeSingle()

    if (reg) {
      const { data: ticketRows } = await admin
        .from('registration_tickets')
        .select('qr_code, attendee_fname, attendee_lname, attendee_email')
        .eq('registration_id', reg.id)

      if (ticketRows && ticketRows.length > 0) {
        ticketQRs = await Promise.all(
          ticketRows.map(async t => ({
            attendee_fname: t.attendee_fname ?? '',
            attendee_lname: t.attendee_lname ?? '',
            attendee_email: t.attendee_email ?? '',
            qr_data_url: await QRCode.toDataURL(t.qr_code, {
              width: 256,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' },
            }),
          }))
        )
      }
    }
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   events (Event[]) — visible events in base ascending order; client sorts into upcoming/past
  //   member — { id, membership_status, first_name, last_name, email, contact_email } | null
  //   isMember (bool) — true when the logged-in user has an active membership
  //   registeredEventIds (Set<string>) — event IDs the member already paid for
  //   success — query param set by Stripe redirect or free-event confirmation
  //   ticketQRs — populated for non-member purchases once payment is confirmed; each entry has
  //               attendee_fname, attendee_lname, attendee_email, and a base64 qr_data_url
  // ============================================================
  return (
    <EventsPageClient
      events={(allEvents ?? []) as Event[]}
      isMember={isMember}
      member={member}
      registeredEventIds={[...registeredEventIds]}
      success={success}
      ticketQRs={ticketQRs}
    />
  )
}
