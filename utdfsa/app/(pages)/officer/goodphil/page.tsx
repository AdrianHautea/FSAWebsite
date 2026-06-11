import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import type { GoodphilEligibility } from '@/types/database'
import GoodphilClient from './GoodphilClient'

export default async function GoodphilPage() {
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
  // queries the goodphil_eligibility view for eligibility data;
  // phone is not included in the view so it is fetched separately
  // from the members table and merged by email before passing down.
  // officer-only access is enforced by middleware on /officer routes.
  // ============================================================
  const admin = createAdminClient()

  // requirements: 3 total meetings including risk management + 6 points
  // these thresholds come from the goodphil_eligibility view — do not hardcode them here
  // run both independent queries in parallel
  const [{ data: eligibility }, { data: phoneRows }] = await Promise.all([
    admin
      .from('goodphil_eligibility')
      .select('*')
      .order('last_name', { ascending: true }),
    admin
      .from('members')
      .select('email, phone'),
  ])

  const phoneByEmail = new Map(
    (phoneRows ?? []).map(r => [r.email as string, r.phone as string | null])
  )

  const members: GoodphilEligibility[] = (eligibility ?? []).map(m => ({
    ...(m as GoodphilEligibility),
    phone: phoneByEmail.get(m.email) ?? null,
  }))

  // ============================================================
  // UI — data is passed to the client component below
  // all search filtering, pagination, and CSV export happen client-side
  // ============================================================
  return <GoodphilClient members={members} />
}
