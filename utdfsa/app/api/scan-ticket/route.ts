// ── route.ts (scan-ticket) ────────────────────────────────────────────────────
// validates a ticket qr code and checks the attendee in at the door.
//
// data:  members (role check), registration_tickets, event_registrations, events
// deps:  none (supabase only)
// notes: returns structured { valid, reason, message } so the scan ui can display
//        a clear pass/fail screen. four explicit failure reasons are defined:
//        INVALID_TICKET, WRONG_EVENT, NOT_PAID, ALREADY_CHECKED_IN.
//        the caller supplies event_id (picked on the scan page) — tickets for any
//        other event are rejected without consuming their check-in.
//        success and already-checked-in responses include the event's door tally
//        (checked_in_count / total_paid) so the scanner ui stays current.
//        checked_in_by is recorded for audit purposes.

// route: POST /api/scan-ticket
// purpose: validates a ticket QR code, checks payment status, and marks the ticket as checked in; returns pass/fail reason to the scan page
// auth: officer or admin only
// calls: supabase

import { requireOfficer } from '@/lib/auth'
import { scanTicketSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'
import { fail } from '@/lib/api-response'

// ── door tally ────────────────────────────────────────────────────────────────

// checked-in vs total paid tickets for one event — returned with every scan so
// the scanner ui can show a live door count without polling a separate endpoint.
// ponytail: tally only refreshes per scan response; two officers scanning at
// once drift between scans — acceptable, next scan corrects it.
type AdminClient = NonNullable<Awaited<ReturnType<typeof requireOfficer>>>['admin']

async function eventTally(admin: AdminClient, eventId: string) {
  const { data } = await admin
    .from('registration_tickets')
    .select('checked_in, event_registrations!inner(event_id, payment_status)')
    .eq('event_registrations.event_id', eventId)
    .eq('event_registrations.payment_status', 'paid')
  const rows = (data ?? []) as { checked_in: boolean }[]
  return {
    checked_in_count: rows.filter(r => r.checked_in).length,
    total_paid: rows.length,
  }
}

// ── POST /api/scan-ticket ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── auth check ────────────────────────────────────────────────────────────

  const ctx = await requireOfficer()
  if (!ctx) return fail('Forbidden', 403)
  const { admin, member: officer } = ctx

  const body = await req.json().catch(() => null)
  const parsed = scanTicketSchema.safeParse(body)

  if (!parsed.success) {
    return fail('Invalid QR code format', 400)
  }

  const { qr_code, event_id } = parsed.data

  // ── ticket lookup ─────────────────────────────────────────────────────────

  // find the ticket by qr_code and join payment status + event name in one query
  // find the ticket
  const { data: ticket } = await admin
    .from('registration_tickets')
    .select(`
      id,
      attendee_fname,
      attendee_lname,
      attendee_email,
      checked_in,
      checked_in_at,
      registration_id,
      event_registrations (
        payment_status,
        event_id,
        events (
          name
        )
      )
    `)
    .eq('qr_code', qr_code)
    .maybeSingle()

  if (!ticket) {
    return NextResponse.json({
      valid: false,
      reason: 'INVALID_TICKET',
      message: 'Ticket not found',
    })
  }

  // ── validation ────────────────────────────────────────────────────────────

  const registration = ticket.event_registrations as any

  // reject tickets that belong to a different event — a valid paid ticket for
  // next week's party must not scan green at tonight's door (and must not
  // consume its own check-in). ticket_event_name tells the officer which event
  // the ticket is actually for so they can redirect the attendee.
  if (registration?.event_id !== event_id) {
    return NextResponse.json({
      valid: false,
      reason: 'WRONG_EVENT',
      message: 'Ticket is for a different event',
      attendee_name: `${ticket.attendee_fname} ${ticket.attendee_lname}`,
      ticket_event_name: registration?.events?.name ?? 'Unknown event',
    })
  }

  // reject if payment has not been confirmed — covers 'pending' and 'failed' statuses
  if (registration?.payment_status !== 'paid') {
    return NextResponse.json({
      valid: false,
      reason: 'NOT_PAID',
      message: 'Payment not verified',
    })
  }

  if (ticket.checked_in) {
    return NextResponse.json({
      valid: false,
      reason: 'ALREADY_CHECKED_IN',
      message: 'Already checked in',
      checked_in_at: ticket.checked_in_at,
      attendee_name: `${ticket.attendee_fname} ${ticket.attendee_lname}`,
      ...(await eventTally(admin, event_id)),
    })
  }

  // ── check-in write ────────────────────────────────────────────────────────

  // mark as checked in — records timestamp and officer who scanned for audit trail.
  // .eq('checked_in', false) makes this atomic: if two near-simultaneous scans race,
  // only the first write matches a row; the loser gets zero rows back and is treated
  // as already checked in below, closing the TOCTOU gap between the read above and this write.
  const { data: updatedTickets } = await admin
    .from('registration_tickets')
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      checked_in_by: officer.id,
    })
    .eq('id', ticket.id)
    .eq('checked_in', false)
    .select('id')

  if (!updatedTickets || updatedTickets.length === 0) {
    return NextResponse.json({
      valid: false,
      reason: 'ALREADY_CHECKED_IN',
      message: 'Already checked in',
      attendee_name: `${ticket.attendee_fname} ${ticket.attendee_lname}`,
      ...(await eventTally(admin, event_id)),
    })
  }

  return NextResponse.json({
    valid: true,
    reason: 'SUCCESS',
    message: 'Check in successful',
    attendee_name: `${ticket.attendee_fname} ${ticket.attendee_lname}`,
    event_name: registration?.events?.name,
    ...(await eventTally(admin, event_id)),
  })
}