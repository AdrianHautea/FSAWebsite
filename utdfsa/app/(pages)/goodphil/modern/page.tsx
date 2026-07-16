// ── page.tsx ──────────────────────────────────────────────
// server shell — exports metadata, then mounts GoodphilModernClient
// (see app/(pages)/goodphil/about/page.tsx for why this wrapper exists)
// ──────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Goodphil — Modern',
  description: 'Meet UTD Maharlika, the modern dance team representing UTD FSA at Goodphil, the annual Filipino cultural competition.',
  alternates: { canonical: '/goodphil/modern' },
  openGraph: { images: [{ url: '/og/goodphil-modern.jpg', width: 1200, height: 630 }] },
}

import GoodphilModernClient from './GoodphilModernClient'

export default function GoodphilModernPage() {
  return <GoodphilModernClient />
}
