// ── page.tsx ──────────────────────────────────────────────
// server shell — exports metadata, then mounts GoodphilCulturalClient
// (see app/(pages)/goodphil/about/page.tsx for why this wrapper exists)
// ──────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Goodphil — Cultural',
  description: 'Meet UTD Pamana, the cultural dance team representing UTD FSA at Goodphil, the annual Filipino cultural competition.',
  alternates: { canonical: '/goodphil/cultural' },
  openGraph: { images: [{ url: '/og/goodphil-cultural.jpg', width: 1200, height: 630 }] },
}

import GoodphilCulturalClient from './GoodphilCulturalClient'

export default function GoodphilCulturalPage() {
  return <GoodphilCulturalClient />
}
