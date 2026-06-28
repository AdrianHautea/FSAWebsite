// ── page.tsx ─────────────────────────────────────────────────
// server component — fetches attendance data and passes it to AttendanceClient
//
// data:  members (id, points), attendance joined with events, meeting/risk management counts
// deps:  supabase (respects rls — user client)
// notes: meetingCount and riskMgmtCount are computed via subqueries because
//        supabase doesn't support aggregate filters on joined tables directly
import { createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  // ============================================================
  // DATA — do not modify this section
  // authenticates the user and queries:
  //   members — for id and current point total
  //   attendance (joined with events) — full attendance history,
  //     newest first; events fields: id, name, event_date, event_type, points
  //   meetingCount — total General Meeting + Risk Management sessions attended
  //   riskMgmtCount — Risk Management sessions attended specifically
  // ============================================================
  // respects rls — only returns rows the caller owns
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // redirect to /login if no session found
  if (!user) redirect('/login')

  // members table — fetch id and current point total for this user
  const { data: member } = await supabase
    .from('members')
    .select('id, points')
    .eq('email', user.email!)
    .maybeSingle()

  // redirect to /login if no member row exists (e.g. account not set up yet)
  if (!member) redirect('/login')

  // parallel: attendance history + event id lookup (both need member.id but not each other)
  const [{ data: attendanceRecords }, { data: meetingAndRiskEvents }] = await Promise.all([
    supabase.from('attendance').select(`
      id,
      created_at,
      events (
        id,
        name,
        event_type,
        event_date,
        points
      )
    `).eq('member_id', member.id).order('created_at', { ascending: false }),
    supabase.from('events').select('id, event_type').in('event_type', ['General Meeting', 'Risk Management']),
  ])

  const generalAndRiskEventIds = meetingAndRiskEvents?.map((e: { id: string }) => e.id) ?? []
  const riskMgmtEventIds = meetingAndRiskEvents?.filter((e: { event_type: string }) => e.event_type === 'Risk Management').map((e: { id: string }) => e.id) ?? []

  // parallel: both counts are independent of each other
  const [{ count: meetingCount }, { count: riskMgmtCount }] = await Promise.all([
    supabase.from('attendance').select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .in('event_id', generalAndRiskEventIds.length > 0 ? generalAndRiskEventIds : ['__none__']),
    supabase.from('attendance').select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .in('event_id', riskMgmtEventIds.length > 0 ? riskMgmtEventIds : ['__none__']),
  ])

  // ============================================================
  // UI — rendered by AttendanceClient (client component)
  // ============================================================
  return (
    <AttendanceClient
      member={{ points: member.points ?? 0 }}
      attendanceRecords={attendanceRecords ?? []}
      meetingCount={meetingCount ?? 0}
      riskMgmtCount={riskMgmtCount ?? 0}
    />
  )
}
