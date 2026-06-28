// ── route.ts (stripe-webhook) ─────────────────────────────────────────────────
// receives stripe webhook events and fulfills orders (membership or event tickets).
//
// data:  members, event_registrations, registration_tickets, events
// deps:  stripe (signature verification + event parsing), resend (confirmation emails),
//        qrcode (png buffer generation for ticket attachments)
// notes: CRITICAL — stripe calls this directly; do NOT add auth middleware here.
//        stripe.webhooks.constructEvent() is the security layer (STRIPE_WEBHOOK_SECRET).
//        two event types are handled:
//          checkout.session.completed → fulfill membership or ticket order + send email
//          checkout.session.expired  → mark event registration as failed
//        email failures are caught and logged — they never fail the webhook response
//        because payment is already recorded before the email attempt.
//        idempotency: stripe may replay events; downstream db updates use .eq('id', …)
//        so they are naturally idempotent (re-applying the same update is safe).

// CRITICAL: this route handles all payment confirmations
// stripe sends events here after payment completes
// do not add auth middleware to this route — stripe calls it directly
// signature verification (stripe.webhooks.constructEvent) is the security mechanism
// do not reorder the event handlers — membership must update before email sends

import { stripe } from '@/lib/stripe'
import { getSettings } from '@/lib/settings'
import { createAdminClient } from '@/utils/supabase/server'
import { resend } from '@/lib/resend'
import { ticketEmailHtml } from '@/lib/email/ticket'
import { membershipEmailHtml } from '@/lib/email/membership'
import QRCode from 'qrcode'
import { NextResponse } from 'next/server'

// App Router reads the raw body via req.text() — no special config needed.
// Do NOT add bodyParser: false here (that's Pages Router only and is ignored in App Router).

