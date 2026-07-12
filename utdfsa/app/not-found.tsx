// ── not-found.tsx ─────────────────────────────────────────
// custom 404 — night-market styling instead of the default next.js screen.
//
// notes: navbar/footer come from the root layout's SiteChrome automatically.
//        server component, no data — safe to restyle freely.
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-brand-bg px-6 text-center">
      <p
        className="font-display font-black text-accent-green leading-none"
        style={{
          fontSize: 'clamp(5rem, 18vw, 11rem)',
          letterSpacing: '-0.02em',
          animation: 'fadeUp 0.5s var(--ease-smooth) both',
        }}
      >
        404
      </p>
      <h1
        className="font-display font-bold text-white text-xl sm:text-2xl mt-4 mb-3"
        style={{ animation: 'fadeUp 0.5s var(--ease-smooth) 100ms both' }}
      >
        This page wandered off
      </h1>
      <p
        className="text-[#8c8c8c] max-w-md mb-8"
        style={{ animation: 'fadeUp 0.5s var(--ease-smooth) 180ms both' }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div
        className="flex flex-wrap items-center justify-center gap-3"
        style={{ animation: 'fadeUp 0.5s var(--ease-smooth) 260ms both' }}
      >
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-accent-green text-[#0e0e0e] font-semibold hover:brightness-[1.08] active:scale-[0.98] transition-all"
        >
          Back to home
        </Link>
        <Link
          href="/events"
          className="px-6 py-3 rounded-xl border border-white/16 text-white font-semibold hover:bg-white/6 transition-colors"
        >
          See events
        </Link>
      </div>
    </main>
  )
}
