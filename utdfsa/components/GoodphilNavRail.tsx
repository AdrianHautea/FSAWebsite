// ── GoodphilNavRail.tsx ───────────────────────────────────
// sibling-page quick nav for the Goodphil cluster (about/spirit/cultural/
// modern/sports). The cluster is hub-and-spoke — only /goodphil/about links
// out to the other four — so landing on a team page otherwise has no way
// back or across without the navbar dropdown. This rail is that escape hatch.

import QuickNavRail from '@/components/QuickNavRail'

const GOODPHIL_PAGES = [
  { label: 'About',    href: '/goodphil/about' },
  { label: 'Spirit',   href: '/goodphil/spirit' },
  { label: 'Cultural', href: '/goodphil/cultural' },
  { label: 'Modern',   href: '/goodphil/modern' },
  { label: 'Sports',   href: '/goodphil/sports' },
]

export default function GoodphilNavRail() {
  return <QuickNavRail mode="pages" ariaLabel="Goodphil team pages" items={GOODPHIL_PAGES} />
}
