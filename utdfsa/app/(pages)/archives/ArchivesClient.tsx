'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Gallery } from '@/types/database'

interface Props {
  galleries: Gallery[]
  isOfficer: boolean
}

const EMPTY_FORM = {
  title: '',
  google_photos_url: '',
  description: '',
  semester: '',
  year: '',
}

export default function ArchivesClient({ galleries, isOfficer }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal()
      }
    }
    if (modalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modalOpen])

  function closeModal() {
    setModalOpen(false)
    setError(null)
    setForm(EMPTY_FORM)
    setCoverFile(null)
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview)
      setCoverPreview(null)
    }
  }

  function set(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
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

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold">Photo Archives</h1>
        {isOfficer && (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + Add Archive
          </button>
        )}
      </div>

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

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">New Archive</h2>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archive Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={set('title')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Spring Formal 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Photo <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
                      <span className="text-2xl">+</span>
                      <span>Click to select a photo</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {coverPreview && (
                  <button
                    type="button"
                    onClick={() => { setCoverFile(null); URL.revokeObjectURL(coverPreview); setCoverPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="mt-1 text-xs text-gray-400 hover:text-red-500"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Album Link</label>
                <input
                  type="url"
                  value={form.google_photos_url}
                  onChange={set('google_photos_url')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://photos.google.com/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={form.semester}
                    onChange={set('semester')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.year}
                    onChange={set('year')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2025"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Create Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
