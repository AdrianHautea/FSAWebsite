// reads business configuration from the settings table in supabase
// all prices, deadlines, and toggles should live here not in env vars
// throws an error if required keys are missing — check the settings table if this throws

import { createAdminClient } from '@/utils/supabase/server'

export async function getSettings() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error || !data) {
    throw new Error('failed to load settings')
  }

  const map = Object.fromEntries(data.map(row => [row.key, row.value]))

  // required keys — throw explicitly so a misconfigured db surfaces immediately
  if (!map.membership_price_cents) throw new Error('settings: membership_price_cents not found in database')
  if (!map.membership_early_bird_price_cents) throw new Error('settings: membership_early_bird_price_cents not found in database')
  if (!map.membership_early_bird_deadline) throw new Error('settings: membership_early_bird_deadline not found in database')
  if (!map.membership_year) throw new Error('settings: membership_year not found in database')

  // calculate membership expiry based on stored month/day
  const now = new Date()
  const expiryMonth = parseInt(map.membership_expiry_month ?? '6') - 1
  const expiryDay = parseInt(map.membership_expiry_day ?? '30')
  const currentYear = now.getFullYear()

  // if we're already past the expiry month this year, push to next year
  const expiryYear = now.getMonth() > expiryMonth ? currentYear + 1 : currentYear
  const membershipExpiry = new Date(expiryYear, expiryMonth, expiryDay, 23, 59, 59)

  return {
    membershipPriceCents: parseInt(map.membership_price_cents),
    earlyBirdPriceCents: parseInt(map.membership_early_bird_price_cents),
    earlyBirdDeadline: new Date(map.membership_early_bird_deadline),
    membershipYear: map.membership_year,
    membershipExpiry,
    // kuyate applications flag — false if the flag is 'false' OR the deadline has already passed
    kuyateDeadline: map.kuyate_deadline ? new Date(map.kuyate_deadline) : null,
    kuyateApplicationsOpen: (map.kuyate_applications_open === 'true') &&
      (!map.kuyate_deadline || new Date() < new Date(map.kuyate_deadline)),
  }
}