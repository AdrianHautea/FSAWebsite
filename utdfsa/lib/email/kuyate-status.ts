// ── lib/email/kuyate-status.ts ────────────────────────────
// html email template for kuya/ate application status notifications
//
// notes: sent by officers via the /officer/applications review UI;
//        two branches — accepted (with optional pamilya name) and rejected;
//        inline styles are required for email client compatibility

// ── helpers ───────────────────────────────────────────────

// escapes the five HTML-special characters so user-controlled values
// cannot inject tags or attributes into the email body
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── template function ─────────────────────────────────────

// returns { subject, html } for the appropriate status branch;
// triggered when an officer approves or rejects a kuyate application
export function kuyateStatusEmailHtml({
  firstName,
  status,
  pamilyaName,
}: {
  firstName: string
  status: 'accepted' | 'rejected'
  // pamilyaName is optional — omitted when the pamilya assignment hasn't been finalized yet
  pamilyaName?: string
}): { subject: string; html: string } {
  const safeName = escHtml(firstName)

  if (status === 'accepted') {
    const subject = 'Congratulations — You have been accepted as a Kuya/Ate!'

    // render a different paragraph depending on whether the pamilya has been assigned
    const pamilyaLine = pamilyaName
      ? `<p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
           You have been matched with <strong style="color:#2b2b2b;font-weight:700;">${escHtml(pamilyaName)}</strong>. Your pam chair will be in touch
           with next steps &mdash; keep an eye on your inbox!
         </p>`
      : `<p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
           Your pamilya assignment is being finalized. Look out for further instructions from your
           pam chair soon!
         </p>`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { color-scheme: light dark; }
    /* gmail dark mode — pin dark backgrounds; data-ogsc/ogsb are added by gmail to elements it has inverted */
    [data-ogsc] body, [data-ogsb] body { background-color: #f3f4f3 !important; }
    [data-ogsc] table, [data-ogsb] table { background-color: inherit !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f3;font-family:Arial,Helvetica,sans-serif;color-scheme:light dark;">
  <!--[if !mso]><!-->
  <div style="background:linear-gradient(rgba(255,255,255,0.01),rgba(255,255,255,0.01));display:none;max-height:0;overflow:hidden;mso-hide:all;">
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <!--<![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f4f3" style="background:#f3f4f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" bgcolor="#fafafa" style="background:#fafafa;border-radius:12px;overflow:hidden;max-width:600px;width:100%;border:1px solid rgba(255,255,255,0.09);">

        <!-- header -->
        <tr>
          <td style="padding:0;">
            <img
              src="https://www.utdfsa.org/kuyate-confirm.png"
              alt="Kuya/Ate Application"
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
          <td style="padding:40px 44px 44px;">
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Hi ${safeName},</p>
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              We are thrilled to welcome you as an official Kuya/Ate of UTD FSA! Your application has
              been reviewed and we are so excited to have you join the family.
            </p>

            <!-- mandatory kuyate meeting — all accepted kuyates must attend; do not remove -->
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#e1efe4" style="background:#e1efe4;border-left:4px solid #35603a;margin:0 0 18px;">
              <tr>
                <td style="padding:14px 18px;color:#2b2b2b;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
                  <strong style="color:#2b2b2b;">MANDATORY KUYATE MEETING:</strong> All accepted Kuya/Ates are required to attend
                  the mandatory Kuyate meeting on <strong style="color:#2b2b2b;">September 9th at 7:00 PM</strong>.
                  Location details will be shared closer to the date.
                  This meeting is required &mdash; please clear your schedule.
                </td>
              </tr>
            </table>

            ${pamilyaLine}
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              Thank you for your commitment to our community. We cannot wait to see everything you
              bring to the org!
            </p>
            <p style="margin:0 0 4px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Mahal namin kayo,</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#35603a;font-family:Arial,Helvetica,sans-serif;">UTD FSA</p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td bgcolor="#e9ebe9" style="background:#e9ebe9;padding:20px 44px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
            <p style="margin:0;font-size:12px;color:#2b2b2b;letter-spacing:0.01em;font-family:Arial,Helvetica,sans-serif;">UTD Filipino Student Association &mdash; University of Texas at Dallas</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    return { subject, html }
  }

  // rejected
  const subject = 'UTD FSA Kuya/Ate Application Update'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { color-scheme: light dark; }
    /* gmail dark mode — pin dark backgrounds; data-ogsc/ogsb are added by gmail to elements it has inverted */
    [data-ogsc] body, [data-ogsb] body { background-color: #f3f4f3 !important; }
    [data-ogsc] table, [data-ogsb] table { background-color: inherit !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f3;font-family:Arial,Helvetica,sans-serif;color-scheme:light dark;">
  <!--[if !mso]><!-->
  <div style="background:linear-gradient(rgba(255,255,255,0.01),rgba(255,255,255,0.01));display:none;max-height:0;overflow:hidden;mso-hide:all;">
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <!--<![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f4f3" style="background:#f3f4f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" bgcolor="#fafafa" style="background:#fafafa;border-radius:12px;overflow:hidden;max-width:600px;width:100%;border:1px solid rgba(255,255,255,0.09);">

        <!-- header -->
        <tr>
          <td style="padding:0;">
            <img
              src="https://www.utdfsa.org/kuyate-confirm.png"
              alt="Kuya/Ate Application"
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
          <td style="padding:40px 44px 44px;">
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Hi ${safeName},</p>
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              Thank you so much for taking the time to apply to be a Kuya/Ate of UTD FSA. We truly
              appreciate your interest and the effort you put into your application.
            </p>
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              After careful review, we are not able to move forward with your application for this
              cycle. This was a difficult decision &mdash; we had many wonderful applicants and limited spots.
            </p>
            <p style="margin:0 0 18px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              We encourage you to stay involved as an ading and to apply again in a future cycle. Your
              enthusiasm means a lot to us and we hope to see you at our upcoming events!
            </p>
            <p style="margin:0 0 4px;color:#2b2b2b;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Mahal namin kayo,</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#35603a;font-family:Arial,Helvetica,sans-serif;">UTD FSA</p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td bgcolor="#e9ebe9" style="background:#e9ebe9;padding:20px 44px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
            <p style="margin:0;font-size:12px;color:#2b2b2b;letter-spacing:0.01em;font-family:Arial,Helvetica,sans-serif;">UTD Filipino Student Association &mdash; University of Texas at Dallas</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
