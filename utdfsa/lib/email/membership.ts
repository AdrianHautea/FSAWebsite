export function membershipEmailHtml({
  firstName,
  membershipYear,
  expiryDate,
}: {
  firstName: string
  membershipYear: string
  expiryDate: string
}): string {
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
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">Membership Confirmed</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Welcome to UTD FSA! Your membership for the <strong>${membershipYear}</strong> school year
              has been confirmed.
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;">
              Your membership is valid through <strong>${expiryDate}</strong>.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;color:#1e40af;font-size:14px;font-weight:bold;">Next Steps</p>
                  <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.9;">
                    <li>Complete your member profile</li>
                    <li>Check out upcoming events on the Events page</li>
                    <li>Attend General Meetings to stay in the loop</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;">
              Your Stripe receipt has been sent separately to your email.
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
