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
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { color-scheme: light dark; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;font-family:Arial,Helvetica,sans-serif;color-scheme:light dark;">
  <!--[if !mso]><!-->
  <div style="background:linear-gradient(rgba(255,255,255,0.01),rgba(255,255,255,0.01));display:none;max-height:0;overflow:hidden;mso-hide:all;">
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <!--<![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0e0e0e" style="background:#0e0e0e;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" bgcolor="#0b0b0b" style="background:#0b0b0b;border-radius:12px;overflow:hidden;max-width:600px;width:100%;border:1px solid rgba(255,255,255,0.09);">

        <!-- header -->
        <tr>
          <td style="padding:0;">
            <img
              src="https://www.utdfsa.org/ticket-confirm.png"
              alt="Your Ticket"
              width="600"
              style="
                display:block;
                width:100%;
                max-width:600px;
                height:auto;
                border:0;
              "
            />
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

        <!-- footer — nested table keeps both rows visible in gmail; separate <p> tags get collapsed -->
        <tr>
          <td bgcolor="#080808" style="background:#080808;padding:20px 44px;border-top:1px solid rgba(255,255,255,0.07);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align:center;padding-bottom:7px;font-size:11px;line-height:1.55;color:#4a4a4a;font-family:Arial,Helvetica,sans-serif;">
                  This ticket was purchased on your behalf. For information on how UTD FSA handles your data, see our <a href="https://www.utdfsa.org/privacy" style="color:#5a5a5a;text-decoration:underline;">Privacy Policy</a>.
                </td>
              </tr>
              <tr>
                <td style="text-align:center;font-size:12px;color:#6f6f6f;letter-spacing:0.01em;font-family:Arial,Helvetica,sans-serif;">
                  UTD Filipino Student Association &mdash; University of Texas at Dallas
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
