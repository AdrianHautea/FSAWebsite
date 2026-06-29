// ── loading.tsx (events) ──────────────────────────────────
// next.js streaming loading skeleton for the /events page
//
// notes: rendered automatically by next.js while events/page.tsx suspends.
//        mirrors the real page's section order so layout doesn't shift on hydration.

export default function EventsLoading() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#0f0f0f' }}>
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-20">

        {/* Section 1 — Page title */}
        <div className="pt-14 pb-10">
          <div className="h-8 w-32 bg-gray-800 animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-gray-800 animate-pulse rounded" />
        </div>

        {/* Section 2 — This Week strip */}
        <div className="mb-2">
          <div className="h-4 w-24 bg-gray-800 animate-pulse rounded mb-3" />
          <div className="flex flex-row gap-3 overflow-hidden pb-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 w-56 bg-gray-800 animate-pulse rounded-xl flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Section 3 — All Events heading */}
        <div className="mt-10">
          <div className="h-6 w-32 bg-gray-800 animate-pulse rounded mb-4" />

          {/* Section 4 — Events grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i}>
                <div className="w-full bg-gray-800 animate-pulse rounded-xl" style={{ aspectRatio: '4/5' }} />
                <div className="h-4 w-3/4 bg-gray-800 animate-pulse rounded mt-3" />
                <div className="h-3 w-1/2 bg-gray-800 animate-pulse rounded mt-2" />
                <div className="h-5 w-20 bg-gray-800 animate-pulse rounded-full mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — Event Calendar heading */}
        <div className="mt-12">
          <div className="h-6 w-40 bg-gray-800 animate-pulse rounded mb-4" />

          {/* Section 6 — Calendar placeholder */}
          <div className="h-96 w-full bg-gray-800 animate-pulse rounded-xl" />
        </div>

      </div>
    </main>
  )
}
