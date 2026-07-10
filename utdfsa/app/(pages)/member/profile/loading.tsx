// ── loading.tsx ───────────────────────────────────────────────
// skeleton screen shown by next.js while ProfilePage fetches data
//
// notes: mirrors the layout of profile/page.tsx (avatar, membership,
//        points + progress bars, personal info) — update both if the
//        page structure changes
export default function ProfileLoading() {
  return (
    <main className="bg-brand-bg min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">

        {/* Title skeleton */}
        <div className="h-10 w-64 bg-gray-800 rounded-lg mb-10" />

        {/* Avatar and name skeleton */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-full bg-gray-800 shrink-0" />
          <div>
            <div className="h-5 w-40 bg-gray-800 rounded mb-2" />
            <div className="h-3 w-48 bg-gray-800 rounded" />
          </div>
        </div>

        {/* Membership status skeleton */}
        <section
          className="mb-4 p-6 rounded-2xl"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="h-3 w-28 bg-gray-800 rounded mb-4" />
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-14 bg-gray-800 rounded" />
              <div className="h-3 w-20 bg-gray-800 rounded" />
            </div>
            <div className="w-full h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <div className="h-3 w-10 bg-gray-800 rounded" />
              <div className="h-3 w-24 bg-gray-800 rounded" />
            </div>
          </div>
        </section>

        {/* Points skeleton */}
        <section
          className="mb-4 p-6 rounded-2xl"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="h-3 w-16 bg-gray-800 rounded mb-4" />
          <div className="h-12 w-20 bg-gray-800 rounded-lg mb-2" />
          <div className="h-3 w-52 bg-gray-800 rounded mb-6" />

          {/* Progress bars skeleton */}
          <div className="border-t border-white/10 pt-5">
            <div className="h-3 w-40 bg-gray-800 rounded mb-4" />

            <div className="mb-5">
              <div className="flex justify-between mb-1.5">
                <div className="h-3 w-36 bg-gray-800 rounded" />
                <div className="h-3 w-10 bg-gray-800 rounded" />
              </div>
              <div className="h-2 rounded-full bg-gray-800" />
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <div className="h-3 w-32 bg-gray-800 rounded" />
                <div className="h-3 w-10 bg-gray-800 rounded" />
              </div>
              <div className="h-2 rounded-full bg-gray-800" />
              <div className="h-3 w-40 bg-gray-800 rounded mt-1.5" />
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="h-4 w-36 bg-gray-800 rounded" />
            </div>
          </div>
        </section>

        {/* Personal info skeleton */}
        <section
          className="mb-4 p-6 rounded-2xl"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="h-3 w-28 bg-gray-800 rounded mb-4" />
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="h-3 w-24 bg-gray-800 rounded mb-2" />
                <div className="h-3 w-56 bg-gray-800 rounded" />
              </div>
              <div className="h-3 w-32 bg-gray-800 rounded shrink-0" />
            </div>
            <div className="w-full h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <div className="h-3 w-14 bg-gray-800 rounded" />
              <div className="h-3 w-24 bg-gray-800 rounded" />
            </div>
          </div>
        </section>

        {/* Edit profile link skeleton */}
        <div className="h-4 w-28 bg-gray-800 rounded mt-2" />

      </div>
    </main>
  )
}
