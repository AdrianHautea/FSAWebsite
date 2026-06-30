// ── ApplicationsClient.tsx ────────────────────────────────
// officer client component for reviewing ading and kuyate applications.
//
// data:  ading_applications, kuyate_applications, members (joined)
// deps:  /api/officer/applications/ading/[id], /api/officer/applications/kuyate/[id]
// notes: status changes for kuyate trigger a confirmation modal because they fire emails;
//        ading status changes are optimistic and silent. pamilya assignment is ading-only.
'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/Modal'

// ── types and constants ───────────────────────────────────

type Status = 'pending' | 'accepted' | 'rejected'
type Filter = 'all' | Status

interface MemberInfo {
  first_name: string
  last_name: string
  email: string
  year: string | null
  major: string | null
  phone: string | null
  pamilya: string | null
}

interface AdingApplication {
  id: string
  member_id: string
  submitted_at: string
  status: Status
  additional_notes: string | null
  instagram: string | null
  phone: string | null
  birthday: string | null
  pronouns: string | null
  activity_level: number | null
  hobbies: string | null
  fave_music_genre: string | null
  fave_artist: string | null
  fave_food: string | null
  pam_vibe: string | null
  hangout_size_preference: number | null
  fave_tv_show_movie: string | null
  availability: { days: string[]; times: string } | null
  thoughts_on_drinking: string | null
  dislikes: string | null
  pam_dealbreakers: string | null
  pam_incompatibilities: string | null
  future_kuyate: string | null
  mbti: string | null
  members: MemberInfo
}

interface KuyateApplication {
  id: string
  member_id: string
  submitted_at: string
  status: Status
  additional_notes: string | null
  instagram: string | null
  pamilya_name: string | null
  wants_to_be_pam_head: boolean
  pam_head_phone: string | null
  why_kuyate: string
  acknowledges_responsibilities: boolean
  members: MemberInfo
}

const PAMILYA_OPTIONS = [
  'Shiballers', 'Gutom Gang', 'Sushi Cuchi', 'Hanobe',
  'Moganda', 'SDIYBT', 'Arigyattos',
] as const

const ADING_QUESTION_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  phone: 'Phone',
  birthday: 'Birthday',
  pronouns: 'Pronouns',
  activity_level: 'Activity Level (1–10)',
  hangout_size_preference: 'Hangout Size Preference (1–10)',
  hobbies: 'Hobbies',
  fave_music_genre: 'Favorite Music Genre',
  fave_artist: 'Favorite Artist',
  fave_food: 'Favorite Food',
  pam_vibe: 'Preferred Pamilya Vibe',
  fave_tv_show_movie: 'Favorite TV Show / Movie',
  availability: 'Availability',
  thoughts_on_drinking: 'Thoughts on Drinking',
  dislikes: 'Dislikes',
  pam_dealbreakers: 'Pamilya Dealbreakers',
  pam_incompatibilities: 'Cannot Be In Pam With & Why',
  future_kuyate: 'Future Kuya/Ate Preference',
  mbti: 'MBTI',
  additional_notes: 'Additional Notes',
}

const ADING_QUESTION_KEYS = Object.keys(ADING_QUESTION_LABELS)

const KUYATE_QUESTION_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  pamilya_name: 'Preferred Pamilya',
  wants_to_be_pam_head: 'Applying to be Pamilya Head',
  pam_head_phone: 'Phone (Pamilya Head)',
  why_kuyate: 'Why do you want to be a Kuya/Ate?',
  acknowledges_responsibilities: 'Acknowledges Responsibilities',
  additional_notes: 'Additional Notes',
}

const KUYATE_QUESTION_KEYS = Object.keys(KUYATE_QUESTION_LABELS)

const ITEMS_PER_PAGE = 15

type SortOption = 'newest' | 'oldest' | 'name-az' | 'name-za'

function sortApps<T extends { submitted_at: string; members: { last_name: string; first_name: string } }>(
  apps: T[], sort: SortOption
): T[] {
  return [...apps].sort((a, b) => {
    switch (sort) {
      case 'newest': return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      case 'oldest': return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      case 'name-az': return a.members.last_name.localeCompare(b.members.last_name) || a.members.first_name.localeCompare(b.members.first_name)
      case 'name-za': return b.members.last_name.localeCompare(a.members.last_name) || b.members.first_name.localeCompare(a.members.first_name)
    }
  })
}

// Fields that always occupy the full 2-column width in the modal
const WIDE_KEYS = new Set([
  'why_kuyate', 'pam_vibe', 'availability', 'thoughts_on_drinking',
  'dislikes', 'pam_dealbreakers', 'pam_incompatibilities', 'additional_notes', 'hobbies',
  'future_kuyate', 'fave_tv_show_movie', 'fave_food', 'mbti',
])

// Intended row pairs for col-1 fields; if a field's partner is absent (null/undefined/""),
// the field self-promotes to col-span-2 so no orphaned empty right cell is left behind
const PAIR_MAP = new Map<string, string>([
  ['instagram', 'phone'], ['phone', 'instagram'],
  ['birthday', 'pronouns'], ['pronouns', 'birthday'],
  ['activity_level', 'hangout_size_preference'], ['hangout_size_preference', 'activity_level'],
  ['fave_music_genre', 'fave_artist'], ['fave_artist', 'fave_music_genre'],
])

// ============================================================
// UI — safe to restyle everything below this line
// ============================================================

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

