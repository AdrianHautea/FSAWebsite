import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// any logged-in user can access these routes
const MEMBER_ROUTES = ['/member']

// only officers and admins can access these routes
const OFFICER_ROUTES = ['/officer', '/api/officer']

// paid members who haven't finished onboarding can still reach these
// without being bounced back to /membership
const ALLOWED_UNPAID_PATHS = [
  '/membership',
  '/onboarding',
  '/auth',
  '/login',
]

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

  // always refresh the session — keeps users logged in across requests
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const needsMember = MEMBER_ROUTES.some(r => pathname.startsWith(r))
  const needsOfficer = OFFICER_ROUTES.some(r => pathname.startsWith(r))

  // not logged in — send to login with a ?next param so they return after
  if ((needsMember || needsOfficer) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (needsMember && user) {
    const { data: member } = await supabase
      .from('members')
      .select('role, membership_status')
      .eq('email', user.email!)
      .maybeSingle()

    const isOfficerOrAdmin =
      member?.role === 'officer' || member?.role === 'admin'

    const isPaid = member?.membership_status === 'active'

    // officers bypass payment entirely — they use the $0 coupon flow
    // regular members who haven't paid get redirected to /membership
    // unless they're already heading somewhere that's allowed unpaid
    if (!isPaid && !isOfficerOrAdmin) {
      const isAllowed = ALLOWED_UNPAID_PATHS.some(p => pathname.startsWith(p))

      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/membership'
        return NextResponse.redirect(url)
      }
    }
  }

  // logged in but trying officer routes — verify role in db
  if (needsOfficer && user) {
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('email', user.email!)
      .maybeSingle()

    const isOfficer = member?.role === 'officer' || member?.role === 'admin'

    if (!isOfficer) {
      // not an officer — redirect to their profile with an error flag
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/member/profile'
      redirectUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}