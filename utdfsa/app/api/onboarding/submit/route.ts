// ── route.ts (onboarding/submit) ──────────────────────────────────────────────
// saves profile fields and inserts the pamilya application (ading or kuyate).
//
// data:  members, ading_applications, kuyate_applications
// notes: two-phase write — profile fields go to members first, then the application
//        row is inserted. onboarding_complete is only flipped after the application
//        insert succeeds, so a partial failure leaves the member in a retryable state.
//        applicationForm is validated by the member-type-specific schema after the
//        outer schema parse, because zod can't know which sub-schema to use upfront.

import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { adingApplicationSchema, kuyateApplicationSchema, phoneField } from '@/lib/schemas'
import { formatPhone } from '@/lib/format'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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
    phone: phoneField.optional(),
    year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', '']).optional().nullable(),
    major: z.string().max(100).trim().optional().nullable(),
  }),
  // applicationForm is typed loosely here — we validate it separately below
  // based on which member type was selected
  applicationForm: z.record(z.string(), z.unknown()),
})

// ── POST /api/onboarding/submit ───────────────────────────────────────────────

export async function POST(req: Request) {
  // respects rls — confirms caller is authenticated; returns 401 on failure
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  // outer schema validates shape — applicationForm is z.record and re-validated below
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

  // ── auth / membership checks ──────────────────────────────────────────────

  // respects rls — fetch the caller's own member row to verify eligibility
  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status, onboarding_complete')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 })
  }

  // guard: only active (paid) members can submit an application
  if (member.membership_status !== 'active') {
    return NextResponse.json({ error: 'membership not active' }, { status: 400 })
  }

  // dedup guard: prevent double-submission if the member refreshes after completing
  if (member.onboarding_complete) {
    return NextResponse.json({ error: 'onboarding already completed' }, { status: 400 })
  }

  // bypass rls — user client cannot write to application tables or update role fields
  const admin = createAdminClient()

  // ── phase 1: write profile fields ────────────────────────────────────────

  // update profile fields — onboarding_complete is NOT set here;
  // it is only flipped to true after the application insert succeeds below
  const { error: profileError } = await admin
    .from('members')
    .update({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      phone: profileForm.phone ? formatPhone(profileForm.phone) : null,
      year: profileForm.year || null,
      major: profileForm.major ?? null,
    })
    .eq('id', member.id)

  if (profileError) {
    console.error('[onboarding submit] profile update error:', profileError)
    return NextResponse.json({ error: 'failed to update profile' }, { status: 500 })
  }

  // ── phase 2: insert application and mark onboarding complete ─────────────

  // insert into the correct application table, then mark onboarding complete
  if (memberType === 'ading') {
    const d = appParsed.data as z.infer<typeof adingApplicationSchema>

    // insert ading application row with status 'pending' for officer review
    const { error: adingError } = await admin
      .from('ading_applications')
      .insert({
        member_id: member.id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        instagram:                d.instagram ?? null,
        phone:                    d.phone ?? null,
        birthday:                 d.birthday ?? null,
        pronouns:                 d.pronouns ?? null,
        activity_level:           d.activity_level ?? null,
        hobbies:                  d.hobbies ?? null,
        fave_music_genre:         d.fave_music_genre ?? null,
        fave_artist:              d.fave_artist ?? null,
        fave_food:                d.fave_food ?? null,
        pam_vibe:                 d.pam_vibe ?? null,
        hangout_size_preference:  d.hangout_size_preference ?? null,
        fave_tv_show_movie:       d.fave_tv_show_movie ?? null,
        availability:             d.availability ?? null,
        thoughts_on_drinking:     d.thoughts_on_drinking ?? null,
        dislikes:                 d.dislikes ?? null,
        pam_dealbreakers:         d.pam_dealbreakers ?? null,
        pam_incompatibilities:    d.pam_incompatibilities ?? null,
        future_kuyate:            d.future_kuyate ?? null,
        mbti:                     d.mbti ?? null,
        additional_notes:         d.additional_notes ?? null,
      })

    if (adingError) {
      console.error('[onboarding submit] ading insert error:', adingError)
      // profile data was saved but application failed — leave onboarding_complete false so they can retry
      return NextResponse.json({ error: 'failed to submit ading application' }, { status: 500 })
    }

    // application saved — now mark onboarding complete and set member_type
    const { error: completeError } = await admin
      .from('members')
      .update({ onboarding_complete: true, member_type: 'ading' })
      .eq('id', member.id)
    if (completeError) console.error('[onboarding submit] ading complete update error:', completeError)
  } else {
    const d = appParsed.data as z.infer<typeof kuyateApplicationSchema>

    // insert kuyate application row with status 'pending' for officer review
    const { error: kuyateError } = await admin
      .from('kuyate_applications')
      .insert({
        member_id: member.id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        additional_notes:           d.additional_notes ?? null,
        instagram:                  d.instagram ?? null,
        pamilya_name:               d.pamilya_name ?? null,
        wants_to_be_pam_head:       d.wants_to_be_pam_head,
        // only store pam_head_phone when they're applying to be pam head
        pam_head_phone:             d.wants_to_be_pam_head ? (d.pam_head_phone ?? null) : null,
        why_kuyate:                 d.why_kuyate,
        acknowledges_responsibilities: d.acknowledges_responsibilities,
      })

    if (kuyateError) {
      console.error('[onboarding submit] kuyate insert error:', kuyateError)
      // profile data was saved but application failed — leave onboarding_complete false so they can retry
      return NextResponse.json({ error: 'failed to submit kuyate application' }, { status: 500 })
    }

    // application saved — now mark onboarding complete and set member_type
    const { error: completeError } = await admin
      .from('members')
      .update({ onboarding_complete: true, member_type: 'kuyate' })
      .eq('id', member.id)
    if (completeError) console.error('[onboarding submit] kuyate complete update error:', completeError)
  }

  return NextResponse.json({ success: true })
}
