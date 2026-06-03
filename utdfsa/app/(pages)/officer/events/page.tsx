import { createAdminClient } from '@/utils/supabase/server'
import OfficerEventsClient from './OfficerEventsClient'

export default async function OfficerEventsPage() {
  // ============================================================
  // DATA — do not modify this section
  // fetches all events (all statuses, newest first) using the admin
  // client so officer auth is not required server-side here —
  // OfficerEventsClient's API calls enforce role checks individually
  // ============================================================
  const admin = createAdminClient()
  const { data: events } = await admin
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  // ============================================================
  // UI — safe to restyle everything below this line
  // all styling lives in OfficerEventsClient — edit that file
  // ============================================================
  return <OfficerEventsClient initialEvents={events ?? []} />
}
