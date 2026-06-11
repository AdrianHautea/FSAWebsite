import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { updateEventSchema } from '@/lib/schemas'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const qrControlSchema = z.object({
  attend_qr_open: z.boolean().optional(),
  attend_qr_expires_at: z.string().datetime({ offset: true }).optional().nullable(),
})

type RouteContext = { params: Promise<{ id: string }> }

async function requireOfficer() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('members')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) return null
  return { admin }
}

// DELETE /api/officer/events/[id] — delete event and all associated registrations/tickets
export async function DELETE(_req: Request, { params }: RouteContext) {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Delete in FK-safe order: tickets → registrations → event
  const { data: regs } = await ctx.admin
    .from('event_registrations')
    .select('id')
    .eq('event_id', id)

  const regIds = (regs ?? []).map(r => r.id)

  if (regIds.length > 0) {
    await ctx.admin.from('registration_tickets').delete().in('registration_id', regIds)
    await ctx.admin.from('event_registrations').delete().in('id', regIds)
  }

  const { error } = await ctx.admin.from('events').delete().eq('id', id)

  if (error) {
    console.error('Event delete error:', error)
    return NextResponse.json({ error: 'Failed to delete event.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/officer/events/[id] — update any event fields
// Also handles QR attendance controls:
//   { attend_qr_open: true }           → open QR for scanning
//   { attend_qr_open: false }          → close QR
//   { attend_qr_expires_at: "..." }    → set auto-expiry
export async function PATCH(req: Request, { params }: RouteContext) {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)

  // split out QR-control fields before schema validation (they're not event schema fields)
  const {
    attend_qr_open,
    attend_qr_expires_at,
    ...eventFields
  } = body ?? {}

  const updates: Record<string, unknown> = {}

  // validate and merge event fields if any were sent
  if (Object.keys(eventFields).length > 0) {
    const parsed = updateEventSchema.safeParse(eventFields)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data.', details: parsed.error.flatten() }, { status: 400 })
    }

    const d = parsed.data
    if (d.name !== undefined)                     updates.name = d.name
    if (d.description !== undefined)              updates.description = d.description
    if (d.event_type !== undefined)               updates.event_type = d.event_type
    if (d.event_date !== undefined)               updates.event_date = d.event_date
    if (d.location !== undefined)                 updates.location = d.location
    if (d.points !== undefined)                   updates.points = d.points
    if (d.price_dollars_members !== undefined)    updates.price_cents_members = d.price_dollars_members
    if (d.price_dollars_nonmembers !== undefined) updates.price_cents_nonmembers = d.price_dollars_nonmembers
    if (d.eb_price_dollars_members !== undefined) updates.eb_price_members = d.eb_price_dollars_members
    if (d.eb_price_dollars_nonmembers !== undefined) updates.eb_price_nonmembers = d.eb_price_dollars_nonmembers
    if (d.eb_deadline !== undefined)              updates.eb_deadline = d.eb_deadline
    if (d.is_active !== undefined)                updates.is_active = d.is_active
    if (d.registration_closes_at !== undefined)   updates.registration_closes_at = d.registration_closes_at
  }

  // validate and merge QR attendance control fields
  if (attend_qr_open !== undefined || attend_qr_expires_at !== undefined) {
    const qrParsed = qrControlSchema.safeParse({ attend_qr_open, attend_qr_expires_at })
    if (!qrParsed.success) {
      return NextResponse.json({ error: 'Invalid QR control data.', details: qrParsed.error.flatten() }, { status: 400 })
    }
    if (qrParsed.data.attend_qr_open !== undefined) updates.attend_qr_open = qrParsed.data.attend_qr_open
    if (qrParsed.data.attend_qr_expires_at !== undefined) updates.attend_qr_expires_at = qrParsed.data.attend_qr_expires_at
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const { data: event, error } = await ctx.admin
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Event update error:', error)
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 })
  }

  return NextResponse.json({ event })
}
