import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import OnboardingClient from './OnboardingClient'

interface Props {
  searchParams: Promise<{ session_id?: string; reapply?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { session_id, reapply } = await searchParams

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('id, first_name, membership_status, onboarding_complete, role, member_type')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) redirect('/login')

  // handle reapply before the onboarding_complete gate so not_interested members
  // can re-enter the flow without being immediately redirected to profile
  if (reapply === 'true') {
    if (member.member_type === 'not_interested') {
      // reset so they can go through onboarding again
      await admin
        .from('members')
        .update({ onboarding_complete: false, member_type: null })
        .eq('id', member.id)
      // fall through to render onboarding normally
    } else {
      // already applied as ading or kuyate — do not allow reapply
      redirect('/member/profile')
    }
  } else if (member.onboarding_complete) {
    // already done — nothing to do here
    redirect('/member/profile')
  }

  // if membership is still pending but we have a session_id from stripe,
  // verify directly with stripe — this handles the race condition where
  // the webhook hasn't fired yet but the payment actually succeeded
  if (member.membership_status !== 'active' && session_id) {
    let stripeSession = null

    try {
      stripeSession = await stripe.checkout.sessions.retrieve(session_id)
    } catch (e) {
      // invalid session id — fall through to redirect below
    }

    if (stripeSession?.payment_status === 'paid') {
      // payment confirmed by stripe directly — update immediately
      // the webhook will also fire and update, but this handles the race
      const { membershipExpiry } = await getSettings()

      await admin
        .from('members')
        .update({
          membership_status: 'active',
          payment_verified_at: new Date().toISOString(),
          payment_provider: 'stripe',
          stripe_checkout_session_id: stripeSession.id,
          stripe_payment_intent_id: stripeSession.payment_intent as string,
          amt_paid: stripeSession.amount_total,
          membership_expires_at: membershipExpiry.toISOString(),
        })
        .eq('id', member.id)

      // fall through to render onboarding normally
    } else {
      // no valid session and not paid — send back to membership
      redirect('/membership')
    }
  } else if (member.membership_status !== 'active' && !session_id) {
    // no session id and not paid — not supposed to be here
    redirect('/membership')
  }

  const { kuyateApplicationsOpen } = await getSettings()

  return (
    <OnboardingClient
      memberId={member.id}
      firstName={member.first_name}
      isKuyateOpen={kuyateApplicationsOpen}
    />
  )
}
