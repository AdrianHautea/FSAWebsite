// ── lib/membership.ts ─────────────────────────────────────
// single definition of "effectively active" membership.
//
// notes: membership_status alone is not authoritative — the stripe webhook
//        stamps membership_expires_at but nothing flips status to 'expired'
//        automatically. every access gate must use this helper so expired
//        members lose member pricing/routes and can re-purchase (the checkout
//        route's "already a member" block also uses this, which is what makes
//        expiry self-healing). pure function — safe to import from middleware.
//        the goodphil_eligibility db view duplicates this predicate in sql;
//        if the rule changes, update both.

export function isMembershipActive(m: {
  membership_status: string | null
  membership_expires_at: string | null
} | null): boolean {
  if (!m || m.membership_status !== 'active') return false
  // legacy rows without an expiry stay active
  if (!m.membership_expires_at) return true
  return new Date(m.membership_expires_at) > new Date()
}
