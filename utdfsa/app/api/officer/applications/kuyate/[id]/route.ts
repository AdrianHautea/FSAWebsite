import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { kuyateStatusEmailHtml } from '@/lib/email/kuyate-status'
import { resend } from '@/lib/resend'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const patchSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
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

  // fetch application first — need member_id, pamilya_name, and status_email_sent_at for email dedup
  const { data: appRow, error: fetchError } = await ctx.admin
    .from('kuyate_applications')
    .select('id, member_id, pamilya_name, status_email_sent_at')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !appRow) {
    console.error('[kuyate/[id]] application not found:', fetchError)
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
  }

  const { error: updateError } = await ctx.admin
    .from('kuyate_applications')
    .update({ status })
    .eq('id', id)

  if (updateError) {
    console.error('[kuyate/[id]] status update error:', updateError)
    return NextResponse.json({ error: 'Failed to update application status.' }, { status: 500 })
  }

  // send status notification email when transitioning to a final status,
  // but only if no email has been sent yet for this application
  if ((status === 'accepted' || status === 'rejected') && !appRow.status_email_sent_at) {
    try {
      const { data: memberRow } = await ctx.admin
        .from('members')
        .select('first_name, email, contact_email')
        .eq('id', appRow.member_id)
        .maybeSingle()

      if (memberRow && process.env.RESEND_FROM_EMAIL) {
        const to = memberRow.contact_email ?? memberRow.email
        const { subject, html } = kuyateStatusEmailHtml({
          firstName: memberRow.first_name,
          status,
          pamilyaName: appRow.pamilya_name ?? undefined,
        })

        const { error: emailError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to,
          subject,
          html,
        })

        if (emailError) {
          console.error('[kuyate/[id]] resend error for application', id, emailError)
        } else {
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
