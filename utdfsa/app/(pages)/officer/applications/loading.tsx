export default function ApplicationsLoading() {
  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto animate-pulse">

        {/* Tab strip */}
        <div className="flex gap-1 mb-8">
          <div className="h-9 w-24 bg-white/[0.08] rounded-xl" />
          <div className="h-9 w-24 bg-white/[0.08] rounded-xl" />
        </div>

        {/* Search + action row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="h-9 w-56 bg-white/[0.06] rounded-xl" />
          <div className="h-9 w-24 bg-white/[0.06] rounded-xl" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-8 bg-white/[0.06] rounded-lg" />
            <div className="h-8 w-8 bg-white/[0.06] rounded-lg" />
          </div>
        </div>

        {/* Application card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-white/[0.06] bg-[#121212] flex flex-col justify-end p-5 gap-2"
            >
              <div className="h-4 w-3/4 bg-white/[0.07] rounded" />
              <div className="h-3 w-1/2 bg-white/[0.05] rounded" />
              <div className="h-3 w-1/3 bg-white/[0.05] rounded" />
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
