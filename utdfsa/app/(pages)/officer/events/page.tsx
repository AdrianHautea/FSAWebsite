import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OfficerEventsClient from './OfficerEventsClient'

export default async function OfficerEventsPage() {
  // defense-in-depth auth check — middleware also protects this route
  // but we verify role explicitly here in case middleware is misconfigured
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
  const { data: events } = await admin
    .from('events')
    .select('id, created_at, name, description, event_type, event_date, location, points, price_cents_members, price_cents_nonmembers, eb_price_members, eb_price_nonmembers, eb_deadline, is_active, attend_qr_open, attend_qr_expires_at, cover_photo_url')
    .order('event_date', { ascending: false })

  // ============================================================
  // UI — safe to restyle everything below this line
  // all styling lives in OfficerEventsClient — edit that file
  // ============================================================
  return <OfficerEventsClient initialEvents={events ?? []} />
}
