// ── page.tsx ─────────────────────────────────────────────────
// server component — member profile view with goodphil eligibility summary
//
// data:  members (all fields), events (id by type), attendance (meeting + risk management counts)
// deps:  supabase (respects rls — user client), getSettings (kuyateApplicationsOpen flag)
// notes: meeting and risk management counts use a two-step subquery pattern because
//        supabase count filters on joined tables are not supported;
//        __none__ sentinel prevents an empty .in() call which would return all rows
import { createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'

export default async function ProfilePage() {
  // ============================================================
  // DATA — do not modify this section
  // authenticates the user, fetches the full member row,
  // and reads kuyateApplicationsOpen from settings to conditionally
  // render the re-apply section for not_interested members.
  // ============================================================
  // respects rls — only returns rows the caller owns
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // redirect to /login if no session found
  if (!user) redirect('/login')

  // members table — fetch the full member row for display on the profile page
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('email', user.email!)
    .maybeSingle()

  // redirect to /login if member row doesn't exist
  if (!member) redirect('/login')

  // settings table — fetch kuyateApplicationsOpen and pamilyaRevealActive
  const { kuyateApplicationsOpen, pamilyaRevealActive } = await getSettings()

  // events table — get ids for general meeting and risk management types (step 1 of subquery)
  const { data: generalAndRiskEvents } = await supabase
    .from('events')
    .select('id')
    .in('event_type', ['General Meeting', 'Risk Management'])

  const generalAndRiskEventIds = generalAndRiskEvents?.map((e: { id: string }) => e.id) ?? []

  // attendance table — count meetings attended; '__none__' sentinel avoids empty .in() returning all rows
  const { count: meetingCount } = await supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', member.id)
    .in('event_id', generalAndRiskEventIds.length > 0 ? generalAndRiskEventIds : ['__none__'])

  // events table — get risk management event ids specifically (step 1 of subquery)
  const { data: riskMgmtEvents } = await supabase
    .from('events')
    .select('id')
    .eq('event_type', 'Risk Management')

  const riskMgmtEventIds = riskMgmtEvents?.map((e: { id: string }) => e.id) ?? []

  // attendance table — count risk management sessions attended specifically
  const { count: riskMgmtCount } = await supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', member.id)
    .in('event_id', riskMgmtEventIds.length > 0 ? riskMgmtEventIds : ['__none__'])

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

        <h1 className="font-display font-black text-[clamp(36px,5vw,64px)] text-white uppercase leading-none tracking-tight mb-10">
          MY PROFILE
        </h1>

        {/* Avatar and name */}
        <div className="flex items-center gap-5 mb-10">
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
        <section className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]">
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
        <section className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]">
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-white/50 mb-4">Points</h3>
          <p className="font-display font-black text-[56px] text-white leading-none">{member.points ?? 0}</p>
          <p className="font-sans text-sm text-white/50 mt-1 mb-6">
            Earned from meetings and events
          </p>

          {/* Goodphil eligibility progress */}
          <div className="border-t border-white/10 pt-5">
            <p className="font-display font-black text-xs uppercase tracking-widest text-white/50 mb-4">
              Goodphil Eligibility
            </p>

            {/* Points bar */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-sans text-xs text-white/60">Goodphil Points (6 required)</span>
                <span className="font-display font-bold text-xs text-white/60">{Math.min(goodphilPoints, 6)} / 6</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green transition-all"
                  style={{ width: `${Math.min((goodphilPoints / 6) * 100, 100)}%` }}
                />
              </div>
              {goodphilPoints >= 6 && (
                <p className="font-sans text-xs text-accent-green mt-1">✓ Points requirement met</p>
              )}
            </div>

            {/* Meetings bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-sans text-xs text-white/60">Meetings Attended (3 required, must include Risk Management)</span>
                <span className="font-display font-bold text-xs text-white/60">{Math.min(goodphilMeetings, 3)} / 3</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green transition-all"
                  style={{ width: `${Math.min((goodphilMeetings / 3) * 100, 100)}%` }}
                />
              </div>
              <p className={`font-sans text-xs mt-1 ${riskMgmtAttended ? 'text-accent-green' : 'text-white/40'}`}>
                {riskMgmtAttended ? '✓ Risk Management: Attended' : 'Risk Management: Not yet attended'}
              </p>
            </div>

            {/* Eligibility status */}
            <div className="pt-3 border-t border-white/10">
              {isGoodphilEligible ? (
                <p className="font-display font-bold text-sm text-accent-green uppercase tracking-wide">
                  ✓ Goodphil Eligible
                </p>
              ) : (
                <p className="font-sans text-sm text-white/40">
                  Requirements not yet met
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Personal info */}
        <section className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]">
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
          </div>
        </section>

        {/* Re-apply section — only renders for members who opted out of the pamilya program */}
        {/* do not remove this condition */}
        {member.member_type === 'not_interested' && (
          <section className="mb-4 p-6 border border-white/[7%] rounded-2xl bg-[#1a1a1a]">
            <h3 className="font-display font-black text-sm text-white uppercase mb-1">Changed your mind?</h3>
            <p className="font-sans text-sm text-white/50 mb-4">You can still apply.</p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="/onboarding?reapply=true&type=ading"
                className="font-display font-bold text-xs uppercase tracking-widest px-5 py-2.5 bg-accent-green text-[#0e0e0e] rounded-lg hover:opacity-90 transition-opacity"
              >
                Apply as Ading
              </a>
              {/* only renders when kuyate applications are open — do not remove this condition */}
              {kuyateApplicationsOpen && (
                <a
                  href="/onboarding?reapply=true&type=kuyate"
                  className="font-display font-bold text-xs uppercase tracking-widest px-5 py-2.5 border-2 border-white/30 text-white rounded-lg hover:border-white/60 transition-colors"
                >
                  Apply as Kuya/Ate
                </a>
              )}
            </div>
          </section>
        )}

        {/* edit profile button — safe to restyle, keep the href */}
        <a href="/member/profile/edit" className="inline-block mt-2 font-display font-bold text-xs text-accent-green uppercase tracking-widest hover:opacity-70 transition-opacity">
          Edit Profile →
        </a>

        {/* Unpaid membership banner — only renders when membership is not active */}
        {/* do not remove this condition */}
        {member.membership_status !== 'active' && (
          <div className="mt-6 p-5 border-2 border-accent-gold/40 rounded-2xl bg-[#1a1a1a]">
            <p className="font-sans text-sm text-accent-gold">
              Your membership is not yet active.{' '}
              <a href="/membership" className="underline font-bold">
                Complete payment to activate.
              </a>
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