export async function POST(req: Request) {
  // ── signature verification ────────────────────────────────────────────────

  // raw text required — stripe signature is computed over the exact request body bytes
  // ============================================================
  // DATA — do not modify this section
  // all database queries and auth checks live here
  // changing these will break functionality
  // ============================================================
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    // uses STRIPE_WEBHOOK_SECRET env var to verify the event came from stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // bypass rls — webhook has no user session; all writes are trusted server-side
  const supabase = createAdminClient()

  // ── event dispatch ────────────────────────────────────────────────────────

  // checkout.session.completed: payment succeeded — fulfill the order
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    // type and member_id are set in stripe checkout session metadata at creation time
    const { type, member_id } = session.metadata ?? {}

    // ── membership payment ─────────────────────────────────────────────────────
    if (type === 'membership' && member_id) {
      const settings = await getSettings()

      // updates membership_status to active — this is what unlocks member access
      // membership_expires_at is pulled from settings so all members share the same expiry date
      // .select().single() returns the activated row so the email is gated on a confirmed DB write
      const { data: activatedMember, error: activationError } = await supabase
        .from('members')
        .update({
          membership_status: 'active',
          amt_paid: session.amount_total,
          payment_verified_at: new Date().toISOString(),
          payment_provider: 'stripe',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: (session.payment_intent as string) ?? null,
          stripe_customer_id: (session.customer as string) ?? null,
          membership_expires_at: settings.membershipExpiry.toISOString(),
          payment_method: session.payment_method_types?.[0] ?? 'card',
          payment_metadata: {
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email,
          },
        })
        .eq('id', member_id)
        .select('first_name, email, contact_email')
        .single()

      if (activationError || !activatedMember) {
        console.error('[webhook] membership activation DB write failed for member', member_id, activationError)
        return NextResponse.json({ error: 'DB write failed' }, { status: 500 })
      }

      // ── send membership confirmation email ────────────────────────────────────
      // only reachable after a confirmed DB write — email is gated on activation success
      // wrapped in try/catch so an email failure never fails the webhook response
      if (process.env.RESEND_FROM_EMAIL) {
        try {
          // prefer contact_email (member's preferred address) over the utd sso email
          const to = activatedMember.contact_email ?? activatedMember.email
          // format expiry date for display in the email body
          const expiryDate = settings.membershipExpiry.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })

          // send membership confirmation email via resend to the member's preferred address
          const { error: sendError } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to,
            subject: 'Welcome to UTD FSA — Membership Confirmed',
            html: membershipEmailHtml({
              firstName: activatedMember.first_name,
              membershipYear: settings.membershipYear,
              expiryDate,
            }),
          })

          if (sendError) {
            console.error('[webhook] membership email send error for member', member_id, sendError)
          } else {
            console.log('[webhook] membership confirmation email sent to', to)
          }
        } catch (err) {
          console.error('[webhook] unexpected error sending membership email for member', member_id, err)
        }
      }
    }

    // ── event ticket payment ───────────────────────────────────────────────────
    // ── event ticket fulfillment ──────────────────────────────────────────────
    if (type === 'event_ticket') {
      const { registration_id } = session.metadata ?? {}

      // mark registration as paid — fill all payment tracking fields
      await supabase
        .from('event_registrations')
        .update({
          payment_status: 'paid',
          amt_paid: session.amount_total,
          payment_verified_at: new Date().toISOString(),
          payment_provider: 'stripe',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: (session.payment_intent as string) ?? null,
          payment_method: session.payment_method_types?.[0] ?? 'card',
          payment_metadata: {
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email,
          },
        })
        .eq('id', registration_id)

      // ── send QR code emails ──────────────────────────────────────────────────
      // Guard: env vars must be present, otherwise log and skip
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        console.error(
          '[webhook] Skipping ticket emails — RESEND_API_KEY or RESEND_FROM_EMAIL is not set in environment variables.'
        )
      } else {
        try {
          // Use two separate queries instead of a nested join.
          const [{ data: tickets }, { data: regRow }] = await Promise.all([
            supabase
              .from('registration_tickets')
              .select('id, qr_code, attendee_fname, attendee_lname, attendee_email')
              .eq('registration_id', registration_id),
            supabase
              .from('event_registrations')
              .select('event_id, member_id')
              .eq('id', registration_id)
              .single(),
          ])

          let eventInfo: { name: string; event_date: string | null; location: string | null } | null = null
          let memberContactEmail: string | null = null

          const [eventResult, memberResult] = await Promise.all([
            regRow?.event_id
              ? supabase.from('events').select('name, event_date, location').eq('id', regRow.event_id).single()
              : Promise.resolve({ data: null }),
            regRow?.member_id
              ? supabase.from('members').select('contact_email').eq('id', regRow.member_id).single()
              : Promise.resolve({ data: null }),
          ])

          eventInfo = eventResult.data
          memberContactEmail = memberResult.data?.contact_email ?? null

          console.log(
            `[webhook] registration ${registration_id}: tickets=${tickets?.length ?? 0}, eventInfo=${eventInfo?.name ?? 'NOT FOUND'}`
          )

          if (!tickets || tickets.length === 0) {
            console.error('[webhook] No tickets found for registration', registration_id)
          } else if (!eventInfo) {
            console.error('[webhook] Event info not found for registration', registration_id)
          } else {
            await Promise.all(
              tickets
                .filter(t => t.attendee_email)
                .map(async (ticket) => {
                  // PNG buffer — embedded as a CID inline attachment so Gmail/Apple Mail/Outlook render it.
                  // data: URLs are blocked by most email clients.
                  const qrBuffer = await QRCode.toBuffer(ticket.qr_code, {
                    width: 256,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                  })

                  const attendeeName =
                    [ticket.attendee_fname, ticket.attendee_lname].filter(Boolean).join(' ') ||
                    'Attendee'

                  // prefer contact_email (member's preferred address) over ticket attendee_email
                  // For members, prefer their stored contact_email over the attendee email on the ticket
                  const recipientEmail = memberContactEmail ?? ticket.attendee_email!

                  const { error: sendError } = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL!,
                    to: recipientEmail,
                    subject: `Your ticket for ${eventInfo!.name}`,
                    html: ticketEmailHtml({
                      attendeeName,
                      eventName: eventInfo!.name,
                      eventDate: eventInfo!.event_date,
                      location: eventInfo!.location,
                      qrCid: 'ticket_qr',
                    }),
                    attachments: [{
                      filename: 'ticket-qr.png',
                      content: qrBuffer,
                      contentId: 'ticket_qr',
                      contentType: 'image/png',
                    }],
                  })

                  if (sendError) {
                    console.error('[webhook] Resend error for ticket', ticket.id, sendError)
                  } else {
                    console.log('[webhook] Email sent to', recipientEmail)
                  }
                })
            )
          }
        } catch (err) {
          // Don't fail the webhook — payment is recorded, emails can be re-sent manually
          console.error('[webhook] Unexpected error sending ticket emails for registration', registration_id, err)
        }
      }
    }
  }

  // checkout.session.expired: user abandoned checkout — mark registration as failed
  // so the seat is not held indefinitely and the member can retry
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object
    const { type, registration_id } = session.metadata ?? {}

    if (type === 'event_ticket' && registration_id) {
      // update event_registrations to reflect abandoned payment
      await supabase
        .from('event_registrations')
        .update({ payment_status: 'failed' })
        .eq('id', registration_id)
    }
  }

  return NextResponse.json({ received: true })
}
