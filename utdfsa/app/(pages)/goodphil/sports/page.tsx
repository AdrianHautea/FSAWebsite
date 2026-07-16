// ── page.tsx ──────────────────────────────────────────────
// server shell — exports metadata, then mounts GoodphilSportsClient
// (see app/(pages)/goodphil/about/page.tsx for why this wrapper exists)
// ──────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Goodphil — Sports',
  description: 'Meet UTD FSA\'s Goodphil sports teams, competing across nine sports at the annual Filipino cultural competition against rival schools.',
  alternates: { canonical: '/goodphil/sports' },
  openGraph: { images: [{ url: '/og/goodphil-sports.jpg', width: 1200, height: 630 }] },
}

import GoodphilSportsClient from './GoodphilSportsClient'

export default function GoodphilSportsPage() {
  return <GoodphilSportsClient />
}
