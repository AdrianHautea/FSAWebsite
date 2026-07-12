// ── page.tsx ──────────────────────────────────────────────
// pamilyas page — server component that resolves member state
// and application status, then delegates all rendering to
// PamilyasClient
//
// data:  members, ading_applications, kuyate_applications,
//        settings (kuyate_applications_open flag, via lib/settings.ts)
// deps:  supabase (user client + admin client)
// ──────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Pamilyas',
  description: "Learn about UTD FSA's pamilya program, small mentorship families that connect new members with upperclassmen kuyas and ates for support and friendship.",
  alternates: { canonical: '/pamilyas' },
  openGraph: { images: [{ url: '/pam-hero.jpg', width: 1200, height: 630 }] },
}

// ── data fetching ─────────────────────────────────────────
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { getSettings } from '@/lib/settings'
import { isMembershipActive } from '@/lib/membership'
import PamilyasClient, { type MemberState } from './PamilyasClient'

export default async function PamilyasPage() {
  // user client for session-scoped reads (auth + settings)
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const memberState: MemberState = {
    isLoggedIn: false,
    isMember: false,
    memberType: null,
    hasAdingApp: false,
    hasKuyateApp: false,
    onboardingComplete: false,
  }

  if (user) {
    memberState.isLoggedIn = true
    const admin = createAdminClient()

    // query members table by email to get membership status and type
    const { data: member } = await admin
      .from('members')
      .select('id, membership_status, membership_expires_at, onboarding_complete, member_type')
      .eq('email', user.email!)
      .maybeSingle()

    if (member) {
      memberState.isMember = isMembershipActive(member)
      memberState.memberType = member.member_type ?? null
      memberState.onboardingComplete = member.onboarding_complete ?? false

      if (memberState.isMember) {
        // check both application tables in parallel to avoid waterfall
        const [adingRes, kuyateRes] = await Promise.all([
          admin.from('ading_applications').select('id').eq('member_id', member.id).maybeSingle(),
          admin.from('kuyate_applications').select('id').eq('member_id', member.id).maybeSingle(),
        ])
        memberState.hasAdingApp = !!adingRes.data
        memberState.hasKuyateApp = !!kuyateRes.data
      }
    }
  }

  // kuyate applications open/closed flag — also accounts for the kuyate_deadline cutoff
  // (settings table is admin/service-role-only; the anon/authenticated roles have no
  // direct read access, so this must go through getSettings() rather than a raw query)
  const { kuyateApplicationsOpen: isKuyateOpen } = await getSettings()

  // ── render ────────────────────────────────────────────────
  // pass resolved state to client component; no markup here
  return <PamilyasClient memberState={memberState} isKuyateOpen={isKuyateOpen} />
}
