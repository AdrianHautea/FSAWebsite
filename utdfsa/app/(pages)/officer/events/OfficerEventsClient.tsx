// ── OfficerEventsClient.tsx ───────────────────────────────
// officer client component for creating, editing, and deleting events.
//
// data:  events table (all fields including qr token/state)
// deps:  POST/PATCH/DELETE /api/officer/events/[id], POST /api/officer/events/[id]/cover
//        qrcode (npm), browser-image-compression (npm)
// notes: event type controls which sections render (ticketed vs qr attendance vs hybrid).
//        cover photo is compressed client-side before upload if over 1 mb.
//        attendance qr open/close is optimistic with a revert on error.
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import type { Event } from '@/types/database'
import Image from 'next/image'
import Modal from '@/components/Modal'
import DeleteEventModal from './DeleteEventModal'
import imageCompression from 'browser-image-compression'
import { getBadge } from '@/utils/eventTypes'

// ============================================================
// LOGIC — do not modify this section
// event type classification, form↔API data conversion,
// and date/currency helpers all live here.
// changing these will silently break form submissions,
// pricing calculations, and the attendance QR flow.
// ============================================================

// ── constants ─────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['General Meeting', 'Risk Management', 'Party', 'GP Event', 'Regular Event', 'Other'] as const

/**
 * Ticketed events: Party, Other
 *   → show ticket pricing + early-bird toggle
 *   → officer scan page handles check-in
 *   → Party has NO attendance QR (ticket scan IS attendance)
 *
 * Attendance QR events: General Meeting, Risk Management, GP Event, Other
 *   → no ticket pricing
 *   → attendance tracked via QR code that members scan at the door
 *   → General Meeting + Risk Management: marks present only, no points
 *   → GP Event: awards goodphil points
 *   → Other (hybrid): paid + awards points via QR
 *
 * Regular Event: no pricing, no QR, no points — purely for the calendar
 */
function isTicketed(type: string) {
  return ['party', 'other'].includes(type.toLowerCase())
}

// Other events are paid (ticketed) but also award attendance points via QR
function isHybrid(type: string) {
  return type.toLowerCase() === 'other'
}

function hasAttendanceQR(type: string) {
  return ['general meeting', 'risk management', 'gp event', 'other'].includes(type.toLowerCase())
}

// Types that actually award goodphil points on check-in
function hasPoints(type: string) {
  return ['gp event', 'other'].includes(type.toLowerCase())
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function toDollars(cents: number) { return (cents / 100).toFixed(2) }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Chicago',
  })
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  // datetime-local inputs use the browser's LOCAL time, but toISOString() returns UTC.
  // Subtract the timezone offset so the value shown matches the local wall-clock time.
  // without this, events created in CDT would display one hour off in the form.
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

// ── form state ────────────────────────────────────────────────────────────────

interface EventFormData {
  name: string
  description: string
  event_type: string
  event_date: string
  event_end: string
  location: string
  points: string
  price_dollars_members: string
  price_dollars_nonmembers: string
  eb_enabled: boolean
  eb_price_dollars_members: string
  eb_price_dollars_nonmembers: string
  eb_deadline: string
  is_active: boolean
  is_visible: boolean
  registration_closes_at: string
}

const emptyForm = (): EventFormData => ({
  name: '', description: '', event_type: 'General Meeting', event_date: '', event_end: '',
  location: '', points: '', price_dollars_members: '', price_dollars_nonmembers: '',
  eb_enabled: false, eb_price_dollars_members: '', eb_price_dollars_nonmembers: '',
  eb_deadline: '', is_active: true, is_visible: true,
  registration_closes_at: '',
})

function eventToForm(e: Event): EventFormData {
  return {
    name: e.name,
    description: e.description ?? '',
    event_type: e.event_type,
    event_date: toDatetimeLocal(e.event_date),
    event_end: toDatetimeLocal(e.event_end),
    location: e.location ?? '',
    points: e.points != null ? String(e.points) : '',
    price_dollars_members: toDollars(e.price_cents_members),
    price_dollars_nonmembers: toDollars(e.price_cents_nonmembers),
    eb_enabled: e.eb_price_members != null,
    eb_price_dollars_members: e.eb_price_members != null ? toDollars(e.eb_price_members) : '',
    eb_price_dollars_nonmembers: e.eb_price_nonmembers != null ? toDollars(e.eb_price_nonmembers) : '',
    eb_deadline: toDatetimeLocal(e.eb_deadline),
    is_active: e.is_active,
    is_visible: e.is_visible,
    registration_closes_at: toDatetimeLocal(e.registration_closes_at),
  }
}

