// ── page.tsx ─────────────────────────────────────────────
// privacy policy — fully static; no data fetching.
// sections: information we collect, how we use your information,
//   sensitive information, pamilya matching and third-party mentions,
//   payment information, non-member and guest data, officer access and
//   accountability, third-party services, data retention, your rights, contact.
// notes: update the "last updated" date manually whenever a material
//   section changes; third-party list confirmed against package.json
//   and utils/s3.ts as of june 2026, vercel analytics/speed insights
//   added june 2026 (free tier, no custom events, no cookies).
// ─────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <main className="bg-brand-bg min-h-screen text-white">
      <div className="max-w-[760px] mx-auto px-6 py-16 md:py-20">

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <p className="font-display font-bold text-[12px] tracking-[0.2em] text-[#6f6f6f] uppercase mb-4">
          UTD FSA
        </p>
        <h1 className="font-display font-black text-[clamp(36px,5vw,64px)] leading-[0.94] tracking-[-0.03em] text-white mb-4">
          Privacy Policy
        </h1>
        <p className="font-sans text-[14px] text-[#6a6a6a] mb-14">
          Last updated: June 2026
        </p>

        {/* ── UI ────────────────────────────────────────────────────── */}
        {/* available data: none — fully static content */}
        {/* change classnames and typography freely */}
        {/* do not add data fetching without converting to a server component */}
        <div className="flex flex-col gap-12">

          {/* 1 — information we collect */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Information we collect
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>When you create an account and use this website, we collect the following categories of information:</p>
              <ul className="list-disc pl-5 flex flex-col gap-2.5">
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Identity and contact:</span>{' '}
                  your name, email address, phone number, academic year, and major — collected when you complete your member profile.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Ading application responses:</span>{' '}
                  Instagram handle, birthday, pronouns, activity level, hobbies, favorite music genre, favorite artist, favorite food, favorite TV show or movie, pamilya vibe preference, hangout size preference, weekly availability, thoughts on drinking, dislikes, pamilya dealbreakers, pamilya incompatibilities, future kuya/ate preference, MBTI type, and any additional notes you choose to share.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Kuya/ate application responses:</span>{' '}
                  Instagram handle, preferred pamilya name, interest in serving as pamilya head (and phone number if applicable), and a written statement of why you want to be a kuya/ate.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Event participation:</span>{' '}
                  event registrations, attendance records, and ticket check-in status — including the identity of the officer who scanned your ticket.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Account data:</span>{' '}
                  your assigned role (member, officer, or admin), membership status, membership expiration date, pamilya assignment, FSA points balance, and profile photo if you choose to upload one.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Payment records:</span>{' '}
                  amount paid, payment provider, and Stripe customer and session identifiers where applicable — described further in the Payment Information section.
                </li>
              </ul>
            </div>
          </section>

          {/* 2 — how we use your information */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              How we use your information
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-5 flex flex-col gap-2.5">
                <li>To create and manage your member account and verify your membership status.</li>
                <li>To assign you to a pamilya through the internal matching process conducted by FSA officers.</li>
                <li>To process event registrations and issue QR code tickets.</li>
                <li>To track attendance and FSA points for Goodphil eligibility.</li>
                <li>To send transactional emails — such as registration confirmations and QR code tickets — through our email provider.</li>
                <li>To display your profile information to other members where relevant, such as your pamilya assignment after reveal.</li>
              </ul>
              <p>We do not sell your information to third parties, and we do not use it for advertising.</p>
            </div>
          </section>

          {/* 3 — sensitive information */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Sensitive information
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                Several fields in the ading application collect information of a more personal nature. These include your thoughts on drinking, pamilya dealbreakers, MBTI type, and pamilya vibe preference. These fields are voluntary and exist solely to help officers make thoughtful pamilya placements. You may write &ldquo;N/A&rdquo; or skip optional fields if you prefer not to share.
              </p>
              <p>
                This information is accessible only to FSA officers and administrators conducting the matching process. It is not shown on your public member profile, not shared with other members, and not disclosed outside of the internal matching process.
              </p>
            </div>
          </section>

          {/* 4 — pamilya matching and third-party mentions */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Pamilya matching and third-party mentions
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                The ading application includes a field asking whether there are specific FSA members you cannot be placed in a pamilya with. In answering this question, you may choose to name other members by name.
              </p>
              <p>
                Any names you provide in these fields — including pamilya incompatibilities, pamilya dealbreakers, and future kuya/ate preferences — are used solely to inform placement decisions and are visible to FSA officers conducting or assisting with the matching process. Individuals you name are not notified that they were referenced in your application. This information is not disclosed to members outside the officer team or to third parties.
              </p>
            </div>
          </section>

          {/* 5 — payment information */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Payment information
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                Membership dues and event ticket payments are primarily processed through Stripe. When you pay via Stripe, your card details are entered directly on Stripe&rsquo;s platform and are never transmitted to or stored on UTD FSA&rsquo;s servers. We retain a Stripe customer ID, checkout session ID, and payment intent ID to reconcile your payment status.
              </p>
              <p>
                The system also supports alternate payment methods — including cash, Venmo, and Zelle — which may be accepted at officer discretion. In those cases, the payment amount and method are recorded manually by an officer rather than processed automatically. No card details are collected for these methods.
              </p>
              <p>
                As of the date of this policy, all recorded payments have been processed through Stripe. Manual payment recording has not been used in production.
              </p>
            </div>
          </section>

          {/* 6 — non-member and guest data */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Non-member and guest data
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                When a non-member purchases tickets to a UTD FSA event, we collect the purchaser&rsquo;s name and email address, as well as the name and email address for each guest ticket. This information is used solely to generate, issue, and validate QR code tickets for event entry. Guests do not have an account on this website.
              </p>
              <p>
                The purchaser completing checkout is required to acknowledge this Privacy Policy before submitting payment. Guests whose information is provided by the purchaser — rather than entered by the guest themselves — are notified of this policy via a link included in the QR code ticket email sent to their address. If you are a guest and would like to request deletion of your data, please contact us at the address listed in the Contact section. Your request will be handled manually by an officer or administrator.
              </p>
            </div>
          </section>

          {/* 7 — officer access and accountability */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Officer access and accountability
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                Officers and administrators can access member application data and event registration records for purposes required to run the organization — including conducting pamilya matching, managing event check-in, and verifying membership. This access is provided through a server-side administrative client and does not expose one member&rsquo;s data to another member.
              </p>
              <p>
                Officer actions that affect member records are logged with the acting officer's identity. This includes checking in an event ticket and reviewing applications — accepting, rejecting, or otherwise changing the status of an ading or kuya/ate application records which officer made that decision and when.
              </p>
            </div>
          </section>

          {/* 8 — third-party services */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Third-party services
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>This website relies on the following third-party services:</p>
              <ul className="list-disc pl-5 flex flex-col gap-2.5">
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Stripe</span> —
                  payment processing for membership dues and event tickets.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Resend</span> —
                  transactional email delivery (registration confirmations and QR code tickets).
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Supabase</span> —
                  database, authentication, and backend infrastructure.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Google</span> —
                  sign-in via Google OAuth. Google manages your Google account credentials; we receive only your name and email address.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Amazon Web Services (S3)</span> —
                  cloud storage for cover photos and gallery images uploaded by officers.
                </li>
                <li>
                  <span className="text-[#e0e0e0] font-semibold">Vercel Analytics and Speed Insights</span> —
                  anonymous, aggregated site traffic and performance monitoring. This records page views, approximate geographic location, device type, and browser, but does not use cookies and does not identify you individually.
                </li>
              </ul>
              <p>Each provider operates under its own privacy policy and data practices, which govern how it handles the data it receives.</p>
            </div>
          </section>

          {/* 9 — data retention */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Data retention
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                We do not currently have an automatic data expiration or archival mechanism. Data you submit — including your member profile, application responses, event registrations, and attendance records — is retained as long as reasonably necessary to operate the organization, maintain historical records, administer membership programs, and comply with organizational requirements.
              </p>
              <p>
                If you would like your data removed, please submit a request as described in the Your Rights section below.
              </p>
            </div>
          </section>

          {/* 10 — your rights */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Your rights
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72] flex flex-col gap-3">
              <p>
                You have the right to request access to the data we hold about you, to ask us to correct inaccurate information, or to request deletion of your data. To submit any of these requests, contact us using the email address in the Contact section below.
              </p>
              <p>
                This website does not currently have a self-service data export or account deletion feature. Fulfilling your request requires a manual action performed by an FSA officer or administrator. As this process is currently informal, response times may vary; we will do our best to respond as soon as reasonably possible.
              </p>
              <p>
                Deleting your account may affect your membership status, event history, and pamilya records. Where reasonably possible, we will try to discuss the scope and consequences with you before taking any irreversible action.
              </p>
            </div>
          </section>

          {/* 11 — contact */}
          <section>
            <h2 className="font-display font-black text-[17px] text-white uppercase tracking-[0.06em] mb-4 pb-3 border-b border-white/[0.07]">
              Contact
            </h2>
            <div className="font-sans text-[15px] text-[#a8a8a8] leading-[1.72]">
              <p>
                For privacy-related questions, data requests, or concerns, email us at{' '}
                <a
                  href="mailto:fsautd@gmail.com"
                  className="text-accent-green underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  fsautd@gmail.com
                </a>
                . Please include your name and the nature of your request so we can route it to the right officer.
              </p>
            </div>
          </section>

        </div>
      </div>
    </main>
  )
}