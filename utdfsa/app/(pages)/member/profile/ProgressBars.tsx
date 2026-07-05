// ── ProgressBars.tsx ─────────────────────────────────────────
// client component — Goodphil eligibility progress bars for the profile page
//
// notes: page.tsx is a server component and can't hold the mount-trigger
//        state itself; mirrors the 0→target width animation already used
//        on the attendance page (AttendanceClient) so both pages match
'use client'

import { useEffect, useState } from 'react'

type Props = {
  goodphilPoints: number
  goodphilMeetings: number
  riskMgmtAttended: boolean
  isGoodphilEligible: boolean
}

export default function ProgressBars({ goodphilPoints, goodphilMeetings, riskMgmtAttended, isGoodphilEligible }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const pointsWidth = Math.min((goodphilPoints / 6) * 100, 100)
  const meetingsWidth = Math.min((goodphilMeetings / 3) * 100, 100)

  return (
    <div className="border-t border-white/10 pt-5">
      <p className="font-display font-black text-xs uppercase tracking-widest text-white/50 mb-4">
        Goodphil Eligibility
      </p>

      {/* Points bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-sans text-xs text-white/60">Goodphil Points (6 required)</span>
          <span className="font-display font-bold text-xs text-white/60">{Math.min(goodphilPoints, 6)} / 6</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-green transition-all duration-700"
            style={{ width: mounted ? `${pointsWidth}%` : '0%' }}
          />
        </div>
        {goodphilPoints >= 6 && (
          <p className="font-sans text-xs text-accent-green mt-1">✓ Points requirement met</p>
        )}
      </div>

      {/* Meetings bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5 gap-2">
          <span className="font-sans text-xs text-white/60">Meetings Attended (3 required)</span>
          <span className="font-display font-bold text-xs text-white/60 shrink-0">{Math.min(goodphilMeetings, 3)} / 3</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: mounted ? `${meetingsWidth}%` : '0%',
              background: goodphilMeetings >= 3 ? '#75ba78' : '#5a96ff',
            }}
          />
        </div>
        <p className={`font-sans text-xs mt-1 ${riskMgmtAttended ? 'text-accent-green' : 'text-white/40'}`}>
          {riskMgmtAttended ? '✓ Risk Management: Attended' : 'Risk Management: Not yet attended'}
        </p>
      </div>

      {/* Eligibility status */}
      <div className="pt-3 border-t border-white/10">
        {isGoodphilEligible ? (
          <p className="font-display font-bold text-sm text-accent-green uppercase tracking-wide">
            ✓ Goodphil Eligible
          </p>
        ) : (
          <p className="font-sans text-sm text-white/40">
            Requirements not yet met
          </p>
        )}
      </div>
    </div>
  )
}