function formToPayload(f: EventFormData) {
  const ticketed = isTicketed(f.event_type)
  return {
    name: f.name,
    description: f.description || null,
    event_type: f.event_type,
    event_date: f.event_date ? new Date(f.event_date).toISOString() : '',
    event_end: f.event_end ? new Date(f.event_end).toISOString() : null,
    location: f.location || null,
    points: hasPoints(f.event_type) && f.points ? parseInt(f.points) : null,
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
    is_visible: f.is_visible,
    registration_closes_at: f.registration_closes_at
      ? new Date(f.registration_closes_at).toISOString() : null,
  }
}

// ============================================================
// UI — safe to restyle everything below this line
// available data per event (Event type):
//   id, name, description, event_type, event_date, location, points
//   price_cents_members, price_cents_nonmembers
//   eb_price_members, eb_price_nonmembers, eb_deadline
//   attend_qr_token, attend_qr_open, attend_qr_expires_at, is_active
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================

// ── shared input styles ───────────────────────────────────────────────────────

const inputCls = 'w-full px-3.5 py-3 rounded-xl bg-[#0d0d0d] border border-white/10 text-white text-sm placeholder:text-[#7a7a7a] focus:outline-none focus:border-[#9747FF] focus:shadow-[0_0_0_3px_rgba(151,71,255,0.18)] transition-[border-color,box-shadow] font-[inherit]'
const selectCls = `${inputCls} officer-select appearance-none cursor-pointer pr-10`
const labelCls = 'block text-[11px] font-bold tracking-[0.07em] uppercase text-[#7e7e7e] mb-2'

// ── pill toggle ───────────────────────────────────────────────────────────────

