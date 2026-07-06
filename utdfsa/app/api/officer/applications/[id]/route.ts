// ── route.ts ─────────────────────────────────────────────
// DELETE /api/officer/applications/[id]?type=ading|kuyate
//
// deletes an ading or kuyate application row and resets the member's
// onboarding state so they can go through onboarding again from scratch.
//
// data:  ading_applications, kuyate_applications, members
// notes: officer-only; type must be passed as a query param
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

// ── auth guard ───────────────────────────────────────────
async function requireOfficer() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // bypass rls — needed to read role from members table before the caller is
  // verified as officer/admin; read-only, scoped to the caller's own email
  const admin = createAdminClient()
  const { data: member } = await admin
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) return null
  return { admin }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: applicationId } = await params

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  // allowlist check — type must resolve to one of the two known tables below,
  // never interpolated directly into the query
  if (!type || !['ading', 'kuyate'].includes(type)) {
    return NextResponse.json({ error: 'Invalid application type' }, { status: 400 })
  }

  const table = type === 'ading' ? 'ading_applications' : 'kuyate_applications'

  // fetch application first to get member_id for the onboarding reset
  const { data: application, error: fetchError } = await ctx.admin
    .from(table)
    .select('id, member_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (fetchError || !application) {
    console.error('[delete application] fetch error:', fetchError)
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  // delete the application row
  const { error: deleteError } = await ctx.admin
    .from(table)
    .delete()
    .eq('id', applicationId)

  if (deleteError) {
    console.error('[delete application] delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
  }

  // reset member onboarding so they can reapply from scratch
  const { error: resetError } = await ctx.admin
    .from('members')
    .update({ onboarding_complete: false, member_type: null })
    .eq('id', application.member_id)

  if (resetError) {
    console.error('[delete application] member reset error:', resetError)
    // application was deleted — log the reset failure but return success
    return NextResponse.json({
      success: true,
      warning: 'Application deleted but member onboarding reset failed — check Supabase manually',
    })
  }

  return NextResponse.json({ success: true })
}
