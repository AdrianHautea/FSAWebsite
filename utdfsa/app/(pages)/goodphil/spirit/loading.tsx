export default function SpiritLoading() {
  return (
    <div className="bg-section-bg text-white overflow-x-hidden animate-pulse">

      {/* Hero skeleton */}
      <div className="w-full h-[600px] bg-gray-800" />

      {/* What Is section skeleton */}
      <div className="py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="h-8 w-72 bg-gray-700 rounded-lg" />
          <div className="h-5 w-full max-w-xl bg-gray-700 rounded" />
          <div className="h-5 w-full max-w-xl bg-gray-700 rounded" />
          <div className="h-5 w-3/4 bg-gray-700 rounded" />
        </div>
      </div>

      {/* Past Performances skeleton — navy bg matches page */}
      <div className="bg-[#1a3461] py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-12">
          <div className="h-14 w-80 bg-[#1e3d74] rounded-lg mx-auto" />
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col gap-4">
              <div className="h-6 w-56 bg-[#1e3d74] rounded mx-auto" />
              <div className="h-64 bg-[rgba(255,255,255,0.2)] rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA section skeleton — white card (Spirit has no logo, just a text card) */}
      <div className="py-16 px-6 md:px-8">
        <div className="max-w-[956px] mx-auto">
          <div className="max-w-2xl mx-auto h-[140px] rounded-[70px] bg-white/[0.08]" />
        </div>
      </div>

    </div>
  )
}
