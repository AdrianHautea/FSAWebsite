// ── lib/settings.ts ───────────────────────────────────────
// reads business configuration from the settings table in supabase
// all prices, deadlines, and toggles should live here not in env vars
// throws an error if required keys are missing — check the settings table if this throws
//
// data:  settings (key, value)
// deps:  createAdminClient (bypasses rls — settings table is officer-managed)

import { createAdminClient } from '@/utils/supabase/server'

// ── settings loader ───────────────────────────────────────

export async function getSettings() {
  // bypass rls — officer action, user client would be blocked
  const supabase = createAdminClient()

  // fetch all key/value rows from the settings table
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error || !data) {
    throw new Error('failed to load settings')
  }

  // flatten rows into a plain object for easy key access
  const map = Object.fromEntries(data.map(row => [row.key, row.value]))

  // required keys — throw explicitly so a misconfigured db surfaces immediately
  if (!map.membership_price_cents) throw new Error('settings: membership_price_cents not found in database')
  if (!map.membership_early_bird_price_cents) throw new Error('settings: membership_early_bird_price_cents not found in database')
  if (!map.membership_early_bird_deadline) throw new Error('settings: membership_early_bird_deadline not found in database')
  if (!map.membership_year) throw new Error('settings: membership_year not found in database')

  // ── membership expiry date arithmetic ──────────────────

  // calculate membership expiry based on stored month/day
  const now = new Date()
  // month from db is 1-indexed; Date constructor expects 0-indexed
  const expiryMonth = parseInt(map.membership_expiry_month ?? '6') - 1
  const expiryDay = parseInt(map.membership_expiry_day ?? '30')
  const currentYear = now.getFullYear()

  // if we're already past the expiry month this year, push to next year
  const expiryYear = now.getMonth() > expiryMonth ? currentYear + 1 : currentYear
  // set expiry to end-of-day (23:59:59) so the full day counts as valid
  const membershipExpiry = new Date(expiryYear, expiryMonth, expiryDay, 23, 59, 59)

  return {
    membershipPriceCents: parseInt(map.membership_price_cents),
    earlyBirdPriceCents: parseInt(map.membership_early_bird_price_cents),
    earlyBirdDeadline: new Date(map.membership_early_bird_deadline),
    membershipYear: map.membership_year,
    membershipExpiry,
    kuyateDeadline: map.kuyate_deadline ? new Date(map.kuyate_deadline) : null,
    // kuyate applications flag — false if the flag is 'false' OR the deadline has already passed
    kuyateApplicationsOpen: (map.kuyate_applications_open === 'true') &&
      (!map.kuyate_deadline || new Date() < new Date(map.kuyate_deadline)),
    // false if key is missing — safe default hides pamilya until explicitly revealed
    pamilyaRevealActive: (map.pamilya_reveal_active ?? 'false') === 'true',
  }
}