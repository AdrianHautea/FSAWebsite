// ── page.tsx ──────────────────────────────────────────────
// server shell — exports metadata, then mounts GoodphilSpiritClient
// (see app/(pages)/goodphil/about/page.tsx for why this wrapper exists)
// ──────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Goodphil — Spirit',
  description: 'Meet UTD FSA\'s spirit squad, bringing school spirit and hype to Goodphil, the annual Filipino cultural competition.',
  alternates: { canonical: '/goodphil/spirit' },
  openGraph: { images: [{ url: '/og/goodphil-spirit.jpg', width: 1200, height: 630 }] },
}

import GoodphilSpiritClient from './GoodphilSpiritClient'

export default function GoodphilSpiritPage() {
  return <GoodphilSpiritClient />
}
