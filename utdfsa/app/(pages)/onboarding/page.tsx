import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { session_id } = await searchParams

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('id, first_name, membership_status, onboarding_complete, role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) redirect('/login')

  // officers skip onboarding entirely
  if (member.role === 'officer' || member.role === 'admin') {
    redirect('/member/profile')
  }

  // already done — nothing to do here
  if (member.onboarding_complete) {
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
      const { membershipExpiry } = await import('@/lib/settings')
        .then(m => m.getSettings())

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

  return (
    <OnboardingClient
      memberId={member.id}
      firstName={member.first_name}
    />
  )
}