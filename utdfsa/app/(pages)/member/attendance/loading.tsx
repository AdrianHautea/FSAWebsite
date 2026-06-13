export default function AttendanceLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      {/* Title skeleton */}
      <div className="h-7 w-52 bg-gray-800 rounded-lg mb-2" />
      <div className="h-4 w-64 bg-gray-800 rounded mb-8" />

      {/* Points summary card skeleton */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Big number + badge */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="h-12 w-16 bg-gray-800 rounded-lg mb-2" />
            <div className="h-3 w-20 bg-gray-800 rounded" />
          </div>
          <div className="h-7 w-36 bg-gray-800 rounded-full" />
        </div>

        {/* Progress bar 1 */}
        <div className="mb-5">
          <div className="flex justify-between mb-1.5">
            <div className="h-3 w-28 bg-gray-800 rounded" />
            <div className="h-3 w-20 bg-gray-800 rounded" />
          </div>
          <div className="h-2 rounded-full bg-gray-800" />
        </div>

        {/* Progress bar 2 */}
        <div>
          <div className="flex justify-between mb-1.5">
            <div className="h-3 w-32 bg-gray-800 rounded" />
            <div className="h-3 w-20 bg-gray-800 rounded" />
          </div>
          <div className="h-2 rounded-full bg-gray-800" />
          <div className="h-3 w-48 bg-gray-800 rounded mt-1.5" />
        </div>
      </div>

      {/* List label */}
      <div className="h-3 w-24 bg-gray-800 rounded mb-4" />

      {/* List rows */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="px-4 py-3.5 flex items-center gap-3"
            style={{
              background: i % 2 === 0 ? '#1a1a1a' : '#1c1c1c',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <div className="rounded-full bg-gray-700 shrink-0" style={{ width: 8, height: 8 }} />
            <div className="flex-1">
              <div className="h-4 w-40 bg-gray-800 rounded mb-1.5" />
              <div className="h-3 w-24 bg-gray-800 rounded" />
            </div>
            <div className="text-right">
              <div className="h-3 w-20 bg-gray-800 rounded mb-1.5" />
              <div className="h-3 w-12 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
