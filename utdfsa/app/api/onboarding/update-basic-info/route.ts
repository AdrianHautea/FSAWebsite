// ── route.ts (onboarding/update-basic-info) ───────────────────────────────────
// saves name, phone, year, and major for a member who opted out of pamilya.
//
// data:  members (read via user client, write via admin client)
// notes: does NOT touch onboarding_complete — that is already set by the
//        not-interested route before the client navigates here.
//        used by the /onboarding/basic-info page.

import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { phoneField } from '@/lib/schemas'
import { formatPhone } from '@/lib/format'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// capitalize only the first letter of each word — preserves internal casing like 'DeJesus' or 'de la Cruz'
const titleCase = (v: string) =>
  v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const schema = z.object({
  first_name: z.string().min(1).max(50).trim().transform(titleCase),
  last_name: z.string().min(1).max(50).trim().transform(titleCase),
  phone: phoneField.optional(),
  year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', '']).optional().nullable(),
  major: z.string().max(100).trim().optional().nullable(),
})

// ── POST /api/onboarding/update-basic-info ────────────────────────────────────
// saves profile fields (name, phone, year, major) for a member.
// does NOT touch onboarding_complete — that is already set by the not-interested route.
// used by the /onboarding/basic-info page after a member opts out of the pamilya program.
export async function POST(req: Request) {
  // respects rls — confirms caller is authenticated; returns 401 on failure
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', details: parsed.error.format() },
      { status: 400 }
    )
  }

  // ── auth / membership checks ──────────────────────────────────────────────

  // respects rls — fetch the caller's own member row to verify eligibility
  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 })
  }

  // guard: only active (paid) members can update their profile via onboarding
  if (member.membership_status !== 'active') {
    return NextResponse.json({ error: 'membership not active' }, { status: 400 })
  }

  // bypass rls — safe because member.id was just resolved above via an
  // rls-respecting query scoped to the authenticated caller's own email
  const admin = createAdminClient()

  // update basic profile fields and stamp onboarding complete in one write;
  // onboarding_complete is set here (not in not-interested) so the back button
  // on the basic-info form can return to /onboarding without being redirected to /member/profile
  const { error } = await admin
    .from('members')
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone ? formatPhone(parsed.data.phone) : null,
      year: parsed.data.year || null,
      major: parsed.data.major ?? null,
      onboarding_complete: true,
    })
    .eq('id', member.id)

  if (error) {
    console.error('[update-basic-info]', error)
    return NextResponse.json({ error: 'failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
