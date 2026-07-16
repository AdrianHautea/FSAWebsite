// ── page.tsx ─────────────────────────────────────────────────
// about page server component — thin shell that mounts AboutClient
//
// data:  none — no database queries; all data is static in AboutClient
// notes: officer photos not yet available — placeholder silhouettes used;
//        replace placeholder divs with Next.js Image when photos are ready;
//        update social link hrefs and past officer data in AboutClient each semester
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'About Us',
  description: 'Meet the officers and mission behind UTD FSA, the Filipino Student Association at The University of Texas at Dallas, uniting Filipino-American students through culture and community.',
  alternates: { canonical: '/about' },
  openGraph: { images: [{ url: '/og/about.jpg', width: 1200, height: 630 }] },
}

import AboutClient from './AboutClient'

export default function AboutPage() {
  return <AboutClient />
}
