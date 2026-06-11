// singleton stripe client — import { stripe } from '@/lib/stripe' wherever stripe is needed
// the api version is pinned — do not change without testing all stripe integrations

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})