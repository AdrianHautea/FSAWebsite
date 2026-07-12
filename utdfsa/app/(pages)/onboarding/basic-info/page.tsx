// ── page.tsx (onboarding/basic-info) ─────────────────────
// server component: auth guard + membership check before rendering the basic-info form
//
// data:  supabase — members table (select: first_name, last_name, phone, year, major, membership_status)
//        getSettings — kuyateApplicationsOpen, kuyateDeadline (for the not-interested confirmation copy)
// notes: only active members may access this page; non-members redirect to /membership.
//        user client is used (not admin) so rls applies to the member's own row.

import { requireUser } from '@/lib/auth'
import { isMembershipActive } from '@/lib/membership'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import BasicInfoClient from './BasicInfoClient'

export default async function BasicInfoPage() {
  // ============================================================
  // DATA — do not modify this section
  // authenticates the user, verifies active membership,
  // and passes existing member data to the client form for pre-filling.
  // this page is the landing point after choosing "not interested"
  // in the onboarding flow, but is also accessible standalone.
  // ============================================================
  // user client ensures the auth session is valid; unauthenticated users redirect to login
  const ctx = await requireUser()
  if (!ctx) redirect('/login')
  const { supabase, user } = ctx

  // supabase: members table — fetch existing profile fields for pre-filling the form
  const { data: member } = await supabase
    .from('members')
    .select('first_name, last_name, phone, year, major, membership_status, membership_expires_at')
    .eq('email', user.email!)
    .maybeSingle()

  // auth check: member row missing → account not fully set up, send to login
  if (!member) redirect('/login')
  // membership gate: only active members may access this page
  if (!isMembershipActive(member)) redirect('/membership')

  // kuyate applications flag + deadline — drives the "door stays open" copy on the
  // confirmation screen shown after this form submits
  const { kuyateApplicationsOpen, kuyateDeadline } = await getSettings()
  const deadlineText = (kuyateApplicationsOpen && kuyateDeadline)
    ? kuyateDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null

  // ============================================================
  // UI — server component passes pre-filled values to the client form
  // ============================================================
  return (
    <BasicInfoClient
      firstName={member.first_name ?? ''}
      deadlineText={deadlineText}
      initial={{
        first_name: member.first_name ?? '',
        last_name: member.last_name ?? '',
        phone: member.phone ?? '',
        year: member.year ?? '',
        major: member.major ?? '',
      }}
    />
  )
}
