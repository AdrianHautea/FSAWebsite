'use client'

import { useState } from 'react'
import Image from 'next/image'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import RegisterModal from './RegisterModal'
import type { Event } from '@/types/database'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

function fmtCardDate(iso: string) {
  const day = new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' })
  const time = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
  return `${day} · ${time}`
}

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

// ── badge colors per event type — extracted from mockup ──────────────────────
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

function getEventTypeColor(type: string): string {
  return TYPE_STYLE[type.toLowerCase()]?.dot ?? '#9a9a9a'
}

// ── section divider ───────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="font-display font-bold text-xs tracking-[0.18em] text-[#9a9a9a] uppercase whitespace-nowrap">{label}</span>
      <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

// ── placeholder grid when no photo ───────────────────────────────────────────
function PhotoPlaceholder({ ratio = '4/5' }: { ratio?: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2.5"
      style={{ backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 13px,rgba(255,255,255,0.022) 13px 14px)' }}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.7" />
        <path d="M21 15l-5-5L4 21" />
      </svg>
      <span className="font-mono text-[10px] tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.25)' }}>EVENT PHOTO · {ratio}</span>
    </div>
  )
}

// ── props ────────────────────────────────────────────────────────────────────
interface Props {
  events: Event[]
  isMember: boolean
  member: {
    id: string
    membership_status: string
    first_name: string
    last_name: string
    email: string
    contact_email: string | null
  } | null
  registeredEventIds: string[]
  success?: string
}

export default function EventsPageClient({ events, isMember, member, registeredEventIds, success }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const thisWeek = events.filter(e => {
    const d = new Date(e.event_date)
    return d >= now && d <= weekEnd
  })

  return (
    <main className="min-h-screen text-white" style={{ background: '#0f0f0f' }}>
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-20">

        {/* ── page header ──────────────────────────────────────────────────── */}
        <div className="pt-14 pb-10">
          <p className="font-display font-bold text-xs tracking-[0.2em] uppercase mb-5" style={{ color: '#6f6f6f' }}>
            What&apos;s happening
          </p>
          <h1 className="font-display font-black leading-[0.96] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(42px,6vw,74px)' }}>
            Events
          </h1>
          <p className="text-lg font-medium mt-4" style={{ color: '#8c8c8c' }}>
            {isMember
              ? 'Member pricing applied. Limit one ticket per paid event.'
              : 'Stay up to date with everything UTD FSA.'}
          </p>
        </div>

        {/* ── success banner ────────────────────────────────────────────────── */}
        {/* only renders after a successful free-event registration or Stripe redirect — do not remove this condition */}
        {success && (
          <div className="mb-8 px-5 py-4 rounded-2xl text-sm font-medium" style={{
            background: 'rgba(117,186,120,0.1)',
            border: '1px solid rgba(117,186,120,0.3)',
            color: '#75ba78',
          }}>
            You&apos;re registered! Check your email for your QR code ticket.
          </div>
        )}

        {/* ── this week strip ───────────────────────────────────────────────── */}
        <div className="mb-2">
          <SectionLabel label="This Week" />
          {/* only renders empty state when no events this week — do not remove this condition */}
          {thisWeek.length === 0 ? (
            <p className="text-sm font-medium py-3" style={{ color: '#6f6f6f' }}>
              Nothing this week — check back soon.
            </p>
          ) : (
            <div className="tw-scroll flex gap-3.5 overflow-x-auto pb-3">
              {thisWeek.map(event => {
                const badge = getBadge(event.event_type)
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="week-pill flex-none text-left rounded-[14px] px-4"
                    style={{
                      width: '212px',
                      paddingTop: '15px',
                      paddingBottom: '15px',
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
            </div>
          )}
        </div>

        {/* ── all events grid ───────────────────────────────────────────────── */}
        <div className="mt-10">
          <SectionLabel label="All Events" />

          {/* only renders empty state when no active events exist — do not remove this condition */}
          {events.length === 0 ? (
            <p className="py-6" style={{ color: '#6f6f6f' }}>No upcoming events right now — check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[22px]">
              {events.map(event => {
                const badge = getBadge(event.event_type)
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="event-card text-left rounded-[18px] overflow-hidden"
                    style={{
                      background: '#181818',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* photo — 4:5 portrait */}
                    <div
                      className="relative w-full overflow-hidden"
                      style={{
                        aspectRatio: '4/5',
                        background: '#141414',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {event.cover_photo_url ? (
                        <Image
                          src={event.cover_photo_url}
                          alt={event.name}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <PhotoPlaceholder ratio="4:5" />
                      )}
                    </div>

                    {/* card body */}
                    <div style={{ padding: '16px 17px 19px' }}>
                      <div className="mb-3">
                        <span
                          className="inline-flex items-center rounded-full text-[11px] font-bold tracking-[0.04em] uppercase whitespace-nowrap"
                          style={{
                            padding: '4px 11px',
                            color: badge.text,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <h3
                        className="font-bold tracking-[-0.01em] mb-1.5"
                        style={{ fontSize: '18px', color: '#fff' }}
                      >
                        {event.name}
                      </h3>
                      <div className="text-[13px] font-medium" style={{ color: '#8c8c8c' }}>
                        {fmtCardDate(event.event_date)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── event calendar ────────────────────────────────────────────────── */}
        <div className="mt-12">
          <SectionLabel label="Event Calendar" />
          <div className="fc-dark rounded-[18px] overflow-hidden p-4" style={{ background: '#131313', border: '1px solid rgba(255,255,255,0.08)' }}>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              headerToolbar={{ left: 'title', center: '', right: 'prev,next' }}
              events={events.map(event => ({
                id: event.id,
                title: event.name,
                date: event.event_date,
                backgroundColor: getEventTypeColor(event.event_type),
                borderColor: getEventTypeColor(event.event_type),
                extendedProps: { event },
              }))}
              eventClick={info => {
                const event = info.event.extendedProps.event as Event
                setSelectedEvent(event)
              }}
            />
          </div>
        </div>
      </div>

      {/* ── event detail modal ─────────────────────────────────────────────── */}
      {/* only renders when an event card has been clicked — do not remove this condition */}
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
        const registrationClosed =
          event.registration_closes_at != null &&
          new Date() > new Date(event.registration_closes_at)

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/70 p-4"
            style={{ animation: 'backdropIn .2s ease' }}
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
              style={{
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'modalIn .26s cubic-bezier(0.22,1,0.36,1)',
                marginTop: '60px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* cover 16:9 */}
              <div
                className="relative w-full overflow-hidden"
                style={{
                  aspectRatio: '16/9',
                  background: '#171717',
                  backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 15px,rgba(255,255,255,0.025) 15px 16px)',
                }}
              >
                {event.cover_photo_url ? (
                  <Image
                    src={event.cover_photo_url}
                    alt={event.name}
                    fill
                    className="object-cover"
                    sizes="560px"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.3">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.7" />
                      <path d="M21 15l-5-5L4 21" />
                    </svg>
                    <span className="font-mono text-[10px] tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.28)' }}>COVER PHOTO · 16:9</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-3.5 right-3.5 flex items-center justify-center rounded-full transition-colors"
                  style={{
                    width: '34px',
                    height: '34px',
                    background: 'rgba(10,10,10,0.7)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    color: '#e0e0e0',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* modal body */}
              <div style={{ padding: '26px 28px 30px' }}>
                {/* badge */}
                <div className="mb-4">
                  <span
                    className="inline-flex items-center rounded-full text-[11px] font-bold tracking-[0.04em] uppercase"
                    style={{
                      padding: '5px 12px',
                      color: badge.text,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* only renders when early bird pricing is active — do not remove this condition */}
                {isEB && (
                  <div className="flex items-center gap-2 mb-3 w-fit rounded-xl"
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(232,184,75,0.1)',
                      border: '1px solid rgba(232,184,75,0.18)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#e8b84b">
                      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 18.6 6 20.2l1.3-6.6L2.5 9.4l6.6-.8z" />
                    </svg>
                    <span className="text-[12px] font-bold tracking-[0.04em] uppercase" style={{ color: '#e8b84b' }}>Early Bird Pricing</span>
                  </div>
                )}

                <h2
                  className="font-extrabold leading-[1.05] tracking-[-0.02em]"
                  style={{ fontSize: '30px', color: '#fff', marginBottom: '18px' }}
                >
                  {event.name}
                </h2>

                {/* date */}
                <div className="flex items-center gap-2.5 mb-3">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.7">
                    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
                  </svg>
                  <span className="text-[14.5px] font-medium" style={{ color: '#cfcfcf' }}>{fmtModalDate(event.event_date)}</span>
                </div>

                {/* only renders when location is set — do not remove this condition */}
                {event.location && (
                  <div className="flex items-center gap-2.5" style={{ marginBottom: '20px' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.7">
                      <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.4" />
                    </svg>
                    <span className="text-[14.5px] font-medium" style={{ color: '#cfcfcf' }}>{event.location}</span>
                  </div>
                )}

                {/* only renders when event has a description — do not remove this condition */}
                {event.description && (
                  <p className="text-[14.5px] leading-relaxed" style={{ color: '#a8a8a8', marginBottom: '22px' }}>
                    {event.description}
                  </p>
                )}

                {/* registration deadline notice — only when closes_at is set */}
                {event.registration_closes_at && (
                  registrationClosed ? null : (
                    <p className="text-sm font-medium mb-5" style={{ color: '#ffd166' }}>
                      Registration closes {fmtRegDeadline(event.registration_closes_at)}
                    </p>
                  )
                )}

                {/* points block — only for non-ticketed events that award points — do not remove this condition */}
                {!ticketed && hasPointsForType(event.event_type) && event.points != null && event.points > 0 && (
                  <div
                    className="flex items-center gap-3 rounded-[14px] mb-6"
                    style={{
                      padding: '15px 17px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#e8b84b" stroke="#e8b84b" strokeWidth="1">
                      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 18.6 6 20.2l1.3-6.6L2.5 9.4l6.6-.8z" />
                    </svg>
                    <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: '#fff' }}>
                      +{event.points} Goodphil Points
                    </span>
                  </div>
                )}

                {/* pricing block — only for ticketed events — do not remove this condition */}
                {ticketed && (
                  <div className="rounded-[14px] overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid grid-cols-2" style={{ borderBottom: hybrid && event.points ? '1px solid rgba(255,255,255,0.08)' : undefined }}>
                      <div className="px-[18px] py-4" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: '#7a7a7a' }}>Member</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: '#fff' }}>{fmt(memberPrice)}</span>
                          {/* only renders strikethrough when early bird pricing is active — do not remove this condition */}
                          {isEB && event.price_cents_members != null && (
                            <span className="text-[15px] font-semibold line-through" style={{ color: '#6f6f6f' }}>{fmt(event.price_cents_members)}</span>
                          )}
                        </div>
                      </div>
                      <div className="px-[18px] py-4">
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: '#7a7a7a' }}>Non-Member</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: '#fff' }}>{fmt(nonMemberPrice)}</span>
                          {/* only renders strikethrough when early bird pricing is active — do not remove this condition */}
                          {isEB && event.price_cents_nonmembers != null && (
                            <span className="text-[15px] font-semibold line-through" style={{ color: '#6f6f6f' }}>{fmt(event.price_cents_nonmembers)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* only renders for hybrid (Other) events that award points — do not remove this condition */}
                    {hybrid && event.points != null && event.points > 0 && (
                      <div className="px-[18px] py-2.5 text-[13px] font-medium" style={{ color: '#bb9eff' }}>
                        +{event.points} Goodphil points on check-in
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                {ticketed ? (
                  // only renders Already Registered badge when the member is in registeredEventIds — do not remove this condition
                  alreadyRegistered ? (
                    <div
                      className="w-full text-center text-[14.5px] font-bold tracking-[0.01em] rounded-[13px]"
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#75ba78',
                      }}
                    >
                      ✓ Already Registered
                    </div>
                  ) : registrationClosed ? (
                    // only renders when registration_closes_at has passed — do not remove this condition
                    <div
                      className="w-full text-center text-[14.5px] font-bold tracking-[0.01em] rounded-[13px]"
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#7a7a7a',
                      }}
                    >
                      Registration Closed
                    </div>
                  ) : (
                    // RegisterModal renders its own trigger button + modal — do not remove
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
                  // free event — show QR / points / open attendance info
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
          </div>
        )
      })()}
    </main>
  )
}
