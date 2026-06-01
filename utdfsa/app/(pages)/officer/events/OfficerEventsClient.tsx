'use client'

import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import type { Event } from '@/types/database'

// ── constants ─────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['Party', 'Meeting', 'Workshop', 'Practice', 'Fundraising', 'Other'] as const

/**
 * Ticketed events: Party and Other
 *   → show ticket pricing + early-bird toggle
 *   → officer scan page handles check-in
 *   → Party specifically has NO attendance QR (ticket scan IS attendance)
 *
 * Free/attendance events: Meeting, Workshop, Practice, Fundraising, Other
 *   → no ticket pricing
 *   → attendance tracked via QR code that members scan at the door
 */
function isTicketed(type: string) {
  return ['party', 'other'].includes(type.toLowerCase())
}

function hasAttendanceQR(type: string) {
  // Every type except Party uses the attendance QR flow
  return type.toLowerCase() !== 'party'
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function toDollars(cents: number) { return (cents / 100).toFixed(2) }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  // datetime-local inputs use the browser's LOCAL time, but toISOString() returns UTC.
  // Subtract the timezone offset so the value shown matches the local wall-clock time.
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

// ── form state ────────────────────────────────────────────────────────────────

interface EventFormData {
  name: string
  description: string
  event_type: string
  event_date: string
  location: string
  points: string
  price_dollars_members: string
  price_dollars_nonmembers: string
  eb_enabled: boolean
  eb_price_dollars_members: string
  eb_price_dollars_nonmembers: string
  eb_deadline: string
  is_active: boolean
}

const emptyForm = (): EventFormData => ({
  name: '', description: '', event_type: 'Meeting', event_date: '',
  location: '', points: '', price_dollars_members: '', price_dollars_nonmembers: '',
  eb_enabled: false, eb_price_dollars_members: '', eb_price_dollars_nonmembers: '',
  eb_deadline: '', is_active: true,
})

function eventToForm(e: Event): EventFormData {
  return {
    name: e.name,
    description: e.description ?? '',
    event_type: e.event_type,
    event_date: toDatetimeLocal(e.event_date),
    location: e.location ?? '',
    points: e.points != null ? String(e.points) : '',
    price_dollars_members: toDollars(e.price_cents_members),
    price_dollars_nonmembers: toDollars(e.price_cents_nonmembers),
    eb_enabled: e.eb_price_members != null,
    eb_price_dollars_members: e.eb_price_members != null ? toDollars(e.eb_price_members) : '',
    eb_price_dollars_nonmembers: e.eb_price_nonmembers != null ? toDollars(e.eb_price_nonmembers) : '',
    eb_deadline: toDatetimeLocal(e.eb_deadline),
    is_active: e.is_active,
  }
}

function formToPayload(f: EventFormData) {
  const ticketed = isTicketed(f.event_type)
  return {
    name: f.name,
    description: f.description || null,
    event_type: f.event_type,
    event_date: f.event_date ? new Date(f.event_date).toISOString() : '',
    location: f.location || null,
    points: f.points ? parseInt(f.points) : null,
    // pricing only applies to ticketed events; free events store 0
    price_dollars_members: ticketed ? (parseFloat(f.price_dollars_members) || 0) : 0,
    price_dollars_nonmembers: ticketed ? (parseFloat(f.price_dollars_nonmembers) || 0) : 0,
    eb_price_dollars_members: ticketed && f.eb_enabled && f.eb_price_dollars_members
      ? parseFloat(f.eb_price_dollars_members) : null,
    eb_price_dollars_nonmembers: ticketed && f.eb_enabled && f.eb_price_dollars_nonmembers
      ? parseFloat(f.eb_price_dollars_nonmembers) : null,
    eb_deadline: ticketed && f.eb_enabled && f.eb_deadline
      ? new Date(f.eb_deadline).toISOString() : null,
    is_active: f.is_active,
  }
}

// ── shared input styles ───────────────────────────────────────────────────────

const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'text-xs font-medium text-gray-600 block mb-1'

// ── EventForm ─────────────────────────────────────────────────────────────────

function EventForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: EventFormData
  onSubmit: (data: EventFormData) => Promise<void>
  onCancel: () => void
  submitLabel: string
}) {
  const [form, setForm] = useState<EventFormData>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof EventFormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const ticketed = isTicketed(form.event_type)

  const ebExpired =
    form.eb_enabled && form.eb_deadline && new Date(form.eb_deadline) < new Date()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* ── General info (all types) ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Event Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className={inputCls} placeholder="Spring Fiesta 2025" />
        </div>

        <div>
          <label className={labelCls}>Event Type *</label>
          <select required value={form.event_type} onChange={e => set('event_type', e.target.value)}
            className={inputCls}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Date & Time *</label>
          <input required type="datetime-local" value={form.event_date}
            onChange={e => set('event_date', e.target.value)} className={inputCls} />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            className={inputCls} placeholder="Student Union, Room 2.410" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} className={`${inputCls} resize-none`}
            placeholder="Details about the event…" />
        </div>
      </div>

      {/* ── Ticketed events: pricing + early bird ───────────────────────────── */}
      {ticketed && (
        <>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">Ticket Pricing</p>
            <p className="text-xs text-gray-500 mb-3">
              Members are limited to one ticket. Non-members can buy multiple.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Member Price ($ / ticket) *</label>
                <input required type="number" min="0" step="0.01"
                  value={form.price_dollars_members}
                  onChange={e => set('price_dollars_members', e.target.value)}
                  className={inputCls} placeholder="10.00" />
              </div>
              <div>
                <label className={labelCls}>Non-Member Price ($ / ticket) *</label>
                <input required type="number" min="0" step="0.01"
                  value={form.price_dollars_nonmembers}
                  onChange={e => set('price_dollars_nonmembers', e.target.value)}
                  className={inputCls} placeholder="15.00" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.eb_enabled}
                onChange={e => set('eb_enabled', e.target.checked)}
                className="rounded" />
              <span className="text-sm font-semibold text-gray-800">Early Bird Pricing</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Early bird prices are shown until the deadline, then regular prices kick in automatically — no action needed.
            </p>

            {form.eb_enabled && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={labelCls}>EB Member Price ($ / ticket)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.eb_price_dollars_members}
                    onChange={e => set('eb_price_dollars_members', e.target.value)}
                    className={inputCls} placeholder="8.00" />
                </div>
                <div>
                  <label className={labelCls}>EB Non-Member Price ($ / ticket)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.eb_price_dollars_nonmembers}
                    onChange={e => set('eb_price_dollars_nonmembers', e.target.value)}
                    className={inputCls} placeholder="12.00" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Early Bird Deadline</label>
                  <input type="datetime-local" value={form.eb_deadline}
                    onChange={e => set('eb_deadline', e.target.value)}
                    className={inputCls} />
                </div>

                {/* status indicator */}
                {form.eb_deadline && (
                  <div className="col-span-2">
                    {ebExpired ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠️ Early bird ended {fmtDate(form.eb_deadline)} — attendees now see regular prices.
                      </p>
                    ) : (
                      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        ✓ Early bird active until {fmtDate(form.eb_deadline)}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Free events: attendance points ──────────────────────────────────── */}
      {!ticketed && (
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-1">Attendance</p>
          <p className="text-xs text-gray-500 mb-3">
            Members scan the attendance QR code to earn points. Open/close the QR in the edit panel after saving.
          </p>
          <div className="w-40">
            <label className={labelCls}>Points Awarded</label>
            <input type="number" min="0" max="100" value={form.points}
              onChange={e => set('points', e.target.value)}
              className={inputCls} placeholder="10" />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none border-t pt-4">
        <input type="checkbox" checked={form.is_active}
          onChange={e => set('is_active', e.target.checked)} className="rounded" />
        Visible to members (active)
      </label>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 justify-end border-t pt-4">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ── Attendance QR panel ───────────────────────────────────────────────────────

function AttendanceQR({ event, onUpdate }: { event: Event; onUpdate: (e: Event) => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const attendUrl = event.attend_qr_token
    ? `${siteUrl}/attend?token=${event.attend_qr_token}` : null

  useEffect(() => {
    if (!attendUrl) return
    QRCode.toDataURL(attendUrl, { width: 240, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [attendUrl])

  async function patch(fields: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/officer/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (res.ok) onUpdate(data.event)
    setSaving(false)
  }

  const isOpen = event.attend_qr_open

  return (
    <div className="border-t mt-5 pt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Attendance QR Code
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Members scan this at the event to log attendance and earn points.
        Open it when the event starts and close it when done.
      </p>

      <div className="flex gap-5 items-start flex-wrap">
        {qrDataUrl && isOpen && (
          <img src={qrDataUrl} alt="Attendance QR" width={120} height={120}
            className="rounded-lg border shadow-sm shrink-0" />
        )}

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {isOpen ? '● Open' : '○ Closed'}
            </span>
            {event.attend_qr_expires_at && new Date(event.attend_qr_expires_at) > new Date() && (
              <span className="text-xs text-gray-500">
                auto-closes {fmtDate(event.attend_qr_expires_at)}
              </span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button disabled={saving}
              onClick={() => patch({ attend_qr_open: !isOpen })}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 border ${
                isOpen
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              }`}>
              {saving ? '…' : isOpen ? 'Close QR' : 'Open QR'}
            </button>

            {isOpen && (
              <button disabled={saving}
                onClick={() => {
                  const mins = prompt('Auto-close after how many minutes? (leave blank to remove expiry)')
                  if (mins === null) return
                  const expiry = mins.trim()
                    ? new Date(Date.now() + parseInt(mins) * 60_000).toISOString()
                    : null
                  patch({ attend_qr_expires_at: expiry })
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                Set Auto-Close
              </button>
            )}

            {attendUrl && (
              <a href={attendUrl} target="_blank" rel="noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                Preview ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function OfficerEventsClient({ initialEvents }: { initialEvents: Event[] }) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?\n\nThis permanently removes all registrations and tickets for this event.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/officer/events/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id))
        if (editingId === id) setEditingId(null)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Failed to delete event.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  function upsert(updated: Event) {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === updated.id)
      return idx === -1 ? [updated, ...prev] : prev.map(e => e.id === updated.id ? updated : e)
    })
  }

  async function handleCreate(form: EventFormData) {
    const res = await fetch('/api/officer/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(form)),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed to create event.')
    upsert(data.event)
    setCreating(false)
  }

  const handleUpdate = useCallback((id: string) => async (form: EventFormData) => {
    const res = await fetch(`/api/officer/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(form)),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed to update event.')
    upsert(data.event)
    setEditingId(null)
  }, [])

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Parties use ticket QR scanning. Meetings/workshops/practices/fundraisers use attendance QR.
          </p>
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setEditingId(null) }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            + New Event
          </button>
        )}
      </div>

      {/* create form */}
      {creating && (
        <div className="border rounded-xl p-6 bg-white shadow-sm mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Create Event</h2>
          <EventForm
            initial={emptyForm()}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitLabel="Create Event"
          />
        </div>
      )}

      {/* event list */}
      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">No events yet. Create your first one!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map(event => {
            const ticketed = isTicketed(event.event_type)
            const showQR = hasAttendanceQR(event.event_type)
            const isEditing = editingId === event.id

            return (
              <div key={event.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                {/* summary row */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-gray-900">{event.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {event.is_active ? 'Active' : 'Hidden'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {event.event_type}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-0.5">
                      {fmtDate(event.event_date)}
                      {event.location && ` · ${event.location}`}
                    </p>

                    <p className="text-sm text-gray-500 mt-0.5">
                      {ticketed
                        ? `Members ${fmt(event.price_cents_members)} · Non-members ${fmt(event.price_cents_nonmembers)}${
                            event.eb_price_members != null
                              ? ` · EB ${fmt(event.eb_price_members)}/${fmt(event.eb_price_nonmembers!)}`
                              : ''
                          }`
                        : event.points
                          ? `${event.points} attendance pts`
                          : 'Free attendance'
                      }
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setEditingId(isEditing ? null : event.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDelete(event.id, event.name)}
                      disabled={deletingId === event.id}
                      className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50">
                      {deletingId === event.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* inline edit */}
                {isEditing && (
                  <div className="border-t p-5 bg-gray-50">
                    <EventForm
                      initial={eventToForm(event)}
                      onSubmit={handleUpdate(event.id)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Save Changes"
                    />
                    {showQR && <AttendanceQR event={event} onUpdate={upsert} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
