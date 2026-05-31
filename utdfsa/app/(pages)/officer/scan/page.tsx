'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type ScanResult =
  | { valid: true; attendee_name: string; event_name: string; reason: 'SUCCESS' }
  | { valid: false; reason: 'ALREADY_CHECKED_IN'; message: string; checked_in_at: string; attendee_name: string }
  | { valid: false; reason: 'NOT_PAID' | 'INVALID_TICKET'; message: string }
  | null

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult>(null)
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

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
          const res = await fetch('/api/scan-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: decodedText }),
          })
          if (res.ok) scanResult = await res.json()
        } catch {}

        setResult(scanResult)

        // clear overlay and re-arm for next scan after 4 seconds
        setTimeout(() => {
          setResult(null)
          processingRef.current = false
        }, 4000)
      },
      () => {} // ignore per-frame errors
    ).catch(console.error)

    return () => {
      scanner.stop().catch(() => {})
    }
  }, []) // scanner starts once and stays running — no stop/restart cycle

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white">

      {/* result overlay */}
      {result && (
        <div className={`fixed inset-0 flex flex-col items-center justify-center z-50
          ${result.valid ? 'bg-green-600' : 'bg-red-600'}`}
        >
          <div className="text-8xl mb-6">
            {result.valid ? '✅' : '❌'}
          </div>

          {result.valid ? (
            <>
              <h1 className="text-4xl font-black mb-2">VALID TICKET</h1>
              <p className="text-2xl">{result.attendee_name}</p>
              <p className="text-lg opacity-75 mt-1">{result.event_name}</p>
            </>
          ) : result.reason === 'ALREADY_CHECKED_IN' ? (
            <>
              <h1 className="text-4xl font-black mb-2">ALREADY CHECKED IN</h1>
              <p className="text-2xl">{result.attendee_name}</p>
              <p className="text-lg opacity-75 mt-1">
                at {new Date(result.checked_in_at).toLocaleTimeString()}
              </p>
            </>
          ) : result.reason === 'NOT_PAID' ? (
            <h1 className="text-4xl font-black">PAYMENT NOT VERIFIED</h1>
          ) : (
            <h1 className="text-4xl font-black">INVALID TICKET</h1>
          )}

          <p className="mt-8 opacity-50 text-sm">Resetting in 4 seconds...</p>
        </div>
      )}

      {/* camera view — scanner keeps running behind the overlay */}
      <div id="qr-reader" className="w-full max-w-sm" />
      <p className="mt-4 text-gray-400 text-sm">Point camera at ticket QR code</p>

    </main>
  )
}
