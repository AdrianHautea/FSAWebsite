// ── membership.ts ─────────────────────────────────────────────────────────────
// generates the html body for the membership confirmation email.
//
// notes: table-based layout for broad email client compatibility (gmail, outlook,
//        apple mail). no external css or images — fully inline styles.
//        called by the stripe-webhook route after a membership payment succeeds.
//        stripe sends its own receipt separately — this email is the fsa welcome.

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
            <h1 style="margin:0;color:#ffffff !important;font-size:30px;font-weight:900;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.01em;line-height:1.05;">Membership Confirmed</h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:40px 44px 44px;">
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</p>
            <p style="margin:0 0 18px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              Welcome to UTD FSA! Your membership for the <strong style="color:#ffffff;font-weight:700;">${membershipYear}</strong> school year has been confirmed.
            </p>
            <p style="margin:0 0 30px;color:#d4d4d4;font-size:16px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
              Your membership is valid through <strong style="color:#ffffff;font-weight:700;">${expiryDate}</strong>.
            </p>

            <!-- next steps box -->
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0f110f" style="background:#0f110f;border:1px solid rgba(70,106,71,0.28);border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:22px 24px;">
                  <p style="margin:0 0 14px;color:#7fae80;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Next Steps</p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="14" style="vertical-align:top;padding-top:2px;color:#466a47;font-size:15px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">&#9679;</td>
                      <td style="padding-left:8px;font-size:15px;line-height:1.5;color:#cfcfcf;font-family:Arial,Helvetica,sans-serif;">Complete your member profile</td>
                    </tr>
                    <tr><td colspan="2" style="height:10px;"></td></tr>
                    <tr>
                      <td width="14" style="vertical-align:top;padding-top:2px;color:#466a47;font-size:15px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">&#9679;</td>
                      <td style="padding-left:8px;font-size:15px;line-height:1.5;color:#cfcfcf;font-family:Arial,Helvetica,sans-serif;">Check out upcoming events on the Events page</td>
                    </tr>
                    <tr><td colspan="2" style="height:10px;"></td></tr>
                    <tr>
                      <td width="14" style="vertical-align:top;padding-top:2px;color:#466a47;font-size:15px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">&#9679;</td>
                      <td style="padding-left:8px;font-size:15px;line-height:1.5;color:#cfcfcf;font-family:Arial,Helvetica,sans-serif;">Attend General Meetings to stay in the loop</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;line-height:1.6;color:#7a7a7a;font-family:Arial,Helvetica,sans-serif;">
              Your Stripe receipt has been sent separately to your email.
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
