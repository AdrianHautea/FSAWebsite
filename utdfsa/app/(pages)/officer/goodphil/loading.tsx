const HEADER_WIDTHS = ['w-32', 'w-48', 'w-16', 'w-24', 'w-24', 'w-28']
const ROW_WIDTHS    = ['w-28', 'w-40', 'w-12', 'w-20', 'w-20', 'w-24']

export default function GoodphilLoading() {
  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto animate-pulse">

        {/* Title + export button row */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="h-7 w-64 bg-white/[0.08] rounded" />
          <div className="h-9 w-36 bg-white/[0.06] rounded-xl" />
        </div>

        {/* Search row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-64 bg-white/[0.06] rounded-xl" />
        </div>

        {/* Data table */}
        <div className="rounded-[18px] border border-white/[0.08] bg-[#121212] overflow-hidden">
          <div className="flex gap-6 px-5 py-3 border-b border-white/[0.06]">
            {HEADER_WIDTHS.map((w, i) => (
              <div key={i} className={`h-3.5 ${w} bg-white/[0.08] rounded`} />
            ))}
          </div>
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-6 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                {ROW_WIDTHS.map((w, j) => (
                  <div key={j} className={`h-3.5 ${w} bg-white/[0.05] rounded`} />
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
