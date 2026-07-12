// ── ScanClient.tsx ────────────────────────────────────────
// officer qr ticket scanner — fullscreen camera view for event check-in.
//
// deps:  POST /api/scan-ticket, html5-qrcode (npm)
// notes: mobile-first — designed for phone use at events.
//        do not add a max-width container — full screen is intentional.
//        do not add navbar padding — scan overlay must cover full viewport.
//        auth/role check happens in page.tsx (server component) before this renders.
//        the officer must pick an event before scans are accepted — the scanner
//        callback ignores frames until selectedEvent is set, and every scan is
//        validated against that event server-side (WRONG_EVENT rejection).
'use client'

// mobile-first page — designed for phone use at events
// do not add a max-width container — full screen is intentional
// do not add navbar padding — scan overlay must cover full viewport

import { useEffect, useRef, useState } from 'react'
import Modal from '@/components/Modal'
import { Html5Qrcode } from 'html5-qrcode'

export type ScannableEvent = {
  id: string
  name: string
  event_date: string
  event_type: string
  checked_in_count: number
  total_paid: number
}

type ScanResult =
  | { valid: true; attendee_name: string; event_name: string; reason: 'SUCCESS'; checked_in_count?: number; total_paid?: number }
  | { valid: false; reason: 'ALREADY_CHECKED_IN'; message: string; checked_in_at?: string; attendee_name: string; checked_in_count?: number; total_paid?: number }
  | { valid: false; reason: 'WRONG_EVENT'; message: string; attendee_name: string; ticket_event_name: string }
  | { valid: false; reason: 'NOT_PAID' | 'INVALID_TICKET'; message: string }
  | null

