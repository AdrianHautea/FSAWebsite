// ── route.ts ─────────────────────────────────────────────
// PATCH /api/officer/applications/kuyate/[id] — update kuyate application status and send notification email
//
// data:  kuyate_applications, members
// deps:  resend (kuyate status email)
// notes: email is sent only when transitioning to a final status (accepted/rejected) and
//        only once per application — status_email_sent_at guards against duplicate sends
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { kuyateStatusEmailHtml } from '@/lib/email/kuyate-status'
import { resend } from '@/lib/resend'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const patchSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
})

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

  const { status } = parsed.data

  // ── fetch application ─────────────────────────────────────
  // fetch application first — need member_id, pamilya_name, status, and status_email_sent_at
  // bypass rls — officer action; reads kuyate_applications to get data needed for the email and lock check
  const { data: appRow, error: fetchError } = await ctx.admin
    .from('kuyate_applications')
    .select('id, member_id, pamilya_name, status, status_email_sent_at')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !appRow) {
    console.error('[kuyate/[id]] application not found:', fetchError)
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
  }

  // no-op: requested status already matches — skip write and email
  if (appRow.status === status) {
    return NextResponse.json({ success: true })
  }

  // ── status update ─────────────────────────────────────────
  // bypass rls — officer action; updates kuyate_applications.status
  // reviewed_by and reviewed_at are derived from the authenticated session — never client-supplied
  // .eq('status', appRow.status) is an optimistic lock: if another officer changed the status
  // concurrently, 0 rows match and updatedRow is null — we return 409 with reviewer context
  const { data: updatedRow, error: updateError } = await ctx.admin
    .from('kuyate_applications')
    .update({ status, reviewed_by: ctx.officerId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', appRow.status)
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('[kuyate/[id]] status update error:', updateError)
    return NextResponse.json({ error: 'Failed to update application status.' }, { status: 500 })
  }

  if (!updatedRow) {
    // optimistic lock failed: another officer changed the status between our read and this write
    const { data: currentRow } = await ctx.admin
      .from('kuyate_applications')
      .select('status, reviewed_by')
      .eq('id', id)
      .maybeSingle()

    let reviewerName = 'Another officer'
    if (currentRow?.reviewed_by) {
      const { data: reviewer } = await ctx.admin
        .from('members')
        .select('first_name, last_name')
        .eq('id', currentRow.reviewed_by)
        .maybeSingle()
      if (reviewer) reviewerName = `${reviewer.first_name} ${reviewer.last_name}`
    }

    return NextResponse.json({
      error: 'conflict',
      message: `${reviewerName} already reviewed this as ${currentRow?.status ?? 'unknown'}`,
      currentStatus: currentRow?.status ?? null,
    }, { status: 409 })
  }

  // ── status notification email ─────────────────────────────
  // send status notification email when transitioning to a final status,
  // but only if no email has been sent yet for this application
  if ((status === 'accepted' || status === 'rejected') && !appRow.status_email_sent_at) {
    try {
      // bypass rls — fetch the applicant's name and contact email to address the notification
      const { data: memberRow } = await ctx.admin
        .from('members')
        .select('first_name, email, contact_email')
        .eq('id', appRow.member_id)
        .maybeSingle()

      // RESEND_FROM_EMAIL must be set in env for emails to send — skip silently if absent
      if (memberRow && process.env.RESEND_FROM_EMAIL) {
        // prefer contact_email over login email so member gets mail at their preferred address
        const to = memberRow.contact_email ?? memberRow.email
        const { subject, html } = kuyateStatusEmailHtml({
          firstName: memberRow.first_name,
          status,
          pamilyaName: appRow.pamilya_name ?? undefined,
        })

        // sends a kuyate application status email (accepted or rejected) to the applicant
        const { error: emailError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to,
          subject,
          html,
        })

        if (emailError) {
          console.error('[kuyate/[id]] resend error for application', id, emailError)
        } else {
          // stamp the send time so future status changes don't re-send the email
          await ctx.admin
            .from('kuyate_applications')
            .update({ status_email_sent_at: new Date().toISOString() })
            .eq('id', id)
        }
      }
    } catch (err) {
      console.error('[kuyate/[id]] unexpected error sending status email:', err)
    }
  }

  return NextResponse.json({ success: true })
}
