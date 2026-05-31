import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// separate schemas per member type — more explicit than a generic record
const adingApplicationSchema = z.object({
  preferred_pamilya: z.string().optional().nullable(),
  additional_notes: z.string().optional().nullable(),
})

const kuyateApplicationSchema = z.object({
  additional_notes: z.string().optional().nullable(),
})

const schema = z.object({
  memberType: z.enum(['ading', 'kuyate']),
  profileForm: z.object({
    first_name: z.string().min(1).max(50).trim()
      .transform(v => v.split(' ').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ')),
    last_name: z.string().min(1).max(50).trim()
      .transform(v => v.split(' ').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ')),
    phone: z.string().max(20).trim().optional().nullable(),
    year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', '']).optional().nullable(),
    major: z.string().max(100).trim().optional().nullable(),
  }),
  // applicationForm is typed loosely here — we validate it separately below
  // based on which member type was selected
  applicationForm: z.record(z.string(), z.unknown()),
})

export async function POST(req: Request) {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', details: parsed.error.format() },
      { status: 400 }
    )
  }

  const { memberType, profileForm, applicationForm } = parsed.data

  // validate application form fields against the correct schema
  const appParsed = memberType === 'ading'
    ? adingApplicationSchema.safeParse(applicationForm)
    : kuyateApplicationSchema.safeParse(applicationForm)

  if (!appParsed.success) {
    return NextResponse.json(
      { error: 'invalid application fields', details: appParsed.error.format() },
      { status: 400 }
    )
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status, onboarding_complete')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 })
  }

  if (member.membership_status !== 'active') {
    return NextResponse.json({ error: 'membership not active' }, { status: 400 })
  }

  if (member.onboarding_complete) {
    return NextResponse.json({ error: 'onboarding already completed' }, { status: 400 })
  }

  const admin = createAdminClient()

  // update profile fields on the members table
  const { error: profileError } = await admin
    .from('members')
    .update({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      phone: profileForm.phone ?? null,
      year: profileForm.year || null,
      major: profileForm.major ?? null,
      onboarding_complete: true,
    })
    .eq('id', member.id)

  if (profileError) {
    console.error('[onboarding submit] profile update error:', profileError)
    return NextResponse.json({ error: 'failed to update profile' }, { status: 500 })
  }

  // insert into the correct application table
  if (memberType === 'ading') {
    const adingData = appParsed.data as z.infer<typeof adingApplicationSchema>

    const { error: adingError } = await admin
      .from('ading_applications')
      .insert({
        member_id: member.id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        preferred_pamilya: adingData.preferred_pamilya ?? null,
        additional_notes: adingData.additional_notes ?? null,
      })

    if (adingError) {
      console.error('[onboarding submit] ading insert error:', adingError)
      // roll back onboarding_complete so they can retry
      await admin
        .from('members')
        .update({ onboarding_complete: false })
        .eq('id', member.id)
      return NextResponse.json({ error: 'failed to submit ading application' }, { status: 500 })
    }
  } else {
    const kuyateData = appParsed.data as z.infer<typeof kuyateApplicationSchema>

    const { error: kuyateError } = await admin
      .from('kuyate_applications')
      .insert({
        member_id: member.id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        additional_notes: kuyateData.additional_notes ?? null,
      })

    if (kuyateError) {
      console.error('[onboarding submit] kuyate insert error:', kuyateError)
      await admin
        .from('members')
        .update({ onboarding_complete: false })
        .eq('id', member.id)
      return NextResponse.json({ error: 'failed to submit kuyate application' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}