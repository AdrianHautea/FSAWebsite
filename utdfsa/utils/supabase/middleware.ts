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

  // protects member and officer routes — redirects to /login (with ?next=) if not authenticated
  if ((needsMember || needsOfficer) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // single member lookup shared by all three checks below —
  // runs whenever we need role or membership_status
  let memberRow: { role: string; membership_status: string } | null = null

  if (user && (needsMember || needsOfficer || pathname === '/membership')) {
    const { data } = await supabase
      .from('members')
      .select('role, membership_status')
      .eq('email', user.email!)
      .maybeSingle()
    memberRow = data
  }

  // protects /membership — redirects active members and officers away since they don't need to pay again
  if (pathname === '/membership' && user) {
    const isActive = memberRow?.membership_status === 'active'
    const isOfficer = memberRow?.role === 'officer' || memberRow?.role === 'admin'
    if (isActive || isOfficer) {
      const url = request.nextUrl.clone()
      url.pathname = '/member/profile'
      return NextResponse.redirect(url)
    }
  }

  // protects member routes — redirects unpaid members to /membership so they can complete payment
  if (needsMember && user) {
    const isPaid = memberRow?.membership_status === 'active'

    if (!isPaid) {
      const isAllowed = ALLOWED_UNPAID_PATHS.some(p => pathname.startsWith(p))

      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/membership'
        return NextResponse.redirect(url)
      }
    }
  }

  // protects officer routes — redirects non-officers to /member/profile with an error flag
  if (needsOfficer && user) {
    const isOfficer = memberRow?.role === 'officer' || memberRow?.role === 'admin'

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
