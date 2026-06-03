'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Gallery } from '@/types/database'

/**
 * Props — passed down from OfficerGalleryPage server component (officer/gallery/page.tsx)
 *   galleries — ALL Gallery rows (published + drafts), sorted by year then created_at
 */
interface Props {
  galleries: Gallery[]
}

const EMPTY_FORM = {
  title: '',
  google_photos_url: '',
  description: '',
  semester: '',
  year: '',
}

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   galleries (Gallery[]) — each has: id, title, cover_photo_url,
//     google_photos_url, semester, year, description, is_published
//   modalOpen (bool) — controls the creation modal visibility
//   submitting (bool) — true while the create API call is in flight
//   deletingId (string|null) — id of the gallery currently being deleted
//   coverPreview (string|null) — data: URL of the selected cover image
//   error (string|null) — validation or API error to display
//   form — { title, google_photos_url, description, semester, year }
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function OfficerGalleryClient({ galleries }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function closeModal() {
    setModalOpen(false)
    setError(null)
    setForm(EMPTY_FORM)
    setCoverFile(null)
    setCoverPreview(null)
  }

  function set(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  // uses FileReader instead of URL.createObjectURL because the CSP img-src
  // allows data: but not blob: — do not switch back to createObjectURL
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setCoverFile(file)
    if (!file) {
      setCoverPreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!coverFile) {
      setError('Please select a cover photo.')
      return
    }
    setSubmitting(true)
    setError(null)

    const body = new FormData()
    body.append('cover', coverFile)
    body.append('title', form.title)
    body.append('google_photos_url', form.google_photos_url)
    body.append('description', form.description)
    body.append('semester', form.semester)
    body.append('year', form.year)

    // api: calls POST /api/galleries — uploads cover to S3 and inserts gallery row — do not change this endpoint
    const res = await fetch('/api/galleries', { method: 'POST', body })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }

    closeModal()
    setSubmitting(false)
    router.refresh()
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    // api: calls DELETE /api/galleries/[id] — removes gallery row from database — do not change this endpoint
    const res = await fetch(`/api/galleries/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete archive.')
      return
    }
    router.refresh()
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and delete photo archives.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + New Archive
        </button>
      </div>

      {/* only renders when no galleries exist yet — do not remove this condition */}
      {galleries.length === 0 ? (
        <p className="text-gray-500 text-sm py-16 text-center">No archives yet. Create one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleries.map((gallery) => (
            <div key={gallery.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="h-40 bg-gray-100 overflow-hidden">
                <img
                  src={gallery.cover_photo_url}
                  alt={gallery.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900 truncate">{gallery.title}</h2>
                {/* only renders when at least one of semester/year is set — do not remove this condition */}
                {(gallery.semester || gallery.year) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[gallery.semester, gallery.year].filter(Boolean).join(' ')}
                  </p>
                )}
                {/* only renders when the gallery has a description — do not remove this condition */}
                {gallery.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{gallery.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {/* only renders when the gallery has a linked album URL — do not remove this condition */}
                  {gallery.google_photos_url && (
                    // route: gallery.google_photos_url — opens the Google Photos album in a new tab — do not change this path
                    <a
                      href={gallery.google_photos_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Album ↗
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(gallery.id, gallery.title)}
                    disabled={deletingId === gallery.id}
                    className="ml-auto text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {/* only shows "Deleting…" while this specific gallery's delete call is in flight — do not remove this condition */}
                    {deletingId === gallery.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* only renders when the officer has opened the New Archive modal — do not remove this condition */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">New Archive</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* only renders when the API or file validation returned an error — do not remove this condition */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Archive Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={set('title')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Spring Formal 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Cover Photo <span className="text-red-500">*</span>
                </label>
                {/* clicking anywhere in this div opens the hidden file input — do not remove the onClick */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {/* only renders the preview once a file has been selected — do not remove this condition */}
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
                      <span className="text-2xl">+</span>
                      <span>Click to select a photo</span>
                    </div>
                  )}
                </div>
                {/* hidden — triggered programmatically by the div above — do not remove */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {/* only renders the remove button after a file is selected — do not remove this condition */}
                {coverPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="mt-1 text-xs text-gray-400 hover:text-red-500"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Album Link</label>
                <input
                  type="url"
                  value={form.google_photos_url}
                  onChange={set('google_photos_url')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://photos.google.com/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Semester</label>
                  <select
                    value={form.semester}
                    onChange={set('semester')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.year}
                    onChange={set('year')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2025"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description…"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {/* only shows "Saving…" while the upload+insert API call is in flight — do not remove this condition */}
                  {submitting ? 'Saving…' : 'Create Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
