// ── route.ts (officer/events) ─────────────────────────────────────────────────
// list all events (GET) and create a new event (POST) for officer management ui.
//
// data:  events
// deps:  none (supabase only)
// notes: all queries use the admin client — rls would block writes from officers.
//        dollar-to-cent conversion is handled upstream by createEventSchema
//        (schema transforms price_dollars_* → price_cents_* before this handler sees them).
//        attend_qr_token is generated at insert time so the qr is ready immediately.

import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { createEventSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

// ── auth guard ────────────────────────────────────────────────────────────────

async function requireOfficer() {
  // respects rls — only confirms the caller is authenticated
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // bypass rls — officer action, user client would be blocked
  const admin = createAdminClient()
  // verify the caller holds officer or admin role in the members table
  const { data: member } = await admin
    .from('members')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle()

  // returns null on failure — callers respond with 403
  if (!member || (member.role !== 'officer' && member.role !== 'admin')) return null
  return { user, member, admin }
}

// ── GET /api/officer/events ───────────────────────────────────────────────────
// list all events for the management ui
export async function GET() {
  // returns 403 if caller is not an officer or admin
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // bypass rls — fetch all events including inactive/hidden ones for officer view
  const { data: events, error } = await ctx.admin
    .from('events')
    .select('id, created_at, name, description, event_type, event_date, event_end, location, points, price_cents_members, price_cents_nonmembers, eb_price_members, eb_price_nonmembers, eb_deadline, is_active, is_visible, attend_qr_open, attend_qr_expires_at, cover_photo_url, registration_closes_at')
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 })

  return NextResponse.json({ events }, { headers: { 'Cache-Control': 'no-store' } })
}

// ── POST /api/officer/events ──────────────────────────────────────────────────
// create a new event
export async function POST(req: Request) {
  // returns 403 if caller is not an officer or admin
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data.', details: parsed.error.flatten() }, { status: 400 })
  }

  const {
    name, description, event_type, event_date, event_end, location, points,
    price_dollars_members, price_dollars_nonmembers,
    eb_price_dollars_members, eb_price_dollars_nonmembers,
    eb_deadline, is_active, is_visible, registration_closes_at,
  } = parsed.data

  // bypass rls — officer action; insert event row and return the created record
  const { data: event, error } = await ctx.admin
    .from('events')
    .insert({
      name,
      description: description ?? null,
      event_type,
      event_date,
      event_end: event_end ?? null,
      location: location ?? null,
      points: points ?? null,
      price_cents_members: price_dollars_members,       // already transformed to cents by schema
      price_cents_nonmembers: price_dollars_nonmembers,
      eb_price_members: eb_price_dollars_members ?? null,
      eb_price_nonmembers: eb_price_dollars_nonmembers ?? null,
      eb_deadline: eb_deadline ?? null,
      is_active: is_active ?? true,
      is_visible: is_visible ?? true,
      registration_closes_at: registration_closes_at ?? null,
      attend_qr_token: crypto.randomUUID(),  // pre-generate so QR is ready whenever they open it
      attend_qr_open: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Event insert error:', error)
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 })
  }

  return NextResponse.json({ event }, { status: 201 })
}
