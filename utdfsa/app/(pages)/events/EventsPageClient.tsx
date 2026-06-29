// ── EventsPageClient.tsx ─────────────────────────────────────
// client component — events page with card grid, this-week strip, calendar, and detail modal
//
// data:  events prop (Event[]) from events/page.tsx server component
//        member and registeredEventIds props for pricing and registration state
// deps:  @fullcalendar/react (dayGrid + interaction plugins) for the calendar view
// notes: early-bird and grace-period logic determines CTA state in the detail modal;
//        modal is rendered inline via an IIFE to keep event variable in scope
// ─────────────────────────────────────────────────────────────
'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Fragment, memo } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { EventClickArg } from '@fullcalendar/core'
// ponytail: dynamic import keeps FullCalendar (~300KB) out of the initial bundle
const EventCalendar = dynamic(() => import('./EventCalendar'), { ssr: false })
import RegisterModal from './RegisterModal'
import Modal from '@/components/Modal'
import type { Event } from '@/types/database'
import { getBadge, getEventTypeColor } from '@/utils/eventTypes'

// ── helpers ───────────────────────────────────────────────────────────────────
// converts cents integer to dollar string (e.g. 1500 → "$15.00")
function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

// all date/time helpers pin to America/Chicago so displays match Dallas event times
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

// event type classification — determines pricing, QR attendance, and points eligibility
// 'other' is a hybrid type: it has ticket pricing AND awards goodphil points on QR check-in
function isTicketed(type: string) { return ['party', 'other'].includes(type.toLowerCase()) }
function isHybrid(type: string) { return type.toLowerCase() === 'other' }
function hasAttendanceQR(type: string) { return ['general meeting', 'risk management', 'gp event', 'other'].includes(type.toLowerCase()) }
function hasPointsForType(type: string) { return ['gp event', 'other'].includes(type.toLowerCase()) }

const EVENTS_PER_PAGE = 12

// ── section divider ───────────────────────────────────────────────────────────
const SectionLabel = memo(function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="font-display font-bold text-xs tracking-[0.18em] text-[#9a9a9a] uppercase whitespace-nowrap">{label}</span>
      <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
})

// ── placeholder grid when no photo ───────────────────────────────────────────
const PhotoPlaceholder = memo(function PhotoPlaceholder({ ratio = '4/5' }: { ratio?: string }) {
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
})

// ── props ────────────────────────────────────────────────────────────────────
interface TicketQR {
  attendee_fname: string
  attendee_lname: string
  attendee_email: string
  qr_data_url: string
}

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
  // populated for non-member purchases once payment is confirmed; undefined until then
  ticketQRs?: TicketQR[]
}

