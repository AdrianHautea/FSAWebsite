// ── page.tsx ─────────────────────────────────────────────────
// archives server component — fetches published galleries and passes to client
//
// data:  galleries table — published only, sorted year desc then created_at desc
// deps:  supabase admin client (bypass rls to read published galleries publicly)
// notes: admin client used here because gallery reads are public but RLS would
//        block unauthenticated access; only is_published = true rows are shown
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Archives' }
export const revalidate = 3600

import { createAdminClient } from '@/utils/supabase/server'
import ArchivesClient from './ArchivesClient'
import type { Gallery } from '@/types/database'

export default async function ArchivesPage() {
  // bypass rls — officer action, user client would be blocked for unauthenticated visitors
  const admin = createAdminClient()

  // galleries table — fetch only published rows, newest year first
  // explicit columns — excludes created_by (officer uuid); mirrors the public /api/galleries GET
  const { data: galleries } = await admin
    .from('galleries')
    .select('id, title, cover_photo_url, google_photos_url, description, semester, year, is_published, created_at')
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
