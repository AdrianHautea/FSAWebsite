import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// title-case transform matches the pattern used in the onboarding submit route
const titleCase = (v: string) =>
  v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

const schema = z.object({
  first_name: z.string().min(1).max(50).trim().transform(titleCase),
  last_name: z.string().min(1).max(50).trim().transform(titleCase),
  phone: z.string().max(20).trim().optional().nullable(),
  year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', '']).optional().nullable(),
  major: z.string().max(100).trim().optional().nullable(),
  pamilya: z.string().max(50).trim().optional().nullable(),
})

// POST /api/onboarding/update-basic-info
// saves profile fields (name, phone, year, major, pamilya) for a member.
// does NOT touch onboarding_complete — that is already set by the not-interested route.
// used by the /onboarding/basic-info page after a member opts out of the pamilya program.
export async function POST(req: Request) {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', details: parsed.error.format() },
      { status: 400 }
    )
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, membership_status')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 })
  }

  if (member.membership_status !== 'active') {
    return NextResponse.json({ error: 'membership not active' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('members')
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone ?? null,
      year: parsed.data.year || null,
      major: parsed.data.major ?? null,
      pamilya: parsed.data.pamilya || null,
    })
    .eq('id', member.id)

  if (error) {
    console.error('[update-basic-info]', error)
    return NextResponse.json({ error: 'failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
