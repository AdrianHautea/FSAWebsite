import { createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BasicInfoClient from './BasicInfoClient'

export default async function BasicInfoPage() {
  // ============================================================
  // DATA — do not modify this section
  // authenticates the user, verifies active membership,
  // and passes existing member data to the client form for pre-filling.
  // this page is the landing point after choosing "not interested"
  // in the onboarding flow, but is also accessible standalone.
  // ============================================================
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('first_name, last_name, phone, year, major, pamilya, membership_status')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) redirect('/login')
  if (member.membership_status !== 'active') redirect('/membership')

  // ============================================================
  // UI — server component passes pre-filled values to the client form
  // ============================================================
  return (
    <BasicInfoClient
      initial={{
        first_name: member.first_name ?? '',
        last_name: member.last_name ?? '',
        phone: member.phone ?? '',
        year: member.year ?? '',
        major: member.major ?? '',
        pamilya: member.pamilya ?? '',
      }}
    />
  )
}