export default function EventsPageClient({ events, isMember, member, registeredEventIds, success, ticketQRs }: Props) {
  // tracks which event card was clicked to open the detail modal; null = closed
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showPast, setShowPast] = useState(false)
  // controls the "already registered" info modal for members who have a paid ticket
  const [showAlreadyRegistered, setShowAlreadyRegistered] = useState(false)
  // refreshed every 60s so events that pass their date while the page is open move to past automatically
  const [now, setNow] = useState(() => new Date())
  // only mount FullCalendar on md+ — avoids loading heavy calendar code on mobile
  const [showCalendar, setShowCalendar] = useState(false)

  // gridPhase drives the grid crossfade during page/filter transitions
  // 'exiting': old cards fade out; 'entering': new cards fade in; 'idle': no transition
  const [gridPhase, setGridPhase] = useState<'idle' | 'exiting' | 'entering'>('idle')
  // contentState lags behind currentPage/showPast by 175ms so the exit animation plays first
  // cardSetKey increments on every content change to force card remounts (re-triggers entrance animations)
  const [contentState, setContentState] = useState({ page: 1, showPast: false, cardSetKey: 0 })

  // header entrance refs
  const labelRef = useRef<HTMLParagraphElement>(null)
  const titleRef  = useRef<HTMLHeadingElement>(null)
  const descRef   = useRef<HTMLDivElement>(null)
  // calendar viewport-trigger ref
  const calendarSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setShowCalendar(mq.matches)
    const handler = (e: MediaQueryListEvent) => setShowCalendar(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── sort: upcoming ascending, past descending ─────────────
  const { upcoming, past } = useMemo(() => {
    const upcoming = events
      .filter(e => new Date(e.event_date) >= now)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    const past = events
      .filter(e => new Date(e.event_date) < now)
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    return { upcoming, past }
  }, [events, now])

  // reset to page 1 if an event crosses into past while the tab is open
  const prevUpcomingCount = useRef(upcoming.length)
  useEffect(() => {
    if (prevUpcomingCount.current !== upcoming.length) {
      setCurrentPage(1)
      setContentState(prev => ({ ...prev, page: 1 }))
      prevUpcomingCount.current = upcoming.length
    }
  }, [upcoming.length])

  // ── pagination (immediate state — drives controls and count display) ──────
  const displayEvents = showPast ? [...upcoming, ...past] : upcoming
  const totalEvents = displayEvents.length
  const totalPages = Math.ceil(totalEvents / EVENTS_PER_PAGE)

  // ── lagged content — drives which cards actually render during transitions ─
  const displayEventsForCards = contentState.showPast ? [...upcoming, ...past] : upcoming
  const paginatedEvents = displayEventsForCards.slice(
    (contentState.page - 1) * EVENTS_PER_PAGE,
    contentState.page * EVENTS_PER_PAGE,
  )

  // ── grid crossfade: exit current cards, swap content, enter new cards ─────
  function animateGridTransition(newPage: number, newShowPast: boolean) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setContentState(prev => ({ page: newPage, showPast: newShowPast, cardSetKey: prev.cardSetKey + 1 }))
      return
    }
    setGridPhase('exiting')
    setTimeout(() => {
      setContentState(prev => ({ page: newPage, showPast: newShowPast, cardSetKey: prev.cardSetKey + 1 }))
      setGridPhase('entering')
      setTimeout(() => setGridPhase('idle'), 350)
    }, 175)
  }

  function handlePageChange(page: number) {
    setCurrentPage(page)
    animateGridTransition(page, showPast)
    document.getElementById('all-events')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleShowPastToggle() {
    const newShowPast = !showPast
    setShowPast(newShowPast)
    setCurrentPage(1)
    animateGridTransition(1, newShowPast)
  }

  function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
  }

  const handleCalendarEventClick = useCallback((info: EventClickArg) => {
    setSelectedEvent(info.event.extendedProps['event'] as Event)
  }, [])

  // ── calendar events mapping — stable across renders where events don't change ─
  const calendarEvents = useMemo(() => events.map(event => ({
    id: event.id,
    title: event.name,
    date: new Date(event.event_date).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
    allDay: true,
    backgroundColor: getEventTypeColor(event.event_type),
    borderColor: getEventTypeColor(event.event_type),
    extendedProps: { event },
  })), [events])

  // ── this-week filter ──────────────────────────────────────
  const thisWeek = useMemo(() => {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return events.filter(e => {
      const d = new Date(e.event_date)
      return d >= now && d <= weekEnd
    })
  }, [events, now])

  // ── header entrance animation (mount only) ────────────────────────────────
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sequence = [
      { ref: labelRef, anim: 'evFadeIn 500ms ease-out both' },
      { ref: titleRef, anim: 'evFadeUp24 700ms ease-out both' },
      { ref: descRef,  anim: 'evFadeUp16 600ms ease-out 150ms both' },
    ]
    if (reduced) {
      sequence.forEach(({ ref }) => { if (ref.current) ref.current.style.opacity = '1' })
      return
    }
    sequence.forEach(({ ref, anim }) => {
      const el = ref.current
      if (!el) return
      el.style.animation = 'none'
      void el.offsetHeight
      el.style.animation = anim
    })
  }, [])

  // ── calendar viewport entrance — re-runs when showCalendar mounts the section ─
  useEffect(() => {
    if (!showCalendar) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = calendarSectionRef.current
    if (!el) return
    if (reduced) { el.style.opacity = '1'; return }
    el.style.opacity = '0'
    el.style.transform = 'translateY(12px)'
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.transition = 'opacity 500ms ease-out, transform 500ms ease-out'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [showCalendar])

  return (
    <main className="min-h-screen text-white" style={{ background: '#0f0f0f' }}>
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-20">

        {/* ── page header ──────────────────────────────────────────────────── */}
        <div className="pt-14 pb-10">
          <p
            ref={labelRef}
            className="font-display font-bold text-xs tracking-[0.2em] uppercase mb-5"
            style={{ color: '#6f6f6f', opacity: 0 }}
          >
            What&apos;s happening
          </p>
          <h1
            ref={titleRef}
            className="font-display font-black leading-[0.96] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(42px,6vw,74px)', opacity: 0 }}
          >
            Events
          </h1>
          <div ref={descRef} style={{ opacity: 0 }}>
            <p className="text-sm font-medium mt-4 mb-1" style={{ color: '#8c8c8c' }}>
              Stay up to date with everything UTD FSA.
            </p>
            <p className="text-sm font-medium" style={{ color: '#6f6f6f' }}>
              {isMember
                ? 'Member pricing applied. Limit one ticket per paid event.'
                : 'Sign in as a member to unlock member pricing on paid events.'}
            </p>
          </div>
        </div>

        {/* ── success banner ────────────────────────────────────────────────── */}
        {/* only renders after a successful free-event registration or Stripe redirect — do not remove this condition */}
        {success && (
          <div className="mb-8 rounded-2xl overflow-hidden" style={{
            background: 'rgba(117,186,120,0.08)',
            border: '1px solid rgba(117,186,120,0.28)',
          }}>
            <div className="px-5 py-4 text-sm font-medium" style={{ color: '#75ba78' }}>
              {ticketQRs && ticketQRs.length > 0
                ? 'You\'re registered! Your QR code tickets are below — screenshot or save each one. Your QR code tickets have also been sent to their respective recipient emails.'
                : 'You\'re registered! Check your email for your QR code ticket.'}
            </div>

            {/* qr code grid — only populated for non-member purchases once payment is confirmed */}
            {ticketQRs && ticketQRs.length > 0 && (
              <div className="px-5 pb-6" style={{ borderTop: '1px solid rgba(117,186,120,0.14)' }}>
                <div className="flex flex-wrap gap-6 pt-5">
                  {ticketQRs.map((t, i) => {
                    const name = [t.attendee_fname, t.attendee_lname].filter(Boolean).join(' ')
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        {/* white padding is part of the qr spec — scanners need quiet zone */}
                        <img
                          src={t.qr_data_url}
                          alt={`QR code for ${name || t.attendee_email}`}
                          width={160}
                          height={160}
                          className="rounded-xl"
                          style={{ background: '#fff', padding: '10px' }}
                        />
                        <p className="text-[12px] font-semibold text-center" style={{ color: '#cfcfcf', maxWidth: '160px' }}>
                          {name || t.attendee_email || `Ticket ${i + 1}`}
                        </p>
                        {/* only renders the email line when both name and email are available */}
                        {name && t.attendee_email && (
                          <p className="text-[11px] text-center" style={{ color: '#6e6e6e', maxWidth: '160px' }}>
                            {t.attendee_email}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
              {thisWeek.map((event, i) => {
                const badge = getBadge(event.event_type)
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="week-pill flex-none text-left rounded-[14px] px-4 hover:brightness-110 transition-all duration-200"
                    style={{
                      width: '212px',
                      paddingTop: '15px',
                      paddingBottom: '15px',
                      background: '#161616',
                      border: '1px solid rgba(255,255,255,0.08)',
                      animation: `evWeekIn 500ms ease-out ${i * 75}ms both`,
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
        <div id="all-events" className="mt-10">
          <SectionLabel label="All Events" />

          {/* only renders empty state when no displayable events exist — do not remove this condition */}
          {displayEvents.length === 0 ? (
            <p className="py-6" style={{ color: '#6f6f6f' }}>No upcoming events right now — check back soon!</p>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[22px]"
              style={{
                opacity: gridPhase === 'exiting' ? 0 : 1,
                transform: gridPhase === 'exiting' ? 'translateY(-8px)' : 'none',
                transition: gridPhase === 'exiting' ? 'opacity 175ms ease-out, transform 175ms ease-out' : 'none',
              }}
            >
              {paginatedEvents.map((event, index) => {
                const badge = getBadge(event.event_type)
                const isPastCard = new Date(event.event_date) < now
                const globalIndex = (contentState.page - 1) * EVENTS_PER_PAGE + index
                const isFirstPastEvent = contentState.showPast && globalIndex === upcoming.length
                return (
                  <Fragment key={`${contentState.cardSetKey}-${event.id}`}>
                    {isFirstPastEvent && (
                      <div className="col-span-full flex items-center gap-4 py-2 my-2">
                        <div className="flex-1 border-t border-white/10" />
                        <span className="font-display font-bold text-[11px] tracking-[0.18em] uppercase whitespace-nowrap" style={{ color: '#6f6f6f' }}>Past Events</span>
                        <div className="flex-1 border-t border-white/10" />
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedEvent(event)}
                      onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
                      className="event-card text-left rounded-[18px] overflow-hidden"
                      style={{
                        background: '#181818',
                        border: '1px solid rgba(255,255,255,0.08)',
                        animation: `evCardIn 550ms ease-out ${index * 50}ms both`,
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
                            className={`object-cover object-top${isPastCard ? ' brightness-75' : ''}`}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            preload={index === 0 && currentPage === 1}
                            loading={index === 0 ? 'eager' : 'lazy'}
                          />
                        ) : (
                          <PhotoPlaceholder ratio="4:5" />
                        )}
                      </div>

                      {/* card body */}
                      <div style={{ padding: '16px 17px 19px' }}>
                        <div className="flex items-center flex-wrap gap-2 mb-3">
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
                          {isPastCard && (
                            <span
                              className="text-[10px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full"
                              style={{ background: 'rgba(0,0,0,0.55)', color: '#9a9a9a', border: '1px solid rgba(255,255,255,0.12)' }}
                            >
                              Past Event
                            </span>
                          )}
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
                  </Fragment>
                )
              })}
            </div>
          )}

          {/* ── pagination controls ───────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-8 mb-4">
              <p className="text-center text-[13px] font-medium mb-4" style={{ color: '#6f6f6f' }}>
                Showing {(currentPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(currentPage * EVENTS_PER_PAGE, totalEvents)} of {totalEvents} events
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] border text-[13px] font-semibold transition-colors${
                    currentPage === 1
                      ? ' opacity-40 cursor-not-allowed border-white/16 bg-transparent text-[#8c8c8c]'
                      : ' border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf]'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Previous
                </button>

                {getPageNumbers(currentPage, totalPages).map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-[13px] font-medium" style={{ color: '#6f6f6f' }}>...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`px-4 py-2 rounded-[10px] border text-[13px] font-semibold transition-colors${
                        page === currentPage
                          ? ' text-white'
                          : ' border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf]'
                      }`}
                      style={page === currentPage ? {
                        background: '#272727',
                        border: '1px solid rgba(255,255,255,0.2)',
                      } : undefined}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] border text-[13px] font-semibold transition-colors${
                    currentPage === totalPages
                      ? ' opacity-40 cursor-not-allowed border-white/16 bg-transparent text-[#8c8c8c]'
                      : ' border-white/16 bg-transparent text-[#8c8c8c] hover:border-white/30 hover:text-[#cfcfcf]'
                  }`}
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── past events toggle ───────────────────────────────────────────── */}
          {past.length > 0 && (
            <div className="flex items-center justify-center mt-4 mb-2">
              <button
                onClick={handleShowPastToggle}
                className="text-[13px] font-semibold transition-colors border border-white/10 rounded-[10px] px-4 py-2 hover:border-white/30 hover:text-[#cfcfcf]"
                style={{ color: '#8c8c8c' }}
              >
                {showPast
                  ? 'Hide past events'
                  : `Show ${past.length} past event${past.length === 1 ? '' : 's'}`}
              </button>
            </div>
          )}
        </div>

        {/* ── event calendar ────────────────────────────────────────────────── */}
        {showCalendar && <div ref={calendarSectionRef} className="mt-12" style={{ opacity: 0 }}>
          <SectionLabel label="Event Calendar" />
          <div className="fc-dark rounded-[18px] overflow-hidden p-4" style={{ background: '#131313', border: '1px solid rgba(255,255,255,0.08)' }}>
            <EventCalendar events={calendarEvents} onEventClick={handleCalendarEventClick} />
          </div>
        </div>}
      </div>

      {/* ── event detail modal ─────────────────────────────────────────────── */}
      {/* only renders when an event card has been clicked — do not remove this condition */}
      {selectedEvent && (() => {
        const event = selectedEvent
        const badge = getBadge(event.event_type)
        const ticketed = isTicketed(event.event_type)
        const hybrid = isHybrid(event.event_type)
        const nowTs = new Date()
        // early bird is active when: event is ticketed, deadline not passed, and eb prices are set
        const isEB =
          ticketed &&
          event.eb_deadline != null &&
          event.eb_price_members != null &&
          event.eb_price_nonmembers != null &&
          nowTs < new Date(event.eb_deadline)
        // resolve the correct price to display based on early bird state
        const memberPrice = isEB ? event.eb_price_members! : event.price_cents_members
        const nonMemberPrice = isEB ? event.eb_price_nonmembers! : event.price_cents_nonmembers
        const alreadyRegistered = ticketed && registeredEventIds.includes(event.id)
        // 24-hour grace period: registration remains open until 24h after the event starts
        const gracePeriodMs = 24 * 60 * 60 * 1000
        const pastGracePeriod =
          nowTs.getTime() - new Date(event.event_date).getTime() > gracePeriodMs
        // event is effectively inactive if manually deactivated or grace period has passed
        const effectivelyInactive = !event.is_active || pastGracePeriod
        // registration is closed when event is inactive OR registration_closes_at has passed
        const registrationClosed =
          effectivelyInactive ||
          (event.registration_closes_at != null &&
           new Date() > new Date(event.registration_closes_at))

        return (
          <Modal onClose={() => { setSelectedEvent(null); setShowAlreadyRegistered(false) }} size="lg" scrollable={false}>
            <div
              style={{
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'modalIn .26s cubic-bezier(0.22,1,0.36,1)',
              }}
              className="rounded-2xl relative"
            >
              <button
                onClick={() => { setSelectedEvent(null); setShowAlreadyRegistered(false) }}
                className="absolute top-3.5 right-3.5 z-10 flex items-center justify-center rounded-full transition-colors"
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
                            <span className="hidden sm:inline text-[15px] font-semibold line-through" style={{ color: '#6f6f6f' }}>{fmt(event.price_cents_members)}</span>
                          )}
                        </div>
                      </div>
                      <div className="px-[18px] py-4">
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: '#7a7a7a' }}>Non-Member</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: '#fff' }}>{fmt(nonMemberPrice)}</span>
                          {/* only renders strikethrough when early bird pricing is active — do not remove this condition */}
                          {isEB && event.price_cents_nonmembers != null && (
                            <span className="hidden sm:inline text-[15px] font-semibold line-through" style={{ color: '#6f6f6f' }}>{fmt(event.price_cents_nonmembers)}</span>
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
                  // only renders Already Registered button when the member has a paid ticket — do not remove this condition
                  alreadyRegistered ? (
                    <button
                      onClick={() => setShowAlreadyRegistered(true)}
                      className="w-full text-center text-[14.5px] font-bold tracking-[0.01em] rounded-[13px] transition-opacity hover:opacity-75"
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#75ba78',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Already Registered
                    </button>
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
          </Modal>
        )
      })()}

      {/* already registered info modal — only for members with a confirmed paid ticket */}
      {showAlreadyRegistered && (
        <Modal onClose={() => setShowAlreadyRegistered(false)} size="sm">
          <div
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'modalIn .26s cubic-bezier(0.22,1,0.36,1)',
            }}
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

      <style>{`
        @keyframes evFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes evFadeUp24 {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes evFadeUp16 {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes evCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes evWeekIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .event-card {
          transition: transform 200ms ease-out, box-shadow 200ms ease-out;
        }
        .event-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 36px rgba(0,0,0,0.45);
        }
        .event-card { animation: none !important; opacity: 1 !important; transform: none !important; }
          .week-pill  { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </main>
  )
}
