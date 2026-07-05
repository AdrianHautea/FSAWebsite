// ── OrdersClient.tsx ─────────────────────────────────────────
// client component — renders order history cards with expandable qr tickets
//
// data:  props from OrdersPage (registrations, eventsData lookup map, contactEmail, success flag)
// deps:  qrcode (npm) — generates qr data urls client-side from ticket codes
// notes: qr images are generated on the client to avoid storing pre-rendered images;
//        the success banner only appears when stripe redirects back with ?success=true
'use client'

import { useState, useEffect, useRef } from 'react'
import { useStaggeredReveal } from '@/lib/useRevealOnScroll'

type Ticket = {
  id: string
  qr_code: string
  attendee_fname: string | null
  attendee_lname: string | null
  attendee_email: string | null
  checked_in: boolean
  checked_in_at: string | null
}

type Registration = {
  id: string
  created_at: string
  payment_status: string
  num_tickets: number
  amt_paid: number | null
  amt_expected: number
  event_id: string | null
  registration_tickets: Ticket[] | null
}

type EventInfo = {
  name: string
  event_date: string
  location: string | null
  cover_photo_url: string | null
}

type Props = {
  registrations: Registration[]
  eventsData: Record<string, EventInfo>
  contactEmail: string
  success: string | undefined
}

// ── helpers ───────────────────────────────────────────────────

// format iso date to "Mon, Jan 1, 2025" in central time
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

