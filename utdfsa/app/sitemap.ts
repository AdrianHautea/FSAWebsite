// ── sitemap.ts ────────────────────────────────────────────────
// Next.js metadata-file convention — auto-served at /sitemap.xml
// lists every public route individually (including goodphil subpages);
// robots.txt only needs to Allow the parent paths, so its list is shorter —
// the two are not meant to match 1:1
// ─────────────────────────────────────────────────────────────
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.utdfsa.org'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '', '/about', '/events', '/pamilyas', '/archives', '/membership',
    '/goodphil/about', '/goodphil/cultural', '/goodphil/modern',
    '/goodphil/spirit', '/goodphil/sports', '/privacy', '/terms',
  ]
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: route === '/events' ? 'daily' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }))
}
