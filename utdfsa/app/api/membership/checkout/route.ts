// ── route.ts ─────────────────────────────────────────────
// POST /api/membership/checkout — create a Stripe checkout session for membership purchase
//
// data:  members, settings (earlyBirdDeadline, membershipPriceCents, membershipYear)
// deps:  stripe (checkout session)
// notes: early-bird pricing is applied when current time is before settings.earlyBirdDeadline;
//        price and expiry are read from the db at request time — never hardcoded
import { requireUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { getSettings } from '@/lib/settings'
import { isMembershipActive } from '@/lib/membership'
import { NextResponse } from 'next/server'
import { fail } from '@/lib/api-response'

export async function POST() {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================

  // ── auth check ───────────────────────────────────────────
  // returns 401 if no valid session — must be logged in to purchase
  const ctx = await requireUser()
  if (!ctx) return fail('Unauthorized', 401)
  const { supabase, user } = ctx

  // ── member lookup ─────────────────────────────────────────
  // respects rls — user client; verifies membership_status before proceeding
  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status, membership_expires_at, email, first_name, last_name')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return fail('Member not found', 404)
  }

  // block duplicate purchases — but only while the membership is effectively active;
  // an expired-by-date member must be able to re-purchase (the webhook re-stamps
  // status and a fresh expiry, which is what makes expiry self-healing)
  if (isMembershipActive(member)) {
    return fail('Already a member', 400)
  }

  // ── pricing ─────────────────────────────────────────────
  // fetch prices dynamically from the database
  let settings
  try {
    settings = await getSettings()
  } catch (err) {
    console.error('[membership/checkout] getSettings failed:', err)
    return fail('Unable to load pricing. Please try again later.', 500)
  }
  // compare current server time against the early-bird deadline stored in settings
  const now = new Date()
  const isEarlyBird = now < settings.earlyBirdDeadline

  // select the correct price in cents based on early-bird eligibility
  const price = isEarlyBird
    ? settings.earlyBirdPriceCents
    : settings.membershipPriceCents

  const label = isEarlyBird
    ? `UTD FSA Membership ${settings.membershipYear} — Early Bird`
    : `UTD FSA Membership ${settings.membershipYear}`

  // ── stripe checkout ───────────────────────────────────────
  // creates a hosted checkout session; returns url to redirect the browser to
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
    // NEXT_PUBLIC_SITE_URL is the canonical origin (e.g. https://utdfsa.com)
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/membership`,
    metadata: {
      // stripe-webhook uses type + member_id to route the completed payment and update membership_status
      member_id: member.id,
      type: 'membership',
      is_early_bird: isEarlyBird.toString(),
    },
  })

  return NextResponse.json({ url: session.url })
}