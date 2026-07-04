// ── page.tsx ──────────────────────────────────────────────
// server component — officer event management page.
//
// data:  events table (all columns), members table (role check only)
// notes: uses admin client to read events; role check uses user client.
//        all mutating operations (create/edit/delete) are handled by api routes
//        which enforce their own auth — this page only reads.
import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OfficerEventsClient from './OfficerEventsClient'

export default async function OfficerEventsPage() {
  // defense-in-depth auth check — middleware also protects this route
  // but we verify role explicitly here in case middleware is misconfigured
  // redirect to /login if no session found
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // table: members — role check; redirects non-officers to their profile with error flag
  const { data: roleRow } = await supabase
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (roleRow?.role !== 'officer' && roleRow?.role !== 'admin') {
    redirect('/member/profile?error=unauthorized')
  }

  // ============================================================
  // DATA — do not modify this section
  // fetches all events (all statuses, newest first) using the admin
  // client so officer auth is not required server-side here —
  // OfficerEventsClient's API calls enforce role checks individually
  // ============================================================
  const admin = createAdminClient()
  // officer page is role-gated server-side above — safe to include attend_qr_token here.
  // the client (OfficerEventsClient) needs it to render each event's check-in QR/URL.
  const { data: events } = await admin
    .from('events')
    .select('id, created_at, name, description, event_type, event_date, location, points, price_cents_members, price_cents_nonmembers, eb_price_members, eb_price_nonmembers, eb_deadline, is_active, is_visible, attend_qr_open, attend_qr_expires_at, attend_qr_token, cover_photo_url, registration_closes_at')
    .order('event_date', { ascending: false })

  // ============================================================
  // UI — safe to restyle everything below this line
  // all styling lives in OfficerEventsClient — edit that file
  // ============================================================
  return <OfficerEventsClient initialEvents={events ?? []} />
}
