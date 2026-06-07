'use client'

import { useState } from 'react'

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

// status button set shared by both tabs
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

// question value renderer for ading and kuyate cards
function renderValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (key === 'availability' && typeof value === 'object') {
    const av = value as { days: string[]; times: string }
    return `${av.days.join(', ')} — ${av.times}`
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// filter bar shared by both tabs
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

// ading application card
function AdingCard({
  app,
  expanded,
  onToggle,
  onStatusChange,
  onPamilyaChange,
  pamilyaSaving,
}: {
  app: AdingApplication
  expanded: boolean
  onToggle: () => void
  onStatusChange: (s: Status) => void
  onPamilyaChange: (pamilya: string | null) => void
  pamilyaSaving: 'saving' | 'saved' | 'error' | null
}) {
  const m = app.members

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        {/* header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-gray-900">
                {m.first_name} {m.last_name}
              </h3>
              {statusBadge(app.status)}
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{m.email}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[m.year, m.major].filter(Boolean).join(' · ')}
              {m.pamilya ? ` · ${m.pamilya}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(app.submitted_at)}</p>
          </div>

          <button
            onClick={onToggle}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* status + pamilya controls */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          <StatusButtons current={app.status} onSelect={onStatusChange} />

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-gray-500 shrink-0">Assign Pamilya</label>
            <select
              value={m.pamilya ?? ''}
              onChange={e => onPamilyaChange(e.target.value || null)}
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

      {/* expanded question answers */}
      {expanded && (
        <div className="border-t px-5 py-4 bg-gray-50">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {ADING_QUESTION_KEYS.map(key => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const raw = (app as any)[key]
              const display = renderValue(key, raw)
              if (display === null) return null
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {ADING_QUESTION_LABELS[key]}
                  </dt>
                  <dd className="text-sm text-gray-800 whitespace-pre-wrap">{display}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </div>
  )
}

// kuyate application card
function KuyateCard({
  app,
  expanded,
  onToggle,
  onStatusChange,
}: {
  app: KuyateApplication
  expanded: boolean
  onToggle: () => void
  onStatusChange: (s: Status) => void
}) {
  const m = app.members

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-gray-900">
                {m.first_name} {m.last_name}
              </h3>
              {statusBadge(app.status)}
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{m.email}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[m.year, m.major].filter(Boolean).join(' · ')}
              {m.pamilya ? ` · ${m.pamilya}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(app.submitted_at)}</p>
          </div>

          <button
            onClick={onToggle}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <StatusButtons current={app.status} onSelect={onStatusChange} />
        </div>
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 bg-gray-50">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {KUYATE_QUESTION_KEYS.map(key => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const raw = (app as any)[key]
              const display = renderValue(key, raw)
              if (display === null) return null
              return (
                <div key={key} className={key === 'why_kuyate' ? 'col-span-2' : ''}>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    {KUYATE_QUESTION_LABELS[key]}
                  </dt>
                  <dd className="text-sm text-gray-800 whitespace-pre-wrap">{display}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </div>
  )
}

// CSV download helper — uses data: URI so blob: CSP restriction is avoided
function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const a = document.createElement('a')
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
  a.download = filename
  a.click()
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

// ── main component ─────────────────────────────────────────────────────────────

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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pamilyaSaving, setPamilyaSaving] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({})

  // computed filtered lists
  const filteredAding = adingFilter === 'all'
    ? adingApps
    : adingApps.filter(a => a.status === adingFilter)

  const filteredKuyate = kuyateFilter === 'all'
    ? kuyateApps
    : kuyateApps.filter(a => a.status === kuyateFilter)

  // count helpers
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

  // optimistic status updates
  async function updateAdingStatus(id: string, newStatus: Status) {
    const prev = adingApps
    setAdingApps(apps => apps.map(a => a.id === id ? { ...a, status: newStatus } : a))

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

    const res = await fetch(`/api/officer/applications/ading/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pamilya }),
    })

    if (res.ok) {
      // update the nested members.pamilya in local state
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
    <main className="max-w-4xl mx-auto px-6 py-10">
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
            <FilterBar active={adingFilter} onChange={setAdingFilter} counts={adingCounts()} />
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
            <div className="flex flex-col gap-4">
              {filteredAding.map(app => (
                <AdingCard
                  key={app.id}
                  app={app}
                  expanded={expandedId === app.id}
                  onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onStatusChange={s => updateAdingStatus(app.id, s)}
                  onPamilyaChange={p => updatePamilya(app.id, p)}
                  pamilyaSaving={pamilyaSaving[app.id] ?? null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* kuyate tab */}
      {tab === 'kuyate' && (
        <section>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <FilterBar active={kuyateFilter} onChange={setKuyateFilter} counts={kuyateCounts()} />
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
            <div className="flex flex-col gap-4">
              {filteredKuyate.map(app => (
                <KuyateCard
                  key={app.id}
                  app={app}
                  expanded={expandedId === app.id}
                  onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onStatusChange={s => updateKuyateStatus(app.id, s)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
