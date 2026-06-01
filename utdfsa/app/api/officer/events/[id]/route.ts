import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { updateEventSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

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

// PATCH /api/officer/events/[id] — update any event fields
// Also handles QR attendance controls:
//   { attend_qr_open: true }           → open QR for scanning
//   { attend_qr_open: false }          → close QR
//   { attend_qr_expires_at: "..." }    → set auto-expiry
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  }

  // QR attendance controls
  if (attend_qr_open !== undefined) updates.attend_qr_open = attend_qr_open
  if (attend_qr_expires_at !== undefined) updates.attend_qr_expires_at = attend_qr_expires_at

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
