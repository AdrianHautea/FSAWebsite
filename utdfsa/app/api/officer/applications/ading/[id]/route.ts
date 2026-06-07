import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const PAMILYA_VALUES = ['Shiballers', 'Gutom Gang', 'Sushi Cuchi', 'Hanobe', 'Moganda', 'SDIYBT', 'Arigyattos'] as const

const patchSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  pamilya: z.enum(PAMILYA_VALUES).nullable().optional(),
}).refine(
  data => data.status !== undefined || data.pamilya !== undefined,
  { message: 'at least one field (status or pamilya) must be provided' }
)

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

export async function PATCH(req: Request, { params }: RouteContext) {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data.', details: parsed.error.flatten() }, { status: 400 })
  }

  const { status, pamilya } = parsed.data

  if (status !== undefined) {
    const { error } = await ctx.admin
      .from('ading_applications')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('[ading/[id]] status update error:', error)
      return NextResponse.json({ error: 'Failed to update application status.' }, { status: 500 })
    }
  }

  if (pamilya !== undefined) {
    // resolve the member_id for this ading application
    const { data: appRow, error: appError } = await ctx.admin
      .from('ading_applications')
      .select('member_id')
      .eq('id', id)
      .maybeSingle()

    if (appError || !appRow) {
      console.error('[ading/[id]] application not found:', appError)
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    // update members.pamilya directly — pamilya lives on the member, not the application
    const { error: memberError } = await ctx.admin
      .from('members')
      .update({ pamilya })
      .eq('id', appRow.member_id)

    if (memberError) {
      console.error('[ading/[id]] pamilya update error:', memberError)
      return NextResponse.json({ error: 'Failed to update pamilya assignment.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
