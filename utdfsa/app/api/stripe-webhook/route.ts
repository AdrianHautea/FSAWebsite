import { stripe } from '@/lib/stripe'
import { getSettings } from '@/lib/settings'
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// tell Next.js not to parse the body — Stripe needs the raw bytes to verify signature
export const config = {
  api: { bodyParser: false },
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { type, member_id } = session.metadata ?? {}

    if (type === 'membership' && member_id) {
      const settings = await getSettings()

      await supabase
        .from('members')
        .update({
          membership_status: 'active',
          amt_paid: session.amount_total,
          payment_verified_at: new Date().toISOString(),
          payment_provider: 'stripe',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          membership_expires_at: settings.membershipExpiry.toISOString(),
          payment_method: session.payment_method_types?.[0] ?? 'card',
          payment_metadata: {
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email,
          },
        })
        .eq('id', member_id)
        }

    if (type === 'event_ticket' && member_id) {
      const { registration_id } = session.metadata ?? {}

      await supabase
        .from('event_registrations')
        .update({
          payment_status: 'paid',
          amt_paid: session.amount_total,
          payment_verified_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
        })
        .eq('id', registration_id)
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object
    const { type, registration_id } = session.metadata ?? {}

    // clean up expired unpaid event registrations
    if (type === 'event_ticket' && registration_id) {
      await supabase
        .from('event_registrations')
        .update({ payment_status: 'failed' })
        .eq('id', registration_id)
    }
  }

  return NextResponse.json({ received: true })
}