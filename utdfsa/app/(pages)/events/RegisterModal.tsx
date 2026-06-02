'use client'

import { useState } from 'react'

interface Ticket { fname: string; lname: string; email: string }

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

              {/* add ticket (non-members only) */}
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
