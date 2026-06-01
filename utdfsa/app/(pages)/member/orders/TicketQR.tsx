'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function TicketQR({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    QRCode.toDataURL(code, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(console.error)
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
