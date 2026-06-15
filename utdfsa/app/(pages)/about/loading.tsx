export default function AboutLoading() {
  return (
    <main className="bg-brand-bg text-white overflow-x-hidden">

      {/* Title + paragraph skeletons */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="h-8 w-40 rounded bg-gray-800 animate-pulse mx-auto" />
          <div className="h-4 w-2/3 rounded bg-gray-800 animate-pulse mx-auto" />
          <div className="h-4 w-1/2 rounded bg-gray-800 animate-pulse mx-auto" />
        </div>
      </section>

      {/* Officer grid skeletons */}
      <section className="py-16 px-6 bg-section-bg">
        <div className="max-w-6xl mx-auto">
          <div className="h-6 w-64 rounded bg-gray-800 animate-pulse mx-auto mb-12" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-gray-800 animate-pulse">
                <div className="aspect-square" />
                <div className="px-4 py-3 flex flex-col gap-2">
                  <div className="h-3 w-16 rounded bg-gray-700" />
                  <div className="h-4 w-24 rounded bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accordion skeletons */}
      <section className="py-16 px-6 bg-brand-bg">
        <div className="max-w-4xl mx-auto">
          <div className="h-6 w-52 rounded bg-gray-800 animate-pulse mx-auto mb-10" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
