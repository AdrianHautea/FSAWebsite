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
      ? `<p style="margin:0 0 16px;color:#374151;font-size:15px;">
           You have been matched with <strong>${pamilyaName}</strong>. Your pam chair will be in touch
           with next steps — keep an eye on your inbox!
         </p>`
      : `<p style="margin:0 0 16px;color:#374151;font-size:15px;">
           Your pamilya assignment is being finalized. Look out for further instructions from your
           pam chair soon!
         </p>`

    const html = `<!DOCTYPE html>
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
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">Kuya/Ate Application</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              We are thrilled to welcome you as an official Kuya/Ate of UTD FSA! Your application has
              been reviewed and we are so excited to have you join the family.
            </p>
            <p style="margin:16px 0;background-color:#1a1a2e;border-left:4px solid #1e40af;padding:12px 16px;border-radius:4px;color:#e5e7eb;font-size:15px;">
              <strong>MANDATORY KUYATE MEETING:</strong> All accepted Kuya/Ates are required to attend
              the mandatory Kuyate meeting on <strong>September 9th at 7:00 PM</strong>.
              Location details will be shared closer to the date.
              This meeting is required &mdash; please clear your schedule.
            </p>
            ${pamilyaLine}
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Thank you for your commitment to our community. We cannot wait to see everything you
              bring to the org!
            </p>
            <p style="margin:0;color:#374151;font-size:15px;">
              Mahal namin kayo,<br/>
              <strong>UTD FSA</strong>
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
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- header -->
        <tr>
          <td style="background:#1e40af;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#bfdbfe;font-size:13px;letter-spacing:1px;text-transform:uppercase;">UTD Filipino Student Association</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">Kuya/Ate Application</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Thank you so much for taking the time to apply to be a Kuya/Ate of UTD FSA. We truly
              appreciate your interest and the effort you put into your application.
            </p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              After careful review, we are not able to move forward with your application for this
              cycle. This was a difficult decision — we had many wonderful applicants and limited spots.
            </p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              We encourage you to stay involved as an ading and to apply again in a future cycle. Your
              enthusiasm means a lot to us and we hope to see you at our upcoming events!
            </p>
            <p style="margin:0;color:#374151;font-size:15px;">
              Mahal namin kayo,<br/>
              <strong>UTD FSA</strong>
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

  return { subject, html }
}
