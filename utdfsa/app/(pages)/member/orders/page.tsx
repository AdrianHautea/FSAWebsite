// ── page.tsx ─────────────────────────────────────────────────
// server component — fetches order history and passes it to OrdersClient
//
// data:  members (id, contact_email), event_registrations with registration_tickets, events lookup
// deps:  supabase admin client (bypass rls to read tickets and registrations)
// notes: events are fetched in a separate query because nested fk joins require
//        explicit constraints in the supabase schema; eventsData is passed as a
//        record keyed by id for O(1) lookups in the client component
import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OrdersClient from './OrdersClient'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================
  // ?success=true is appended by stripe on redirect after a completed checkout
  const { success } = await searchParams

  // respects rls — only used for the auth check; all data reads use the admin client below
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  // route: /login — redirects unauthenticated users to sign in — do not change this path
  if (!user) redirect('/login')

  // bypass rls — safe because every query below is scoped to this member's
  // own id/email; no other member's data is ever read here
  const admin = createAdminClient()

  // members table — fetch id and contact_email for this user
  // contact_email is the preferred notification address; falls back to Google login email
  const { data: member } = await admin
    .from('members')
    .select('id, contact_email')
    .eq('email', user.email!)
    .maybeSingle()

  // redirect to /login if no member row (account not fully set up)
  if (!member) redirect('/login')

  // the email address that qr ticket confirmation was sent to
  const contactEmail = member.contact_email ?? user.email!

  // event_registrations table — all registrations for this member, newest first, with tickets inline
  const { data: registrations } = await admin
    .from('event_registrations')
    .select(`
      id,
      created_at,
      payment_status,
      num_tickets,
      amt_paid,
      amt_expected,
      event_id,
      registration_tickets (
        id,
        qr_code,
        attendee_fname,
        attendee_lname,
        attendee_email,
        checked_in,
        checked_in_at
      )
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })

  // fetch event details separately — nested joins require fk constraints in supabase schema
  // collect unique event ids from registrations, filtering out nulls
  const eventIds = (registrations ?? [])
    .map(r => r.event_id)
    .filter((id): id is string => Boolean(id))

  const eventsData: Record<string, {
    name: string
    event_date: string
    location: string | null
    cover_photo_url: string | null
  }> = {}

  if (eventIds.length > 0) {
    // events table — fetch display fields for all events referenced by this member's registrations
    const { data: events } = await admin
      .from('events')
      .select('id, name, event_date, location, cover_photo_url')
      .in('id', eventIds)

    // index by id so OrdersClient can do O(1) lookups per registration
    for (const e of events ?? []) eventsData[e.id] = e
  }

  // ============================================================
  // UI — rendered by OrdersClient (client component)
  // ============================================================
  return (
    <OrdersClient
      registrations={registrations ?? []}
      eventsData={eventsData}
      contactEmail={contactEmail}
      success={success}
    />
  )
}
