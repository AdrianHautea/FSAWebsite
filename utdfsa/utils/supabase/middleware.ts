import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Any logged-in user can access these
const MEMBER_ROUTES = ['/member']

// Only officers and admins can access these
const OFFICER_ROUTES = ['/officer', '/api/officer']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const needsMember = MEMBER_ROUTES.some(r => pathname.startsWith(r))
  const needsOfficer = OFFICER_ROUTES.some(r => pathname.startsWith(r))

  // Not logged in — redirect to login and remember where they were going
  if ((needsMember || needsOfficer) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in but trying to reach officer routes — check role
  if (needsOfficer && user) {
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('email', user.email!)
      .single()

    const isOfficer = member?.role === 'officer' || member?.role === 'admin'

    if (!isOfficer) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/member/profile'
      redirectUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}