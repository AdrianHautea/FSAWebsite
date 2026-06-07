import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import RegisterModal from './RegisterModal'
import type { Event } from '@/types/database'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
}

/**
 * Ticketed: Party, Other → show prices + register button
 * Attendance QR: General Meeting, Risk Management, GP Event, Other → members scan to check in
 * Points: GP Event, Other → award goodphil points on check-in
 * Regular Event: calendar-only, no QR/points/pricing
 */
function isTicketed(type: string) {
  return ['party', 'other'].includes(type.toLowerCase())
}

// Other events are paid + award attendance points — show both price and pts in the badge
function isHybrid(type: string) {
  return type.toLowerCase() === 'other'
}

function hasAttendanceQR(type: string) {
  return ['general meeting', 'risk management', 'gp event', 'other'].includes(type.toLowerCase())
}

function hasPointsForType(type: string) {
  return ['gp event', 'other'].includes(type.toLowerCase())
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================
  const { success } = await searchParams
  const admin = createAdminClient()

  // only active events are shown to the public
  const { data: events } = await admin
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('event_date', { ascending: true })

  // resolve caller (page is public — members get different display)
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let member: {
    id: string
    membership_status: string
    first_name: string
    last_name: string
    email: string
    contact_email: string | null
  } | null = null
  let registeredEventIds = new Set<string>()

  if (user?.email) {
    const { data } = await admin
      .from('members')
      .select('id, membership_status, first_name, last_name, email, contact_email')
      .eq('email', user.email)
      .maybeSingle()
    member = data

    // only fetch existing registrations for active (paid) members
    if (member?.membership_status === 'active') {
      const { data: regs } = await admin
        .from('event_registrations')
        .select('event_id')
        .eq('member_id', member.id)
        .neq('payment_status', 'failed')
      registeredEventIds = new Set(
        (regs ?? []).map(r => r.event_id).filter(Boolean) as string[]
      )
    }
  }

  const isMember = member?.membership_status === 'active'

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   events (Event[]) — active events sorted by date ascending;
  //     each has: id, name, description, event_type, event_date, location,
  //     price_cents_members, price_cents_nonmembers, eb_price_members,
  //     eb_price_nonmembers, eb_deadline, points, is_active
  //   member — { id, membership_status, first_name, last_name, email, contact_email } | null
  //   isMember (bool) — true when the logged-in user has an active membership
  //   registeredEventIds (Set<string>) — event IDs the member already paid for
  //   success — query param set by Stripe redirect or free-event confirmation
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Events</h1>
      <p className="text-sm text-gray-600 mb-8">
        {/* only renders the member pricing note when the user is an active member — do not remove this condition */}
        {isMember
          ? 'Member pricing applied. Limit one ticket per paid event.'
          : 'Sign in as a member to unlock member pricing on paid events.'}
      </p>

      {/* only renders after a successful free-event registration or Stripe redirect — do not remove this condition */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
          🎉 You&apos;re registered! Check your email for your QR code ticket.
        </div>
      )}

      {/* only renders empty state when no active events exist — do not remove this condition */}
      {!events || events.length === 0 ? (
        <p className="text-gray-600">No upcoming events right now — check back soon!</p>
      ) : (
        <div className="flex flex-col gap-5">
          {events.map((event: Event) => {
            const ticketed = isTicketed(event.event_type)
            const hybrid = isHybrid(event.event_type)
            const now = new Date()
            const isEB =
              ticketed &&
              event.eb_deadline != null &&
              event.eb_price_members != null &&
              event.eb_price_nonmembers != null &&
              now < new Date(event.eb_deadline)

            const memberPrice = isEB ? event.eb_price_members! : event.price_cents_members
            const nonMemberPrice = isEB ? event.eb_price_nonmembers! : event.price_cents_nonmembers
            const alreadyRegistered = ticketed && registeredEventIds.has(event.id)

            return (
              <div key={event.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                {/* cover photo hero — present when the event has a cover, placeholder when not */}
                {event.cover_photo_url ? (
                  <img
                    src={event.cover_photo_url}
                    alt={event.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-3 bg-blue-600" />
                )}

                <div className="p-6">
                {/* header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                      {/* only renders the Early Bird badge when the EB deadline hasn't passed — do not remove this condition */}
                      {isEB && (
                        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Early Bird
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>📅 {fmtDate(event.event_date)} · {fmtTime(event.event_date)}</span>
                      {/* only renders location when it is set — do not remove this condition */}
                      {event.location && <span>📍 {event.location}</span>}
                    </div>
                  </div>

                  {/* pricing / points badge */}
                  {/* only renders the paid pricing block for ticketed events — do not remove this condition */}
                  {ticketed ? (
                    <div className="text-right shrink-0">
                      {/* only renders the member price when the user is an active member — do not remove this condition */}
                      {isMember ? (
                        <p className="text-lg font-bold text-blue-700">{fmt(memberPrice)}</p>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-gray-900">{fmt(nonMemberPrice)}</p>
                          <p className="text-xs text-gray-500">Members: {fmt(memberPrice)}</p>
                        </>
                      )}
                      {/* only renders EB end date when early bird is active — do not remove this condition */}
                      {isEB && event.eb_deadline && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          EB ends {fmtDate(event.eb_deadline)}
                        </p>
                      )}
                      {/* only renders points for hybrid (Other) events that award points — do not remove this condition */}
                      {hybrid && event.points != null && event.points > 0 && (
                        <p className="text-sm text-blue-600 font-medium mt-0.5">+{event.points} pts</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <p className="text-base font-semibold text-gray-700">Free</p>
                      {/* only renders for event types that award goodphil points (GP Event, Other hybrid) — do not remove this condition */}
                      {hasPointsForType(event.event_type) && event.points != null && event.points > 0 && (
                        <p className="text-sm text-blue-600 font-medium">+{event.points} pts</p>
                      )}
                    </div>
                  )}
                </div>

                {/* only renders when the event has a description — do not remove this condition */}
                {event.description && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{event.description}</p>
                )}

                {/* CTA */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  {/* only renders registration UI for ticketed events — do not remove this condition */}
                  {ticketed ? (
                    // only renders the Already Registered badge when the member is in registeredEventIds — do not remove this condition
                    alreadyRegistered ? (
                      <span className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                        ✓ Already Registered
                      </span>
                    ) : (
                      <RegisterModal
                        event={{
                          id: event.id,
                          name: event.name,
                          event_date: event.event_date,
                          location: event.location,
                          price_cents_members: memberPrice,
                          price_cents_nonmembers: nonMemberPrice,
                          is_early_bird: isEB,
                        }}
                        isMember={isMember}
                        // memberInfo is null for non-members/guests — pre-fills the first ticket slot for active members
                        memberInfo={isMember && member ? {
                          fname: member.first_name,
                          lname: member.last_name,
                          email: member.contact_email ?? member.email,
                        } : null}
                      />
                    )
                  ) : (
                    <p className="text-sm text-gray-500">
                      {hasPointsForType(event.event_type)
                        ? 'Free to attend — scan the QR code at the event to earn goodphil points.'
                        : hasAttendanceQR(event.event_type)
                          ? 'Free to attend — scan the QR code at the event to check in.'
                          : 'Free to attend — no registration required.'}
                    </p>
                  )}
                </div>
                </div>{/* end p-6 content wrapper */}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
