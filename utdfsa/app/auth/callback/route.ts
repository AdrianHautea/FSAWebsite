// ── route.ts (auth/callback) ──────────────────────────────────────────────────
// supabase oauth callback — exchanges code for session and routes the user.
//
// data:  members (insert on first sign-in, read on subsequent sign-ins)
// notes: public endpoint — called by supabase redirect after google oauth completes.
//        provisions a members row on first sign-in using oauth metadata.
//        routing priority: officer/admin → ?next or /member/profile;
//          unpaid → /membership; onboarding pending → /onboarding;
//          fully set up → ?next or /member/profile.
//        ?next param is honored only for paid/officer users (safe internal paths only).

// route: GET /auth/callback
// purpose: exchanges the oauth code for a session, provisions a member row on first sign-in, then routes to the right destination based on membership and onboarding status
// auth: public — called by supabase oauth redirect, no session exists yet
// calls: supabase (auth + members table)

import { NextResponse } from 'next/server'
import { createUserClient, createAdminClient } from '@/utils/supabase/server'

// ── GET /auth/callback ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  // code is the pkce auth code supabase appended to the redirect url
  const code = searchParams.get('code')
  // next is an optional deep-link destination passed through the oauth flow
  const next = searchParams.get('next')

  // missing code means oauth failed or user denied access — redirect to login with error
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // exchange the pkce code for a supabase session (sets auth cookies)
  const supabase = await createUserClient()
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  // failed exchange — redirect to login with error
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user
  // bypass rls — need to insert/read members regardless of their current row state
  const admin = createAdminClient()

  // ── member provisioning ───────────────────────────────────────────────────

  // check if a member row exists already
  const { data: existingMember } = await admin
    .from('members')
    .select('id, membership_status, onboarding_complete, role')
    .eq('email', user.email!)
    .maybeSingle()

  let member = existingMember

  // first time signing in — create the member row from oauth metadata
  if (!member) {
    const firstName = user.user_metadata?.given_name
      ?? user.user_metadata?.full_name?.split(' ')[0]
      ?? ''
    const lastName = user.user_metadata?.family_name
      ?? user.user_metadata?.full_name?.split(' ').slice(1).join(' ')
      ?? ''

    const { data: newMember } = await admin
      .from('members')
      .insert({
        email: user.email!,
        first_name: firstName,
        last_name: lastName,
        role: 'member',
        membership_status: 'pending',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        contact_email: user.email!,
      })
      .select('id, membership_status, onboarding_complete, role')
      .single()

    member = newMember
  }

  // ── routing ───────────────────────────────────────────────────────────────

  // if a ?next param was passed and it's a safe internal path, honor it
  // but only for paid members — unpaid members always go to /membership first
  // startsWith('/') but NOT '//' — protocol-relative URLs like //evil.com start with / and would be an open redirect
  const isSafeNext = next && next.startsWith('/') && !next.startsWith('//')

  // officers skip payment entirely — they always have access
  if (member?.role === 'officer' || member?.role === 'admin') {
    return NextResponse.redirect(`${origin}${isSafeNext ? next : '/member/profile'}`)
  }

  // unpaid — always send to membership page regardless of ?next
  if (member?.membership_status !== 'active') {
    return NextResponse.redirect(`${origin}/membership`)
  }

  // paid but onboarding not done — send to onboarding
  if (!member?.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // fully set up — send to intended destination or profile
  return NextResponse.redirect(`${origin}${isSafeNext ? next : '/member/profile'}`)
}