// ── ticket.ts ─────────────────────────────────────────────────────────────────
// generates the html body for the event ticket email containing the attendee's qr code.
//
// notes: table-based layout for broad email client compatibility.
//        qr code is embedded as a cid inline attachment (not a data: url) because
//        gmail, outlook, and apple mail all block data: urls in email bodies.
//        the cid value ('ticket_qr') must match the contentId set in resend's
//        attachments array in the stripe-webhook route.
//        date/time is formatted in america/chicago (ct) — utd is in dallas, tx.
//        called once per ticket per registration after payment succeeds.

export function ticketEmailHtml({
  attendeeName,
  eventName,
  eventDate,
  location,
  qrCid,
}: {
  attendeeName: string
  eventName: string
  eventDate: string | null
  location: string | null
  qrCid: string
}): string {
  // format event_date (iso string) into a human-readable date in central time
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Chicago',
      })
    : null

  // format time separately so it can be appended inline after the date
  const timeStr = eventDate
    ? new Date(eventDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Chicago',
      })
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#070707;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#070707" style="background:#070707;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" bgcolor="#0b0b0b" style="background:#0b0b0b;border-radius:12px;overflow:hidden;max-width:600px;width:100%;border:1px solid rgba(255,255,255,0.09);">

        <!-- header -->
        <tr>
          <td bgcolor="#10220f" style="background:linear-gradient(135deg,#0a160c 0%,#10220f 55%,#16331a 100%);padding:40px 44px 36px;border-bottom:1px solid rgba(70,106,71,0.25);">
            <table cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="https://www.utdfsa.org/logo-head.png" width="36" height="36" alt="UTD FSA" style="display:block;border:0;" />
                </td>
                <td style="vertical-align:middle;padding-left:10px;">
                  <span style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9db89e;font-family:Arial,Helvetica,sans-serif;">Filipino Student Association</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:900;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.01em;line-height:1.05;">Your Ticket</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:38px 44px 44px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9a9a9a;font-family:Arial,Helvetica,sans-serif;">Hi ${attendeeName},</p>
            <h2 style="margin:0 0 22px;font-size:22px;font-weight:900;color:#ffffff;line-height:1.1;font-family:Arial,Helvetica,sans-serif;">${eventName}</h2>

            <!-- date and location -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:26px;">
              ${dateStr ? `<tr>
                <td style="padding-bottom:12px;font-size:15px;font-weight:700;color:#dcdcdc;font-family:Arial,Helvetica,sans-serif;">
                  &#128197; ${dateStr}${timeStr ? ` &middot; ${timeStr} CT` : ''}
                </td>
              </tr>` : ''}
              ${location ? `<tr>
                <td style="font-size:15px;font-weight:700;color:#dcdcdc;font-family:Arial,Helvetica,sans-serif;">
                  &#128205; ${location}
                </td>
              </tr>` : ''}
            </table>

            <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#bdbdbd;font-family:Arial,Helvetica,sans-serif;">
              Show the QR code below at the door. Each QR code is unique and can only be scanned once.
            </p>

            <!-- QR code — cid:${qrCid} embeds the attachment; do not change this reference -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 0;">
                  <img src="cid:${qrCid}" width="220" height="220" alt="Ticket QR Code"
                    style="display:block;border:1px solid rgba(70,106,71,0.35);border-radius:10px;padding:14px;background:#ffffff;" />
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#6f6f6f;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              Do not share this QR code &mdash; it is tied to your name.
            </p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td bgcolor="#080808" style="background:#080808;padding:20px 44px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
            <p style="margin:0;font-size:12px;color:#6f6f6f;letter-spacing:0.01em;font-family:Arial,Helvetica,sans-serif;">UTD Filipino Student Association &mdash; University of Texas at Dallas</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
