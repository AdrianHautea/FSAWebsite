import { createAdminClient } from '@/utils/supabase/server'
import ArchivesClient from './ArchivesClient'
import type { Gallery } from '@/types/database'

export default async function ArchivesPage() {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================
  const admin = createAdminClient()

  const { data: galleries } = await admin
    .from('galleries')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   galleries (Gallery[]) — published archives only,
  //     sorted by year desc then created_at desc
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================
  return (
    <ArchivesClient
      galleries={(galleries ?? []) as Gallery[]}
    />
  )
}
