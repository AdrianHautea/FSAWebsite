// ── page.tsx ──────────────────────────────────────────────
// server component — officer applications page.
//
// data:  ading_applications, kuyate_applications, members (joined via !inner)
// notes: uses admin client to bypass rls; auth + role check done first with user client.
//        rows are sorted pending → accepted → rejected, then by submitted_at ascending.
import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationsClient from './ApplicationsClient'

// sort order used to group pending apps at the top so officers see actionable items first
const STATUS_ORDER: Record<string, number> = { pending: 0, accepted: 1, rejected: 2 }

function sortByStatusThenDate<T extends { status: string; submitted_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 3
    const sb = STATUS_ORDER[b.status] ?? 3
    if (sa !== sb) return sa - sb
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  })
}

export default async function OfficerApplicationsPage() {
  // ============================================================
  // DATA — do not modify this section
  // auth check and all database queries live here
  // ============================================================

  // redirect to /login if no session found
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // table: members — fetch role to enforce officer-only access
  // redirects to member profile with error flag if role check fails
  const { data: roleRow } = await supabase
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (roleRow?.role !== 'officer' && roleRow?.role !== 'admin') {
    redirect('/member/profile?error=unauthorized')
  }

  // bypass rls — officer action, user client would be blocked on ading/kuyate_applications
  const admin = createAdminClient()

  // fetch both application tables in parallel to reduce server response time
  const [{ data: rawAding }, { data: rawKuyate }] = await Promise.all([
    admin
      .from('ading_applications')
      .select(`
        id, member_id, submitted_at, status, additional_notes,
        instagram, phone, birthday, pronouns, activity_level, hobbies,
        fave_music_genre, fave_artist, fave_food, pam_vibe,
        hangout_size_preference, fave_tv_show_movie, availability,
        thoughts_on_drinking, dislikes, pam_dealbreakers, pam_incompatibilities, future_kuyate,
        mbti,
        members!member_id!inner(first_name, last_name, email, year, major, phone, pamilya)
      `),
    admin
      .from('kuyate_applications')
      .select(`
        id, member_id, submitted_at, status, additional_notes,
        instagram, pamilya_name, wants_to_be_pam_head, pam_head_phone,
        why_kuyate, acknowledges_responsibilities,
        members!member_id!inner(first_name, last_name, email, year, major, phone, pamilya)
      `),
  ])

  const adingApps = sortByStatusThenDate(rawAding ?? [])
  const kuyateApps = sortByStatusThenDate(rawKuyate ?? [])

  // ============================================================
  // UI — safe to restyle everything below this line
  // pass both datasets to the client component
  // ============================================================
  return (
    <ApplicationsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adingApps={adingApps as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kuyateApps={kuyateApps as any}
    />
  )
}
