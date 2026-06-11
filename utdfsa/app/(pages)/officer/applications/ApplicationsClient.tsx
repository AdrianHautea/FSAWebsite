'use client'

import { useEffect, useState } from 'react'

// ============================================================
// DATA — types and constants
// ============================================================

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
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const label: Record<Status, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls[status]}`}>
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
  const buttons: { value: Status; label: string; cls: string; activeCls: string }[] = [
    { value: 'pending',  label: 'Pending',  cls: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50', activeCls: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
    { value: 'accepted', label: 'Accept',   cls: 'border-green-300 text-green-700 hover:bg-green-50',   activeCls: 'bg-green-100 border-green-400 text-green-800' },
    { value: 'rejected', label: 'Reject',   cls: 'border-red-300 text-red-600 hover:bg-red-50',         activeCls: 'bg-red-100 border-red-400 text-red-700' },
  ]

  return (
    <div className="flex gap-1.5">
      {buttons.map(b => (
        <button
          key={b.value}
          onClick={() => onSelect(b.value)}
          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
            current === b.value ? b.activeCls : b.cls
          }`}
        >
          {b.label}
        </button>
      ))}
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
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            active === f
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {labels[f]} <span className="opacity-70">({counts[f]})</span>
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
  useEffect(() => {
    if (!application) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [application, onClose])

  if (!application) return null

  const m = application.members
  const questionKeys = type === 'ading' ? ADING_QUESTION_KEYS : KUYATE_QUESTION_KEYS
  const questionLabels = type === 'ading' ? ADING_QUESTION_LABELS : KUYATE_QUESTION_LABELS

  return (
    <div
      className="fixed inset-0 z-50 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-6rem)] flex flex-col${type === 'ading' ? ' mt-[80px]' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — sticky */}
        <div className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {m.first_name} {m.last_name}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">{m.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[m.year, m.major].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2">{statusBadge(application.status)}</div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1 -mr-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="border-t border-gray-200" />
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
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      {questionLabels[key]}
                    </dt>
                    <dd className="text-sm text-gray-800">
                      {av.days.length > 0 && <p>{av.days.join(', ')}</p>}
                      {av.times && <p className="text-gray-600">{av.times}</p>}
                    </dd>
                  </div>
                )
              }

              const display = renderValue(key, raw)
              if (display === null) return null
              const isWide = WIDE_KEYS.has(key)

              return (
                <div key={key} className={isWide ? 'col-span-2' : 'col-span-1'}>
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {questionLabels[key]}
                  </dt>
                  <dd className="text-sm text-gray-800 whitespace-pre-wrap break-words">{display}</dd>
                </div>
              )
            })}
          </dl>
        </div>

        {/* Footer — sticky */}
        <div className="px-6 py-4 border-t border-gray-200 shrink-0">
          {type === 'kuyate' ? (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => onStatusChange(application.id, 'accepted')}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors border-green-300 text-green-700 hover:bg-green-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => onStatusChange(application.id, 'rejected')}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors border-red-300 text-red-600 hover:bg-red-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <StatusButtons
                  current={application.status}
                  onSelect={s => onStatusChange(application.id, s)}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 shrink-0">Assign Pamilya</label>
                  <select
                    value={(application as AdingApplication).members.pamilya ?? ''}
                    onChange={e => onPamilyaChange?.(application.id, e.target.value || null)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Not yet assigned</option>
                    {PAMILYA_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {pamilyaSaving === 'saving' && (
                    <span className="text-xs text-gray-400">Saving…</span>
                  )}
                  {pamilyaSaving === 'saved' && (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                  {pamilyaSaving === 'error' && (
                    <span className="text-xs text-red-500">Failed</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Application Cards ───────────────────────────────────────────────────────

function AdingCard({ app, onOpen }: { app: AdingApplication; onOpen: () => void }) {
  const m = app.members
  return (
    <div
      onClick={onOpen}
      className="border rounded-xl bg-white shadow-sm h-48 overflow-hidden cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-200 transition-all flex flex-col"
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm text-gray-900 line-clamp-1 flex-1 min-w-0">
            {m.first_name} {m.last_name}
          </h3>
          {statusBadge(app.status)}
        </div>
        <p className="text-xs text-gray-600 line-clamp-1">{m.email}</p>
        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
          {[m.year, m.major].filter(Boolean).join(' · ')}
        </p>
        {m.pamilya && (
          <p className="text-xs text-blue-600 mt-0.5 line-clamp-1">Pamilya: {m.pamilya}</p>
        )}
        <div className="mt-auto pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">Submitted {fmtDate(app.submitted_at)}</p>
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
      className="border rounded-xl bg-white shadow-sm h-48 overflow-hidden cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-200 transition-all flex flex-col"
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm text-gray-900 line-clamp-1 flex-1 min-w-0">
            {m.first_name} {m.last_name}
          </h3>
          {statusBadge(app.status)}
        </div>
        <p className="text-xs text-gray-600 line-clamp-1">{m.email}</p>
        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
          {[m.year, m.major].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-auto pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">Submitted {fmtDate(app.submitted_at)}</p>
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
    <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
      <span>
        Showing {start}–{end} of {total} application{total !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={page * ITEMS_PER_PAGE >= total}
          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  const [tab, setTab] = useState<'ading' | 'kuyate'>('ading')
  const [adingApps, setAdingApps] = useState<AdingApplication[]>(initialAdingApps)
  const [kuyateApps, setKuyateApps] = useState<KuyateApplication[]>(initialKuyateApps)
  const [adingFilter, setAdingFilter] = useState<Filter>('pending')
  const [kuyateFilter, setKuyateFilter] = useState<Filter>('pending')
  const [adingPage, setAdingPage] = useState(1)
  const [kuyatePage, setKuyatePage] = useState(1)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedAppType, setSelectedAppType] = useState<'ading' | 'kuyate'>('ading')
  const [pamilyaSaving, setPamilyaSaving] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({})
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
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and update ading and kuyate applications.
        </p>
      </div>

      {/* tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['ading', 'kuyate'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t === 'ading' ? 'Ading' : 'Kuyate'}
          </button>
        ))}
      </div>

      {/* ading tab */}
      {tab === 'ading' && (
        <section>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <FilterBar active={adingFilter} onChange={handleAdingFilterChange} counts={adingCounts()} />
            <button
              onClick={() => exportAdingCSV(filteredAding)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Export CSV
            </button>
          </div>

          {filteredAding.length === 0 ? (
            <p className="text-gray-500 text-sm py-12 text-center">No applications found.</p>
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
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <FilterBar active={kuyateFilter} onChange={handleKuyateFilterChange} counts={kuyateCounts()} />
            <button
              onClick={() => exportKuyateCSV(filteredKuyate)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Export CSV
            </button>
          </div>

          {filteredKuyate.length === 0 ? (
            <p className="text-gray-500 text-sm py-12 text-center">No applications found.</p>
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
          }
        }}
        onPamilyaChange={(id, pamilya) => updatePamilya(id, pamilya)}
        pamilyaSaving={selectedAppId ? (pamilyaSaving[selectedAppId] ?? null) : null}
      />

      {/* Kuyate confirmation modal — z-50 so it layers above the detail modal */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-gray-900 mb-2">
              {pendingStatus.status === 'accepted' ? 'Confirm Acceptance' : 'Confirm Rejection'}
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              {pendingStatus.status === 'accepted'
                ? `This will send an acceptance email to ${pendingStatus.applicantFirstName}. This email cannot be unsent. Are you sure?`
                : `This will send a rejection email to ${pendingStatus.applicantFirstName}. This email cannot be unsent. Are you sure?`}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  updateKuyateStatus(pendingStatus.applicationId, pendingStatus.status)
                  setPendingStatus(null)
                }}
                className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg ${
                  pendingStatus.status === 'accepted'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingStatus.status === 'accepted' ? 'Yes, Accept' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
