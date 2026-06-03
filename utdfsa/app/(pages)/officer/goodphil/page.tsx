import { createAdminClient } from '@/utils/supabase/server'
import type { GoodphilEligibility } from '@/types/database'
import GoodphilClient from './GoodphilClient'

export default async function GoodphilPage() {
  // ============================================================
  // DATA — do not modify this section
  // queries the goodphil_eligibility view for all active members;
  // officer-only access is enforced by middleware on /officer routes.
  // returns members sorted alphabetically by last name.
  // ============================================================
  const admin = createAdminClient()

  const { data: members } = await admin
    .from('goodphil_eligibility')
    .select('*')
    .order('last_name', { ascending: true })

  // ============================================================
  // UI — data is passed to the client component below
  // all search filtering and CSV export happen client-side
  // ============================================================
  return <GoodphilClient members={(members ?? []) as GoodphilEligibility[]} />
}
