'use client'

import { useState } from 'react'

interface Ticket { fname: string; lname: string; email: string }

/**
 * Props — passed down from EventsPage server component (events/page.tsx)
 *   event      — shape of the event being registered for (id, name, date, location, prices, early-bird flag)
 *   isMember   — true when the logged-in user has an active membership; controls pricing and ticket limits
 *   memberInfo — pre-filled name + contact_email for the first ticket slot; null for non-members / unauthenticated
 */
interface Props {
  event: {
    id: string
    name: string
    event_date: string
    location: string | null
    price_cents_members: number
    price_cents_nonmembers: number
    is_early_bird: boolean
  }
  isMember: boolean
  memberInfo: { fname: string; lname: string; email: string } | null
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

const blank = (): Ticket => ({ fname: '', lname: '', email: '' })

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   event       — id, name, event_date, location, price_cents_members,
//                 price_cents_nonmembers, is_early_bird
//   isMember    — bool; true = member pricing + 1-ticket limit
//   memberInfo  — { fname, lname, email } | null; pre-fills the first ticket row
//   tickets     — array of { fname, lname, email } being registered
//   pricePerTicket — computed from isMember + event prices (cents)
//   total       — pricePerTicket * tickets.length (cents)
//   loading     — true while the checkout API call is in flight
//   error       — string | null; validation or API error
//   open        — bool; controls modal visibility
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function RegisterModal({ event, isMember, memberInfo }: Props) {
  const [open, setOpen] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([
    memberInfo
      ? { fname: memberInfo.fname, lname: memberInfo.lname, email: memberInfo.email }
      : blank(),
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pricePerTicket = isMember ? event.price_cents_members : event.price_cents_nonmembers
  const total = pricePerTicket * tickets.length

  function updateTicket(i: number, field: keyof Ticket, value: string) {
    setTickets(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function addTicket() {
    if (tickets.length < 10) setTickets(prev => [...prev, blank()])
  }

  function removeTicket(i: number) {
    setTickets(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // api: calls POST /api/events/register — creates registration + Stripe checkout session — do not change this endpoint
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, tickets }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }

      // redirect to Stripe checkout (or success page for free events)
      window.location.href = data.url
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
      >
        Register
      </button>

      {/* only renders when the user has clicked the Register button — do not remove this condition */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{event.name}</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                  {event.location && ` · ${event.location}`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

              {/* pricing notice */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {/* only renders the member-rate label when the user is an active member — do not remove this condition */}
                {isMember ? (
                  <p className="text-blue-700 font-medium">
                    Member rate · {fmt(pricePerTicket)}/ticket
                    {event.is_early_bird && ' (Early Bird)'}
                  </p>
                ) : (
                  <p className="text-gray-600">
                    General admission · {fmt(pricePerTicket)}/ticket
                    {event.is_early_bird && ' (Early Bird)'}
                  </p>
                )}
                {/* only renders the 1-ticket limit notice for members — do not remove this condition */}
                {isMember && (
                  <p className="text-gray-400 text-xs mt-1">
                    Members are limited to one ticket per event.
                  </p>
                )}
              </div>

              {/* ticket fields */}
              {tickets.map((ticket, i) => (
                <div key={i} className="border rounded-lg p-4 flex flex-col gap-3 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">
                      <span className="text-gray-800">{i === 0 ? 'Your info' : `Attendee ${i + 1}`}</span>
                    </p>
                    {/* only renders the Remove button for non-member extra attendees (not the first slot) — do not remove this condition */}
                    {!isMember && i > 0 && (
                      <button
                        type="button"
                        onClick={() => removeTicket(i)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">First Name</label>
                      {/* disabled for the member's own first ticket — their name comes from memberInfo — do not remove disabled */}
                      <input
                        required
                        value={ticket.fname}
                        onChange={e => updateTicket(i, 'fname', e.target.value)}
                        disabled={isMember && i === 0}
                        className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="First"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Last Name</label>
                      {/* disabled for the member's own first ticket — their name comes from memberInfo — do not remove disabled */}
                      <input
                        required
                        value={ticket.lname}
                        onChange={e => updateTicket(i, 'lname', e.target.value)}
                        disabled={isMember && i === 0}
                        className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Last"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                    {/* disabled for the member's own first ticket — their contact_email comes from memberInfo — do not remove disabled */}
                    <input
                      required
                      type="email"
                      value={ticket.email}
                      onChange={e => updateTicket(i, 'email', e.target.value)}
                      disabled={isMember && i === 0}
                      className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              ))}

              {/* only renders the add-attendee button for non-members who haven't hit the 10-ticket cap — do not remove this condition */}
              {!isMember && tickets.length < 10 && (
                <button
                  type="button"
                  onClick={addTicket}
                  className="w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 rounded-lg py-3 text-sm font-medium transition-colors"
                >
                  + Add another attendee
                </button>
              )}

              {/* total */}
              <div className="flex justify-between items-center pt-1 border-t text-sm">
                <span className="text-gray-700">
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                </span>
                <span className="font-bold text-base text-gray-900">
                  {total === 0 ? 'Free' : fmt(total)}
                </span>
              </div>

              {/* only renders when the API or network returned an error — do not remove this condition */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {/* only shows "Processing…" while the checkout API call is in flight — do not remove this condition */}
                {loading
                  ? 'Processing…'
                  : total === 0
                    ? 'Confirm Registration'
                    : `Continue to Payment · ${fmt(total)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
