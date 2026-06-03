import { getSettings } from '@/lib/settings'
import MembershipClient from './MembershipClient'

export default async function MembershipPage() {
  // ============================================================
  // DATA — do not modify this section
  // reads the settings table via getSettings() for:
  //   membershipPriceCents, earlyBirdPriceCents, earlyBirdDeadline, membershipYear
  // computes isEarlyBird by comparing now vs. earlyBirdDeadline
  // all values are forwarded as props to MembershipClient
  // ============================================================

  // fetch prices from the settings table
  const settings = await getSettings()

  const now = new Date()
  const isEarlyBird = now < settings.earlyBirdDeadline

  const displayPrice = isEarlyBird
    ? settings.earlyBirdPriceCents
    : settings.membershipPriceCents

  const regularPrice = settings.membershipPriceCents

  // ============================================================
  // UI — safe to restyle everything below this line
  // all styling lives in MembershipClient — edit that file
  // ============================================================
  return (
    <MembershipClient
      displayPrice={displayPrice}
      regularPrice={regularPrice}
      isEarlyBird={isEarlyBird}
      earlyBirdDeadline={settings.earlyBirdDeadline.toISOString()}
      membershipYear={settings.membershipYear}
    />
  )
}