function statusBadge(status: Status) {
  const cls: Record<Status, string> = {
    pending:  'bg-[rgba(227,174,61,0.12)] border border-[rgba(227,174,61,0.35)] text-[#f0c869]',
    accepted: 'bg-[rgba(95,207,143,0.12)] border border-[rgba(95,207,143,0.35)] text-[#5fcf8f]',
    rejected: 'bg-[rgba(239,111,111,0.12)] border border-[rgba(239,111,111,0.35)] text-[#ef6f6f]',
  }
  const label: Record<Status, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  }
  return (
    <span className={`text-[11px] font-bold tracking-[0.04em] px-2.5 py-0.5 rounded-full ${cls[status]}`}>
      {label[status]}
    </span>
  )
}

function StatusButtons({
  current,
  onSelect,
}: {
  current: Status
  onSelect: (s: Status) => void
}) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onSelect('pending')}
        className={`text-xs font-bold px-3 py-1.5 rounded-[9px] border transition-colors ${
          current === 'pending'
            ? 'bg-[rgba(227,174,61,0.16)] border-[rgba(227,174,61,0.5)] text-[#f0c869]'
            : 'bg-transparent border-white/12 text-[#7e7e7e] hover:border-white/24 hover:text-[#cfcfcf]'
        }`}
      >
        Pending
      </button>
      <button
        onClick={() => onSelect('accepted')}
        className={`text-xs font-bold px-3 py-1.5 rounded-[9px] border-none transition-colors ${
          current === 'accepted'
            ? 'bg-[#3a9d63] text-white'
            : 'bg-[rgba(58,157,99,0.14)] text-[#5fcf8f] hover:bg-[rgba(58,157,99,0.22)]'
        }`}
      >
        Accept
      </button>
      <button
        onClick={() => onSelect('rejected')}
        className={`text-xs font-bold px-3 py-1.5 rounded-[9px] border-none transition-colors ${
          current === 'rejected'
            ? 'bg-[#cf4d4d] text-white'
            : 'bg-[rgba(207,77,77,0.14)] text-[#ef6f6f] hover:bg-[rgba(207,77,77,0.22)]'
        }`}
      >
        Reject
      </button>
    </div>
  )
}

function renderValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (key === 'availability' && typeof value === 'object') {
    const av = value as { days: string[]; times: string }
    return `${av.days.join(', ')} — ${av.times}`
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function FilterBar({ active, onChange, counts }: {
  active: Filter
  onChange: (f: Filter) => void
  counts: Record<Filter, number>
}) {
  const filters: Filter[] = ['all', 'pending', 'accepted', 'rejected']
  const labels: Record<Filter, string> = {
    all: 'All', pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected',
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-[10px] border transition-colors ${
            active === f
              ? 'bg-[#9747FF] text-white border-transparent'
              : 'bg-transparent text-[#8c8c8c] border-white/14 hover:border-white/28 hover:text-[#cfcfcf]'
          }`}
        >
          {labels[f]} <span className={`${active === f ? 'opacity-70' : 'opacity-50'}`}>({counts[f]})</span>
        </button>
      ))}
    </div>
  )
}

// ── Application Detail Modal ────────────────────────────────────────────────

function ApplicationDetailModal({
  application,
  type,
  onClose,
  onStatusChange,
  onPamilyaChange,
  pamilyaSaving,
  onDelete,
  currentIndex,
  totalCount,
  onPrevApp,
  onNextApp,
}: {
  application: AdingApplication | KuyateApplication | null
  type: 'ading' | 'kuyate'
  onClose: () => void
  onStatusChange: (id: string, status: Status) => void
  onPamilyaChange?: (id: string, pamilya: string | null) => void
  pamilyaSaving?: 'saving' | 'saved' | 'error' | null
  onDelete: () => void
  currentIndex?: number
  totalCount?: number
  onPrevApp?: () => void
  onNextApp?: () => void
}) {
  if (!application) return null

  const m = application.members
  const questionKeys = type === 'ading' ? ADING_QUESTION_KEYS : KUYATE_QUESTION_KEYS
  const questionLabels = type === 'ading' ? ADING_QUESTION_LABELS : KUYATE_QUESTION_LABELS

  return (
    <Modal onClose={onClose} size="lg">
      <div
        className="bg-[#141414] border border-white/10 rounded-2xl shadow-modal w-full flex flex-col"
        style={{ animation: 'modalIn 0.18s ease-out' }}
      >
        {/* Header — sticky */}
        <div className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-white leading-tight">
                {m.first_name} {m.last_name}
              </h2>
              <p className="text-[14px] text-[#8c8c8c] font-medium mt-0.5">{m.email}</p>
              {(m.year || m.major) && (
                <p className="text-[13px] text-text-muted font-medium mt-0.5">
                  {[m.year, m.major].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="mt-2.5">{statusBadge(application.status)}</div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {typeof currentIndex === 'number' && typeof totalCount === 'number' && totalCount > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onPrevApp}
                    disabled={currentIndex === 0}
                    className="w-6 h-6 rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors"
                    aria-label="Previous application"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
                  </button>
                  <span className="text-[11px] text-[#7e7e7e] font-medium tabular-nums">{currentIndex + 1}/{totalCount}</span>
                  <button
                    onClick={onNextApp}
                    disabled={currentIndex >= totalCount - 1}
                    className="w-6 h-6 rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors"
                    aria-label="Next application"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="border-t border-white/8" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            {questionKeys.map(key => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const raw = (application as any)[key]

              // Availability: render days and times on separate lines
              if (key === 'availability') {
                if (!raw || typeof raw !== 'object') return null
                const av = raw as { days: string[]; times: string }
                if (!av.days.length && !av.times) return null
                return (
                  <div key={key} className="col-span-2">
                    <dt className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em] mb-1.5">
                      {questionLabels[key]}
                    </dt>
                    <dd className="text-[14px] text-[#d4d4d4]">
                      {av.days.length > 0 && <p className="font-medium">{av.days.join(', ')}</p>}
                      {av.times && <p className="text-[#8c8c8c] mt-0.5">{av.times}</p>}
                    </dd>
                  </div>
                )
              }

              const display = renderValue(key, raw)
              if (display === null) return null
              const pairKey = PAIR_MAP.get(key)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pairIsEmpty = pairKey !== undefined && renderValue(pairKey, (application as any)[pairKey]) === null
              const isWide = WIDE_KEYS.has(key) || pairIsEmpty

              return (
                <div key={key} className={isWide ? 'col-span-2' : 'col-span-1'}>
                  <dt className="text-[11px] font-bold text-text-muted uppercase tracking-[0.08em] mb-1.5">
                    {questionLabels[key]}
                  </dt>
                  <dd className="text-[14px] text-[#d4d4d4] font-medium whitespace-pre-wrap break-words">{display}</dd>
                </div>
              )
            })}
          </dl>
        </div>

        {/* Footer — sticky */}
        <div className="px-6 py-4 border-t border-white/8 shrink-0">
          {type === 'kuyate' ? (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onDelete}
                className="text-[12px] font-semibold text-[#ef6f6f]/60 border border-[#ef6f6f]/25 hover:border-[#ef6f6f]/55 hover:text-[#ef6f6f]/90 rounded-[9px] px-2.5 py-1 transition-colors"
              >
                Delete
              </button>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onStatusChange(application.id, 'accepted')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-[9px] border-none transition-colors ${
                      application.status === 'accepted'
                        ? 'bg-[#3a9d63] text-white'
                        : 'bg-[rgba(58,157,99,0.14)] text-[#5fcf8f] hover:bg-[rgba(58,157,99,0.22)]'
                    }`}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onStatusChange(application.id, 'rejected')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-[9px] border-none transition-colors ${
                      application.status === 'rejected'
                        ? 'bg-[#cf4d4d] text-white'
                        : 'bg-[rgba(207,77,77,0.14)] text-[#ef6f6f] hover:bg-[rgba(207,77,77,0.22)]'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Row 1: Delete far-left, Close + status buttons far-right */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onDelete}
                    className="text-[12px] font-semibold text-[#ef6f6f]/60 border border-[#ef6f6f]/25 hover:border-[#ef6f6f]/55 hover:text-[#ef6f6f]/90 rounded-[9px] px-2.5 py-1 transition-colors"
                  >
                    Delete
                  </button>
                </div>
                <StatusButtons
                  current={application.status}
                  onSelect={s => onStatusChange(application.id, s)}
                />
              </div>
              {/* Row 2: Assign Pamilya dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-[#7e7e7e] font-semibold shrink-0">Assign Pamilya</label>
                <select
                  value={(application as AdingApplication).members.pamilya ?? ''}
                  onChange={e => onPamilyaChange?.(application.id, e.target.value || null)}
                  className="text-[12px] border border-white/12 rounded-[9px] px-2.5 py-1.5 text-[#d4d4d4] bg-[#0d0d0d] focus:outline-none focus:border-[#9747FF] officer-select appearance-none pr-8 font-[inherit]"
                >
                  <option value="">Not yet assigned</option>
                  {PAMILYA_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {pamilyaSaving === 'saving' && (
                  <span className="text-[12px] text-text-muted font-medium">Saving…</span>
                )}
                {pamilyaSaving === 'saved' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5fcf8f" strokeWidth={2.4}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {pamilyaSaving === 'error' && (
                  <span className="text-[12px] text-[#ef6f6f] font-medium">Failed</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Application Cards ───────────────────────────────────────────────────────

function AdingCard({ app, onOpen, onDelete }: { app: AdingApplication; onOpen: () => void; onDelete: () => void }) {
  const m = app.members
  return (
    <div
      onClick={onOpen}
      className="bg-[#121212] border border-white/8 rounded-2xl h-48 overflow-hidden cursor-pointer hover:border-white/16 hover:-translate-y-0.5 hover:shadow-raised transition-all flex flex-col"
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-[15px] text-white line-clamp-1 flex-1 min-w-0">
            {m.first_name} {m.last_name}
          </h3>
          {statusBadge(app.status)}
        </div>
        <p className="text-[13px] text-[#8c8c8c] font-medium line-clamp-1">{m.email}</p>
        <p className="text-[12px] text-text-muted font-medium line-clamp-1 mt-0.5">
          {[m.year, m.major].filter(Boolean).join(' · ')}
        </p>
        {m.pamilya && (
          <p className="text-[12px] text-[#9747FF] mt-0.5 line-clamp-1 font-semibold">Pamilya: {m.pamilya}</p>
        )}
        <div className="mt-auto pt-3 border-t border-white/6 flex items-center justify-between">
          <p className="text-[12px] text-text-muted font-medium">Submitted {fmtDate(app.submitted_at)}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-[11px] font-semibold text-[#ef6f6f]/50 border border-[#ef6f6f]/20 hover:border-[#ef6f6f]/55 hover:text-[#ef6f6f]/80 rounded-[6px] px-2 py-0.5 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function KuyateCard({ app, onOpen, onDelete }: { app: KuyateApplication; onOpen: () => void; onDelete: () => void }) {
  const m = app.members
  return (
    <div
      onClick={onOpen}
      className="bg-[#121212] border border-white/8 rounded-2xl h-48 overflow-hidden cursor-pointer hover:border-white/16 hover:-translate-y-0.5 hover:shadow-raised transition-all flex flex-col"
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-[15px] text-white line-clamp-1 flex-1 min-w-0">
            {m.first_name} {m.last_name}
          </h3>
          {statusBadge(app.status)}
        </div>
        <p className="text-[13px] text-[#8c8c8c] font-medium line-clamp-1">{m.email}</p>
        <p className="text-[12px] text-text-muted font-medium line-clamp-1 mt-0.5">
          {[m.year, m.major].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-auto pt-3 border-t border-white/6 flex items-center justify-between">
          <p className="text-[12px] text-text-muted font-medium">Submitted {fmtDate(app.submitted_at)}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-[11px] font-semibold text-[#ef6f6f]/50 border border-[#ef6f6f]/20 hover:border-[#ef6f6f]/55 hover:text-[#ef6f6f]/80 rounded-[6px] px-2 py-0.5 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pagination Controls ─────────────────────────────────────────────────────

function PaginationBar({
  page,
  total,
  onPrev,
  onNext,
}: {
  page: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const start = (page - 1) * ITEMS_PER_PAGE + 1
  const end = Math.min(page * ITEMS_PER_PAGE, total)
  return (
    <div className="flex items-center justify-between mt-6">
      <span className="text-[13px] text-text-muted font-medium">
        Showing {start}–{end} of {total} application{total !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="px-4 py-2 rounded-[10px] border border-white/12 bg-transparent text-[13px] font-semibold text-[#8c8c8c] hover:border-white/24 hover:text-[#cfcfcf] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={page * ITEMS_PER_PAGE >= total}
          className="px-4 py-2 rounded-[10px] border border-white/12 bg-transparent text-[13px] font-semibold text-[#8c8c8c] hover:border-white/24 hover:text-[#cfcfcf] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ── CSV helpers ─────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]): void {
  const csv = rows
    .map(row =>
      row.map(cell => {
        const value = cell == null ? '' : String(cell)
        return value.includes(',') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportAdingCSV(apps: AdingApplication[]): void {
  const headers = [
    'Last Name', 'First Name', 'Email', 'Year', 'Major', 'Current Pamilya', 'Status', 'Submitted At',
    'Instagram', 'Phone', 'Birthday', 'Pronouns', 'Activity Level', 'Hobbies',
    'Favorite Music Genre', 'Favorite Artist', 'Favorite Food', 'Pamilya Vibe',
    'Hangout Size Preference', 'Favorite TV Show / Movie', 'Availability',
    'Thoughts on Drinking', 'Dislikes', 'Pamilya Dealbreakers', 'Pamilya Incompatibilities', 'Future Kuya/Ate',
    'MBTI', 'Additional Notes',
  ]

  const rows = apps.map(a => [
    a.members.last_name, a.members.first_name, a.members.email,
    a.members.year ?? '', a.members.major ?? '', a.members.pamilya ?? '',
    a.status,
    new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    a.instagram ?? '', a.phone ?? '', a.birthday ?? '', a.pronouns ?? '',
    a.activity_level ?? '', a.hobbies ?? '',
    a.fave_music_genre ?? '', a.fave_artist ?? '', a.fave_food ?? '',
    a.pam_vibe ?? '', a.hangout_size_preference ?? '',
    a.fave_tv_show_movie ?? '',
    a.availability ? `${a.availability.days.join(', ')} — ${a.availability.times}` : '',
    a.thoughts_on_drinking ?? '', a.dislikes ?? '',
    a.pam_dealbreakers ?? '', a.pam_incompatibilities ?? '', a.future_kuyate ?? '',
    a.mbti ?? '', a.additional_notes ?? '',
  ])

  downloadCSV('ading-applications.csv', [headers, ...rows])
}

function exportKuyateCSV(apps: KuyateApplication[]): void {
  const headers = [
    'Last Name', 'First Name', 'Email', 'Year', 'Major', 'Current Pamilya', 'Status', 'Submitted At',
    'Instagram', 'Preferred Pamilya', 'Wants to be Pamilya Head', 'Pam Head Phone',
    'Why Kuyate', 'Acknowledges Responsibilities', 'Additional Notes',
  ]

  const rows = apps.map(a => [
    a.members.last_name, a.members.first_name, a.members.email,
    a.members.year ?? '', a.members.major ?? '', a.members.pamilya ?? '',
    a.status,
    new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    a.instagram ?? '', a.pamilya_name ?? '',
    a.wants_to_be_pam_head ? 'Yes' : 'No',
    a.pam_head_phone ?? '',
    a.why_kuyate,
    a.acknowledges_responsibilities ? 'Yes' : 'No',
    a.additional_notes ?? '',
  ])

  downloadCSV('kuyate-applications.csv', [headers, ...rows])
}

// ── Keyboard Shortcuts Dialog ───────────────────────────────────────────────

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const items: [string, string][] = [
    ['/', 'Focus search'],
    ['1', 'Switch to Ading tab'],
    ['2', 'Switch to Kuyate tab'],
    ['?', 'Show keyboard shortcuts'],
    ['Esc', 'Close modal'],
  ]
  return (
    <Modal onClose={onClose} size="sm">
      <div className="bg-[#141414] border border-white/10 rounded-[18px] w-full p-6 shadow-modal" style={{ animation: 'modalIn 0.18s ease-out' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>
        <dl className="flex flex-col gap-3">
          {items.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <dt className="text-[13px] text-[#8c8c8c] font-medium">{label}</dt>
              <dd>
                <kbd className="text-[12px] font-mono font-semibold text-[#cfcfcf] bg-white/8 border border-white/12 rounded-[6px] px-2 py-0.5">{key}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ApplicationsClient({
  adingApps: initialAdingApps,
  kuyateApps: initialKuyateApps,
}: {
  adingApps: AdingApplication[]
  kuyateApps: KuyateApplication[]
}) {
  // active tab — 'ading' or 'kuyate'
  const [tab, setTab] = useState<'ading' | 'kuyate'>('ading')
  // local copy of ading apps — optimistically updated on status/pamilya change
  const [adingApps, setAdingApps] = useState<AdingApplication[]>(initialAdingApps)
  // local copy of kuyate apps — optimistically updated on status change
  const [kuyateApps, setKuyateApps] = useState<KuyateApplication[]>(initialKuyateApps)
  // per-tab filter/sort/page/search — keyed by tab name so resets are independent
  type TabState = { filter: Filter; sort: SortOption; page: number; search: string }
  const [tabState, setTabState] = useState<Record<'ading' | 'kuyate', TabState>>({
    ading:  { filter: 'pending', sort: 'newest', page: 1, search: '' },
    kuyate: { filter: 'pending', sort: 'newest', page: 1, search: '' },
  })
  function patchTab(t: 'ading' | 'kuyate', patch: Partial<TabState>) {
    setTabState(prev => ({ ...prev, [t]: { ...prev[t], ...patch } }))
  }
  const adingSearchRef = useRef<HTMLInputElement>(null)
  const kuyateSearchRef = useRef<HTMLInputElement>(null)

  // keyboard shortcuts: / → focus search, 1/2 → switch tabs, ? → shortcuts dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === '/' && !inInput) {
        e.preventDefault()
        const ref = tab === 'ading' ? adingSearchRef : kuyateSearchRef
        ref.current?.focus()
      } else if (e.key === '?' && !inInput) {
        e.preventDefault()
        setShowShortcuts(s => !s)
      } else if (e.key === '1' && !inInput) {
        setTab('ading')
      } else if (e.key === '2' && !inInput) {
        setTab('kuyate')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tab])
  // id of the application whose detail modal is open; null means closed
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedAppType, setSelectedAppType] = useState<'ading' | 'kuyate'>('ading')
  // per-application pamilya save state keyed by application id
  const [pamilyaSaving, setPamilyaSaving] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({})
  // kuyate accept/reject requires a confirmation step because it fires an email
  const [pendingStatus, setPendingStatus] = useState<{
    applicationId: string
    applicantFirstName: string
    status: 'accepted' | 'rejected'
  } | null>(null)
  // conflict message shown when the optimistic lock rejects a concurrent status write
  const [kuyateConflict, setKuyateConflict] = useState<string | null>(null)
  // delete confirmation — requires typing the applicant's full name to confirm
  const [deleteTarget, setDeleteTarget] = useState<{
    applicationId: string
    type: 'ading' | 'kuyate'
    applicantName: string
    memberId: string
  } | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Derive the live modal app from current state so status/pamilya changes are reflected
  const currentModalApp: AdingApplication | KuyateApplication | null = selectedAppId
    ? selectedAppType === 'ading'
      ? adingApps.find(a => a.id === selectedAppId) ?? null
      : kuyateApps.find(a => a.id === selectedAppId) ?? null
    : null


  // Filtered lists (used for CSV export — all filtered, not just current page)
  const filteredAding = tabState.ading.filter === 'all'
    ? adingApps
    : adingApps.filter(a => a.status === tabState.ading.filter)

  const filteredKuyate = tabState.kuyate.filter === 'all'
    ? kuyateApps
    : kuyateApps.filter(a => a.status === tabState.kuyate.filter)

  // sort applied after status filter; csv export reads unsorted filteredAding/filteredKuyate
  const sortedAding = sortApps(filteredAding, tabState.ading.sort)
  const sortedKuyate = sortApps(filteredKuyate, tabState.kuyate.sort)

  // name search applied on top of sorted+filtered list
  const adingSearchTerm = tabState.ading.search.trim().toLowerCase()
  const searchedAding = adingSearchTerm
    ? sortedAding.filter(a =>
        `${a.members.first_name} ${a.members.last_name}`.toLowerCase().includes(adingSearchTerm)
      )
    : sortedAding

  const kuyateSearchTerm = tabState.kuyate.search.trim().toLowerCase()
  const searchedKuyate = kuyateSearchTerm
    ? sortedKuyate.filter(a =>
        `${a.members.first_name} ${a.members.last_name}`.toLowerCase().includes(kuyateSearchTerm)
      )
    : sortedKuyate

  // prev/next navigation — operates over the full filtered+searched list, independent of pagination
  const modalNavList = selectedAppType === 'ading' ? searchedAding : searchedKuyate
  const modalNavIndex = selectedAppId ? modalNavList.findIndex(a => a.id === selectedAppId) : -1

  // Paginated slices
  const paginatedAding = searchedAding.slice((tabState.ading.page - 1) * ITEMS_PER_PAGE, tabState.ading.page * ITEMS_PER_PAGE)
  const paginatedKuyate = searchedKuyate.slice((tabState.kuyate.page - 1) * ITEMS_PER_PAGE, tabState.kuyate.page * ITEMS_PER_PAGE)

  function tabCounts(apps: Array<{ status: Status }>): Record<Filter, number> {
    return {
      all: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      accepted: apps.filter(a => a.status === 'accepted').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
    }
  }

  async function updateAdingStatus(id: string, newStatus: Status) {
    const prev = adingApps
    setAdingApps(apps => apps.map(a => a.id === id ? { ...a, status: newStatus } : a))

    // api: calls PATCH /api/officer/applications/ading/[id] — updates ading application status — do not change this endpoint or method
    const res = await fetch(`/api/officer/applications/ading/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      setAdingApps(prev)
    }
  }

  async function updateKuyateStatus(id: string, newStatus: Status) {
    const prev = kuyateApps
    setKuyateApps(apps => apps.map(a => a.id === id ? { ...a, status: newStatus } : a))

    // api: calls PATCH /api/officer/applications/kuyate/[id] — updates kuyate application status and triggers acceptance/rejection email — do not change this endpoint or method
    const res = await fetch(`/api/officer/applications/kuyate/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      setKuyateApps(prev)
      if (res.status === 409) {
        const body = await res.json().catch(() => null)
        setKuyateConflict(body?.message ?? 'Another officer already reviewed this application.')
      }
    }
  }

  async function updatePamilya(appId: string, pamilya: string | null) {
    setPamilyaSaving(prev => ({ ...prev, [appId]: 'saving' }))

    // api: calls PATCH /api/officer/applications/ading/[id] — updates the assigned pamilya on the member row — do not change this endpoint or method
    const res = await fetch(`/api/officer/applications/ading/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pamilya }),
    })

    if (res.ok) {
      setAdingApps(apps => apps.map(a => {
        if (a.id !== appId) return a
        return { ...a, members: { ...a.members, pamilya } }
      }))
      setPamilyaSaving(prev => ({ ...prev, [appId]: 'saved' }))
      setTimeout(() => setPamilyaSaving(prev => ({ ...prev, [appId]: null })), 2000)
    } else {
      setPamilyaSaving(prev => ({ ...prev, [appId]: 'error' }))
      setTimeout(() => setPamilyaSaving(prev => ({ ...prev, [appId]: null })), 3000)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    if (deleteConfirmInput !== deleteTarget.applicantName) return

    setDeleting(true)
    setDeleteError(null)

    // api: calls DELETE /api/officer/applications/[id]?type=ading|kuyate — deletes the application and resets member onboarding
    const res = await fetch(
      `/api/officer/applications/${deleteTarget.applicationId}?type=${deleteTarget.type}`,
      { method: 'DELETE' },
    )
    const data = await res.json()
    setDeleting(false)

    if (!res.ok) {
      setDeleteError(data.error ?? 'Failed to delete application')
      return
    }

    // remove from local state so the UI updates immediately
    if (deleteTarget.type === 'ading') {
      setAdingApps(prev => prev.filter(a => a.id !== deleteTarget.applicationId))
    } else {
      setKuyateApps(prev => prev.filter(a => a.id !== deleteTarget.applicationId))
    }

    setDeleteTarget(null)
    setDeleteConfirmInput('')
    setSelectedAppId(null)
  }

  function handleDeleteCancel() {
    setDeleteTarget(null)
    setDeleteConfirmInput('')
    setDeleteError(null)
  }

  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto">
        {/* page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-[32px] text-white tracking-tight leading-[1.02] mb-2">Applications</h1>
            <p className="text-[15px] text-[#8c8c8c] font-medium">
              Review and update ading and kuyate applications.
            </p>
          </div>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="mt-1 shrink-0 text-[12px] font-mono font-semibold text-[#7e7e7e] hover:text-[#cfcfcf] border border-white/10 hover:border-white/22 rounded-[6px] px-2 py-0.5 transition-colors"
          >
            ?
          </button>
        </div>

        {/* tab bar */}
        <div role="tablist" className="flex gap-0 border-b border-white/8 mb-6">
          {(['ading', 'kuyate'] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-[14px] font-bold transition-colors relative ${
                tab === t
                  ? 'text-white'
                  : 'text-text-muted hover:text-[#a0a0a0]'
              }`}
            >
              {t === 'ading' ? 'Ading' : 'Kuyate'}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#9747FF] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* ading tab */}
        {tab === 'ading' && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5">
              <div className="order-1 sm:order-1 flex flex-col sm:flex-row sm:items-center gap-3">
                <FilterBar active={tabState.ading.filter} onChange={f => patchTab('ading', { filter: f, page: 1 })} counts={tabCounts(adingApps)} />
                <select
                  value={tabState.ading.sort}
                  onChange={e => patchTab('ading', { sort: e.target.value as SortOption, page: 1 })}
                  className="w-full sm:w-auto text-[12px] font-semibold border border-white/12 rounded-[9px] px-2.5 py-1.5 text-[#8c8c8c] bg-[#0d0d0d] hover:border-white/22 hover:text-[#cfcfcf] focus:outline-none focus:border-white/24 officer-select appearance-none pr-7 font-[inherit] transition-colors"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name-az">Name A→Z</option>
                  <option value="name-za">Name Z→A</option>
                </select>
              </div>
              <div className="relative order-2 sm:order-2 sm:flex-1 sm:min-w-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input
                  ref={adingSearchRef}
                  type="search"
                  value={tabState.ading.search}
                  onChange={e => patchTab('ading', { search: e.target.value, page: 1 })}
                  placeholder="Search by name… ( / )"
                  className="w-full pl-8 pr-3.5 py-2 rounded-[10px] bg-[#0d0d0d] border border-white/10 text-[13px] text-white placeholder:text-text-muted focus:outline-none focus:border-white/24 transition-[border-color] font-[inherit]"
                />
              </div>
              <button
                onClick={() => exportAdingCSV(filteredAding)}
                className="order-3 flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 sm:p-2 rounded-[10px] border border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf] transition-colors sm:shrink-0"
                title="Export CSV"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[13px] font-semibold sm:hidden">Export CSV</span>
              </button>
            </div>

            {tabState.ading.search.trim() && searchedAding.length > 0 && (
              <p className="text-[12px] text-text-muted mb-3">{searchedAding.length} of {filteredAding.length} result{searchedAding.length !== 1 ? 's' : ''}</p>
            )}
            {searchedAding.length === 0 ? (
              <p className="text-[#5e5e5e] text-sm py-14 text-center">No applications found.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedAding.map(app => (
                    <AdingCard
                      key={app.id}
                      app={app}
                      onOpen={() => {
                        setSelectedAppId(app.id)
                        setSelectedAppType('ading')
                      }}
                      onDelete={() => setDeleteTarget({
                        applicationId: app.id,
                        type: 'ading',
                        applicantName: `${app.members.first_name} ${app.members.last_name}`,
                        memberId: app.member_id,
                      })}
                    />
                  ))}
                </div>
                {searchedAding.length > ITEMS_PER_PAGE && (
                  <PaginationBar
                    page={tabState.ading.page}
                    total={searchedAding.length}
                    onPrev={() => patchTab('ading', { page: tabState.ading.page - 1 })}
                    onNext={() => patchTab('ading', { page: tabState.ading.page + 1 })}
                  />
                )}
              </>
            )}
          </section>
        )}

        {/* kuyate tab */}
        {tab === 'kuyate' && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5">
              <div className="order-1 sm:order-1 flex flex-col sm:flex-row sm:items-center gap-3">
                <FilterBar active={tabState.kuyate.filter} onChange={f => patchTab('kuyate', { filter: f, page: 1 })} counts={tabCounts(kuyateApps)} />
                <select
                  value={tabState.kuyate.sort}
                  onChange={e => patchTab('kuyate', { sort: e.target.value as SortOption, page: 1 })}
                  className="w-full sm:w-auto text-[12px] font-semibold border border-white/12 rounded-[9px] px-2.5 py-1.5 text-[#8c8c8c] bg-[#0d0d0d] hover:border-white/22 hover:text-[#cfcfcf] focus:outline-none focus:border-white/24 officer-select appearance-none pr-7 font-[inherit] transition-colors"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name-az">Name A→Z</option>
                  <option value="name-za">Name Z→A</option>
                </select>
              </div>
              <div className="relative order-2 sm:order-2 sm:flex-1 sm:min-w-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input
                  ref={kuyateSearchRef}
                  type="search"
                  value={tabState.kuyate.search}
                  onChange={e => patchTab('kuyate', { search: e.target.value, page: 1 })}
                  placeholder="Search by name… ( / )"
                  className="w-full pl-8 pr-3.5 py-2 rounded-[10px] bg-[#0d0d0d] border border-white/10 text-[13px] text-white placeholder:text-text-muted focus:outline-none focus:border-white/24 transition-[border-color] font-[inherit]"
                />
              </div>
              <button
                onClick={() => exportKuyateCSV(filteredKuyate)}
                className="order-3 flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 sm:p-2 rounded-[10px] border border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf] transition-colors sm:shrink-0"
                title="Export CSV"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[13px] font-semibold sm:hidden">Export CSV</span>
              </button>
            </div>

            {tabState.kuyate.search.trim() && searchedKuyate.length > 0 && (
              <p className="text-[12px] text-text-muted mb-3">{searchedKuyate.length} of {filteredKuyate.length} result{searchedKuyate.length !== 1 ? 's' : ''}</p>
            )}
            {searchedKuyate.length === 0 ? (
              <p className="text-[#5e5e5e] text-sm py-14 text-center">No applications found.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedKuyate.map(app => (
                    <KuyateCard
                      key={app.id}
                      app={app}
                      onOpen={() => {
                        setSelectedAppId(app.id)
                        setSelectedAppType('kuyate')
                      }}
                      onDelete={() => setDeleteTarget({
                        applicationId: app.id,
                        type: 'kuyate',
                        applicantName: `${app.members.first_name} ${app.members.last_name}`,
                        memberId: app.member_id,
                      })}
                    />
                  ))}
                </div>
                {searchedKuyate.length > ITEMS_PER_PAGE && (
                  <PaginationBar
                    page={tabState.kuyate.page}
                    total={searchedKuyate.length}
                    onPrev={() => patchTab('kuyate', { page: tabState.kuyate.page - 1 })}
                    onNext={() => patchTab('kuyate', { page: tabState.kuyate.page + 1 })}
                  />
                )}
              </>
            )}
          </section>
        )}

        {/* Application detail modal */}
        <ApplicationDetailModal
          application={currentModalApp}
          type={selectedAppType}
          onClose={() => setSelectedAppId(null)}
          onDelete={() => {
            if (!currentModalApp) return
            setDeleteTarget({
              applicationId: currentModalApp.id,
              type: selectedAppType,
              applicantName: `${currentModalApp.members.first_name} ${currentModalApp.members.last_name}`,
              memberId: currentModalApp.member_id,
            })
          }}
          onStatusChange={(id, s) => {
            if (selectedAppType === 'kuyate') {
              const app = kuyateApps.find(a => a.id === id)
              if (!app || app.status === s) {
                // no-op: app not found or status already matches
              } else if (s === 'accepted' || s === 'rejected') {
                setPendingStatus({ applicationId: id, applicantFirstName: app.members.first_name, status: s })
              } else {
                updateKuyateStatus(id, s)
              }
            } else {
              updateAdingStatus(id, s)
              if (s === 'accepted' || s === 'rejected') setSelectedAppId(null)
            }
          }}
          onPamilyaChange={(id, pamilya) => updatePamilya(id, pamilya)}
          pamilyaSaving={selectedAppId ? (pamilyaSaving[selectedAppId] ?? null) : null}
          currentIndex={modalNavIndex >= 0 ? modalNavIndex : undefined}
          totalCount={modalNavList.length}
          onPrevApp={modalNavIndex > 0 ? () => setSelectedAppId(modalNavList[modalNavIndex - 1].id) : undefined}
          onNextApp={modalNavIndex < modalNavList.length - 1 ? () => setSelectedAppId(modalNavList[modalNavIndex + 1].id) : undefined}
        />

        {/* Kuyate confirmation modal — z-50 so it layers above the detail modal */}
        {pendingStatus && (
          <Modal onClose={() => setPendingStatus(null)} size="sm">
            <div
              className="bg-[#141414] border border-white/10 rounded-[18px] w-full p-7 shadow-modal"
              style={{ animation: 'modalIn 0.18s ease-out' }}
            >
              <h2 className="text-[16px] font-bold text-white mb-2">
                {pendingStatus.status === 'accepted' ? 'Confirm Acceptance' : 'Confirm Rejection'}
              </h2>
              <p className="text-[14px] text-[#8c8c8c] font-medium mb-6 leading-relaxed">
                {pendingStatus.status === 'accepted'
                  ? `This will send an acceptance email to ${pendingStatus.applicantFirstName}. This email cannot be unsent. Are you sure?`
                  : `This will send a rejection email to ${pendingStatus.applicantFirstName}. This email cannot be unsent. Are you sure?`}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingStatus(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#cfcfcf] border border-white/16 bg-transparent rounded-xl hover:border-white/30 hover:text-white transition-colors"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateKuyateStatus(pendingStatus.applicationId, pendingStatus.status)
                    setPendingStatus(null)
                    setSelectedAppId(null)
                  }}
                  className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl border-none transition-colors ${
                    pendingStatus.status === 'accepted'
                      ? 'bg-[#3a9d63] hover:bg-[#44b572]'
                      : 'bg-[#cf4d4d] hover:bg-[#e05555]'
                  }`}
                >
                  {pendingStatus.status === 'accepted' ? 'Yes, Accept' : 'Yes, Reject'}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {/* Conflict notice — appears when the optimistic lock rejects a concurrent review */}
        {kuyateConflict && (
          <Modal onClose={() => setKuyateConflict(null)} size="sm">
            <div
              className="bg-[#141414] border border-white/10 rounded-[18px] w-full p-7 shadow-modal"
              style={{ animation: 'modalIn 0.18s ease-out' }}
            >
              <h2 className="text-[16px] font-bold text-white mb-2">Already Reviewed</h2>
              <p className="text-[14px] text-[#8c8c8c] font-medium mb-6 leading-relaxed">{kuyateConflict}</p>
              <button
                type="button"
                onClick={() => setKuyateConflict(null)}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2a2a2a] rounded-xl hover:bg-[#333] border border-white/10 transition-colors"
              >
                Got it
              </button>
            </div>
          </Modal>
        )}

        {/* Keyboard shortcuts help dialog */}
        {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}

        {/* Delete confirmation modal — appears above detail modal; requires typing exact full name */}
        {deleteTarget && (
          <Modal onClose={handleDeleteCancel} size="sm" scrollable={false}>
            <div
              className="bg-[#141414] border border-white/10 rounded-[18px] w-full p-7 shadow-modal"
              style={{ animation: 'modalIn 0.18s ease-out' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef6f6f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h2 className="text-[16px] font-bold text-white">Delete Application</h2>
              </div>
              <p className="text-[14px] text-[#8c8c8c] font-medium mb-2 leading-relaxed">
                This will permanently delete{' '}
                <strong className="text-white">{deleteTarget.applicantName}</strong>
                &apos;s {deleteTarget.type} application and reset their onboarding so they can reapply.
              </p>
              <p className="text-[13px] text-text-muted font-medium mb-5 leading-relaxed">
                This action cannot be undone. The member will need to go through onboarding again to submit a new application.
              </p>
              <p className="text-[11px] font-bold tracking-[0.07em] uppercase text-[#7e7e7e] mb-1">
                Type their full name to confirm
              </p>
              <p className="text-[12px] text-text-muted font-medium mb-2">&ldquo;{deleteTarget.applicantName}&rdquo;</p>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type full name here"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0d0d] border border-white/10 text-[14px] text-white placeholder:text-text-muted focus:outline-none focus:border-[#ef6f6f] focus:shadow-[0_0_0_3px_rgba(239,111,111,0.12)] transition-[border-color,box-shadow] font-[inherit] mb-4"
              />
              {deleteError && (
                <p className="text-[13px] text-[#ef6f6f] mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#cfcfcf] border border-white/16 bg-transparent rounded-xl hover:border-white/30 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmInput !== deleteTarget.applicantName || deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-[#cf4d4d] hover:bg-[#e05555] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl border-none transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete Application'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </main>
  )
}
