import { redirect } from 'next/navigation'
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import OfficerGalleryClient from './OfficerGalleryClient'
import type { Gallery } from '@/types/database'

export default async function OfficerGalleryPage() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/officer/gallery')

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .single()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) {
    redirect('/member/profile?error=unauthorized')
  }

  const { data: galleries } = await admin
    .from('galleries')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <OfficerGalleryClient galleries={(galleries ?? []) as Gallery[]} />
  )
}
