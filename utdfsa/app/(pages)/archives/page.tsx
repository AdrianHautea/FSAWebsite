import { createAdminClient } from '@/utils/supabase/server'
import ArchivesClient from './ArchivesClient'
import type { Gallery } from '@/types/database'

export default async function ArchivesPage() {
  const admin = createAdminClient()

  const { data: galleries } = await admin
    .from('galleries')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <ArchivesClient
      galleries={(galleries ?? []) as Gallery[]}
    />
  )
}
