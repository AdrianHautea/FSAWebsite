import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/onboarding/not-interested
// marks the member as not interested in the pamilya program:
//   sets onboarding_complete = true, member_type = 'not_interested'
// client then redirects to /onboarding/basic-info to collect profile info
export async function POST() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 })
  }

  if (member.membership_status !== 'active') {
    return NextResponse.json({ error: 'membership not active' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('members')
    .update({ onboarding_complete: true, member_type: 'not_interested' })
    .eq('id', member.id)

  if (error) {
    console.error('[onboarding not-interested]', error)
    return NextResponse.json({ error: 'failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
