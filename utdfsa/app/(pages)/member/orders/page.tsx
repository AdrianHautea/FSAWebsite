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
  const { success } = await searchParams

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  // route: /login — redirects unauthenticated users to sign in — do not change this path
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // contact_email is the preferred notification address; falls back to Google login email
  const { data: member } = await admin
    .from('members')
    .select('id, contact_email')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) redirect('/login')

  // contactEmail is what the QR ticket email was actually sent to
  const contactEmail = member.contact_email ?? user.email!

  // registrations newest-first, with tickets inline
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

  // fetch event details separately — nested joins require FK constraints in Supabase schema
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
    const { data: events } = await admin
      .from('events')
      .select('id, name, event_date, location, cover_photo_url')
      .in('id', eventIds)

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
