// ── route.ts (onboarding/not-interested) ─────────────────────────────────────
// marks a member as opting out of the pamilya program.
//
// data:  members (read via user client, write via admin client)
// notes: sets onboarding_complete = true and member_type = 'not_interested'.
//        guarded by membership_status check — only active members can reach this step.
//        client redirects to /onboarding/basic-info afterward to collect profile info.

import { createAdminClient } from '@/utils/supabase/server'
import { requireUser } from '@/lib/auth'
import { isMembershipActive } from '@/lib/membership'
import { NextResponse } from 'next/server'
import { fail } from '@/lib/api-response'

// POST /api/onboarding/not-interested
// marks the member as not interested in the pamilya program:
//   sets onboarding_complete = true, member_type = 'not_interested'
// client then redirects to /onboarding/basic-info to collect profile info
export async function POST() {
  // respects rls — confirms caller is authenticated; returns 401 on failure
  const ctx = await requireUser()
  if (!ctx) return fail('Unauthorized', 401)
  const { supabase, user } = ctx

  // respects rls — fetch the caller's own member row to verify status
  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status, membership_expires_at')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return fail('Member not found', 404)
  }

  // guard: only active (paid) members can proceed through onboarding
  if (!isMembershipActive(member)) {
    return fail('Membership not active', 400)
  }

  // bypass rls — safe because member.id was just resolved above via an
  // rls-respecting query scoped to the authenticated caller's own email
  const admin = createAdminClient()

  // set member_type only — onboarding_complete is stamped by update-basic-info after the form submits
  const { error } = await admin
    .from('members')
    .update({ member_type: 'not_interested' })
    .eq('id', member.id)

  if (error) {
    console.error('[onboarding not-interested]', error)
    return fail('Failed to update', 500)
  }

  return NextResponse.json({ success: true })
}
