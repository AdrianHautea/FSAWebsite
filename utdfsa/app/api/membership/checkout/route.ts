import { createUserClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { getSettings } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function POST() {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status, email, first_name, last_name')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (member.membership_status === 'active') {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 })
  }

  // fetch prices dynamically from the database
  const settings = await getSettings()
  const now = new Date()
  const isEarlyBird = now < settings.earlyBirdDeadline

  const price = isEarlyBird
    ? settings.earlyBirdPriceCents
    : settings.membershipPriceCents

  const label = isEarlyBird
    ? `UTD FSA Membership ${settings.membershipYear} — Early Bird`
    : `UTD FSA Membership ${settings.membershipYear}`

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: user.email!,
    customer_creation: 'always',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: label,
          description: isEarlyBird
            ? 'UTD FSA Membership: Early Bird Rate — Thank you for signing up early!'
            : 'UTD FSA Membership for the current academic year',
        },
        unit_amount: price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/membership`,
    metadata: {
      member_id: member.id,
      type: 'membership',
      is_early_bird: isEarlyBird.toString(),
    },
  })

  return NextResponse.json({ url: session.url })
}