// ── TicketQRImage ─────────────────────────────────────────────
// inline sub-component — renders a qr code image for a single ticket code
function TicketQRImage({ code }: { code: string }) {
  // holds the generated qr data url; empty string means still loading
  const [dataUrl, setDataUrl] = useState('')

  // generate the qr code data url whenever the ticket code changes
  useEffect(() => {
    if (code) {
      import('qrcode').then(({ default: QR }) =>
        QR.toDataURL(code, { width: 240, margin: 2 }).then(setDataUrl).catch(console.error)
      )
    }
  }, [code])

  if (!dataUrl) {
    return (
      <div
        className="rounded-xl animate-pulse w-[240px] max-w-full aspect-square"
        style={{ background: '#262626' }}
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt="Ticket QR Code"
      width={240}
      height={240}
      className="rounded-xl w-[240px] max-w-full h-auto"
    />
  )
}

// ── component ─────────────────────────────────────────────────
export default function OrdersClient({ registrations, eventsData, contactEmail, success }: Props) {
  // tracks which registration cards have their qr ticket panel open; keyed by registration id
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // toggles the qr ticket panel open/closed for a given registration card
  const toggle = (id: string) =>
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }))

  const sortedRegistrations = sortOrder === 'newest'
    ? registrations
    : [...registrations].reverse()

  const listRef = useRef<HTMLDivElement>(null)
  useStaggeredReveal(
    () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-order-card]') ?? []),
    (card, cards) => {
      const i = cards.indexOf(card)
      card.style.animation = `fadeUp 0.5s var(--ease-smooth) ${i * 70}ms both`
    },
  )

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-white mb-1">Order History</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Your event registrations and QR code tickets.
      </p>

      {/* only renders when Stripe redirects back with ?success=true after payment — do not remove this condition */}
      {success && (
        <div
          className="mb-6 p-4 rounded-xl text-sm font-medium"
          style={{
            background: 'rgba(117,186,120,0.1)',
            border: '1px solid rgba(117,186,120,0.25)',
            color: '#75ba78',
            animation: 'fadeUp 0.5s var(--ease-smooth) both',
          }}
        >
          🎉 Registration confirmed! Your QR code ticket is shown below and was sent to {contactEmail}.
        </div>
      )}

      {/* sort toggle — full width on mobile, auto on sm+ */}
      {registrations.length > 0 && (
        <button
          onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
          className="w-full sm:w-auto mb-4 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150"
          style={{
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
          }}
          onMouseEnter={e => {
            const t = e.currentTarget
            t.style.borderColor = 'rgba(255,255,255,0.2)'
            t.style.color = 'rgba(255,255,255,0.9)'
            t.style.background = 'rgba(255,255,255,0.05)'
          }}
          onMouseLeave={e => {
            const t = e.currentTarget
            t.style.borderColor = 'rgba(255,255,255,0.1)'
            t.style.color = 'rgba(255,255,255,0.6)'
            t.style.background = 'rgba(255,255,255,0.02)'
          }}
        >
          {sortOrder === 'newest' ? 'Newest first ↓' : 'Oldest first ↑'}
        </button>
      )}

      {/* only renders the empty state when the member has no registrations — do not remove this condition */}
      {registrations.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl mb-3" role="img" aria-label="ticket">🎟️</p>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            No orders yet
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Register for an event to see your tickets here.
          </p>
        </div>
      ) : (
        <div ref={listRef} className="flex flex-col gap-3">
          {sortedRegistrations.map(reg => {
            // look up event details from the pre-fetched map by event_id
            const event = reg.event_id ? eventsData[reg.event_id] ?? null : null
            const tickets = (reg.registration_tickets ?? []) as Ticket[]
            // derive display flags from payment_status string
            const isPaid = reg.payment_status === 'paid'
            const isPending = reg.payment_status === 'pending'
            const isFailed = reg.payment_status === 'failed'
            // whether this card's qr ticket panel is currently open
            const isExpanded = expandedCards[reg.id] ?? false

            return (
              <div
                key={reg.id}
                data-order-card
                className="rounded-2xl overflow-hidden"
                style={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Card header row */}
                <div className="p-4 flex items-center gap-4">
                  {/* Event name, date, location */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">
                      {event?.name ?? 'Unknown Event'}
                    </p>
                    {event && (
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {fmtDate(event.event_date)}
                      </p>
                    )}
                    {event?.location && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {event.location}
                      </p>
                    )}
                  </div>

                  {/* Payment status badge — no event type badge */}
                  <span className={`shrink-0 text-[11px] font-bold tracking-[0.04em] px-2.5 py-0.5 rounded-full ${
                    isPaid
                      ? 'bg-[rgba(95,207,143,0.12)] border border-[rgba(95,207,143,0.35)] text-[#5fcf8f]'
                      : isPending
                        ? 'bg-[rgba(227,174,61,0.12)] border border-[rgba(227,174,61,0.35)] text-[#f0c869]'
                        : 'bg-[rgba(239,111,111,0.12)] border border-[rgba(239,111,111,0.35)] text-[#ef6f6f]'
                  }`}>
                    {isPaid ? 'Paid' : isPending ? 'Pending' : 'Failed'}
                  </span>
                </div>

                {/* only renders tickets once payment_status === 'paid' and tickets exist — do not remove this condition */}
                {isPaid && tickets.length > 0 && (
                  <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />

                    <div className="px-4 py-3">
                      <button
                        onClick={() => toggle(reg.id)}
                        className="w-full text-sm py-2.5 rounded-xl transition-colors duration-150"
                        style={{
                          color: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                        onMouseEnter={e => {
                          const t = e.currentTarget
                          t.style.borderColor = 'rgba(255,255,255,0.2)'
                          t.style.color = 'rgba(255,255,255,0.9)'
                          t.style.background = 'rgba(255,255,255,0.05)'
                        }}
                        onMouseLeave={e => {
                          const t = e.currentTarget
                          t.style.borderColor = 'rgba(255,255,255,0.1)'
                          t.style.color = 'rgba(255,255,255,0.6)'
                          t.style.background = 'rgba(255,255,255,0.02)'
                        }}
                      >
                        {isExpanded ? '↑ Hide Ticket' : 'Show QR Ticket ↓'}
                      </button>
                    </div>

                    {/* grid-template-rows 0fr→1fr — animates the collapse without touching
                        height directly, so the panel stays always-mounted (no pop-in) */}
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-out"
                      style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <div
                          style={{
                            background: '#0f0f0f',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                          }}
                          className="px-4 py-8 flex flex-col items-center gap-10"
                        >
                          {tickets.map(ticket => (
                            <div key={ticket.id} className="flex flex-col items-center gap-3">
                              <TicketQRImage code={ticket.qr_code} />
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {[ticket.attendee_fname, ticket.attendee_lname].filter(Boolean).join(' ') || 'Attendee'}
                              </p>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                {event?.name ?? ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* only renders when payment is still processing — do not remove this condition */}
                {isPending && (
                  <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />
                    <div className="px-4 py-3">
                      <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Ticket available after payment is confirmed.
                      </p>
                    </div>
                  </>
                )}

                {/* only renders when payment failed or was abandoned — do not remove this condition */}
                {isFailed && (
                  <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />
                    <div className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'rgba(248,113,113,0.7)' }}>
                        Payment was not completed.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
