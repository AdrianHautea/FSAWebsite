import { NextResponse } from 'next/server'
import { createUserClient, createAdminClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createUserClient()
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user
  const admin = createAdminClient()

  // check if a member row exists already
  const { data: existingMember } = await admin
    .from('members')
    .select('id, membership_status, onboarding_complete, role')
    .eq('email', user.email!)
    .maybeSingle()

  let member = existingMember

  // first time signing in — create the member row
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
      })
      .select('id, membership_status, onboarding_complete, role')
      .single()

    member = newMember
  }

  // if a ?next param was passed and it's a safe internal path, honor it
  // but only for paid members — unpaid members always go to /membership first
  const isSafeNext = next && next.startsWith('/')

  // officers skip payment entirely
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