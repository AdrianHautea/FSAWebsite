'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import Modal from '@/components/Modal'
import RegisterModal from '@/app/(pages)/events/RegisterModal'
import type { Event } from '@/types/database'

// ── helpers (shared with EventsPageClient) ─────────────────────────────────
function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

function fmtModalDate(iso: string) {
  const day = new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })
  const time = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
  return `${day} · ${time}`
}

function fmtWeekDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' }).toUpperCase()
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
}

function fmtRegDeadline(iso: string) {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Chicago' })
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
  return `${datePart} at ${timePart}`
}

function isTicketed(type: string) { return ['party', 'other'].includes(type.toLowerCase()) }
function isHybrid(type: string) { return type.toLowerCase() === 'other' }
function hasAttendanceQR(type: string) { return ['general meeting', 'risk management', 'gp event', 'other'].includes(type.toLowerCase()) }
function hasPointsForType(type: string) { return ['gp event', 'other'].includes(type.toLowerCase()) }

const TYPE_STYLE: Record<string, { text: string; bg: string; border: string; dot: string; label: string }> = {
  'party':           { text: '#ff84b0', bg: 'rgba(255,92,150,0.13)',  border: 'rgba(255,120,170,0.34)', dot: '#ff5e9c', label: 'Party' },
  'general meeting': { text: '#79acff', bg: 'rgba(82,150,255,0.13)',  border: 'rgba(115,168,255,0.34)', dot: '#5a96ff', label: 'General Meeting' },
  'gp event':        { text: '#bb9eff', bg: 'rgba(151,113,255,0.15)', border: 'rgba(172,138,255,0.36)', dot: '#9b7bff', label: 'GP Event' },
  'risk management': { text: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.32)', dot: '#ffd166', label: 'Risk Management' },
  'other':           { text: '#63dbc9', bg: 'rgba(82,210,190,0.12)',  border: 'rgba(112,222,205,0.32)', dot: '#4fd0bd', label: 'Other' },
}

function getBadge(type: string) {
  return TYPE_STYLE[type.toLowerCase()] ?? {
    text: '#9a9a9a', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)', dot: '#9a9a9a', label: type,
  }
}

// ── types ──────────────────────────────────────────────────────────────────
type MemberInfo = {
  id: string
  membership_status: string
  first_name: string
  last_name: string
  email: string
  contact_email: string | null
}

interface Props {
  events: Event[]
}