function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Chicago',
  })
}

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   events (ScannableEvent[]) — active events for the picker, soonest first
//   selectedEvent (ScannableEvent | null) — null until the officer picks one
//   tally ({ checked_in_count, total_paid } | null) — live door count
//   result (ScanResult | null) — set after each QR scan; null between scans
//     if valid: { attendee_name, event_name, reason: 'SUCCESS' }
//     if invalid: { reason: 'ALREADY_CHECKED_IN' | 'WRONG_EVENT' | 'NOT_PAID' | 'INVALID_TICKET', message, ... }
//   cameraError (string | null) — set when the camera fails to start
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function ScanClient({ events }: { events: ScannableEvent[] }) {
  // result of the most recent scan — null between scans, set for 2.5 s after each
  const [result, setResult] = useState<ScanResult>(null)
  // set when the camera fails to start (permission denied, no camera, etc.)
  const [cameraError, setCameraError] = useState<string | null>(null)
  // the event the officer is working the door for — scans are ignored until set
  const [selectedEvent, setSelectedEvent] = useState<ScannableEvent | null>(null)
  // live door count for the selected event — seeded from props, refreshed per scan response
  const [tally, setTally] = useState<{ checked_in_count: number; total_paid: number } | null>(null)
  // prevents the scanner callback from firing again while the result overlay is visible
  const processingRef = useRef(false)
  // ref mirror of selectedEvent — the scanner callback closes over mount-time state,
  // so it must read the current selection through a ref, not the stale closure
  const selectedEventRef = useRef<ScannableEvent | null>(null)
  // holds the Html5Qrcode instance so the cleanup function can stop it
  const scannerRef = useRef<Html5Qrcode | null>(null)
  // tracks whether start() resolved successfully — stop() must not be called if start() never resolved
  const startedRef = useRef(false)

  function pickEvent(ev: ScannableEvent) {
    selectedEventRef.current = ev
    setSelectedEvent(ev)
    setTally({ checked_in_count: ev.checked_in_count, total_paid: ev.total_paid })
  }

  function switchEvent() {
    selectedEventRef.current = null
    setSelectedEvent(null)
    setTally(null)
  }

  // effect: starts the camera scanner on mount, runs continuously, cleans up on unmount — do not remove or reorder
  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        // no event picked yet — ignore frames; the picker overlay is covering the screen
        const event = selectedEventRef.current
        if (!event) return
        // debounce: ignore while result overlay is showing
        if (processingRef.current) return
        processingRef.current = true

        let scanResult: ScanResult = { valid: false, reason: 'INVALID_TICKET', message: 'Scan failed' }

        try {
          // api: calls POST /api/scan-ticket — validates QR code against the selected
          // event and marks the ticket as checked in — do not change this endpoint
          const res = await fetch('/api/scan-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: decodedText, event_id: event.id }),
          })
          if (res.ok) scanResult = await res.json()
        } catch {}

        setResult(scanResult)

        // refresh the door tally when the response carries updated counts
        if (scanResult && 'checked_in_count' in scanResult && scanResult.checked_in_count != null) {
          setTally({
            checked_in_count: scanResult.checked_in_count,
            total_paid: scanResult.total_paid ?? 0,
          })
        }

        // clear overlay and re-arm for next scan after 2.5 seconds
        // 2.5 s gives the officer enough time to read the result before the camera resumes
        setTimeout(() => {
          setResult(null)
          processingRef.current = false
        }, 2500)
      },
      () => {} // ignore per-frame errors
    ).then(() => {
      startedRef.current = true
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setCameraError('Camera access was denied. Please allow camera access in your browser settings and reload the page.')
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no camera') || msg.toLowerCase().includes('could not start')) {
        setCameraError('No camera was detected on this device. Connect a camera or use a mobile device to scan tickets.')
      } else {
        setCameraError(`Camera could not be started: ${msg}`)
      }
    })

    // only call stop() if start() succeeded — calling stop on a never-started scanner throws
    return () => {
      if (startedRef.current) scanner.stop().catch(() => {})
    }
  }, []) // scanner starts once and stays running — no stop/restart cycle

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white">

      {/* only renders when the camera fails to initialize (no camera, permission denied, etc.) — do not remove this condition */}
      {cameraError && (
        <Modal onClose={() => setCameraError(null)} size="sm">
          <div className="bg-white rounded-2xl shadow-xl w-full p-6 text-center">
            <div className="text-5xl mb-4">📷</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Camera Not Available</h2>
            <p className="text-sm text-gray-600 mb-6">{cameraError}</p>
            <button
              onClick={() => setCameraError(null)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Dismiss
            </button>
          </div>
        </Modal>
      )}

      {/* event picker — covers the screen until the officer picks which door they're working; do not remove this condition */}
      {!selectedEvent && !cameraError && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#070707] px-5">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-[7px] h-[7px] rounded-full bg-[#9747FF]" />
              <h1 className="font-display font-bold text-[19px] tracking-[-0.01em]">Select event</h1>
            </div>
            <p className="text-sm text-[#8c8c8c] mb-6">Tickets for any other event will be rejected at this door.</p>

            {events.length === 0 ? (
              <p className="text-[#5e5e5e] text-sm py-8 text-center border border-white/10 rounded-2xl">
                No active events to scan for right now.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto">
                {events.map(ev => (
                  <li key={ev.id}>
                    <button
                      onClick={() => pickEvent(ev)}
                      className="w-full text-left px-4 py-3.5 rounded-2xl bg-[#141414] border border-white/10 hover:border-[#9747FF] transition-colors cursor-pointer"
                    >
                      <span className="block font-semibold text-[15px] text-white">{ev.name}</span>
                      <span className="flex items-center justify-between mt-1">
                        <span className="text-[13px] text-[#8c8c8c]">{fmtEventDate(ev.event_date)}</span>
                        <span className="text-[13px] font-medium text-[#cfcfcf] tabular-nums">
                          {ev.checked_in_count}/{ev.total_paid} checked in
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* only renders for 2.5 s after each QR scan to display the pass/fail result — do not remove this condition */}
      {result && (
        <div
          role="alert"
          className={`fixed inset-0 flex flex-col items-center justify-center z-50
          ${result.valid ? 'bg-green-600' : 'bg-red-600'}`}
        >
          <div className="text-8xl mb-6">
            {result.valid ? '✅' : '❌'}
          </div>

          {/* only renders for a successful, first-time check-in — do not remove this condition */}
          {result.valid ? (
            <>
              <h1 className="text-4xl font-black mb-2">VALID TICKET</h1>
              <p className="text-2xl">{result.attendee_name}</p>
              <p className="text-lg opacity-75 mt-1">{result.event_name}</p>
            </>
          ) : result.reason === 'ALREADY_CHECKED_IN' ? (
            // only renders when the ticket was already scanned — do not remove this condition
            <>
              <h1 className="text-4xl font-black mb-2">ALREADY CHECKED IN</h1>
              <p className="text-2xl">{result.attendee_name}</p>
              {result.checked_in_at && (
                <p className="text-lg opacity-75 mt-1">
                  at {new Date(result.checked_in_at).toLocaleTimeString('en-US', { timeZone: 'America/Chicago' })}
                </p>
              )}
            </>
          ) : result.reason === 'WRONG_EVENT' ? (
            // only renders when the ticket belongs to a different event — do not remove this condition
            <>
              <h1 className="text-4xl font-black mb-2">WRONG EVENT</h1>
              <p className="text-2xl">{result.attendee_name}</p>
              <p className="text-lg opacity-75 mt-1">Ticket is for: {result.ticket_event_name}</p>
            </>
          ) : result.reason === 'NOT_PAID' ? (
            // only renders when the ticket's payment is not confirmed — do not remove this condition
            <h1 className="text-4xl font-black">PAYMENT NOT VERIFIED</h1>
          ) : (
            <h1 className="text-4xl font-black">INVALID TICKET</h1>
          )}

          <p className="mt-8 opacity-50 text-sm">Resetting in 2.5 seconds...</p>
        </div>
      )}

      {/* header chip — selected event + live door tally; only renders once an event is picked */}
      {selectedEvent && (
        <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-[#070707]/90 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selectedEvent.name}</p>
            <p className="text-[13px] text-[#8c8c8c] tabular-nums">
              {tally ? `${tally.checked_in_count}/${tally.total_paid} checked in` : '—'}
            </p>
          </div>
          <button
            onClick={switchEvent}
            className="flex-shrink-0 px-3.5 py-2 rounded-[10px] bg-white/6 hover:bg-white/12 border border-white/10 text-[13px] font-semibold text-[#cfcfcf] transition-colors cursor-pointer"
          >
            Switch event
          </button>
        </div>
      )}

      {/* camera view — Html5Qrcode mounts its video feed into this div via the 'qr-reader' id — do not rename or remove */}
      <div id="qr-reader" className="w-full max-w-sm" />
      <p className="mt-4 text-gray-400 text-sm">Point camera at ticket QR code</p>

    </main>
  )
}
