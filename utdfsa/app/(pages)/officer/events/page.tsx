import { createAdminClient } from '@/utils/supabase/server'
import OfficerEventsClient from './OfficerEventsClient'

export default async function OfficerEventsPage() {
  const admin = createAdminClient()
  const { data: events } = await admin
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  return <OfficerEventsClient initialEvents={events ?? []} />
}
