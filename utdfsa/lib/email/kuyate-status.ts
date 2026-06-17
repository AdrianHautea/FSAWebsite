// ── lib/email/kuyate-status.ts ────────────────────────────
// html email template for kuya/ate application status notifications
//
// notes: sent by officers via the /officer/applications review UI;
//        two branches — accepted (with optional pamilya name) and rejected;
//        inline styles are required for email client compatibility

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
  if (status === 'accepted') {
    const subject = 'Congratulations — You have been accepted as a Kuya/Ate!'

    // render a different paragraph depending on whether the pamilya has been assigned
    const pamilyaLine = pamilyaName
      ? `<p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
           You have been matched with <strong style="color:#ffffff;font-weight:700;">${pamilyaName}</strong>. Your pam chair will be in touch
           with next steps &mdash; keep an eye on your inbox!
         </p>`
      : `<p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
           Your pamilya assignment is being finalized. Look out for further instructions from your
           pam chair soon!
         </p>`

    const html = `<!DOCTYPE html>
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
            <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:900;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.01em;line-height:1.05;">Kuya/Ate Application</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:40px 44px 44px;">
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</p>
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              We are thrilled to welcome you as an official Kuya/Ate of UTD FSA! Your application has
              been reviewed and we are so excited to have you join the family.
            </p>

            <!-- mandatory kuyate meeting — all accepted kuyates must attend; do not remove -->
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0f170e" style="background:#0f170e;border-left:4px solid #466a47;margin:0 0 18px;">
              <tr>
                <td style="padding:14px 18px;color:#d4d4d4;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
                  <strong style="color:#ffffff;">MANDATORY KUYATE MEETING:</strong> All accepted Kuya/Ates are required to attend
                  the mandatory Kuyate meeting on <strong style="color:#ffffff;">September 9th at 7:00 PM</strong>.
                  Location details will be shared closer to the date.
                  This meeting is required &mdash; please clear your schedule.
                </td>
              </tr>
            </table>

            ${pamilyaLine}
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              Thank you for your commitment to our community. We cannot wait to see everything you
              bring to the org!
            </p>
            <p style="margin:0 0 4px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Mahal namin kayo,</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#7fae80;font-family:Arial,Helvetica,sans-serif;">UTD FSA</p>
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

    return { subject, html }
  }

  // rejected
  const subject = 'UTD FSA Kuya/Ate Application Update'

  const html = `<!DOCTYPE html>
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
            <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:900;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.01em;line-height:1.05;">Kuya/Ate Application</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:40px 44px 44px;">
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</p>
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              Thank you so much for taking the time to apply to be a Kuya/Ate of UTD FSA. We truly
              appreciate your interest and the effort you put into your application.
            </p>
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              After careful review, we are not able to move forward with your application for this
              cycle. This was a difficult decision &mdash; we had many wonderful applicants and limited spots.
            </p>
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              We encourage you to stay involved as an ading and to apply again in a future cycle. Your
              enthusiasm means a lot to us and we hope to see you at our upcoming events!
            </p>
            <p style="margin:0 0 4px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Mahal namin kayo,</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#7fae80;font-family:Arial,Helvetica,sans-serif;">UTD FSA</p>
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

  return { subject, html }
}
