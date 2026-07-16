// ── route.ts (auth/logout) ────────────────────────────────────────────────────
// clears the supabase session; caller (navbar) redirects to / afterward.
//
// deps:  supabase (auth.signOut clears the http-only session cookies)
// notes: any authenticated user can call this. signOut is fire-and-forget —
//        the redirect happens regardless of whether it errors.
//        POST-only — a GET here would be triggerable via a bare <img src="/auth/logout">
//        on any third-party page with zero interaction, since browsers fire GET for any
//        embedded resource reference. requiring POST forces an attacker to run actual
//        cross-site script/form logic instead, and Next auto-405s unimplemented methods.

import { createUserClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// ── POST /auth/logout ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createUserClient()

  // only apply global scope when the request comes from our own origin;
  // cross-origin requests (potential CSRF) fall back to local scope so they can
  // at most log out this browser — not every session across all devices.
  // parse the Referer to its origin before comparing (startsWith is a prefix bypass).
  const refererHeader = request.headers.get('referer') ?? ''
  const requestOrigin = request.headers.get('origin') ?? ''
  let refererOrigin = ''
  try { if (refererHeader) refererOrigin = new URL(refererHeader).origin } catch { /* invalid referer */ }
  const isSameOrigin = refererOrigin === origin || requestOrigin === origin
  const scope = isSameOrigin ? 'global' : 'local'
  console.info('[security] logout', { scope, isSameOrigin, ts: new Date().toISOString() })
  await supabase.auth.signOut({ scope })

  return NextResponse.json({ success: true })
}