// ── page.tsx ─────────────────────────────────────────────────
// events server component — fetches cached visible events, resolves the
// viewer, and handles the guest post-checkout one-time ticket reveal
//
// data:  events (via getCachedVisibleEvents), members, event_registrations,
//        registration_tickets (guest ?sid= reveal)
// deps:  stripe checkout session id in ?sid=, qrcode (npm)
// notes: see lib/data/events.ts for why unstable_cache is the real cache
//        boundary here; tickets_viewed_at makes the guest success link one-shot
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Events',
  description: 'See upcoming UTD FSA events and register for general meetings, cultural nights, and socials hosted by the Filipino Student Association at UT Dallas.',
  alternates: { canonical: '/events' },
  openGraph: { images: [{ url: '/og/events.jpg', width: 1200, height: 630 }] },
}

import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { getCachedVisibleEvents } from '@/lib/data/events'
import { isMembershipActive } from '@/lib/membership'
import EventsPageClient from './EventsPageClient'
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
  // nonce set per-request by proxy.ts — required for the inline JSON-LD script below
  const nonce = (await headers()).get('x-nonce')
  const admin = createAdminClient()

  // cached — base order ascending; client re-sorts into upcoming/past.
  // see lib/data/events.ts for why this needs unstable_cache instead of
  // a route-segment revalidate export
  const allEvents = await getCachedVisibleEvents()

  // resolve caller (page is public — members get different display)
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let member: {
    id: string
    membership_status: string
    membership_expires_at: string | null
    first_name: string
    last_name: string
    email: string
    contact_email: string | null
  } | null = null
  let registeredEventIds = new Set<string>()

  if (user?.email) {
    const { data } = await admin
      .from('members')
      .select('id, membership_status, membership_expires_at, first_name, last_name, email, contact_email')
      .eq('email', user.email)
      .maybeSingle()
    member = data

    // only fetch existing registrations for active (paid) members
    if (member && isMembershipActive(member)) {
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

  const isMember = isMembershipActive(member)

  // when a non-member purchase completes, stripe substitutes ?sid=<checkout_session_id> in the success url.
  // the session id is only delivered to the browser that completed checkout, but it can still leak
  // (browser history sync, screenshots, analytics referrers) — so tickets_viewed_at makes the QR
  // reveal one-time: once shown here, the sid link no longer re-displays live, scannable QR codes.
  // if payment is confirmed (webhook has fired) and this is the first view, fetch the ticket rows,
  // pre-generate qr data urls, and mark the registration viewed. if the webhook hasn't fired yet,
  // or the tickets were already viewed, ticketQRs stays undefined and the email fallback text shows.
  type TicketQR = { attendee_fname: string; attendee_lname: string; attendee_email: string; qr_data_url: string }
  let ticketQRs: TicketQR[] | undefined = undefined

  if (success && sid) {
    const { data: reg } = await admin
      .from('event_registrations')
      .select('id, tickets_viewed_at')
      .eq('stripe_checkout_session_id', sid)
      .eq('payment_status', 'paid')
      .maybeSingle()

    if (reg && !reg.tickets_viewed_at) {
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

        // one-time reveal — this sid link renders live QR codes exactly once
        await admin
          .from('event_registrations')
          .update({ tickets_viewed_at: new Date().toISOString() })
          .eq('id', reg.id)
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
  // structured data — one Event entry per visible event, for search rich results
  const eventsJsonLd = allEvents.map(e => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.name,
    ...(e.description ? { description: e.description } : {}),
    startDate: e.event_date,
    ...(e.event_end ? { endDate: e.event_end } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: e.location
      ? { '@type': 'Place', name: e.location }
      // Google requires a location even when unconfirmed; VirtualLocation
      // pointing at the events page is the documented fallback
      : { '@type': 'VirtualLocation', url: 'https://www.utdfsa.org/events' },
    offers: {
      '@type': 'Offer',
      price: (e.price_cents_members / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://www.utdfsa.org/events',
    },
  }))

  return (
    <>
      {eventsJsonLd.length > 0 && (
        <script
          type="application/ld+json"
          nonce={nonce ?? undefined}
          // browsers zero out the nonce attribute in the DOM after parsing (CSP
          // hardening, prevents nonce exfiltration) — React sees that as a hydration
          // mismatch even though the script already ran fine server-side
          suppressHydrationWarning
          // name/description come from officer-entered event data, not public
          // input — still escape "<" so a stray "</script>" can't break out
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <EventsPageClient
        events={allEvents}
        isMember={isMember}
        member={member}
        registeredEventIds={[...registeredEventIds]}
        success={success}
        ticketQRs={ticketQRs}
      />
    </>
  )
}
