// ── page.tsx ──────────────────────────────────────────────
// server shell — exports metadata, then mounts GoodphilAboutClient
// (moved here from GoodphilAboutClient.tsx: metadata can't be
// exported from a 'use client' file, so every goodphil subpage
// needs this thin server wrapper to get a unique title/description)
// ──────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Goodphil',
  description: 'Goodphil is UTD FSA\'s annual Filipino cultural competition against UTA, UTSA, UH, TAMU, and UT, featuring cultural, modern, spirit, and sports categories.',
  alternates: { canonical: '/goodphil/about' },
  openGraph: { images: [{ url: '/og/goodphil-about.jpg', width: 1200, height: 630 }] },
}

import GoodphilAboutClient from './GoodphilAboutClient'

export default function GoodphilAboutPage() {
  return <GoodphilAboutClient />
}