export default function UpcomingEventsSection({ events }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showAlreadyRegistered, setShowAlreadyRegistered] = useState(false)
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([])

  // fetch member + registration state client-side (auth-gated, not needed for event display)
  useEffect(() => {
    const supabase = createClient()
    async function fetchMember() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return
      const { data: m } = await supabase
        .from('members')
        .select('id, membership_status, first_name, last_name, email, contact_email')
        .eq('email', user.email)
        .maybeSingle()
      if (!m) return
      setMember(m)
      const active = m.membership_status === 'active'
      setIsMember(active)
      if (active) {
        const { data: regs } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('member_id', m.id)
          .eq('payment_status', 'paid')
        setRegisteredEventIds(
          (regs ?? []).map((r: { event_id: string }) => r.event_id).filter(Boolean)
        )
      }
    }
    fetchMember()
  }, [])

  if (events.length === 0) return null

  return (
    <section className="bg-brand-bg px-4 sm:px-8 lg:px-16 py-14 sm:py-20 lg:py-24">
      <div className="max-w-[1241px] mx-auto">

        {/* mobile: centered; sm+: left-aligned with divider line extending to the right */}
        <div className="flex items-center gap-5 mb-10 lg:mb-14 justify-center sm:justify-start">
          <h2 className="font-display font-black text-[29px] sm:text-[42px] lg:text-[51px] text-white tracking-[-1.5px] sm:tracking-[-2.5px] lg:tracking-[-3px] leading-none flex-none">
            UPCOMING EVENTS
          </h2>
          <div className="hidden sm:block flex-1 h-px mt-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* horizontal scrollable strip — matches "This Week" style on events page */}
        <div className="tw-scroll flex gap-4 overflow-x-auto pb-4">
          {events.map(event => {
            const badge = getBadge(event.event_type)
            return (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="week-pill flex-none text-left rounded-[16px] px-4 hover:brightness-110 transition-all duration-200"
                style={{
                  width: '240px',
                  paddingTop: '18px',
                  paddingBottom: '18px',
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full flex-none" style={{ background: badge.dot }} />
                  <span className="text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: '#8c8c8c' }}>
                    {fmtWeekDay(event.event_date)}
                  </span>
                </div>
                <div className="text-[15px] font-bold tracking-[-0.01em] mb-1.5 truncate" style={{ color: '#fff' }}>
                  {event.name}
                </div>
                <div className="text-[12.5px] font-medium" style={{ color: '#7a7a7a' }}>
                  {fmtTime(event.event_date)}
                </div>
              </button>
            )
          })}

          {/* See More Events — always shown as the last card */}
          <Link
            href="/events"
            className="flex-none flex flex-col items-center justify-center gap-3 rounded-[16px] px-4 hover:brightness-110 transition-all duration-200"
            style={{
              width: '240px',
              paddingTop: '18px',
              paddingBottom: '18px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold" style={{ color: '#cfcfcf' }}>See More Events</span>
          </Link>
        </div>
      </div>

      {/* ── Event detail modal (identical logic to EventsPageClient) ─────────── */}
      {selectedEvent && (() => {
        const event = selectedEvent
        const badge = getBadge(event.event_type)
        const ticketed = isTicketed(event.event_type)
        const hybrid = isHybrid(event.event_type)
        const nowTs = new Date()
        const isEB =
          ticketed &&
          event.eb_deadline != null &&
          event.eb_price_members != null &&
          event.eb_price_nonmembers != null &&
          nowTs < new Date(event.eb_deadline)
        const memberPrice = isEB ? event.eb_price_members! : event.price_cents_members
        const nonMemberPrice = isEB ? event.eb_price_nonmembers! : event.price_cents_nonmembers
        const alreadyRegistered = ticketed && registeredEventIds.includes(event.id)
        const gracePeriodMs = 24 * 60 * 60 * 1000
        const pastGracePeriod = nowTs.getTime() - new Date(event.event_date).getTime() > gracePeriodMs
        const effectivelyInactive = !event.is_active || pastGracePeriod
        const registrationClosed =
          effectivelyInactive ||
          (event.registration_closes_at != null && new Date() > new Date(event.registration_closes_at))

        return (
          <Modal onClose={() => { setSelectedEvent(null); setShowAlreadyRegistered(false) }} size="lg">
            <div
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', animation: 'modalIn .26s cubic-bezier(0.22,1,0.36,1)' }}
              className="rounded-2xl relative"
            >
              <button
                onClick={() => { setSelectedEvent(null); setShowAlreadyRegistered(false) }}
                className="absolute top-3.5 right-3.5 z-10 flex items-center justify-center rounded-full transition-colors"
                style={{ width: '34px', height: '34px', background: 'rgba(10,10,10,0.7)', border: '1px solid rgba(255,255,255,0.16)', color: '#e0e0e0', backdropFilter: 'blur(4px)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div style={{ padding: '26px 28px 30px' }}>
                <div className="mb-4">
                  <span
                    className="inline-flex items-center rounded-full text-[11px] font-bold tracking-[0.04em] uppercase"
                    style={{ padding: '5px 12px', color: badge.text, background: badge.bg, border: `1px solid ${badge.border}` }}
                  >
                    {badge.label}
                  </span>
                </div>

                {isEB && (
                  <div className="flex items-center gap-2 mb-3 w-fit rounded-xl" style={{ padding: '10px 16px', background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.18)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#e8b84b">
                      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 18.6 6 20.2l1.3-6.6L2.5 9.4l6.6-.8z" />
                    </svg>
                    <span className="text-[12px] font-bold tracking-[0.04em] uppercase" style={{ color: '#e8b84b' }}>Early Bird Pricing</span>
                  </div>
                )}

                <h2 className="font-extrabold leading-[1.05] tracking-[-0.02em]" style={{ fontSize: '30px', color: '#fff', marginBottom: '18px' }}>
                  {event.name}
                </h2>

                <div className="flex items-center gap-2.5 mb-3">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.7">
                    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
                  </svg>
                  <span className="text-[14.5px] font-medium" style={{ color: '#cfcfcf' }}>{fmtModalDate(event.event_date)}</span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2.5" style={{ marginBottom: '20px' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.7">
                      <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.4" />
                    </svg>
                    <span className="text-[14.5px] font-medium" style={{ color: '#cfcfcf' }}>{event.location}</span>
                  </div>
                )}

                {event.description && (
                  <p className="text-[14.5px] leading-relaxed" style={{ color: '#a8a8a8', marginBottom: '22px' }}>
                    {event.description}
                  </p>
                )}

                {event.registration_closes_at && !registrationClosed && (
                  <p className="text-sm font-medium mb-5" style={{ color: '#ffd166' }}>
                    Registration closes {fmtRegDeadline(event.registration_closes_at)}
                  </p>
                )}

                {!ticketed && hasPointsForType(event.event_type) && event.points != null && event.points > 0 && (
                  <div className="flex items-center gap-3 rounded-[14px] mb-6" style={{ padding: '15px 17px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#e8b84b" stroke="#e8b84b" strokeWidth="1">
                      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 18.6 6 20.2l1.3-6.6L2.5 9.4l6.6-.8z" />
                    </svg>
                    <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: '#fff' }}>+{event.points} Goodphil Points</span>
                  </div>
                )}

                {ticketed && (
                  <div className="rounded-[14px] overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid grid-cols-2" style={{ borderBottom: hybrid && event.points ? '1px solid rgba(255,255,255,0.08)' : undefined }}>
                      <div className="px-[18px] py-4" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: '#7a7a7a' }}>Member</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: '#fff' }}>{fmt(memberPrice)}</span>
                          {isEB && event.price_cents_members != null && (
                            <span className="hidden sm:inline text-[15px] font-semibold line-through" style={{ color: '#6f6f6f' }}>{fmt(event.price_cents_members)}</span>
                          )}
                        </div>
                      </div>
                      <div className="px-[18px] py-4">
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: '#7a7a7a' }}>Non-Member</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: '#fff' }}>{fmt(nonMemberPrice)}</span>
                          {isEB && event.price_cents_nonmembers != null && (
                            <span className="hidden sm:inline text-[15px] font-semibold line-through" style={{ color: '#6f6f6f' }}>{fmt(event.price_cents_nonmembers)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {hybrid && event.points != null && event.points > 0 && (
                      <div className="px-[18px] py-2.5 text-[13px] font-medium" style={{ color: '#bb9eff' }}>
                        +{event.points} Goodphil points on check-in
                      </div>
                    )}
                  </div>
                )}

                {ticketed ? (
                  alreadyRegistered ? (
                    <button
                      onClick={() => setShowAlreadyRegistered(true)}
                      className="w-full text-center text-[14.5px] font-bold tracking-[0.01em] rounded-[13px] transition-opacity hover:opacity-75"
                      style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#75ba78', cursor: 'pointer' }}
                    >
                      ✓ Already Registered
                    </button>
                  ) : registrationClosed ? (
                    <div
                      className="w-full text-center text-[14.5px] font-bold tracking-[0.01em] rounded-[13px]"
                      style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#7a7a7a' }}
                    >
                      Registration Closed
                    </div>
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
                      memberInfo={isMember && member ? {
                        fname: member.first_name,
                        lname: member.last_name,
                        email: member.contact_email ?? member.email,
                      } : null}
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center gap-2.5 py-1.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="1.6">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M14 14h3v3M21 14v7M17 21h4" />
                    </svg>
                    <span className="text-[14px] font-medium" style={{ color: '#8c8c8c' }}>
                      {hasPointsForType(event.event_type)
                        ? 'Scan the QR code at the event to earn your points'
                        : hasAttendanceQR(event.event_type)
                          ? 'Scan the QR code at the event to check in'
                          : 'Free to attend — no registration required'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* already registered info modal */}
      {showAlreadyRegistered && (
        <Modal onClose={() => setShowAlreadyRegistered(false)} size="sm">
          <div
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', animation: 'modalIn .26s cubic-bezier(0.22,1,0.36,1)' }}
            className="rounded-2xl p-7"
          >
            <h2 className="text-[17px] font-bold text-white mb-2">Already registered</h2>
            <p className="text-[13.5px] font-medium leading-relaxed mb-6" style={{ color: '#8c8c8c' }}>
              You already have a ticket for this event. Members are limited to one ticket per paid event.
            </p>
            <button
              onClick={() => setShowAlreadyRegistered(false)}
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-white/16 bg-transparent text-[#cfcfcf] hover:border-white/30 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
