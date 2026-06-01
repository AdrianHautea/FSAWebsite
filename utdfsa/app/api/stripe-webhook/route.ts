import { stripe } from '@/lib/stripe'
import { getSettings } from '@/lib/settings'
import { createAdminClient } from '@/utils/supabase/server'
import { resend } from '@/lib/resend'
import { ticketEmailHtml } from '@/lib/email/ticket'
import QRCode from 'qrcode'
import { NextResponse } from 'next/server'

// App Router reads the raw body via req.text() — no special config needed.
// Do NOT add bodyParser: false here (that's Pages Router only and is ignored in App Router).

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { type, member_id } = session.metadata ?? {}

    // ── membership payment ─────────────────────────────────────────────────────
    if (type === 'membership' && member_id) {
      const settings = await getSettings()

      await supabase
        .from('members')
        .update({
          membership_status: 'active',
          amt_paid: session.amount_total,
          payment_verified_at: new Date().toISOString(),
          payment_provider: 'stripe',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          membership_expires_at: settings.membershipExpiry.toISOString(),
          payment_method: session.payment_method_types?.[0] ?? 'card',
          payment_metadata: {
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email,
          },
        })
        .eq('id', member_id)
    }

    // ── event ticket payment ───────────────────────────────────────────────────
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
          // Nested joins rely on FK constraints being defined in Supabase's schema;
          // separate queries work regardless of how the schema is wired.
          const [{ data: tickets }, { data: regRow }] = await Promise.all([
            supabase
              .from('registration_tickets')
              .select('id, qr_code, attendee_fname, attendee_lname, attendee_email')
              .eq('registration_id', registration_id),
            supabase
              .from('event_registrations')
              .select('event_id')
              .eq('id', registration_id)
              .single(),
          ])

          let eventInfo: { name: string; event_date: string | null; location: string | null } | null = null

          if (regRow?.event_id) {
            const { data } = await supabase
              .from('events')
              .select('name, event_date, location')
              .eq('id', regRow.event_id)
              .single()
            eventInfo = data
          }

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
                  // PNG data URL — works in Gmail, Apple Mail, Outlook.
                  // SVG data URLs are silently dropped by Gmail.
                  const qrDataUrl = await QRCode.toDataURL(ticket.qr_code, {
                    width: 256,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                  })

                  const attendeeName =
                    [ticket.attendee_fname, ticket.attendee_lname].filter(Boolean).join(' ') ||
                    'Attendee'

                  const { error: sendError } = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL!,
                    to: ticket.attendee_email!,
                    subject: `Your ticket for ${eventInfo!.name}`,
                    html: ticketEmailHtml({
                      attendeeName,
                      eventName: eventInfo!.name,
                      eventDate: eventInfo!.event_date,
                      location: eventInfo!.location,
                      qrDataUrl,
                    }),
                  })

                  if (sendError) {
                    console.error('[webhook] Resend error for ticket', ticket.id, sendError)
                  } else {
                    console.log('[webhook] Email sent to', ticket.attendee_email)
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

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object
    const { type, registration_id } = session.metadata ?? {}

    if (type === 'event_ticket' && registration_id) {
      await supabase
        .from('event_registrations')
        .update({ payment_status: 'failed' })
        .eq('id', registration_id)
    }
  }

  return NextResponse.json({ received: true })
}
