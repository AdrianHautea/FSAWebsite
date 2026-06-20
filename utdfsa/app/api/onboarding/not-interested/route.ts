// ── route.ts (onboarding/not-interested) ─────────────────────────────────────
// marks a member as opting out of the pamilya program.
//
// data:  members (read via user client, write via admin client)
// notes: sets onboarding_complete = true and member_type = 'not_interested'.
//        guarded by membership_status check — only active members can reach this step.
//        client redirects to /onboarding/basic-info afterward to collect profile info.

import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/onboarding/not-interested
// marks the member as not interested in the pamilya program:
//   sets onboarding_complete = true, member_type = 'not_interested'
// client then redirects to /onboarding/basic-info to collect profile info
export async function POST() {
  // respects rls — confirms caller is authenticated; returns 401 on failure
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // respects rls — fetch the caller's own member row to verify status
  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 })
  }

  // guard: only active (paid) members can proceed through onboarding
  if (member.membership_status !== 'active') {
    return NextResponse.json({ error: 'membership not active' }, { status: 400 })
  }

  // bypass rls — user client cannot update its own role fields
  const admin = createAdminClient()

  console.log('[not-interested] updating member_type=not_interested for member.id:', member.id)
  // set member_type only — onboarding_complete is stamped by update-basic-info after the form submits
  const { error } = await admin
    .from('members')
    .update({ member_type: 'not_interested' })
    .eq('id', member.id)
  console.log('[not-interested] update error:', error)

  if (error) {
    console.error('[onboarding not-interested]', error)
    return NextResponse.json({ error: 'failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
