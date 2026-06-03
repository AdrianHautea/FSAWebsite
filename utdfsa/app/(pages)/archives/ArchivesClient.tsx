'use client'

import type { Gallery } from '@/types/database'

/**
 * Props — passed down from the ArchivesPage server component (archives/page.tsx)
 *   galleries — published Gallery rows fetched from Supabase, sorted by year then created_at
 */
interface Props {
  galleries: Gallery[]
}

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   galleries (Gallery[]) — each has: id, title, cover_photo_url,
//     google_photos_url, semester, year, description
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function ArchivesClient({ galleries }: Props) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-10">Photo Archives</h1>

      {/* only renders when there are no published galleries — do not remove this condition */}
      {galleries.length === 0 ? (
        <p className="text-center text-gray-500 py-20">No archives yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => (
            // route: gallery.google_photos_url — opens the Google Photos album in a new tab — do not change this path
            <a
              key={gallery.id}
              href={gallery.google_photos_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow"
            >
              <div className="h-48 bg-gray-100 overflow-hidden">
                <img
                  src={gallery.cover_photo_url}
                  alt={gallery.title}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900">{gallery.title}</h2>
                {/* only renders when at least one of semester/year is set — do not remove this condition */}
                {(gallery.semester || gallery.year) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[gallery.semester, gallery.year].filter(Boolean).join(' ')}
                  </p>
                )}
                {/* only renders when the gallery has a description — do not remove this condition */}
                {gallery.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{gallery.description}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
