// ── route.ts ─────────────────────────────────────────────
// PATCH /api/officer/applications/ading/[id] — update ading application status and/or pamilya assignment
//
// data:  ading_applications, members (pamilya field)
// notes: pamilya is stored on the member row, not the application; officer-only
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

// ── auth guard ───────────────────────────────────────────
// returns null if unauthenticated or if role is not officer/admin;
// callers must check for null and return 403 before proceeding
async function requireOfficer() {
  // respects rls — user client; only returns a user if a valid session exists
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // bypass rls — admin client needed to read role from members table
  const admin = createAdminClient()
  const { data: member } = await admin
    .from('members')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) return null
  return { admin, officerId: member.id }
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

  // ── status update ─────────────────────────────────────────
  if (status !== undefined) {
    // fetch current status first so the update can be optimistically locked against it
    // bypass rls — officer action; reads ading_applications for the lock check
    const { data: currentApp, error: fetchError } = await ctx.admin
      .from('ading_applications')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !currentApp) {
      console.error('[ading/[id]] application not found:', fetchError)
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    // no-op: requested status already matches — skip the write
    if (currentApp.status !== status) {
      // bypass rls — officer action; updates ading_applications.status
      // reviewed_by and reviewed_at are derived from the authenticated session — never client-supplied
      // .eq('status', currentApp.status) is an optimistic lock: if another officer changed the status
      // concurrently, 0 rows match and updatedRow is null — we return 409 with reviewer context
      const { data: updatedRow, error } = await ctx.admin
        .from('ading_applications')
        .update({ status, reviewed_by: ctx.officerId, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', currentApp.status)
        .select('id')
        .maybeSingle()

      if (error) {
        console.error('[ading/[id]] status update error:', error)
        return NextResponse.json({ error: 'Failed to update application status.' }, { status: 500 })
      }

      if (!updatedRow) {
        // optimistic lock failed: another officer changed the status between our read and this write
        const { data: conflictRow } = await ctx.admin
          .from('ading_applications')
          .select('status, reviewed_by')
          .eq('id', id)
          .maybeSingle()

        let reviewerName = 'Another officer'
        if (conflictRow?.reviewed_by) {
          const { data: reviewer } = await ctx.admin
            .from('members')
            .select('first_name, last_name')
            .eq('id', conflictRow.reviewed_by)
            .maybeSingle()
          if (reviewer) reviewerName = `${reviewer.first_name} ${reviewer.last_name}`
        }

        return NextResponse.json({
          error: 'conflict',
          message: `${reviewerName} already reviewed this as ${conflictRow?.status ?? 'unknown'}`,
          currentStatus: conflictRow?.status ?? null,
        }, { status: 409 })
      }
    }
  }

  // ── pamilya assignment ────────────────────────────────────
  if (pamilya !== undefined) {
    // resolve the member_id for this ading application
    // bypass rls — reads ading_applications to get the linked member_id
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
    // bypass rls — officer action; writes to members table on behalf of an officer
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
