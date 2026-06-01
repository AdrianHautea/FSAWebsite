import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { createEventSchema } from '@/lib/schemas'
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
  return { user, member, admin }
}

// GET /api/officer/events — list all events for the management UI
export async function GET() {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: events, error } = await ctx.admin
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 })

  return NextResponse.json({ events })
}

// POST /api/officer/events — create a new event
export async function POST(req: Request) {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data.', details: parsed.error.flatten() }, { status: 400 })
  }

  const {
    name, description, event_type, event_date, location, points,
    price_dollars_members, price_dollars_nonmembers,
    eb_price_dollars_members, eb_price_dollars_nonmembers,
    eb_deadline, is_active,
  } = parsed.data

  const { data: event, error } = await ctx.admin
    .from('events')
    .insert({
      name,
      description: description ?? null,
      event_type,
      event_date,
      location: location ?? null,
      points: points ?? null,
      price_cents_members: price_dollars_members,       // already transformed to cents by schema
      price_cents_nonmembers: price_dollars_nonmembers,
      eb_price_members: eb_price_dollars_members ?? null,
      eb_price_nonmembers: eb_price_dollars_nonmembers ?? null,
      eb_deadline: eb_deadline ?? null,
      is_active,
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
