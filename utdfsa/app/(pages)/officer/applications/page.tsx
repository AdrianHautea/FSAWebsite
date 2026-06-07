import { createAdminClient, createUserClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationsClient from './ApplicationsClient'

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

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleRow } = await supabase
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  if (roleRow?.role !== 'officer' && roleRow?.role !== 'admin') {
    redirect('/member/profile?error=unauthorized')
  }

  const admin = createAdminClient()

  const [{ data: rawAding }, { data: rawKuyate }] = await Promise.all([
    admin
      .from('ading_applications')
      .select(`
        id, submitted_at, status, additional_notes,
        instagram, phone, birthday, pronouns, activity_level, hobbies,
        fave_music_genre, fave_artist, fave_food, pam_vibe,
        hangout_size_preference, fave_tv_show_movie, availability,
        thoughts_on_drinking, dislikes, pam_dealbreakers, future_kuyate,
        mbti,
        members!inner(first_name, last_name, email, year, major, phone, pamilya)
      `),
    admin
      .from('kuyate_applications')
      .select(`
        id, submitted_at, status, additional_notes,
        instagram, pamilya_name, wants_to_be_pam_head, pam_head_phone,
        why_kuyate, acknowledges_responsibilities,
        members!inner(first_name, last_name, email, year, major, phone, pamilya)
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
