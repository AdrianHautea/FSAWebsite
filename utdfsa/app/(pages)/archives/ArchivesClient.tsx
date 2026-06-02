'use client'

import type { Gallery } from '@/types/database'

interface Props {
  galleries: Gallery[]
}

export default function ArchivesClient({ galleries }: Props) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-10">Photo Archives</h1>

      {galleries.length === 0 ? (
        <p className="text-center text-gray-500 py-20">No archives yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => (
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
                {(gallery.semester || gallery.year) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[gallery.semester, gallery.year].filter(Boolean).join(' ')}
                  </p>
                )}
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