function PillToggle({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  sublabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-[#e8e8e8]">{label}</div>
        {sublabel && <div className="text-[13px] text-[#7e7e7e] font-medium mt-0.5">{sublabel}</div>}
      </div>
      <label className="relative cursor-pointer select-none flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-[46px] h-[27px] rounded-full relative transition-colors duration-150 ${checked ? 'bg-[#9747FF]' : 'bg-white/12'}`}>
          <span className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-all duration-150 ${checked ? 'left-[22px]' : 'left-[3px]'}`} />
        </div>
      </label>
    </div>
  )
}

// ── EventForm ─────────────────────────────────────────────────────────────────

function EventForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  coverPhotoSlot,
  beforeButtons,
  leftButtons,
}: {
  initial: EventFormData
  onSubmit: (data: EventFormData) => Promise<void>
  onCancel: () => void
  submitLabel: string
  coverPhotoSlot?: React.ReactNode
  beforeButtons?: React.ReactNode
  leftButtons?: React.ReactNode
}) {
  // local form state — initialized from props; changes are not reflected upward until submit
  const [form, setForm] = useState<EventFormData>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function set(field: keyof EventFormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // red border on fields with a validation error — matches the field's own required-asterisk red
  function errCls(field: string) {
    return fieldErrors[field] ? ' !border-[#ef6f6f]' : ''
  }

  // warn before unload when the form has unsaved changes
  useEffect(() => {
    const isDirty = (Object.keys(form) as (keyof EventFormData)[]).some(k => form[k] !== initial[k])
    if (!isDirty) return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [form, initial])

  const ticketed = isTicketed(form.event_type)

  // true when the early bird deadline has already passed — used to show a warning banner
  const ebExpired =
    form.eb_enabled && form.eb_deadline && new Date(form.eb_deadline) < new Date()

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)

    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Event name is required.'
    if (!form.event_date) errs.event_date = 'Date and time is required.'
    if (form.event_end && form.event_date && new Date(form.event_end) < new Date(form.event_date)) {
      errs.event_end = 'End time must be after start time.'
    }
    if (!form.location.trim()) errs.location = 'Location is required.'
    if (ticketed) {
      if (!form.price_dollars_members.trim()) errs.price_dollars_members = 'Member price is required.'
      if (!form.price_dollars_nonmembers.trim()) errs.price_dollars_nonmembers = 'Non-member price is required.'
    }
    if (form.eb_enabled) {
      if (!form.eb_price_dollars_members.trim()) errs.eb_price_dollars_members = 'EB member price is required.'
      if (!form.eb_price_dollars_nonmembers.trim()) errs.eb_price_dollars_nonmembers = 'EB non-member price is required.'
      if (!form.eb_deadline) errs.eb_deadline = 'Early bird deadline is required.'
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})

    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save event — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── General info (all types) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Event Name <span className="text-[#ef6f6f]">*</span></label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className={inputCls + errCls('name')} placeholder="Spring Fiesta 2025" />
          {fieldErrors.name && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.name}</p>}
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Event Type <span className="text-[#ef6f6f]">*</span></label>
          <select required value={form.event_type}
            onChange={e => {
              const newType = e.target.value
              setForm(prev => ({
                ...prev,
                event_type: newType,
                ...(newType !== 'Party' && newType !== 'Other' ? { registration_closes_at: '', is_active: true } : {}),
              }))
            }}
            className={selectCls}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="col-span-2 min-w-0">
          <label className={labelCls}>Date &amp; Time <span className="text-[#ef6f6f]">*</span></label>
          <input required type="datetime-local" value={form.event_date}
            onChange={e => set('event_date', e.target.value)}
            className={inputCls + errCls('event_date')} style={{ colorScheme: 'dark' }} />
          {fieldErrors.event_date && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.event_date}</p>}
        </div>

        <div className="col-span-2 min-w-0">
          <label className={labelCls}>End Time <span className="text-[#7e7e7e] normal-case font-medium">(optional)</span></label>
          <input type="datetime-local" value={form.event_end}
            onChange={e => set('event_end', e.target.value)}
            className={inputCls + errCls('event_end')} style={{ colorScheme: 'dark' }} />
          {fieldErrors.event_end && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.event_end}</p>}
        </div>

        {(form.event_type === 'Party' || form.event_type === 'Other') && (
          <div className="col-span-2 min-w-0">
            <label className={labelCls}>Registration Closes At</label>
            <input type="datetime-local" value={form.registration_closes_at}
              onChange={e => set('registration_closes_at', e.target.value)}
              className={inputCls} style={{ colorScheme: 'dark' }} />
            <p className="text-[12px] text-text-muted font-medium mt-2 leading-relaxed">
              Optional. After this date and time, the registration button will be hidden for members. Leave blank to allow registration until the event date.
            </p>
          </div>
        )}

        <div className="col-span-2">
          <label className={labelCls}>Location <span className="text-[#ef6f6f]">*</span></label>
          <input required value={form.location} onChange={e => set('location', e.target.value)}
            className={inputCls + errCls('location')} placeholder="Student Union, Room 2.410" />
          {fieldErrors.location && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.location}</p>}
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={9} className={`${inputCls} resize-none`}
            placeholder="Details about the event…" />
        </div>
      </div>

      {/* ── Ticketed events: pricing + early bird ───────────────────────────── */}
      {ticketed && (
        <>
          <div className="border-t border-white/7 pt-5">
            <div className="flex flex-col gap-1 mb-4">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#9a9a9a]">Ticketing</p>
              <p className="text-[13px] text-text-muted font-medium">
                Members are limited to one ticket. Non-members can buy multiple.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Member Price ($ / ticket) <span className="text-[#ef6f6f]">*</span></label>
                <input required type="number" min="0" step="0.01"
                  value={form.price_dollars_members}
                  onChange={e => set('price_dollars_members', e.target.value)}
                  className={inputCls + errCls('price_dollars_members')} placeholder="10.00" />
                {fieldErrors.price_dollars_members && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.price_dollars_members}</p>}
              </div>
              <div>
                <label className={labelCls}>Non-Member Price ($ / ticket) <span className="text-[#ef6f6f]">*</span></label>
                <input required type="number" min="0" step="0.01"
                  value={form.price_dollars_nonmembers}
                  onChange={e => set('price_dollars_nonmembers', e.target.value)}
                  className={inputCls + errCls('price_dollars_nonmembers')} placeholder="15.00" />
                {fieldErrors.price_dollars_nonmembers && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.price_dollars_nonmembers}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-white/7 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#e8e8e8]">Early Bird Pricing</div>
                <div className="text-[13px] text-[#7e7e7e] font-medium mt-0.5">
                  Early bird prices are shown until the deadline, then regular prices kick in automatically — no action needed.
                </div>
              </div>
              <label className="relative cursor-pointer select-none flex-shrink-0">
                <input type="checkbox" checked={form.eb_enabled}
                  onChange={e => set('eb_enabled', e.target.checked)}
                  className="sr-only" />
                <div className={`w-[46px] h-[27px] rounded-full relative transition-colors duration-150 ${form.eb_enabled ? 'bg-[#9747FF]' : 'bg-white/12'}`}>
                  <span className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-all duration-150 ${form.eb_enabled ? 'left-[22px]' : 'left-[3px]'}`} />
                </div>
              </label>
            </div>

            {form.eb_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelCls}>EB Member Price ($ / ticket)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.eb_price_dollars_members}
                    onChange={e => set('eb_price_dollars_members', e.target.value)}
                    className={inputCls + errCls('eb_price_dollars_members')} placeholder="8.00" />
                  {fieldErrors.eb_price_dollars_members && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.eb_price_dollars_members}</p>}
                </div>
                <div>
                  <label className={labelCls}>EB Non-Member Price ($ / ticket)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.eb_price_dollars_nonmembers}
                    onChange={e => set('eb_price_dollars_nonmembers', e.target.value)}
                    className={inputCls + errCls('eb_price_dollars_nonmembers')} placeholder="12.00" />
                  {fieldErrors.eb_price_dollars_nonmembers && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.eb_price_dollars_nonmembers}</p>}
                </div>
                <div className="col-span-2 min-w-0">
                  <label className={labelCls}>Early Bird Deadline</label>
                  <input type="datetime-local" value={form.eb_deadline}
                    onChange={e => set('eb_deadline', e.target.value)}
                    className={inputCls + errCls('eb_deadline')} style={{ colorScheme: 'dark' }} />
                  {fieldErrors.eb_deadline && <p role="alert" className="mt-1.5 text-[12px] text-[#ef6f6f]">{fieldErrors.eb_deadline}</p>}
                </div>

                {/* status indicator */}
                {form.eb_deadline && (
                  <div className="col-span-2">
                    {ebExpired ? (
                      <p className="text-[13px] text-[#ffb347] bg-[rgba(255,170,50,0.08)] border border-[rgba(255,170,50,0.25)] rounded-xl px-4 py-2.5">
                        ⚠️ Early bird ended {fmtDate(form.eb_deadline)} — attendees now see regular prices.
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#5fcf8f] bg-[rgba(95,207,143,0.08)] border border-[rgba(95,207,143,0.22)] rounded-xl px-4 py-2.5">
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

      {/* ── Attendance (QR tracking + optional points) ─────────────────────── */}
      {hasAttendanceQR(form.event_type) && (
        <div className="border-t border-white/7 pt-5">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#9a9a9a] mb-1">Attendance</p>
          {hasPoints(form.event_type) ? (
            <>
              <p className="text-[13px] text-text-muted font-medium mb-4">
                {isHybrid(form.event_type)
                  ? 'Members earn goodphil points by scanning the attendance QR in addition to buying a ticket.'
                  : 'Members scan the attendance QR code to earn goodphil points. Open/close the QR in the edit panel after saving.'}
              </p>
              <div className="w-40">
                <label className={labelCls}>Points Awarded</label>
                <input type="number" min="0" max="100" value={form.points}
                  onChange={e => set('points', e.target.value)}
                  className={inputCls} placeholder="10" />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-text-muted font-medium">
              Attendance is tracked via QR code. Open/close the QR in the edit panel after saving.
              No goodphil points are awarded for this event type.
            </p>
          )}
        </div>
      )}

      {coverPhotoSlot}

      {/* ── Visibility toggles ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 pt-5 border-t border-white/7">
        <PillToggle
          checked={form.is_visible}
          onChange={v => set('is_visible', v)}
          label="Visible to Members"
          sublabel="Show this event on the public Events page"
        />
        {(form.event_type === 'Party' || form.event_type === 'Other') && (
          <PillToggle
            checked={form.is_active}
            onChange={v => set('is_active', v)}
            label="Event Active"
            sublabel="Turn off to cancel or fully close this event after it has ended."
          />
        )}
      </div>

      {beforeButtons}

      {error && (
        <p role="alert" className="text-[13px] text-[#ef6f6f] bg-[rgba(239,111,111,0.08)] border border-[rgba(239,111,111,0.25)] rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-5 border-t border-white/7 gap-3">
        <div>{leftButtons}</div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button type="button" onClick={onCancel}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-transparent border border-white/16 text-[#cfcfcf] text-sm font-semibold hover:border-white/32 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl border-none bg-[#9747FF] hover:bg-[#a85eff] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm transition-all">
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

// ── Attendance QR panel ───────────────────────────────────────────────────────

function AttendanceQR({ event, onUpdate }: { event: Event; onUpdate: (e: Event) => void }) {
  // data url for the rendered qr code image — generated client-side via qrcode library
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // optimistic local open state — updates immediately on button click, syncs from prop on server response
  const [isOpen, setIsOpen] = useState(event.attend_qr_open)

  // keep isOpen in sync if the parent updates the event prop (e.g. after a patch response)
  useEffect(() => { setIsOpen(event.attend_qr_open) }, [event.attend_qr_open])

  // auto-close the badge locally once the expiry timestamp is reached
  // calculates ms until expiry and sets a one-shot timeout; clears on unmount or expiry change
  useEffect(() => {
    if (!event.attend_qr_expires_at) return
    const ms = new Date(event.attend_qr_expires_at).getTime() - Date.now()
    if (ms <= 0) { setIsOpen(false); return }
    const t = setTimeout(() => setIsOpen(false), ms)
    return () => clearTimeout(t)
  }, [event.attend_qr_expires_at])

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const attendUrl = event.attend_qr_token
    ? `${siteUrl}/attend?token=${event.attend_qr_token}` : null

  // regenerate the qr image whenever the attendance url changes (e.g. new token issued)
  useEffect(() => {
    if (!attendUrl) return
    import('qrcode').then(({ default: QR }) =>
      QR.toDataURL(attendUrl, { width: 240, margin: 2 }).then(setQrDataUrl).catch(() => {})
    )
  }, [attendUrl])

  async function patch(fields: Record<string, unknown>) {
    // optimistically flip open state before the round-trip
    if ('attend_qr_open' in fields) setIsOpen(fields.attend_qr_open as boolean)
    setSaving(true)
    // api: calls PATCH /api/officer/events/[id] — updates attend_qr_open and/or attend_qr_expires_at — do not change this endpoint or method
    const res = await fetch(`/api/officer/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (res.ok) {
      onUpdate(data.event)
    } else {
      // revert on error
      if ('attend_qr_open' in fields) setIsOpen(event.attend_qr_open)
    }
    setSaving(false)
  }

  return (
    <div className="rounded-[14px] bg-[rgba(151,71,255,0.05)] border border-[rgba(151,71,255,0.2)] p-5 mt-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-[11px] bg-[rgba(151,71,255,0.12)] flex items-center justify-center flex-shrink-0">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#c4a3ff" strokeWidth={1.7}>
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <path d="M14 14h3v3M21 14v.01M17 21h.01M21 21v-3.5M21 17.5h-3.5"/>
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-bold text-white">Attendance QR</div>
            <div className="text-[12px] text-[#7e7e7e] font-medium mt-0.5">Members scan this at the event to log attendance.</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-[7px] h-[7px] rounded-full ${isOpen ? 'bg-[#5fcf8f]' : 'bg-[#6e6e6e]'}`} />
              <span className={`text-[13px] font-semibold ${isOpen ? 'text-[#5fcf8f]' : 'text-[#8c8c8c]'}`}>
                {isOpen ? 'QR Open' : 'QR Closed'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button disabled={saving}
            onClick={() => patch({ attend_qr_open: !isOpen })}
            className={`text-sm font-bold px-4 py-2 rounded-[10px] border-none cursor-pointer disabled:cursor-not-allowed transition-colors disabled:opacity-60 ${
              isOpen
                ? 'bg-[rgba(239,111,111,0.16)] text-[#ef6f6f] hover:bg-[rgba(239,111,111,0.24)]'
                : 'bg-[#9747FF] text-white hover:bg-[#a85eff]'
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
              className="text-sm font-semibold px-4 py-2 rounded-[10px] bg-transparent border border-white/16 text-[#cfcfcf] hover:border-white/30 hover:text-white transition-colors">
              Set Auto-Close
            </button>
          )}

          {attendUrl && (
            <a href={attendUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-4 py-2 text-[#9a9a9a] text-sm font-semibold hover:text-white transition-colors">
              Preview <span className="text-xs">↗</span>
            </a>
          )}
        </div>
      </div>

      {!isHybrid(event.event_type) && (
        <p className="text-[12px] italic text-text-muted font-medium mt-3">
          Use this to control when members can scan the attendance QR. Open it at the start of the event, close it when attendance ends.
        </p>
      )}

      {qrDataUrl && isOpen && (
        <div className="mt-4 pt-4 border-t border-white/7">
          <img src={qrDataUrl} alt="Attendance QR" width={120} height={120}
            className="rounded-xl border border-white/10 shrink-0" />
          {event.attend_qr_expires_at && new Date(event.attend_qr_expires_at) > new Date() && (
            <p className="text-[12px] text-text-muted font-medium mt-2">
              Auto-closes {fmtDateTime(event.attend_qr_expires_at)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── cover photo upload ────────────────────────────────────────────────────────

function CoverPhotoUpload({ event, onUpdate }: { event: Event; onUpdate: (e: Event) => void }) {
  const [uploading, setUploading] = useState(false)
  // preview url — starts as the existing cover, updates after a successful upload
  const [preview, setPreview] = useState<string | null>(event.cover_photo_url ?? null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // ref used to programmatically trigger the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null)

  // keep preview in sync if the parent event prop changes (e.g. after a save)
  useEffect(() => { setPreview(event.cover_photo_url ?? null) }, [event.cover_photo_url])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadError(null)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a JPEG, PNG, or WEBP image.')
      return
    }
    // hard cap — s3 upload and supabase row both have size limits
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Image must be under 20MB.')
      return
    }

    setUploading(true)

    // compress images over 1 mb to keep uploads fast and storage costs low
    let fileToUpload: File = file
    if (file.size > 1 * 1024 * 1024) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        fileToUpload = new File([compressed], file.name, { type: file.type })
      } catch (err) {
        console.error('[cover upload] compression failed, using original:', err)
      }
    }

    const body = new FormData()
    body.append('file', fileToUpload)
    // api: calls POST /api/officer/events/[id]/cover — uploads and stores the event cover photo — do not change this endpoint or method
    const res = await fetch(`/api/officer/events/${event.id}/cover`, { method: 'POST', body })
    const data = await res.json().catch(() => ({}))
    setUploading(false)

    if (res.ok) {
      setPreview(data.url)
      onUpdate({ ...event, cover_photo_url: data.url })
    } else {
      setUploadError(data.error ?? 'Upload failed.')
    }
  }

  return (
    <div className="border-t border-white/7 pt-5">
      <label className={labelCls}>Cover Photo</label>

      <div className="flex gap-4 items-start flex-wrap">
        <div className="flex-1 min-w-[220px]">
          {preview ? (
            <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden mb-3">
              <Image src={preview} alt="Event cover" fill className="object-cover object-top" sizes="320px" />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-sm text-white font-medium">Uploading…</span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/5] border-2 border-dashed border-white/18 rounded-xl bg-[#0d0d0d] flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:border-[rgba(151,71,255,0.55)] hover:bg-[#101010] transition-colors mb-3"
            >
              <div className="w-11 h-11 rounded-xl bg-white/4 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth={1.7}>
                  <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
                  <path d="M21 15l-5-5L4 21"/>
                </svg>
              </div>
              <div className="text-sm font-semibold text-[#d4d4d4]">Click to upload cover photo</div>
              <div className="text-xs text-text-muted font-medium">PNG or JPG · 4:5 portrait</div>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-[#ef6f6f] mb-2">{uploadError}</p>
          )}

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-white/16 text-[#cfcfcf] hover:border-white/30 hover:text-white disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : preview ? 'Change Cover' : 'Upload Cover'}
          </button>
        </div>

        <div className="flex-shrink-0">
          <div className="w-[100px] aspect-[4/5] rounded-xl border border-white/10 bg-[#141414] flex flex-col items-center justify-center gap-2"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 11px,rgba(255,255,255,0.025) 11px 12px)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.4}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
              <path d="M21 15l-5-5L4 21"/>
            </svg>
            <span className="font-mono text-[8px] tracking-[0.1em] text-white/30">4:5</span>
          </div>
          <p className="text-[10px] text-text-muted font-medium mt-1.5 text-center max-w-[100px]">as shown on event cards</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

// ── pending cover photo (create flow) ────────────────────────────────────────

function PendingCoverPhotoUpload({ onChange }: { onChange: (file: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadError(null)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Image must be under 20MB.')
      return
    }

    // show preview immediately from the original file
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // compress in background, then pass the compressed file to parent
    let fileToPass: File = file
    if (file.size > 1 * 1024 * 1024) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        fileToPass = new File([compressed], file.name, { type: file.type })
      } catch (err) {
        console.error('[cover upload] compression failed, using original:', err)
      }
    }
    onChange(fileToPass)
  }

  return (
    <div className="border-t border-white/7 pt-5">
      <label className={labelCls}>Cover Photo</label>

      <div className="flex gap-4 items-start flex-wrap">
        <div className="flex-1 min-w-[220px]">
          {preview ? (
            <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden mb-3">
              <Image src={preview} alt="Event cover" fill className="object-cover object-top" sizes="320px" />
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/5] border-2 border-dashed border-white/18 rounded-xl bg-[#0d0d0d] flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:border-[rgba(151,71,255,0.55)] hover:bg-[#101010] transition-colors mb-3"
            >
              <div className="w-11 h-11 rounded-xl bg-white/4 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth={1.7}>
                  <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
                  <path d="M21 15l-5-5L4 21"/>
                </svg>
              </div>
              <div className="text-sm font-semibold text-[#d4d4d4]">Click to upload cover photo</div>
              <div className="text-xs text-text-muted font-medium">PNG or JPG · recommended 4:5 portrait</div>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-[#ef6f6f] mb-2">{uploadError}</p>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-white/16 text-[#cfcfcf] hover:border-white/30 hover:text-white transition-colors"
          >
            {preview ? 'Change Cover' : 'Upload Cover'}
          </button>
        </div>

        <div className="flex-shrink-0">
          <div className="w-[100px] aspect-[4/5] rounded-xl border border-white/10 bg-[#141414] flex flex-col items-center justify-center gap-2"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg,transparent 0 11px,rgba(255,255,255,0.025) 11px 12px)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.4}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.7"/>
              <path d="M21 15l-5-5L4 21"/>
            </svg>
            <span className="font-mono text-[8px] tracking-[0.1em] text-white/30">4:5</span>
          </div>
          <p className="text-[10px] text-text-muted font-medium mt-1.5 text-center max-w-[100px]">as shown on event cards</p>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

// ── main component ────────────────────────────────────────

export default function OfficerEventsClient({ initialEvents }: { initialEvents: Event[] }) {
  // local events list — updated optimistically after create/update/delete
  const [events, setEvents] = useState<Event[]>(initialEvents)
  // true when the create-event form panel is expanded
  const [creating, setCreating] = useState(false)
  // id of the event whose inline edit form is expanded; null means none open
  const [editingId, setEditingId] = useState<string | null>(null)
  // set when the delete button is clicked — opens the DeleteEventModal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  // cover file staged during the create flow — uploaded immediately after event row is created
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null)

  function upsert(updated: Event) {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === updated.id)
      return idx === -1 ? [updated, ...prev] : prev.map(e => e.id === updated.id ? updated : e)
    })
  }

  async function handleCreate(form: EventFormData) {
    // api: calls POST /api/officer/events — creates a new event row — do not change this endpoint or method
    const res = await fetch('/api/officer/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(form)),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed to create event.')
    let event = data.event
    if (pendingCoverFile) {
      const body = new FormData()
      body.append('file', pendingCoverFile)
      const coverRes = await fetch(`/api/officer/events/${event.id}/cover`, { method: 'POST', body })
      if (coverRes.ok) {
        const coverData = await coverRes.json()
        event = { ...event, cover_photo_url: coverData.url }
      }
      setPendingCoverFile(null)
    }
    upsert(event)
    setCreating(false)
  }

  const handleUpdate = useCallback((id: string) => async (form: EventFormData) => {
    // api: calls PATCH /api/officer/events/[id] — updates event fields — do not change this endpoint or method
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
    <main className="min-h-screen bg-[#070707] px-4 sm:px-6 md:px-10 py-10">
      <div className="max-w-4xl mx-auto">
        {/* page header */}
        <div className="flex items-start justify-between gap-6 mb-7">
          <div>
            <h1 className="font-display font-black text-[32px] text-white tracking-tight leading-[1.02] mb-2">
              Event Management
            </h1>
            <p className="text-[15px] text-[#8c8c8c] font-medium">
              Parties use ticket QR scanning. Meetings use attendance QR.
            </p>
          </div>
          {!creating && (
            <button
              onClick={() => { setCreating(true); setEditingId(null) }}
              className="sm:flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] border-none rounded-[13px] bg-[#9747FF] hover:bg-[#a85eff] text-white text-sm font-bold cursor-pointer transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Event
            </button>
          )}
        </div>

        {/* create form modal */}
        {creating && (
          <Modal onClose={() => { setCreating(false); setPendingCoverFile(null) }} size="lg" label="Create event">
            <div className="bg-[#141414] border border-white/10 rounded-[20px] shadow-modal w-full"
              style={{ animation: 'modalIn 0.18s ease-out' }}>
              <div className="px-4 sm:px-7 pt-4 sm:pt-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#9747FF]" />
                    <h2 className="font-display font-bold text-[17px] text-white tracking-[-0.01em]">Create New Event</h2>
                  </div>
                  <button type="button" onClick={() => { setCreating(false); setPendingCoverFile(null) }}
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-4 sm:px-7 pb-4 sm:pb-7">
                <EventForm
                  initial={emptyForm()}
                  onSubmit={handleCreate}
                  onCancel={() => { setCreating(false); setPendingCoverFile(null) }}
                  submitLabel="Create Event"
                  coverPhotoSlot={<PendingCoverPhotoUpload onChange={setPendingCoverFile} />}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* existing events header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="font-display font-bold text-[15px] text-white">Existing Events</span>
          <span className="h-px flex-1 bg-white/7" />
          <span className="text-[13px] text-text-muted font-medium">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>

        {/* event list */}
        {events.length === 0 ? (
          <p className="text-[#5e5e5e] text-sm text-center py-12">No events yet. Create your first one!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map(event => {
              const ticketed = isTicketed(event.event_type)
              const isEditing = editingId === event.id
              const badge = getBadge(event.event_type)

              return (
                <div
                  key={event.id}
                  className={`rounded-2xl overflow-hidden transition-[border-color] duration-150 ${
                    isEditing
                      ? 'bg-[#121212] border border-[rgba(151,71,255,0.3)]'
                      : 'bg-[#121212] border border-white/8 hover:border-white/16'
                  } ${!event.is_visible ? 'opacity-80' : ''}`}
                >
                  {/* summary row */}
                  <div className="p-5 pb-[18px]">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-2">
                          <h3 className="font-bold text-[17px] text-white tracking-[-0.01em] line-clamp-2">{event.name}</h3>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-[0.05em] uppercase"
                            style={{ color: badge.text, background: badge.bg, border: `1px solid ${badge.border}` }}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-sm text-[#8c8c8c] font-medium mb-1">
                          {fmtDate(event.event_date)}
                          {event.location && ` · ${event.location}`}
                        </p>

                        <p className="text-sm text-[#9a9a9a] font-medium">
                          {ticketed
                            ? `Members ${fmt(event.price_cents_members)} · Non-members ${fmt(event.price_cents_nonmembers)}${
                                event.eb_price_members != null
                                  ? ` · EB ${fmt(event.eb_price_members)}/${fmt(event.eb_price_nonmembers!)}`
                                  : ''
                              }${isHybrid(event.event_type) && event.points ? ` · +${event.points} pts` : ''}`
                            : event.points
                              ? `+${event.points} attendance pts`
                              : 'Free attendance'
                          }
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:flex-shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${
                          event.is_visible
                            ? 'bg-[rgba(95,207,143,0.12)] border border-[rgba(95,207,143,0.28)] text-[#5fcf8f]'
                            : 'bg-white/5 border border-white/12 text-[#8c8c8c]'
                        }`}>
                          {event.is_visible ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5fcf8f]" />
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth={2}>
                              <path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                            </svg>
                          )}
                          {event.is_visible ? 'Active' : 'Hidden'}
                        </span>

                        <button
                          onClick={() => setEditingId(isEditing ? null : event.id)}
                          className="bg-transparent border-none text-[#5fa8e8] text-[14px] font-bold cursor-pointer hover:text-[#8ec5f5] transition-colors p-2 -m-2 min-h-[44px] flex items-center">
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* edit form modal — centralized so only one instance exists regardless of which card triggered it */}
      {(() => {
        const editingEvent = events.find(e => e.id === editingId)
        if (!editingEvent) return null
        const showQR = hasAttendanceQR(editingEvent.event_type)
        return (
          <Modal key={editingEvent.id} onClose={() => setEditingId(null)} size="lg" label="Edit event">
            <div className="bg-[#141414] border border-white/10 rounded-[20px] shadow-modal w-full"
              style={{ animation: 'modalIn 0.18s ease-out' }}>
              <div className="px-4 sm:px-7 pt-4 sm:pt-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#9747FF]" />
                    <h2 className="font-display font-bold text-[17px] text-white tracking-[-0.01em]">Edit Event</h2>
                  </div>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-[#8c8c8c] hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-4 sm:px-7 pb-4 sm:pb-7">
                <EventForm
                  initial={eventToForm(editingEvent)}
                  onSubmit={handleUpdate(editingEvent.id)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save Changes"
                  beforeButtons={
                    <>
                      <CoverPhotoUpload event={editingEvent} onUpdate={upsert} />
                      {showQR && <AttendanceQR event={editingEvent} onUpdate={upsert} />}
                    </>
                  }
                  leftButtons={
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: editingEvent.id, name: editingEvent.name })}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-[11px] bg-transparent border border-[rgba(239,111,111,0.4)] text-[#ef6f6f] text-sm font-bold cursor-pointer hover:bg-[rgba(239,111,111,0.1)] transition-colors">
                      Delete Event
                    </button>
                  }
                />
              </div>
            </div>
          </Modal>
        )
      })()}

      {deleteTarget && (
        <DeleteEventModal
          eventName={deleteTarget.name}
          eventId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setEvents(prev => prev.filter(e => e.id !== deleteTarget.id))
            if (editingId === deleteTarget.id) setEditingId(null)
            setDeleteTarget(null)
          }}
        />
      )}
    </main>
  )
}
