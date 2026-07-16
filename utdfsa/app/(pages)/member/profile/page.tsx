// ── page.tsx ─────────────────────────────────────────────────
// server component — member profile view with goodphil eligibility summary
//
// data:  members (all fields), attendance joined with events (meeting + risk management counts)
// deps:  supabase (respects rls — user client), getSettings (kuyateApplicationsOpen flag)
// notes: meeting and risk management counts are derived in js from one attendance+events
//        query instead of three round trips — mirrors the pattern in member/attendance/page.tsx
import { requireActiveMember } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import Link from 'next/link'
import ProgressBars from './ProgressBars'

export default async function ProfilePage() {
  // ============================================================
  // DATA — do not modify this section
  // authenticates the user, fetches the full member row,
  // and reads kuyateApplicationsOpen from settings to conditionally
  // render the re-apply section for not_interested members.
  // ============================================================
  // respects rls — only returns rows the caller owns. requireActiveMember() also
  // re-verifies paid/officer status server-side (defense-in-depth mirror of the
  // middleware gate — see lib/auth.ts), redirecting to /membership if neither holds
  const { supabase, user } = await requireActiveMember()

  // members table — fetch the full member row for display on the profile page
  const { data: member } = await supabase
    .from('members')
    .select('id, email, first_name, last_name, role, membership_status, membership_expires_at, points, phone, year, major, shirt_size, pamilya, avatar_url, member_type')
    .eq('email', user.email!)
    .maybeSingle()

  // redirect to /login if member row doesn't exist
  if (!member) redirect('/login')

  // parallel: settings + attendance history (both independent of each other)
  const [
    { kuyateApplicationsOpen, pamilyaRevealActive },
    { data: attendanceRecords },
  ] = await Promise.all([
    getSettings(),
    supabase.from('attendance').select('id, events (event_type)').eq('member_id', member.id),
  ])

  // supabase returns the joined row as an object or a single-element array depending on
  // relation cardinality — normalize the same way AttendanceClient's resolveEvent does
  const resolveEventType = (raw: unknown): string | undefined => {
    const e = Array.isArray(raw) ? raw[0] : raw
    return (e as { event_type?: string } | null | undefined)?.event_type
  }

  const meetingCount = (attendanceRecords ?? []).filter(r => {
    const type = resolveEventType(r.events)
    return type === 'General Meeting' || type === 'Risk Management'
  }).length
  const riskMgmtCount = (attendanceRecords ?? []).filter(r => resolveEventType(r.events) === 'Risk Management').length

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   member (Member) — full member row
  //   kuyateApplicationsOpen (bool) — whether kuyate applications are open;
  //     used to show/hide the kuya/ate re-apply link
  //   meetingCount (number | null) — meetings attended (General Meeting + Risk Management)
  //   riskMgmtCount (number | null) — Risk Management sessions attended
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================
  // ── goodphil eligibility ──────────────────────────────────────
  // true when the member has attended at least one risk management session
  const riskMgmtAttended = (riskMgmtCount ?? 0) > 0
  const goodphilPoints = member.points ?? 0
  const goodphilMeetings = meetingCount ?? 0
  // eligible when: 6+ points, 3+ meetings attended, and risk management attended at least once
  const isGoodphilEligible = goodphilPoints >= 6 && goodphilMeetings >= 3 && riskMgmtAttended

  return (
    <main className="bg-brand-bg min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        <h1
          className="font-display font-black text-[clamp(36px,5vw,64px)] text-white uppercase leading-none tracking-tight mb-10"
          style={{ animation: 'fadeUp 450ms cubic-bezier(0.16,1,0.3,1) both' }}
        >
          MY PROFILE
        </h1>

        {/* Avatar and name */}
        <div
          className="flex items-center gap-5 mb-10"
          style={{ animation: 'fadeUp 450ms cubic-bezier(0.16,1,0.3,1) 80ms both' }}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt="profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-bg border-2 border-white/20 flex items-center justify-center font-display font-black text-white text-xl">
              {member.first_name?.[0]}{member.last_name?.[0]}
            </div>
          )}
          <div>
            <h2 className="font-display font-black text-xl text-white uppercase">
              {member.first_name} {member.last_name}
            </h2>
            <p className="font-sans text-sm text-white/50 mt-0.5">{member.email}</p>
          </div>
        </div>

        {/* Membership status */}
        <section
          className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]"
          style={{ animation: 'fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 150ms both' }}
        >
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-white/50 mb-4">Membership</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-sans text-sm text-white/50">Status</span>
              <span className={`font-display font-bold text-sm uppercase tracking-wide ${
                member.membership_status === 'active'
                  ? 'text-accent-green'
                  : 'text-accent-gold'
              }`}>
                {member.membership_status ?? 'Pending'}
              </span>
            </div>
            <div className="w-full h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="font-sans text-sm text-white/50">Role</span>
              <span className="font-sans text-sm text-white capitalize">{member.role}</span>
            </div>
            {/* only renders after pamilya reveal is active AND a value is assigned — do not remove this condition */}
            {pamilyaRevealActive && member.pamilya && (
              <>
                <div className="w-full h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm text-white/50">Pamilya</span>
                  <span className="font-sans text-sm text-white">{member.pamilya}</span>
                </div>
              </>
            )}
            {/* only renders when membership has an expiry date — do not remove this condition */}
            {member.membership_expires_at && (
              <>
                <div className="w-full h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm text-white/50">Expires</span>
                  <span className="font-sans text-sm text-white">
                    {new Date(member.membership_expires_at).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Points */}
        <section
          className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]"
          style={{ animation: 'fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 220ms both' }}
        >
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-white/50 mb-4">Points</h3>
          <p className="font-display font-black text-[56px] text-white leading-none">{member.points ?? 0}</p>
          <p className="font-sans text-sm text-white/50 mt-1 mb-6">
            Earned from meetings and events
          </p>

          {/* Goodphil eligibility progress */}
          <ProgressBars
            goodphilPoints={goodphilPoints}
            goodphilMeetings={goodphilMeetings}
            riskMgmtAttended={riskMgmtAttended}
            isGoodphilEligible={isGoodphilEligible}
          />
        </section>

        {/* Personal info */}
        <section
          className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]"
          style={{ animation: 'fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 290ms both' }}
        >
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-white/50 mb-4">Personal Info</h3>
          <div className="flex flex-col gap-3">
            {/* contact email — always shown */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="font-sans text-sm text-white/50 block">Contact Email</span>
                <span className="font-sans text-xs text-white/30">used for emails and other notifications from the website</span>
              </div>
              <span className="font-sans text-sm text-white text-right shrink-0">{member.email}</span>
            </div>
            {/* only renders when phone is set — do not remove this condition */}
            {member.phone && (
              <>
                <div className="w-full h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm text-white/50">Phone</span>
                  <span className="font-sans text-sm text-white">{member.phone}</span>
                </div>
              </>
            )}
            {/* only renders when year is set — do not remove this condition */}
            {member.year && (
              <>
                <div className="w-full h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm text-white/50">Year</span>
                  <span className="font-sans text-sm text-white">{member.year}</span>
                </div>
              </>
            )}
            {/* only renders when major is set — do not remove this condition */}
            {member.major && (
              <>
                <div className="w-full h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm text-white/50">Major</span>
                  <span className="font-sans text-sm text-white">{member.major}</span>
                </div>
              </>
            )}
            {/* only renders when shirt_size is set — do not remove this condition */}
            {member.shirt_size && (
              <>
                <div className="w-full h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm text-white/50">T-Shirt Size</span>
                  <span className="font-sans text-sm text-white">{member.shirt_size}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Re-apply section — only renders for members who opted out of the pamilya program */}
        {/* do not remove this condition */}
        {member.member_type === 'not_interested' && (
          <section
            className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]"
            style={{ animation: 'fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 360ms both' }}
          >
            <h3 className="font-display font-black text-sm text-white uppercase mb-1">Changed your mind?</h3>
            <p className="font-sans text-sm text-white/50 mb-4">You can still apply.</p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/onboarding?reapply=true&type=ading"
                className="inline-flex items-center font-display font-bold text-xs uppercase tracking-widest px-5 py-2.5 bg-accent-green text-[#0e0e0e] rounded-lg hover:opacity-90 transition-opacity"
              >
                Apply as Ading
              </Link>
              {/* only renders when kuyate applications are open — do not remove this condition */}
              {kuyateApplicationsOpen && (
                <Link
                  href="/onboarding?reapply=true&type=kuyate"
                  className="font-display font-bold text-xs uppercase tracking-widest px-5 py-2.5 border-2 border-white/30 text-white rounded-lg hover:border-white/60 transition-colors"
                >
                  Apply as Kuya/Ate
                </Link>
              )}
            </div>
          </section>
        )}

        {/* edit profile button — safe to restyle, keep the href */}
        <Link href="/member/profile/edit" className="inline-block mt-2 font-display font-bold text-xs text-accent-green uppercase tracking-widest hover:opacity-70 transition-opacity">
          Edit Profile →
        </Link>

        {/* Unpaid membership banner — only renders when membership is not active */}
        {/* do not remove this condition */}
        {member.membership_status !== 'active' && (
          <div
            className="mt-6 p-5 border-2 border-accent-gold/40 rounded-2xl bg-[#1a1a1a]"
            style={{ animation: 'fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 430ms both' }}
          >
            <p className="font-sans text-sm text-accent-gold">
              Your membership is not yet active.{' '}
              <Link href="/membership" className="underline font-bold">
                Complete payment to activate.
              </Link>
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
