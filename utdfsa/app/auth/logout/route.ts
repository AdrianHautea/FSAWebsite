// route: GET /auth/logout
// purpose: signs the user out and redirects to /login
// auth: any authenticated user
// calls: supabase (auth.signOut)

import { createUserClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createUserClient()

  await supabase.auth.signOut()

  const response = NextResponse.redirect(`${origin}/login`)
  return response
}