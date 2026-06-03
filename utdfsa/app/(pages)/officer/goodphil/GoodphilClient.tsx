'use client'

import { useState, useMemo } from 'react'
import type { GoodphilEligibility } from '@/types/database'

// ── helpers ───────────────────────────────────────────────────────────────────

function PassFail({ pass, label }: { pass: boolean; label?: string }) {
  return (
    <span className={`font-semibold ${pass ? 'text-green-600' : 'text-red-500'}`}>
      {label !== undefined && <span className="mr-1 font-normal text-gray-900">{label}</span>}
      {pass ? '✓' : '✗'}
    </span>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function GoodphilClient({ members }: { members: GoodphilEligibility[] }) {
  const [query, setQuery] = useState('')

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   members (GoodphilEligibility[]) — all active members from the view,
  //     each has: id, first_name, last_name, email, pamilya, points,
  //     dues_paid, attended_risk_mgmt, total_meetings_attended,
  //     meets_points_requirement, automated_requirements_met
  //   query (string) — current search input, filters by first or last name
  //   filtered (GoodphilEligibility[]) — members after applying query filter
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

  function exportCSV() {
    const header = [
      'Last Name', 'First Name', 'Pamilya', 'Points',
      'Risk Mgmt Attended', 'Total Meetings', 'Meets Requirements',
    ]
    const rows = filtered.map(m => [
      m.last_name,
      m.first_name,
      m.pamilya ?? '',
      String(m.points ?? 0),
      m.attended_risk_mgmt ? 'YES' : 'NO',
      String(m.total_meetings_attended),
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
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goodphil Eligibility</h1>
          <p className="text-sm text-gray-700 mt-1">
            Requirements: 3 total meetings (including Risk Management) + 6 points
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* only renders member count — do not remove */}
        <span className="text-sm text-gray-700">
          {filtered.length} member{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-900">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-900">Pamilya</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-900">Points ≥ 6</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-900">Risk Mgmt</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-900">Meetings ≥ 3</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-900">Eligible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* only renders empty state when no rows match — do not remove this condition */}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                  <span className="text-gray-600">{query ? 'No members match your search.' : 'No members found.'}</span>
                </td>
              </tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.last_name}, {m.first_name}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{m.pamilya ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {/* meets_points_requirement is the db-computed flag (points >= 6) */}
                    <PassFail pass={m.meets_points_requirement} label={String(m.points ?? 0)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PassFail pass={m.attended_risk_mgmt} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PassFail pass={m.total_meetings_attended >= 3} label={String(m.total_meetings_attended)} />
                  </td>
                  {/* automated_requirements_met is the most important column — styled larger */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xl font-black ${m.automated_requirements_met ? 'text-green-600' : 'text-red-500'}`}>
                      {m.automated_requirements_met ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
