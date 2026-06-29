// ── loading.tsx ───────────────────────────────────────────
// skeleton shown by next.js while officer/events/page.tsx fetches event rows.

export default function OfficerEventsLoading() {
  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-5xl mx-auto animate-pulse">

        {/* Title + new event button */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-48 bg-white/[0.08] rounded" />
          <div className="h-10 w-36 bg-white/[0.06] rounded-xl" />
        </div>

        {/* Event list rows */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/[0.07] shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-48 bg-white/[0.08] rounded" />
                <div className="h-3 w-32 bg-white/[0.05] rounded" />
              </div>
              <div className="h-6 w-20 bg-white/[0.06] rounded-full" />
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
