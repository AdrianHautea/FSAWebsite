// ── route.ts ─────────────────────────────────────────────
// POST /api/member/update-profile — update the authenticated member's display profile
//
// data:  members
// notes: only updates name/phone/year/major/contact_email; does not affect
//        membership_status or role; contact_email empty string is coerced to null
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { phoneField } from '@/lib/schemas'
import { formatPhone } from '@/lib/format'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  first_name: z.string().min(1).max(50).trim(),
  last_name: z.string().min(1).max(50).trim(),
  phone: phoneField.optional(),
  year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', '']).optional().nullable(),
  major: z.string().max(100).trim().optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal('')),
})

export async function POST(req: Request) {
  // ── auth check ───────────────────────────────────────────
  // returns 401 if no valid session
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── request validation ────────────────────────────────────
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.format() },
      { status: 400 }
    )
  }

  const { first_name, last_name, phone, year, major, contact_email } = parsed.data

  // bypass rls — safe because the update is scoped to .eq('email', user.email!) below,
  // which is the authenticated caller's own row
  const admin = createAdminClient()

  // update the members table row for this user, matched by their login email
  const { error } = await admin
    .from('members')
    .update({
      first_name,
      last_name,
      // normalise phone to e.164-style before storing
      phone: phone ? formatPhone(phone) : null,
      year: year || null,
      major: major || null,
      // if contact_email is empty string, store null — fall back to login email
      contact_email: contact_email || null,
    })
    .eq('email', user.email!)

  if (error) {
    console.error('[update-profile] error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}