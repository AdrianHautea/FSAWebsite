import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error -- stripe package types don't include this version string yet
  // but it is the version reported by the stripe cli and dashboard
  apiVersion: '2026-04-22.dahlia',
})