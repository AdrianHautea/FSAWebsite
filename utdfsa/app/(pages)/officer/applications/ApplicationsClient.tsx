// ── ApplicationsClient.tsx ────────────────────────────────
// officer client component for reviewing ading and kuyate applications.
//
// data:  ading_applications, kuyate_applications, members (joined)
// deps:  /api/officer/applications/ading/[id], /api/officer/applications/kuyate/[id]
// notes: status changes for kuyate trigger a confirmation modal because they fire emails;
//        ading status changes are optimistic and silent. pamilya assignment is ading-only.
'use client'

import { useState } from 'react'
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
  future_kuyate: string | null
  mbti: string | null
  members: MemberInfo
}

interface KuyateApplication {
  id: string
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
  hobbies: 'Hobbies',
  fave_music_genre: 'Favorite Music Genre',
  fave_artist: 'Favorite Artist',
  fave_food: 'Favorite Food',
  pam_vibe: 'Pamilya Vibe',
  hangout_size_preference: 'Hangout Size Preference (1–10)',
  fave_tv_show_movie: 'Favorite TV Show / Movie',
  availability: 'Availability',
  thoughts_on_drinking: 'Thoughts on Drinking',
  dislikes: 'Dislikes',
  pam_dealbreakers: 'Pamilya Dealbreakers',
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

// Fields that should span the full 2-column width in the modal
const WIDE_KEYS = new Set([
  'why_kuyate', 'pam_vibe', 'availability', 'thoughts_on_drinking',
  'dislikes', 'pam_dealbreakers', 'additional_notes', 'hobbies',
  'future_kuyate', 'fave_tv_show_movie',
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
    <span className={`text-[10.5px] font-bold tracking-[0.04em] px-2.5 py-0.5 rounded-full ${cls[status]}`}>
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
}: {
  application: AdingApplication | KuyateApplication | null
  type: 'ading' | 'kuyate'
  onClose: () => void
  onStatusChange: (id: string, status: Status) => void
  onPamilyaChange?: (id: string, pamilya: string | null) => void
  pamilyaSaving?: 'saving' | 'saved' | 'error' | null
}) {
  if (!application) return null

  const m = application.members
  const questionKeys = type === 'ading' ? ADING_QUESTION_KEYS : KUYATE_QUESTION_KEYS
  const questionLabels = type === 'ading' ? ADING_QUESTION_LABELS : KUYATE_QUESTION_LABELS

  return (
    <Modal onClose={onClose} size="lg">
      <div
        className="bg-[#141414] border border-white/10 rounded-2xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85)] w-full flex flex-col"
        style={{ animation: 'modalIn 0.18s ease-out' }}
      >
        {/* Header — sticky */}
        <div className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-white leading-tight">
                {m.first_name} {m.last_name}
              </h2>
              <p className="text-[13.5px] text-[#8c8c8c] font-medium mt-0.5">{m.email}</p>
              {(m.year || m.major) && (
                <p className="text-[12.5px] text-[#6e6e6e] font-medium mt-0.5">
                  {[m.year, m.major].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="mt-2.5">{statusBadge(application.status)}</div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors shrink-0"
              aria-label="Close"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
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
                    <dt className="text-[10.5px] font-bold text-[#6e6e6e] uppercase tracking-[0.08em] mb-1.5">
                      {questionLabels[key]}
                    </dt>
                    <dd className="text-[13.5px] text-[#d4d4d4]">
                      {av.days.length > 0 && <p className="font-medium">{av.days.join(', ')}</p>}
                      {av.times && <p className="text-[#8c8c8c] mt-0.5">{av.times}</p>}
                    </dd>
                  </div>
                )
              }

              const display = renderValue(key, raw)
              if (display === null) return null
              const isWide = WIDE_KEYS.has(key)

              return (
                <div key={key} className={isWide ? 'col-span-2' : 'col-span-1'}>
                  <dt className="text-[10.5px] font-bold text-[#6e6e6e] uppercase tracking-[0.08em] mb-1.5">
                    {questionLabels[key]}
                  </dt>
                  <dd className="text-[13.5px] text-[#d4d4d4] font-medium whitespace-pre-wrap break-words">{display}</dd>
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
                onClick={onClose}
                className="text-sm text-[#6e6e6e] hover:text-[#cfcfcf] font-medium transition-colors"
              >
                Close
              </button>
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
          ) : (
            <div className="flex flex-col gap-3">
              {/* Row 1: Close far-left, status buttons far-right */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  className="text-sm text-[#6e6e6e] hover:text-[#cfcfcf] font-medium transition-colors"
                >
                  Close
                </button>
                <StatusButtons
                  current={application.status}
                  onSelect={s => onStatusChange(application.id, s)}
                />
              </div>
              {/* Row 2: Assign Pamilya dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-[11.5px] text-[#7e7e7e] font-semibold shrink-0">Assign Pamilya</label>
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
                  <span className="text-[11.5px] text-[#6e6e6e] font-medium">Saving…</span>
                )}
                {pamilyaSaving === 'saved' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5fcf8f" strokeWidth={2.4}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {pamilyaSaving === 'error' && (
                  <span className="text-[11.5px] text-[#ef6f6f] font-medium">Failed</span>
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

function AdingCard({ app, onOpen }: { app: AdingApplication; onOpen: () => void }) {
  const m = app.members
  return (
    <div
      onClick={onOpen}
      className="bg-[#121212] border border-white/8 rounded-2xl h-48 overflow-hidden cursor-pointer hover:border-[rgba(151,71,255,0.4)] hover:shadow-[0_0_0_1px_rgba(151,71,255,0.14),0_18px_38px_-16px_rgba(151,71,255,0.35)] transition-all flex flex-col"
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-[14.5px] text-white line-clamp-1 flex-1 min-w-0">
            {m.first_name} {m.last_name}
          </h3>
          {statusBadge(app.status)}
        </div>
        <p className="text-[12.5px] text-[#8c8c8c] font-medium line-clamp-1">{m.email}</p>
        <p className="text-[12px] text-[#6e6e6e] font-medium line-clamp-1 mt-0.5">
          {[m.year, m.major].filter(Boolean).join(' · ')}
        </p>
        {m.pamilya && (
          <p className="text-[12px] text-[#9747FF] mt-0.5 line-clamp-1 font-semibold">Pamilya: {m.pamilya}</p>
        )}
        <div className="mt-auto pt-3 border-t border-white/6">
          <p className="text-[11.5px] text-[#5a5a5a] font-medium">Submitted {fmtDate(app.submitted_at)}</p>
        </div>
      </div>
    </div>
  )
}

function KuyateCard({ app, onOpen }: { app: KuyateApplication; onOpen: () => void }) {
  const m = app.members
  return (
    <div
      onClick={onOpen}
      className="bg-[#121212] border border-white/8 rounded-2xl h-48 overflow-hidden cursor-pointer hover:border-[rgba(151,71,255,0.4)] hover:shadow-[0_0_0_1px_rgba(151,71,255,0.14),0_18px_38px_-16px_rgba(151,71,255,0.35)] transition-all flex flex-col"
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-[14.5px] text-white line-clamp-1 flex-1 min-w-0">
            {m.first_name} {m.last_name}
          </h3>
          {statusBadge(app.status)}
        </div>
        <p className="text-[12.5px] text-[#8c8c8c] font-medium line-clamp-1">{m.email}</p>
        <p className="text-[12px] text-[#6e6e6e] font-medium line-clamp-1 mt-0.5">
          {[m.year, m.major].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-auto pt-3 border-t border-white/6">
          <p className="text-[11.5px] text-[#5a5a5a] font-medium">Submitted {fmtDate(app.submitted_at)}</p>
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
      <span className="text-[13px] text-[#6e6e6e] font-medium">
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
    'Thoughts on Drinking', 'Dislikes', 'Pamilya Dealbreakers', 'Future Kuya/Ate',
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
    a.pam_dealbreakers ?? '', a.future_kuyate ?? '',
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
  // filter defaults to 'pending' so officers see actionable items first
  const [adingFilter, setAdingFilter] = useState<Filter>('pending')
  const [kuyateFilter, setKuyateFilter] = useState<Filter>('pending')
  // separate page counters per tab so pagination resets independently
  const [adingPage, setAdingPage] = useState(1)
  const [kuyatePage, setKuyatePage] = useState(1)
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

  // Derive the live modal app from current state so status/pamilya changes are reflected
  const currentModalApp: AdingApplication | KuyateApplication | null = selectedAppId
    ? selectedAppType === 'ading'
      ? adingApps.find(a => a.id === selectedAppId) ?? null
      : kuyateApps.find(a => a.id === selectedAppId) ?? null
    : null

  // Filtered lists (used for CSV export — all filtered, not just current page)
  const filteredAding = adingFilter === 'all'
    ? adingApps
    : adingApps.filter(a => a.status === adingFilter)

  const filteredKuyate = kuyateFilter === 'all'
    ? kuyateApps
    : kuyateApps.filter(a => a.status === kuyateFilter)

  // Paginated slices
  const paginatedAding = filteredAding.slice((adingPage - 1) * ITEMS_PER_PAGE, adingPage * ITEMS_PER_PAGE)
  const paginatedKuyate = filteredKuyate.slice((kuyatePage - 1) * ITEMS_PER_PAGE, kuyatePage * ITEMS_PER_PAGE)

  function adingCounts(): Record<Filter, number> {
    return {
      all: adingApps.length,
      pending: adingApps.filter(a => a.status === 'pending').length,
      accepted: adingApps.filter(a => a.status === 'accepted').length,
      rejected: adingApps.filter(a => a.status === 'rejected').length,
    }
  }

  function kuyateCounts(): Record<Filter, number> {
    return {
      all: kuyateApps.length,
      pending: kuyateApps.filter(a => a.status === 'pending').length,
      accepted: kuyateApps.filter(a => a.status === 'accepted').length,
      rejected: kuyateApps.filter(a => a.status === 'rejected').length,
    }
  }

  function handleAdingFilterChange(f: Filter) {
    setAdingFilter(f)
    setAdingPage(1)
  }

  function handleKuyateFilterChange(f: Filter) {
    setKuyateFilter(f)
    setKuyatePage(1)
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

  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto">
        {/* page header */}
        <div className="mb-8">
          <h1 className="font-display font-black text-[32px] text-white tracking-tight leading-[1.02] mb-2">Applications</h1>
          <p className="text-[14.5px] text-[#8c8c8c] font-medium">
            Review and update ading and kuyate applications.
          </p>
        </div>

        {/* tab bar */}
        <div className="flex gap-0 border-b border-white/8 mb-6">
          {(['ading', 'kuyate'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-[14px] font-bold transition-colors relative ${
                tab === t
                  ? 'text-white'
                  : 'text-[#6e6e6e] hover:text-[#a0a0a0]'
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
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <FilterBar active={adingFilter} onChange={handleAdingFilterChange} counts={adingCounts()} />
              <button
                onClick={() => exportAdingCSV(filteredAding)}
                className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px] border border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export CSV
              </button>
            </div>

            {filteredAding.length === 0 ? (
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
                    />
                  ))}
                </div>
                {filteredAding.length > ITEMS_PER_PAGE && (
                  <PaginationBar
                    page={adingPage}
                    total={filteredAding.length}
                    onPrev={() => setAdingPage(p => p - 1)}
                    onNext={() => setAdingPage(p => p + 1)}
                  />
                )}
              </>
            )}
          </section>
        )}

        {/* kuyate tab */}
        {tab === 'kuyate' && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <FilterBar active={kuyateFilter} onChange={handleKuyateFilterChange} counts={kuyateCounts()} />
              <button
                onClick={() => exportKuyateCSV(filteredKuyate)}
                className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px] border border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export CSV
              </button>
            </div>

            {filteredKuyate.length === 0 ? (
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
                    />
                  ))}
                </div>
                {filteredKuyate.length > ITEMS_PER_PAGE && (
                  <PaginationBar
                    page={kuyatePage}
                    total={filteredKuyate.length}
                    onPrev={() => setKuyatePage(p => p - 1)}
                    onNext={() => setKuyatePage(p => p + 1)}
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
          onStatusChange={(id, s) => {
            if (selectedAppType === 'kuyate') {
              if (s === 'accepted' || s === 'rejected') {
                const app = kuyateApps.find(a => a.id === id)
                if (app) {
                  setPendingStatus({ applicationId: id, applicantFirstName: app.members.first_name, status: s })
                }
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
        />

        {/* Kuyate confirmation modal — z-50 so it layers above the detail modal */}
        {pendingStatus && (
          <Modal onClose={() => setPendingStatus(null)} size="sm">
            <div
              className="bg-[#141414] border border-white/10 rounded-[18px] w-full p-7 shadow-[0_32px_72px_-16px_rgba(0,0,0,0.85)]"
              style={{ animation: 'modalIn 0.18s ease-out' }}
            >
              <h2 className="text-[16px] font-bold text-white mb-2">
                {pendingStatus.status === 'accepted' ? 'Confirm Acceptance' : 'Confirm Rejection'}
              </h2>
              <p className="text-[13.5px] text-[#8c8c8c] font-medium mb-6 leading-relaxed">
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
      </div>
    </main>
  )
}
