// ── page.tsx ──────────────────────────────────────────────
// server component — officer qr ticket scanner auth guard + event list.
//
// data:  members (role check), events (scannable list), registration_tickets
//        joined through paid event_registrations (initial door tallies)
// notes: defense-in-depth auth check — middleware also protects this route
//        but we verify role explicitly here in case middleware is misconfigured.
//        all camera/scanner logic lives in ScanClient (client component).
//        events are limited to active ones from the last 7 days onward — the
//        picker is for working a door, not browsing history.
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ScanClient, { type ScannableEvent } from './ScanClient'

export default async function ScanPage() {
  // redirect to /login if no session found
  const ctx = await requireUser()
  if (!ctx) redirect('/login')
  const { supabase, user } = ctx

  // table: members — role check; redirects non-officers to their profile with error flag
  const { data: roleRow } = await supabase
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (roleRow?.role !== 'officer' && roleRow?.role !== 'admin') {
    redirect('/member/profile?error=unauthorized')
  }

  // bypass rls — officer view; active events from the recent past onward,
  // soonest first, so tonight's event sits at the top of the picker
  const admin = createAdminClient()
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - 7)
  const { data: events } = await admin
    .from('events')
    .select('id, name, event_date, event_type')
    .eq('is_active', true)
    .gte('event_date', windowStart.toISOString())
    .order('event_date', { ascending: true })

  // initial door tallies — one query for all listed events, counted in js.
  // scan responses keep the tally fresh afterwards (see /api/scan-ticket).
  const eventIds = (events ?? []).map(e => e.id)
  const tallies = new Map<string, { checked_in_count: number; total_paid: number }>()
  if (eventIds.length > 0) {
    const { data: tickets } = await admin
      .from('registration_tickets')
      .select('checked_in, event_registrations!inner(event_id, payment_status)')
      .in('event_registrations.event_id', eventIds)
      .eq('event_registrations.payment_status', 'paid')
    for (const t of (tickets ?? []) as unknown as { checked_in: boolean; event_registrations: { event_id: string } }[]) {
      const id = t.event_registrations.event_id
      const tally = tallies.get(id) ?? { checked_in_count: 0, total_paid: 0 }
      tally.total_paid += 1
      if (t.checked_in) tally.checked_in_count += 1
      tallies.set(id, tally)
    }
  }

  const scannableEvents: ScannableEvent[] = (events ?? []).map(e => ({
    id: e.id,
    name: e.name,
    event_date: e.event_date,
    event_type: e.event_type,
    checked_in_count: tallies.get(e.id)?.checked_in_count ?? 0,
    total_paid: tallies.get(e.id)?.total_paid ?? 0,
  }))

  return <ScanClient events={scannableEvents} />
}
