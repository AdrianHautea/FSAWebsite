// ── page.tsx (onboarding) ─────────────────────────────────
// server component: orchestrates the full onboarding entry flow
//
// data:  supabase admin — members table (select + update); getSettings — kuyateApplicationsOpen, membershipExpiry
// deps:  stripe (checkout.sessions.retrieve for race condition patch)
// notes: admin client is used to bypass rls for member_type + onboarding_complete updates.
//        handles three special cases before rendering: reapply, stripe race condition, and membership gate.

import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import OnboardingClient from './OnboardingClient'

interface Props {
  searchParams: Promise<{ session_id?: string; reapply?: string; type?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  // ============================================================
  // DATA — do not modify this section
  // authenticates the user, fetches the member row, and handles:
  //   - reapply flow: resets onboarding state for not_interested members
  //   - stripe race condition: verifies payment directly if webhook hasn't fired yet
  //   - gate: redirects unpaid members to /membership
  // ============================================================
  // session_id: stripe checkout session id passed back as ?session_id= after payment
  // reapply: ?reapply=true lets not_interested members re-enter the onboarding flow
  // type: ?type=ading|kuyate pre-selects the application type in the client
  const { session_id, reapply, type } = await searchParams

  // user client to validate the auth session; unauthenticated users redirect to login
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // auth check: no session → send to login
  if (!user) redirect('/login')

  // bypass rls — officer action, user client would be blocked for onboarding_complete + member_type updates
  const admin = createAdminClient()

  // supabase: members table — fetch all fields needed for the onboarding gate checks and client props
  const { data: member } = await admin
    .from('members')
    .select('id, first_name, last_name, phone, year, major, membership_status, onboarding_complete, role, member_type')
    .eq('email', user.email!)
    .maybeSingle()

  // auth check: member row missing → account not set up, send to login
  if (!member) redirect('/login')

  // reapply check runs before the onboarding_complete gate so not_interested members
  // can re-enter the flow without being immediately redirected to profile
  if (reapply === 'true') {
    if (member.member_type === 'not_interested') {
      // supabase: members table — reset onboarding state so the flow renders fresh
      // bypass rls — officer action, user client would be blocked
      await admin
        .from('members')
        .update({ onboarding_complete: false, member_type: null })
        .eq('id', member.id)
      // fall through to render onboarding normally
    }
    // if member_type is null or any other value, fall through
    // to render onboarding normally — do not redirect
  } else if (member.onboarding_complete) {
    // onboarding already finished — nothing left to do, send to profile
    redirect('/member/profile')
  }

  // stripe race condition patch: membership_status may still be 'pending' if the webhook
  // hasn't fired yet after a successful payment. if a session_id is present, verify directly
  // with stripe so the member isn't incorrectly blocked from onboarding.
  if (member.membership_status !== 'active' && session_id) {
    let stripeSession = null

    try {
      stripeSession = await stripe.checkout.sessions.retrieve(session_id)
    } catch (e) {
      // invalid or expired session id — fall through to the membership redirect below
    }

    if (stripeSession?.payment_status === 'paid') {
      // payment confirmed by stripe directly; activate membership now.
      // the stripe webhook will also fire and update, but this prevents a blank onboarding screen.
      const { membershipExpiry } = await getSettings()

      // supabase: members table — activate membership immediately after stripe confirms payment
      // bypass rls — officer action, user client would be blocked
      await admin
        .from('members')
        .update({
          membership_status: 'active',
          // iso string timestamp of when we verified the payment on our side
          payment_verified_at: new Date().toISOString(),
          payment_provider: 'stripe',
          stripe_checkout_session_id: stripeSession.id,
          stripe_payment_intent_id: stripeSession.payment_intent as string,
          amt_paid: stripeSession.amount_total,
          // expiry date sourced from site settings so it can be changed without a deploy
          membership_expires_at: membershipExpiry.toISOString(),
        })
        .eq('id', member.id)

      // fall through to render onboarding normally
    } else {
      // session_id present but payment not confirmed — send back to membership purchase
      redirect('/membership')
    }
  } else if (member.membership_status !== 'active' && !session_id) {
    // membership gate: no active membership and no stripe session — not supposed to be here
    redirect('/membership')
  }

  // fetch the kuyate applications flag from settings; passed to the client to conditionally show the kuyate option
  const { kuyateApplicationsOpen } = await getSettings()

  // ============================================================
  // UI — safe to restyle everything below this line
  // all styling lives in OnboardingClient — edit that file
  // ============================================================
  return (
    <OnboardingClient
      firstName={member.first_name}
      isKuyateOpen={kuyateApplicationsOpen}
      // only pass ading/kuyate as initialType; reject any other ?type= value
      initialType={(type === 'ading' || type === 'kuyate') ? type : null}
      existingProfile={{
        first_name: member.first_name ?? '',
        last_name: member.last_name ?? '',
        phone: member.phone ?? null,
        year: member.year ?? null,
        major: member.major ?? null,
      }}
    />
  )
}
