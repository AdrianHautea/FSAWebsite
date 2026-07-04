// ── sitemap.ts ────────────────────────────────────────────────
// Next.js metadata-file convention — auto-served at /sitemap.xml
// route list mirrors public/robots.txt's Allow list; keep the two in sync
// ─────────────────────────────────────────────────────────────
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.utdfsa.org'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '', '/about', '/events', '/pamilyas', '/archives', '/membership',
    '/goodphil', '/goodphil/about', '/goodphil/cultural', '/goodphil/modern',
    '/goodphil/spirit', '/goodphil/sports',
  ]
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/events' ? 'daily' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }))
}
