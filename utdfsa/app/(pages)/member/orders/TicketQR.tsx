// ── TicketQR.tsx ─────────────────────────────────────────────
// client component — renders a single qr code image from a ticket code string
//
// data:  code prop (qr_code field from registration_tickets table)
// deps:  qrcode (npm) — encodes the code string into a png data url
// notes: this is a standalone version; OrdersClient has its own inline TicketQRImage;
//        kept separate for use in other contexts (e.g. officer check-in views)
'use client'

import { useEffect, useState } from 'react'

export default function TicketQR({ code }: { code: string }) {
  // holds the base64 png data url; empty string while the qr is being generated
  const [dataUrl, setDataUrl] = useState('')

  // generates the qr image whenever the ticket code changes; runs once on mount
  useEffect(() => {
    import('qrcode').then(({ default: QR }) =>
      QR.toDataURL(code, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(setDataUrl).catch(console.error)
    )
  }, [code])

  if (!dataUrl) {
    return <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg animate-pulse" />
  }

  return (
    <img
      src={dataUrl}
      alt="Ticket QR Code"
      width={200}
      height={200}
      className="rounded-lg border border-gray-200"
    />
  )
}
