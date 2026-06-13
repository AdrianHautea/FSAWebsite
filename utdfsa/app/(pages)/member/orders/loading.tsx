export default function OrdersLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      {/* Title skeleton */}
      <div className="h-7 w-44 bg-gray-800 rounded-lg mb-2" />
      <div className="h-4 w-64 bg-gray-800 rounded mb-8" />

      <div className="flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Header row */}
            <div className="p-4 flex items-center gap-4">
              {/* Thumbnail */}
              <div className="rounded-xl bg-gray-800 shrink-0" style={{ width: 72, height: 72 }} />
              {/* Text lines */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-48 bg-gray-800 rounded" />
                <div className="h-3 w-36 bg-gray-800 rounded" />
                <div className="h-3 w-28 bg-gray-800 rounded" />
              </div>
              {/* Badge */}
              <div className="h-6 w-14 bg-gray-800 rounded-full shrink-0" />
            </div>
            {/* Button skeleton */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />
            <div className="px-4 py-3">
              <div className="h-10 w-full bg-gray-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
