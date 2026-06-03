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

  // calculate membership expiry based on stored month/day
  const now = new Date()
  const expiryMonth = parseInt(map.membership_expiry_month ?? '6') - 1
  const expiryDay = parseInt(map.membership_expiry_day ?? '30')
  const currentYear = now.getFullYear()

  // if we're already past the expiry month this year, push to next year
  const expiryYear = now.getMonth() > expiryMonth ? currentYear + 1 : currentYear
  const membershipExpiry = new Date(expiryYear, expiryMonth, expiryDay, 23, 59, 59)

  return {
    membershipPriceCents: parseInt(map.membership_price_cents ?? '3500'),
    earlyBirdPriceCents: parseInt(map.membership_early_bird_price_cents ?? '3000'),
    earlyBirdDeadline: new Date(map.membership_early_bird_deadline ?? '2025-09-15'),
    membershipYear: map.membership_year ?? '2025-2026',
    membershipExpiry,
    // kuyate applications flag — stored as the string 'true' in the settings table
    kuyateApplicationsOpen: map.kuyate_applications_open === 'true',
    kuyateDeadline: map.kuyate_deadline ? new Date(map.kuyate_deadline) : null,
  }
}