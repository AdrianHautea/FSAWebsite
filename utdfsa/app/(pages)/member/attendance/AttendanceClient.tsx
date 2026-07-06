// ── AttendanceClient.tsx ─────────────────────────────────────
// client component — renders the attendance history page
//
// data:  props from AttendancePage server component (attendance records, points, meeting/risk counts)
// notes: goodphil eligibility requires 6+ points, 3+ meetings, and at least one risk management session;
//        events may be returned as an object or single-element array due to supabase join behavior
'use client'

import { useEffect, useState } from 'react'
import { getEventTypeColor } from '@/utils/eventTypes'

type EventInfo = {
  id: string
  name: string
  event_type: string
  event_date: string
  points: number | null
}

type AttendanceRecord = {
  id: string
  created_at: string
  // supabase may return joined rows as an object or single-element array depending on the relation cardinality
  events: EventInfo | EventInfo[] | null
}

type Props = {
  member: { points: number }
  attendanceRecords: AttendanceRecord[]
  meetingCount: number
  riskMgmtCount: number
}

// ── helpers ───────────────────────────────────────────────────

// format iso date string to "Jan 1, 2025" in central time
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

// normalizes the supabase join result — the events field may be an array or a plain object
function resolveEvent(raw: EventInfo | EventInfo[] | null): EventInfo | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

// ── component ─────────────────────────────────────────────────
export default function AttendanceClient({ member, attendanceRecords, meetingCount, riskMgmtCount }: Props) {
  const points = member.points ?? 0

  // clamp progress to 100% so bars don't overflow when requirements are exceeded
  const pointsProgress  = Math.min((points / 6) * 100, 100)
  const meetingsProgress = Math.min((meetingCount / 3) * 100, 100)

  // trigger CSS transition from 0 → target width on mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // goodphil eligibility: 6+ points, 3+ meetings, and risk management attended at least once
  const isEligible = points >= 6 && meetingCount >= 3 && riskMgmtCount > 0

  // count the points total up from 0, synced to the 700ms progress-bar fill duration
  const [displayPoints, setDisplayPoints] = useState(0)
  useEffect(() => {
    if (!mounted) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || points === 0) { setDisplayPoints(points); return }

    const duration = 700
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4) // ease-out-quart
      setDisplayPoints(Math.round(eased * points))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mounted, points])

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div style={{ animation: 'fadeUp 450ms cubic-bezier(0.16,1,0.3,1) both' }}>
        <h1 className="font-display text-2xl font-bold text-white mb-1">Attendance History</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-dim)' }}>
          Track your points and Goodphil eligibility.
        </p>
      </div>

      {/* ── Points summary card ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.07)',
          animation: 'fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 80ms both',
        }}
      >
        {/* Header row: big points number + eligibility badge */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-display text-5xl font-bold text-white leading-none">{displayPoints}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-dim)' }}>Total Points</p>
          </div>
          <span
            className={`text-[11px] font-bold tracking-[0.04em] px-2.5 py-0.5 rounded-full mt-1 ${
              isEligible
                ? 'bg-[rgba(95,207,143,0.12)] border border-[rgba(95,207,143,0.35)] text-[#5fcf8f]'
                : 'bg-[rgba(255,255,255,0.06)] border border-white/10 text-[#7a7a7a]'
            }`}
            style={mounted && isEligible ? { animation: 'fsa-check-pop 500ms cubic-bezier(0.16,1,0.3,1) both' } : undefined}
          >
            {isEligible ? '✓ Goodphil Eligible' : 'Requirements not yet met'}
          </span>
        </div>

        {/* Progress bar 1 — Goodphil Points (6 required) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Goodphil Points
            </p>
            {points >= 6 ? (
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-green)' }}>✓ Requirement Met</span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                {points} / 6 required
              </span>
            )}
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{
              background: '#0e0e0e',
              animation: mounted && points >= 6 ? 'fsa-bar-glow 700ms cubic-bezier(0.16,1,0.3,1) 700ms 1 both' : undefined,
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: mounted ? `${pointsProgress}%` : '0%',
                background: points >= 6 ? 'var(--accent-green)' : 'rgba(117,186,120,0.65)',
              }}
            />
          </div>
        </div>

        {/* Progress bar 2 — Meetings (3 required) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Meetings Attended
            </p>
            {meetingCount >= 3 ? (
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-green)' }}>✓ Requirement Met</span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                {meetingCount} / 3 required
              </span>
            )}
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{
              background: '#0e0e0e',
              animation: mounted && meetingCount >= 3 ? 'fsa-bar-glow 700ms cubic-bezier(0.16,1,0.3,1) 700ms 1 both' : undefined,
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: mounted ? `${meetingsProgress}%` : '0%',
                background: meetingCount >= 3 ? '#75ba78' : '#5a96ff',
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={riskMgmtCount > 0 ? { color: 'var(--accent-green)' } : { color: 'var(--accent-gold)' }}>
            {riskMgmtCount > 0
              ? '✓ Risk Management attended'
              : '⚠ Risk Management not yet attended'}
          </p>
        </div>
      </div>

      {/* ── Attendance list ───────────────────────────────────────── */}
      <p
        className="text-xs font-semibold uppercase tracking-[0.12em] mb-4"
        style={{ color: 'var(--color-text-muted)', animation: 'fadeUp 450ms cubic-bezier(0.16,1,0.3,1) 150ms both' }}
      >
        Attendance Log
      </p>

      {attendanceRecords.length === 0 ? (
        <div className="text-center py-16" style={{ animation: 'fadeUp 450ms cubic-bezier(0.16,1,0.3,1) 200ms both' }}>
          <p className="text-2xl mb-3" role="img" aria-label="calendar" style={{ animation: 'fsa-float 3s ease-in-out infinite' }}>📅</p>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            No attendance records yet
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Attend an event to start building your record.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--color-border-subtle)', animation: 'fadeUp 450ms cubic-bezier(0.16,1,0.3,1) 200ms both' }}
        >
          {attendanceRecords.map((record, idx) => {
            const event = resolveEvent(record.events)
            const dotColor = event ? getEventTypeColor(event.event_type) : '#9a9a9a'
            const isLast = idx === attendanceRecords.length - 1
            const staggerDelay = Math.min(idx, 10) * 40

            return (
              <div
                key={record.id}
                className="px-4 py-3.5 flex items-center gap-3 transition-[filter] duration-150 hover:brightness-125"
                style={{
                  background: idx % 2 === 0 ? '#1a1a1a' : '#1c1c1c',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  animation: `fadeUp 400ms cubic-bezier(0.16,1,0.3,1) ${240 + staggerDelay}ms both`,
                }}
              >
                {/* Colored event-type dot */}
                <div
                  className="rounded-full shrink-0"
                  style={{ width: 8, height: 8, background: dotColor, flexShrink: 0 }}
                />

                {/* Event name + type */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {event?.name ?? 'Unknown Event'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                    {event?.event_type ?? ''}
                  </p>
                </div>

                {/* Date + points */}
                <div className="text-right shrink-0">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {event?.event_date ? fmtDate(event.event_date) : '—'}
                  </p>
                  {event?.points && event.points > 0 ? (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--accent-green)' }}>
                      +{event.points} pts
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>—</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
