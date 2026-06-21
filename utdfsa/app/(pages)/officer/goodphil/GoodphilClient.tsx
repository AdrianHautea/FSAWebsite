// ── GoodphilClient.tsx ────────────────────────────────────
// officer client component displaying goodphil eligibility for all active members.
//
// data:  goodphil_eligibility (db view), members.phone (merged server-side)
// notes: all filtering, pagination, and csv export are purely client-side.
//        eligibility thresholds (3 meetings, risk mgmt attended, 6 points) come
//        from the db view — they are not hardcoded here.
'use client'

import { useState, useMemo, useEffect } from 'react'
import type { GoodphilEligibility } from '@/types/database'

// ── helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

function PassFail({ pass, label }: { pass: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label !== undefined && (
        <span className="font-semibold text-[13.5px] text-[#d4d4d4]">{label}</span>
      )}
      {pass ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5fcf8f" strokeWidth={2.4}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ef6f6f" strokeWidth={2.4}>
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
        </svg>
      )}
    </span>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function GoodphilClient({ members }: { members: GoodphilEligibility[] }) {
  // search string — filters by first or last name (case-insensitive)
  const [query, setQuery] = useState('')
  // 0-indexed current page
  const [page, setPage] = useState(0)

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   members (GoodphilEligibility[]) — all active members from the view,
  //     each has: id, first_name, last_name, email, phone, pamilya, points,
  //     dues_paid, attended_risk_mgmt, total_meetings_attended,
  //     meets_points_requirement, automated_requirements_met
  //   query (string) — current search input, filters by first or last name
  //   filtered (GoodphilEligibility[]) — members after applying query filter
  //   page (number) — current 0-indexed page; resets to 0 when query changes
  //   paginated (GoodphilEligibility[]) — the current page's slice of filtered
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return members
    return members.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q)
    )
  }, [members, query])

  // reset to page 0 whenever the search query changes
  useEffect(() => { setPage(0) }, [query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // clamp page index so a narrowing search can't leave us past the last page
  const safePage = Math.min(page, totalPages - 1)
  // 0-indexed start position for the current page
  const start = safePage * PAGE_SIZE
  // exclusive end — capped to filtered.length to avoid showing empty rows
  const end = Math.min(start + PAGE_SIZE, filtered.length)
  const paginated = filtered.slice(start, end)

  function exportCSV() {
    const header = [
      'Last Name', 'First Name', 'Email', 'Phone',
      'Total Meetings', 'Risk Mgmt Attended', 'Points', 'Meets Requirements',
    ]
    const rows = filtered.map(m => [
      m.last_name,
      m.first_name,
      m.email,
      m.phone ?? '',
      String(m.total_meetings_attended),
      m.attended_risk_mgmt ? 'YES' : 'NO',
      String(m.points ?? 0),
      m.automated_requirements_met ? 'YES' : 'NO',
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'goodphil-eligibility.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[#070707] px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto">
        {/* page header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display font-black text-[32px] text-white tracking-tight leading-[1.02] mb-2">
              Goodphil Eligibility
            </h1>
            <p className="text-[14.5px] text-[#8c8c8c] font-medium">
              Requirements: 3 total meetings (including Risk Management) + 6 points
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-[13px] bg-transparent border border-white/20 text-[#cfcfcf] text-sm font-bold hover:border-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export CSV
          </button>
        </div>

        {/* search + pagination controls */}
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5a5a]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d0d] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#5a5a5a] focus:outline-none focus:border-[#9747FF] focus:shadow-[0_0_0_3px_rgba(151,71,255,0.18)] transition-[border-color,box-shadow]"
            />
          </div>

          {/* Gmail-style pagination indicator — only renders when there is more than one page */}
          {/* do not remove this condition */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] text-[#6e6e6e] font-medium">
                {start + 1}–{end} of {filtered.length}
              </span>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8c8c8c] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base"
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8c8c8c] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* table */}
        <div className="overflow-x-auto rounded-[18px] border border-white/8 bg-[#121212]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Name</th>
                <th className="text-left px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Email</th>
                <th className="text-left px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Phone</th>
                <th className="text-center px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Meetings ≥ 3</th>
                <th className="text-center px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Risk Mgmt</th>
                <th className="text-center px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Points ≥ 6</th>
                <th className="text-center px-5 py-4 text-[10.5px] font-bold tracking-[0.1em] uppercase text-[#7e7e7e]">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {/* only renders empty state when no rows match — do not remove this condition */}
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-sm">
                    <span className="text-[#5e5e5e]">{query ? 'No members match your search.' : 'No members found.'}</span>
                  </td>
                </tr>
              ) : (
                paginated.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02] ${
                      i % 2 === 1 ? 'bg-white/[0.018]' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 font-semibold text-[#e8e8e8]">
                      {m.last_name}, {m.first_name}
                    </td>
                    <td className="px-5 py-3.5 text-[#9a9a9a]">{m.email}</td>
                    <td className="px-5 py-3.5 text-[#9a9a9a]">{m.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <PassFail pass={m.total_meetings_attended >= 3} label={String(m.total_meetings_attended)} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <PassFail pass={m.attended_risk_mgmt} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {/* meets_points_requirement is the db-computed flag (points >= 6) */}
                      <PassFail pass={m.meets_points_requirement} label={String(m.points ?? 0)} />
                    </td>
                    {/* automated_requirements_met is the most important column — styled larger */}
                    <td className="px-5 py-3.5 text-center">
                      {m.automated_requirements_met ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5fcf8f" strokeWidth={2.4} className="mx-auto">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef6f6f" strokeWidth={2.4} className="mx-auto">
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                        </svg>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
