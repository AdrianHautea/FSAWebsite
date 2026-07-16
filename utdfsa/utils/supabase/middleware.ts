// ── utils/supabase/middleware.ts ──────────────────────────
// next.js middleware — refreshes the supabase session and
// enforces route-level auth guards for member and officer paths.
//
// data:  members (role, membership_status, membership_expires_at)
// deps:  supabase/ssr
// notes: called by proxy.ts on every non-static request;
//        all redirects preserve the original path in ?next=

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isMembershipActive } from '@/lib/membership'

// ── route protection lists ────────────────────────────────

// require login + effectively active membership (officers/admins exempt — see below)
const MEMBER_ROUTES = ['/member']

// only officers and admins can access these routes
const OFFICER_ROUTES = ['/officer', '/api/officer']

// unpaid users can still reach these without being bounced to /membership —
// matters because '/membership' itself matches the '/member' prefix above.
// (only '/membership' can actually start with '/member' — '/onboarding', '/auth',
// and '/login' never reach this check, since it only runs under needsMember)
const ALLOWED_UNPAID_PATHS = [
  '/membership',
]

// ── session refresh + auth guards ─────────────────────────

// per-request csp/nonce values, computed in proxy.ts — threaded through so
// downstream Server Components can read x-nonce via next/headers
type CspInfo = { nonce: string; csp: string }

export async function updateSession(request: NextRequest, cspInfo?: CspInfo) {
  // builds a fresh Headers copy from the CURRENT request.headers each time it's called —
  // must not be built once and reused, because the setAll callback below mutates
  // request.cookies (which updates request.headers) after a session refresh, and the
  // second NextResponse.next() call needs to see that mutation to propagate the
  // refreshed cookie to the downstream render. a single frozen snapshot would silently
  // drop that refresh.
  function forwardedHeaders() {
    const headers = new Headers(request.headers)
    if (cspInfo) {
      headers.set('x-nonce', cspInfo.nonce)
      headers.set('Content-Security-Policy', cspInfo.csp)
    }
    return headers
  }

  let supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders() } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // write cookies to both the request and the response so the
          // refreshed session token reaches the browser
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders() } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // always refresh the session — this is the only place that can persist a
  // refreshed cookie (Server Components can't write cookies, so RootLayout's
  // own getUser() call relies on middleware having already refreshed it here;
  // gating this call on guarded-only paths broke that on public pages —
  // see docs/performance-bloat-audit.md item 4 postmortem)
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const needsMember = MEMBER_ROUTES.some(r => pathname.startsWith(r))
  const needsOfficer = OFFICER_ROUTES.some(r => pathname.startsWith(r))

  // protects member and officer routes — redirects to /login (with ?next=) if not authenticated
  if ((needsMember || needsOfficer) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // ?next= lets the login page redirect back to the originally requested path after sign-in
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // single member lookup shared by all three checks below —
  // runs whenever we need role or effective membership (status + expiry)
  let memberRow: { role: string; membership_status: string; membership_expires_at: string | null } | null = null

  if (user && (needsMember || needsOfficer || pathname === '/membership')) {
    // respects rls — only returns the row matching the caller's email
    const { data } = await supabase
      .from('members')
      .select('role, membership_status, membership_expires_at')
      .eq('email', user.email!)
      .maybeSingle()
    memberRow = data
  }

  // protects /membership — redirects active members and officers away since they don't need to pay again
  if (pathname === '/membership' && user) {
    const isActive = isMembershipActive(memberRow)
    const isOfficer = memberRow?.role === 'officer' || memberRow?.role === 'admin'
    if (isActive || isOfficer) {
      const url = request.nextUrl.clone()
      url.pathname = '/member/profile'
      return NextResponse.redirect(url)
    }
  }

  // protects member routes — redirects unpaid members to /membership so they can complete payment.
  // officers/admins are exempt: the /membership block above bounces them to /member/profile,
  // so gating them here on payment would create an infinite redirect loop between the two.
  if (needsMember && user) {
    const isOfficer = memberRow?.role === 'officer' || memberRow?.role === 'admin'
    const isPaid = isMembershipActive(memberRow) || isOfficer

    if (!isPaid) {
      // allow exceptions (onboarding, auth routes) so the payment flow itself isn't blocked
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
      // ?error=unauthorized lets the profile page surface a toast or banner
      redirectUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
