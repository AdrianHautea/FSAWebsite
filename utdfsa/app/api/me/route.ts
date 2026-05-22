import { createUserClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createUserClient()

  // get the authenticated user from Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // look them up in members table using their email
  const { data: member, error: dbError } = await supabase
    .from('members')
    .select('*')
    .eq('email', user.email!)
    .single()

  if (dbError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json(member)
}