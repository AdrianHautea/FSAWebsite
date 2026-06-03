'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type ScanResult =
  | { valid: true; attendee_name: string; event_name: string; reason: 'SUCCESS' }
  | { valid: false; reason: 'ALREADY_CHECKED_IN'; message: string; checked_in_at: string; attendee_name: string }
  | { valid: false; reason: 'NOT_PAID' | 'INVALID_TICKET'; message: string }
  | null

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   result (ScanResult | null) — set after each QR scan; null between scans
//     if valid: { attendee_name, event_name, reason: 'SUCCESS' }
//     if invalid: { reason: 'ALREADY_CHECKED_IN' | 'NOT_PAID' | 'INVALID_TICKET', message, ... }
//   cameraError (string | null) — set when the camera fails to start
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function ScanPage() {
  const [result, setResult] = useState<ScanResult>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        // debounce: ignore while result overlay is showing
        if (processingRef.current) return
        processingRef.current = true

        let scanResult: ScanResult = { valid: false, reason: 'INVALID_TICKET', message: 'Scan failed' }

        try {
          // api: calls POST /api/scan-ticket — validates QR code and marks ticket as checked in — do not change this endpoint
          const res = await fetch('/api/scan-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: decodedText }),
          })
          if (res.ok) scanResult = await res.json()
        } catch {}

        setResult(scanResult)

        // clear overlay and re-arm for next scan after 2.5 seconds
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
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
        </div>
      )}

      {/* only renders for 2.5 s after each QR scan to display the pass/fail result — do not remove this condition */}
      {result && (
        <div className={`fixed inset-0 flex flex-col items-center justify-center z-50
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
              <p className="text-lg opacity-75 mt-1">
                at {new Date(result.checked_in_at).toLocaleTimeString('en-US', { timeZone: 'America/Chicago' })}
              </p>
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

      {/* camera view — Html5Qrcode mounts its video feed into this div via the 'qr-reader' id — do not rename or remove */}
      <div id="qr-reader" className="w-full max-w-sm" />
      <p className="mt-4 text-gray-400 text-sm">Point camera at ticket QR code</p>

    </main>
  )
}
