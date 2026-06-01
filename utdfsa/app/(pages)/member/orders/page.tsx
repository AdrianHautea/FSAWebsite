import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TicketQR from './TicketQR'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtCents(cents: number | null) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) redirect('/login')

  // registrations newest-first, with tickets inline
  const { data: registrations } = await admin
    .from('event_registrations')
    .select(`
      id,
      created_at,
      payment_status,
      num_tickets,
      amt_paid,
      amt_expected,
      event_id,
      registration_tickets (
        id,
        qr_code,
        attendee_fname,
        attendee_lname,
        attendee_email,
        checked_in,
        checked_in_at
      )
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })

  // fetch event details separately — nested joins require FK constraints in Supabase schema
  const eventIds = (registrations ?? [])
    .map(r => r.event_id)
    .filter((id): id is string => Boolean(id))

  const eventsMap = new Map<string, { name: string; event_date: string; location: string | null }>()

  if (eventIds.length > 0) {
    const { data: events } = await admin
      .from('events')
      .select('id, name, event_date, location')
      .in('id', eventIds)

    for (const e of events ?? []) eventsMap.set(e.id, e)
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order History</h1>
      <p className="text-sm text-gray-600 mb-8">Your event registrations and QR code tickets.</p>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
          🎉 Registration confirmed! Your QR code ticket is shown below and was sent to your email.
        </div>
      )}

      {!registrations || registrations.length === 0 ? (
        <p className="text-gray-500 text-sm">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {registrations.map(reg => {
            const event = reg.event_id ? eventsMap.get(reg.event_id) : null
            const tickets = (reg.registration_tickets ?? []) as Array<{
              id: string
              qr_code: string
              attendee_fname: string | null
              attendee_lname: string | null
              attendee_email: string | null
              checked_in: boolean
              checked_in_at: string | null
            }>
            const isPaid = reg.payment_status === 'paid'
            const isPending = reg.payment_status === 'pending'

            return (
              <div key={reg.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">

                {/* order header */}
                <div className="px-5 py-4 bg-gray-50 border-b flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 truncate">
                      {event?.name ?? 'Unknown Event'}
                    </h2>
                    {event && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        {fmtDate(event.event_date)} · {fmtTime(event.event_date)}
                        {event.location && ` · ${event.location}`}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Ordered {new Date(reg.created_at).toLocaleDateString()} ·{' '}
                      {reg.num_tickets} ticket{reg.num_tickets !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isPaid
                        ? 'bg-green-100 text-green-700'
                        : isPending
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {isPaid ? 'Paid' : isPending ? 'Pending' : 'Failed'}
                    </span>
                    <p className="text-base font-bold text-gray-900 mt-1">
                      {fmtCents(reg.amt_paid ?? reg.amt_expected)}
                    </p>
                  </div>
                </div>

                {/* tickets — only shown once payment is confirmed */}
                {isPaid && tickets.length > 0 && (
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
                      Tickets — show QR code at the door
                    </p>

                    <div className={`grid gap-4 ${tickets.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {tickets.map(ticket => (
                        <div
                          key={ticket.id}
                          className="border rounded-xl p-5 flex flex-col items-center text-center gap-3"
                        >
                          <p className="font-semibold text-gray-900">
                            {[ticket.attendee_fname, ticket.attendee_lname].filter(Boolean).join(' ') || 'Attendee'}
                          </p>
                          {ticket.attendee_email && (
                            <p className="text-xs text-gray-500">{ticket.attendee_email}</p>
                          )}

                          <TicketQR code={ticket.qr_code} />

                          {ticket.checked_in ? (
                            <p className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                              ✓ Checked in
                              {ticket.checked_in_at && ` at ${new Date(ticket.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">Not yet checked in</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* pending/failed state */}
                {isPending && (
                  <div className="px-5 py-4">
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      Payment is pending. If you completed checkout, your ticket will appear here shortly.
                    </p>
                  </div>
                )}

                {reg.payment_status === 'failed' && (
                  <div className="px-5 py-4">
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      Payment was not completed. Please register again.
                    </p>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
