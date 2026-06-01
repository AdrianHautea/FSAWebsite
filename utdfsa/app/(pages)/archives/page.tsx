import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import ArchivesClient from './ArchivesClient'
import type { Gallery } from '@/types/database'

export default async function ArchivesPage() {
  const supabase = await createUserClient()
  const admin = createAdminClient()

  let isOfficer = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: member } = await admin
      .from('members')
      .select('role')
      .eq('email', user.email!)
      .single()
    isOfficer = member?.role === 'officer' || member?.role === 'admin'
  }

  const { data: galleries } = await admin
    .from('galleries')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <ArchivesClient
      galleries={(galleries ?? []) as Gallery[]}
      isOfficer={isOfficer}
    />
  )
}
