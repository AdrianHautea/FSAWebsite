import { getSettings } from '@/lib/settings'
import MembershipClient from './MembershipClient'

export default async function MembershipPage() {
  // fetch prices from the settings table
  const settings = await getSettings()

  const now = new Date()
  const isEarlyBird = now < settings.earlyBirdDeadline

  const displayPrice = isEarlyBird
    ? settings.earlyBirdPriceCents
    : settings.membershipPriceCents

  const regularPrice = settings.membershipPriceCents

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