export function ticketEmailHtml({
  attendeeName,
  eventName,
  eventDate,
  location,
  qrDataUrl,
}: {
  attendeeName: string
  eventName: string
  eventDate: string | null
  location: string | null
  qrDataUrl: string
}): string {
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- header -->
        <tr>
          <td style="background:#1e40af;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#bfdbfe;font-size:13px;letter-spacing:1px;text-transform:uppercase;">UTD Filipino Student Association</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">Your Ticket</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Hi ${attendeeName},</p>
            <h2 style="margin:8px 0 0;color:#111827;font-size:20px;">${eventName}</h2>

            ${dateStr ? `<p style="margin:16px 0 0;color:#374151;font-size:14px;">📅 ${dateStr}</p>` : ''}
            ${location ? `<p style="margin:8px 0 0;color:#374151;font-size:14px;">📍 ${location}</p>` : ''}

            <p style="margin:24px 0 12px;color:#374151;font-size:14px;">
              Show the QR code below at the door. Each QR code is unique and can only be scanned once.
            </p>

            <!-- QR code -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:16px 0;">
                  <img src="${qrDataUrl}" width="220" height="220" alt="Ticket QR Code"
                    style="display:block;border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff;" />
                </td>
              </tr>
            </table>

            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
              Do not share this QR code — it is tied to your name.
            </p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">UTD Filipino Student Association &mdash; University of Texas at Dallas</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
