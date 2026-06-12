export default function ArchivesLoading() {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Page header skeleton */}
      <div className="px-6 sm:px-10 lg:px-14 pt-14 pb-8">
        <div className="h-3 w-28 rounded bg-white/[0.06] animate-pulse mb-[18px]" />
        <div className="h-16 w-64 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-48 rounded bg-white/[0.05] animate-pulse mt-4" />
      </div>

      {/* Filter pills skeleton */}
      <div className="px-6 sm:px-10 lg:px-14 pb-7 flex items-center gap-2.5 flex-wrap">
        {[90, 96, 88, 80, 92].map((w, i) => (
          <div
            key={i}
            className="h-9 rounded-full bg-white/[0.06] animate-pulse"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="px-6 sm:px-10 lg:px-14 pb-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
