// ── page.tsx ─────────────────────────────────────────────────
// attend page — QR code check-in handler; records attendance and awards points
//
// data:  events (by attend_qr_token), attendance (duplicate guard), members (points)
// notes: all guard checks must remain in order — token → auth → event validity →
//        qr open → expiry → member lookup → duplicate → then write;
//        attendance + points are written via the record_attendance RPC (admin
//        client) — client roles are write-restricted, so this is the only path
// ─────────────────────────────────────────────────────────────
import { createAdminClient } from '@/utils/supabase/server'
import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function AttendPage({ searchParams }: Props) {
  // ============================================================
  // DATA — do not modify this section
  // reads searchParams.token, authenticates the user, queries:
  //   events (by attend_qr_token) — to validate the QR and get event details
  //   attendance — to prevent duplicate check-ins
  //   members — to get and update the member's point total
  // all redirects and early-exit returns below guard data integrity
  // ============================================================
  const { token } = await searchParams

  // token missing — qr was scanned without a token param; bail to home
  if (!token) redirect('/')

  const ctx = await requireUser()
  // redirect to login, preserving the full attend url so the user returns after auth
  if (!ctx) {
    redirect(`/login?next=${encodeURIComponent(`/attend?token=${token}`)}`)
  }
  const { supabase, user } = ctx

  // bypass rls — attend_qr_token is column-privilege-revoked for anon/authenticated
  // (see migration: revoke_qr_token_column_and_tighten_events_visibility), so the
  // user client can no longer filter on it; the admin client is required here
  const admin = createAdminClient()

  // run event and member queries in parallel — both are independent of each other
  const [{ data: event }, { data: member }] = await Promise.all([
    // events table — look up the event associated with the scanned QR token
    admin
      .from('events')
      .select('id, name, event_date, points, is_active, attend_qr_open, attend_qr_expires_at')
      .eq('attend_qr_token', token)
      .maybeSingle(),
    // members table — need id for the attendance RPC (points are handled server-side)
    supabase
      .from('members')
      .select('id')
      .eq('email', user.email!)
      .maybeSingle(),
  ])

  if (!event) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) both' }}>
        <h1 className="text-2xl font-bold text-red-600">Invalid QR Code</h1>
        <p className="text-gray-500 mt-2">This attendance code is not valid.</p>
      </main>
    )
  }

  // check if event is still active (master switch)
  if (!event.is_active) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) both' }}>
        <h1 className="text-2xl font-bold text-yellow-600">Check-in Closed</h1>
        <p className="text-gray-500">Attendance is no longer open for this event.</p>
      </main>
    )
  }

  // check if QR is open
  if (!event.attend_qr_open) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) both' }}>
        <h1 className="text-2xl font-bold text-yellow-600">Check-in Not Open</h1>
        <p className="text-gray-500 mt-2">The officer hasn&apos;t opened attendance yet.</p>
      </main>
    )
  }

  // compare expiry timestamp against current time; null means no expiry set
  if (event.attend_qr_expires_at && new Date(event.attend_qr_expires_at) < new Date()) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) both' }}>
        <h1 className="text-2xl font-bold text-yellow-600">Check-in Closed</h1>
        <p className="text-gray-500 mt-2">Attendance window has closed for this event.</p>
      </main>
    )
  }

  // member not found — user is authenticated but hasn't completed onboarding; redirect to profile
  if (!member) redirect('/member/profile')

  // record attendance + award points atomically via the service-role RPC.
  // client roles are read-only (migration: harden_client_write_privileges_and_atomic_attendance),
  // so all writes go through the admin client. record_attendance inserts the attendance row
  // (unique on member_id, event_id) and increments points in one transaction, returning true
  // only when a NEW row was created — concurrent double-scans can never double-award or duplicate.
  const { data: newlyRecorded, error: recordError } = await admin.rpc('record_attendance', {
    p_member_id: member.id,
    p_event_id: event.id,
    p_points: event.points ?? 0,
  })

  if (recordError) {
    console.error('[attend] record_attendance failed:', recordError)
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) both' }}>
        <h1 className="text-2xl font-bold text-red-600">Check-in Failed</h1>
        <p className="text-gray-500">Something went wrong. Please try scanning again.</p>
      </main>
    )
  }

  // false means the attendance row already existed — the member had already checked in
  if (!newlyRecorded) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) both' }}>
        <h1 className="text-2xl font-bold text-yellow-600">Already Checked In</h1>
        <p className="text-gray-500">You already checked into {event.name}.</p>
      </main>
    )
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   event.name (string) — event the member just checked into
  //   event.points (number | null) — points awarded for attendance
  // the earlier returns above (invalid QR, not open, expired, already attended)
  // are also safe to restyle — keep their conditional logic intact
  // change classnames, layout, colors, and typography freely
  // ============================================================
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-green-500"
          style={{ animation: 'fsa-ring 1s cubic-bezier(0.16,1,0.3,1) both' }}
        />
        <div className="text-6xl" style={{ animation: 'fsa-check-pop 500ms cubic-bezier(0.16,1,0.3,1) both' }}>✅</div>
      </div>
      <h1 className="text-3xl font-bold text-green-600" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) 150ms both' }}>Attendance Recorded!</h1>
      <p className="text-xl" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) 220ms both' }}>{event.name}</p>
      {event.points ? (
        <p className="text-gray-500" style={{ animation: 'fadeUp 0.5s var(--ease-smooth) 290ms both' }}>+{event.points} points added to your account.</p>
      ) : null}
    </main>
  )
}