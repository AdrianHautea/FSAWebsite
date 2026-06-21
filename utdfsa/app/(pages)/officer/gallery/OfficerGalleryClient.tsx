// ── OfficerGalleryClient.tsx ──────────────────────────────
// officer client component for creating, editing, and deleting gallery archives.
//
// data:  galleries table (id, title, cover_photo_url, google_photos_url, semester, year,
//          description, is_published)
// deps:  POST /api/galleries, PATCH /api/galleries/[id], DELETE /api/galleries/[id],
//        browser-image-compression (npm)
// notes: cover preview uses FileReader (data: url) instead of URL.createObjectURL
//        because the CSP blocks blob: urls in img-src. images over 1 mb are compressed
//        client-side before upload. after create, edit, or delete, router.refresh()
//        re-fetches the gallery list from the server without a full navigation.
'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/Modal'
import { useRouter } from 'next/navigation'
import type { Gallery } from '@/types/database'
import imageCompression from 'browser-image-compression'

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

interface EditForm {
  title: string
  google_photos_url: string
  description: string
  semester: string
  year: string
  is_published: boolean
}

const EMPTY_EDIT_FORM: EditForm = {
  title: '',
  google_photos_url: '',
  description: '',
  semester: '',
  year: '',
  is_published: true,
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

const inputCls = 'w-full px-3.5 py-3 rounded-xl bg-[#0d0d0d] border border-white/10 text-white text-sm placeholder:text-[#5a5a5a] focus:outline-none focus:border-[#9747FF] focus:shadow-[0_0_0_3px_rgba(151,71,255,0.18)] transition-[border-color,box-shadow] font-[inherit]'
const selectCls = `${inputCls} officer-select appearance-none cursor-pointer pr-10`
const labelCls = 'block text-[11px] font-bold tracking-[0.07em] uppercase text-[#7e7e7e] mb-2'

export default function OfficerGalleryClient({ galleries }: Props) {
  const router = useRouter()
  // controls the "new archive" modal visibility
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // validation or api error shown inside the modal
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  // the selected (and possibly compressed) file to upload as the cover
  const [coverFile, setCoverFile] = useState<File | null>(null)
  // data: url preview for the cover — shown immediately after file selection
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  // ref used to programmatically trigger the hidden file input from the drop zone div
  const fileInputRef = useRef<HTMLInputElement>(null)

  // edit modal state
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM)
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editDeleting, setEditDeleting] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

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
    if (!file) {
      setCoverFile(null)
      setCoverPreview(null)
      return
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WEBP, or GIF image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20MB.')
      return
    }
    setCoverFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!coverFile) {
      setError('Please select a cover photo.')
      return
    }
    setSubmitting(true)
    setError(null)

    // compress images over 1 mb to keep s3 storage costs low and uploads fast
    let fileToUpload: File = coverFile
    if (coverFile.size > 1 * 1024 * 1024) {
      try {
        const compressed = await imageCompression(coverFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        fileToUpload = new File([compressed], coverFile.name, { type: coverFile.type })
      } catch (err) {
        console.error('[gallery upload] compression failed, using original:', err)
      }
    }

    const body = new FormData()
    body.append('cover', fileToUpload)
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

  function openEdit(gallery: Gallery) {
    setEditingGallery(gallery)
    setEditForm({
      title: gallery.title,
      google_photos_url: gallery.google_photos_url ?? '',
      description: gallery.description ?? '',
      semester: gallery.semester ?? '',
      year: gallery.year != null ? String(gallery.year) : '',
      is_published: gallery.is_published,
    })
    setEditCoverFile(null)
    setEditCoverPreview(null)
    setEditError(null)
    setEditDeleting(false)
    setEditSubmitting(false)
  }

  function closeEdit() {
    setEditingGallery(null)
    setEditCoverFile(null)
    setEditCoverPreview(null)
    setEditError(null)
  }

  function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setEditCoverFile(null)
      setEditCoverPreview(null)
      return
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setEditError('Please upload a JPEG, PNG, WEBP, or GIF image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setEditError('Image must be under 20MB.')
      return
    }
    setEditCoverFile(file)
    setEditError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setEditCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleEditSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!editingGallery) return
    setEditSubmitting(true)
    setEditError(null)

    let fileToUpload: File | null = editCoverFile
    if (editCoverFile && editCoverFile.size > 1 * 1024 * 1024) {
      try {
        const compressed = await imageCompression(editCoverFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        fileToUpload = new File([compressed], editCoverFile.name, { type: editCoverFile.type })
      } catch (err) {
        console.error('[gallery edit] compression failed, using original:', err)
      }
    }

    const body = new FormData()
    body.append('title', editForm.title)
    body.append('google_photos_url', editForm.google_photos_url)
    body.append('description', editForm.description)
    body.append('semester', editForm.semester)
    body.append('year', editForm.year)
    body.append('is_published', String(editForm.is_published))
    if (fileToUpload) body.append('cover', fileToUpload)

    // api: calls PATCH /api/galleries/[id] — updates gallery fields — do not change this endpoint
    const res = await fetch(`/api/galleries/${editingGallery.id}`, { method: 'PATCH', body })
    const data = await res.json()

    if (!res.ok) {
      setEditError(data.error ?? 'Something went wrong')
      setEditSubmitting(false)
      return
    }

    closeEdit()
    setEditSubmitting(false)
    router.refresh()
  }

  async function handleEditDelete() {
    if (!editingGallery) return
    if (!confirm(`Delete "${editingGallery.title}"? This cannot be undone.`)) return
    setEditDeleting(true)
    // api: calls DELETE /api/galleries/[id] — removes gallery row from database — do not change this endpoint
    const res = await fetch(`/api/galleries/${editingGallery.id}`, { method: 'DELETE' })
    setEditDeleting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setEditError(data.error ?? 'Failed to delete archive.')
      return
    }
    closeEdit()
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-5xl mx-auto">
        {/* page header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display font-black text-[32px] text-white tracking-tight leading-[1.02] mb-2">
              Gallery Management
            </h1>
            <p className="text-[14.5px] text-[#8c8c8c] font-medium">Create and manage photo archives.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="sm:flex-shrink-0 flex items-center gap-2 px-5 py-3 min-h-[44px] border-none rounded-[13px] bg-[#9747FF] hover:bg-[#a85eff] text-white text-sm font-bold cursor-pointer transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Archive
          </button>
        </div>

        {/* existing galleries header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="font-display font-bold text-[12px] tracking-[0.16em] text-[#9a9a9a] uppercase">Existing Galleries</span>
          <span className="h-px flex-1 bg-white/7" />
          <span className="text-[12.5px] text-[#6e6e6e] font-medium">{galleries.length} archive{galleries.length !== 1 ? 's' : ''}</span>
        </div>

        {/* gallery list */}
        {/* only renders when no galleries exist yet — do not remove this condition */}
        {galleries.length === 0 ? (
          <p className="text-[#5e5e5e] text-sm text-center py-16">No archives yet. Create one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                className="flex flex-col sm:flex-row gap-3 sm:gap-5 bg-[#121212] border border-white/8 rounded-2xl p-4 hover:border-white/16 transition-colors group"
              >
                {/* cover thumbnail */}
                <div className="w-[72px] h-[72px] rounded-[13px] overflow-hidden flex-shrink-0 bg-[#0d0d0d] border border-white/8 sm:self-center sm:mt-0.5">
                  <img
                    src={gallery.cover_photo_url}
                    alt={gallery.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* info */}
                <div className="flex-1 min-w-0 sm:self-center">
                  <h2 className="font-bold text-[15.5px] text-white truncate leading-snug">{gallery.title}</h2>
                  {/* only renders when at least one of semester/year is set — do not remove this condition */}
                  {(gallery.semester || gallery.year) && (
                    <p className="text-[12.5px] text-[#8c8c8c] font-medium mt-0.5">
                      {[gallery.semester, gallery.year].filter(Boolean).join(' ')}
                    </p>
                  )}
                  {/* only renders when the gallery has a description — do not remove this condition */}
                  {gallery.description && (
                    <p className="text-[12.5px] text-[#6e6e6e] font-medium mt-1 line-clamp-1">{gallery.description}</p>
                  )}
                </div>

                {/* actions — badge pins top-right, edit pins bottom-right */}
                <div className="flex sm:flex-col sm:justify-between sm:items-end gap-2 sm:flex-shrink-0 sm:self-stretch">
                  {gallery.is_published ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.05em] uppercase bg-[rgba(74,222,128,0.1)] text-[#4ade80] border border-[rgba(74,222,128,0.22)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.05em] uppercase bg-white/5 text-[#6e6e6e] border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6e6e6e]" />
                      Draft
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(gallery)}
                    className="min-h-[44px] flex items-center text-[13px] font-semibold text-[#5fa8e8] hover:text-[#8ec5f5] transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* only renders when the officer has opened the New Archive modal — do not remove this condition */}
      {modalOpen && (
        <Modal onClose={closeModal} size="md">
          <div
            className="bg-[#141414] border border-white/10 rounded-[20px] shadow-[0_32px_72px_-16px_rgba(0,0,0,0.8)] w-full"
            style={{ animation: 'modalIn 0.18s ease-out' }}
          >
            <div className="px-4 sm:px-7 pt-4 sm:pt-7 pb-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#9747FF]" />
                  <h2 className="font-display font-bold text-[17px] text-white tracking-[-0.01em]">New Archive</h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* only renders when the API or file validation returned an error — do not remove this condition */}
              {error && (
                <p className="text-[13px] text-[#ef6f6f] bg-[rgba(239,111,111,0.08)] border border-[rgba(239,111,111,0.25)] rounded-xl px-4 py-3 mb-5">
                  {error}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-7 pb-4 sm:pb-7 flex flex-col gap-5">
              <div>
                <label className={labelCls}>Archive Name <span className="text-[#ef6f6f]">*</span></label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={set('title')}
                  className={inputCls}
                  placeholder="e.g. Spring Formal 2025"
                />
              </div>

              <div>
                <label className={labelCls}>Cover Photo <span className="text-[#ef6f6f]">*</span></label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    {/* clicking this area opens the hidden file input — do not remove the onClick */}
                    {coverPreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[1/1] rounded-xl overflow-hidden cursor-pointer mb-2"
                      >
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[1/1] border-2 border-dashed border-white/18 rounded-xl bg-[#0d0d0d] flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:border-[rgba(151,71,255,0.55)] hover:bg-[#101010] transition-colors mb-2"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth={1.7}>
                            <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
                            <path d="M21 15l-5-5L4 21"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#d4d4d4]">Click to select a photo</div>
                          <div className="text-xs text-[#6e6e6e] font-medium mt-0.5">JPEG, PNG, or WEBP · 1:1 square</div>
                        </div>
                      </div>
                    )}
                    {/* only renders the remove button after a file is selected — do not remove this condition */}
                    {coverPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverFile(null)
                          setCoverPreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="text-[12px] text-[#6e6e6e] hover:text-[#ef6f6f] font-medium transition-colors"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>

                  {/* reference tile — mirrors the 1:1 thumbnail shown on the archives list */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-[72px] aspect-[1/1] rounded-[13px] border border-white/10 bg-[#141414] flex flex-col items-center justify-center gap-1.5"
                      style={{ backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 11px,rgba(255,255,255,0.025) 11px 12px)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.4}>
                        <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
                        <path d="M21 15l-5-5L4 21"/>
                      </svg>
                      <span className="font-mono text-[8px] tracking-[0.1em] text-white/30">1:1</span>
                    </div>
                    <p className="text-[10px] text-[#6e6e6e] font-medium mt-1.5 text-center max-w-[72px]">as shown in archives</p>
                  </div>
                </div>

                {/* hidden — triggered programmatically by the area above — do not remove */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className={labelCls}>Album Link <span className="text-[#ef6f6f]">*</span></label>
                <input
                  type="url"
                  required
                  value={form.google_photos_url}
                  onChange={set('google_photos_url')}
                  className={inputCls}
                  placeholder="https://photos.google.com/..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Semester</label>
                  <select
                    value={form.semester}
                    onChange={set('semester')}
                    className={selectCls}
                  >
                    <option value="">—</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.year}
                    onChange={set('year')}
                    className={inputCls}
                    placeholder="2025"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Optional description…"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto min-h-[44px] border border-white/16 bg-transparent text-[#cfcfcf] rounded-xl px-4 py-2.5 text-sm font-semibold hover:border-white/32 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto sm:ml-auto min-h-[44px] bg-[#9747FF] hover:bg-[#a85eff] disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-bold border-none cursor-pointer transition-colors"
                >
                  {/* only shows "Saving…" while the upload+insert API call is in flight — do not remove this condition */}
                  {submitting ? 'Saving…' : 'Create Archive'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* only renders when the officer has opened the Edit Archive modal — do not remove this condition */}
      {editingGallery && (
        <Modal onClose={closeEdit} size="md">
          <div
            className="bg-[#141414] border border-white/10 rounded-[20px] shadow-[0_32px_72px_-16px_rgba(0,0,0,0.8)] w-full"
            style={{ animation: 'modalIn 0.18s ease-out' }}
          >
            <div className="px-4 sm:px-7 pt-4 sm:pt-7 pb-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#9747FF]" />
                  <h2 className="font-display font-bold text-[17px] text-white tracking-[-0.01em]">Edit Archive</h2>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* only renders when the API or file validation returned an error — do not remove this condition */}
              {editError && (
                <p className="text-[13px] text-[#ef6f6f] bg-[rgba(239,111,111,0.08)] border border-[rgba(239,111,111,0.25)] rounded-xl px-4 py-3 mb-5">
                  {editError}
                </p>
              )}
            </div>

            <form onSubmit={handleEditSubmit} className="px-4 sm:px-7 pb-4 sm:pb-7 flex flex-col gap-5">

              {/* Archive Name */}
              <div>
                <label className={labelCls}>Archive Name <span className="text-[#ef6f6f]">*</span></label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Spring Formal 2025"
                />
              </div>

              {/* Cover Photo */}
              <div>
                <label className={labelCls}>Cover Photo</label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full aspect-[1/1] rounded-xl overflow-hidden cursor-pointer mb-2"
                    >
                      <img
                        src={editCoverPreview ?? editingGallery.cover_photo_url}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* only renders the remove button after a new file is staged — do not remove this condition */}
                    {editCoverPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditCoverFile(null)
                          setEditCoverPreview(null)
                          if (editFileInputRef.current) editFileInputRef.current.value = ''
                        }}
                        className="text-[12px] text-[#6e6e6e] hover:text-[#ef6f6f] font-medium transition-colors"
                      >
                        Remove new photo
                      </button>
                    )}
                  </div>

                  {/* reference tile */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-[72px] aspect-[1/1] rounded-[13px] border border-white/10 bg-[#141414] flex flex-col items-center justify-center gap-1.5"
                      style={{ backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 11px,rgba(255,255,255,0.025) 11px 12px)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.4}>
                        <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
                        <path d="M21 15l-5-5L4 21"/>
                      </svg>
                      <span className="font-mono text-[8px] tracking-[0.1em] text-white/30">1:1</span>
                    </div>
                    <p className="text-[10px] text-[#6e6e6e] font-medium mt-1.5 text-center max-w-[72px]">as shown in archives</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-[12px] font-semibold px-3.5 py-1.5 rounded-lg border border-white/16 text-[#cfcfcf] hover:border-white/30 hover:text-white transition-colors mt-2"
                >
                  {editCoverPreview ? 'Change Cover' : 'Replace Cover'}
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditFileChange}
                  className="hidden"
                />
              </div>

              {/* Album Link */}
              <div>
                <label className={labelCls}>Album Link</label>
                <input
                  type="url"
                  value={editForm.google_photos_url}
                  onChange={e => setEditForm(f => ({ ...f, google_photos_url: e.target.value }))}
                  className={inputCls}
                  placeholder="https://photos.google.com/..."
                />
                {editForm.google_photos_url && (
                  <a
                    href={editForm.google_photos_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[12.5px] text-[#5fa8e8] font-semibold hover:text-[#8ec5f5] transition-colors"
                  >
                    View Album
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                  </a>
                )}
              </div>

              {/* Semester / Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Semester</label>
                  <select
                    value={editForm.semester}
                    onChange={e => setEditForm(f => ({ ...f, semester: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">—</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={editForm.year}
                    onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}
                    className={inputCls}
                    placeholder="2025"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Optional description…"
                />
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/7">
                <div>
                  <div className="text-sm font-semibold text-[#e8e8e8]">Published</div>
                  <div className="text-[12.5px] text-[#7e7e7e] font-medium mt-0.5">Show this archive on the public Gallery page</div>
                </div>
                <label className="relative cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={editForm.is_published}
                    onChange={e => setEditForm(f => ({ ...f, is_published: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`w-[46px] h-[27px] rounded-full relative transition-colors duration-150 ${editForm.is_published ? 'bg-[#9747FF]' : 'bg-white/12'}`}>
                    <span className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-all duration-150 ${editForm.is_published ? 'left-[22px]' : 'left-[3px]'}`} />
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-5 border-t border-white/7 gap-3">
                <button
                  type="button"
                  disabled={editDeleting}
                  onClick={handleEditDelete}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-[11px] bg-transparent border border-[rgba(239,111,111,0.4)] text-[#ef6f6f] text-sm font-bold cursor-pointer hover:bg-[rgba(239,111,111,0.1)] disabled:opacity-50 transition-colors"
                >
                  {editDeleting ? 'Deleting…' : 'Delete Archive'}
                </button>
                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-transparent border border-white/16 text-[#cfcfcf] text-sm font-semibold hover:border-white/32 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl border-none bg-[#9747FF] hover:bg-[#a85eff] disabled:opacity-50 text-white font-bold text-sm transition-colors"
                  >
                    {editSubmitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </main>
  )
}
