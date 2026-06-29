// ── loading.tsx ───────────────────────────────────────────
// skeleton shown by next.js while officer/gallery/page.tsx fetches gallery rows.

export default function OfficerGalleryLoading() {
  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-5xl mx-auto animate-pulse">

        {/* Title + new archive button */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-40 bg-white/[0.08] rounded" />
          <div className="h-10 w-36 bg-white/[0.06] rounded-xl" />
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              <div className="aspect-square bg-white/[0.07]" />
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="h-4 w-36 bg-white/[0.08] rounded" />
                <div className="h-3 w-24 bg-white/[0.05] rounded" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
