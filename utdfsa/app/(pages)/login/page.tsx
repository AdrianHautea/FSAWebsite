'use client'

import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// UI — safe to restyle everything below this line
// no external data — this page only triggers Google OAuth
// handleGoogleLogin: do not modify — initiates Supabase OAuth
//   and redirects to /auth/callback with an optional ?next= param
// change classnames, layout, colors, and typography freely
// ============================================================
export default function LoginPage() {
  const supabase = createClient()

  async function handleGoogleLogin() {
    const next = new URLSearchParams(window.location.search).get('next')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
      },
    })
  }

  return (
    <div className="min-h-screen flex bg-[#0f0f0f]">

      {/* LEFT: photo panel — hidden on mobile */}
      <div className="hidden lg:block lg:flex-[0_0_60%] relative overflow-hidden">
        <Image
          src="/hero-officers.jpg"
          alt="UTD FSA members"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          sizes="60vw"
          priority
        />
        {/* dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(7,7,7,0.35) 0%, rgba(7,7,7,0.5) 55%, rgba(7,7,7,0.82) 100%)' }}
        />
        {/* centered brand block */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[22px] px-10 text-center">
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              background: 'conic-gradient(from 180deg at 50% 50%, #395131 104deg, #497047 242deg, #e3ae3d 292deg)',
              boxShadow: '0 12px 40px -8px rgba(0,0,0,0.7)',
            }}
          >
            <Image
              src="/logo-head.png"
              alt="UTD FSA"
              width={72}
              height={72}
              className="rounded-full"
              style={{ width: '72px', height: '72px', objectFit: 'cover' }}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span
              className="font-display font-black text-[40px] leading-none tracking-[-0.01em] text-white"
            >
              UTD FSA
            </span>
            <span
              className="text-[14px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'rgba(255,255,255,0.62)' }}
            >
              Filipino Student Association
            </span>
          </div>
          <p
            className="font-display font-semibold text-[18px] tracking-[0.01em] italic"
            style={{ color: 'rgba(255,255,255,0.86)', marginTop: '6px' }}
          >
            Para sa Kultura. For the Culture.
          </p>
        </div>
      </div>

      {/* RIGHT: form panel */}
      <div
        className="w-full lg:flex-[0_0_40%] flex items-center justify-center p-6 lg:p-12 min-h-screen"
        style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-full max-w-[340px] flex flex-col">

          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden"
              style={{ background: 'conic-gradient(from 180deg at 50% 50%, #395131 104deg, #497047 242deg, #e3ae3d 292deg)' }}
            >
              <Image
                src="/logo-head.png"
                alt="UTD FSA"
                width={59}
                height={59}
                className="rounded-full"
                style={{ width: '59px', height: '59px', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Heading */}
          <h1
            className="font-display font-black text-white leading-[1.05] tracking-[-0.02em] mb-[14px]"
            style={{ fontSize: 'clamp(30px, 3vw, 34px)' }}
          >
            Welcome Back
          </h1>

          {/* Subtext */}
          <p className="text-[15px] font-medium leading-[1.55] mb-8" style={{ color: '#8c8c8c' }}>
            Sign in to access your FSA membership, events, and more.
          </p>

          {/* Google sign-in button */}
          <button
            onClick={handleGoogleLogin}
            className="google-btn w-full flex items-center justify-center gap-3 py-[15px] px-[18px] rounded-[14px] text-[15px] font-semibold tracking-[0.01em] cursor-pointer transition-all duration-[180ms]"
            style={{
              background: '#fff',
              border: '1px solid #e6e6e6',
              color: '#3c4043',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-[14px] my-6">
            <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.09)' }} />
            <span
              className="text-[12px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: '#5e5e5e' }}
            >
              or
            </span>
            <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.09)' }} />
          </div>

          {/* Helper text */}
          <p className="text-[13px] font-medium leading-[1.55] text-center" style={{ color: '#7a7a7a' }}>
            New here? Signing in for the first time will automatically create your account.
          </p>

          {/* Terms */}
          <p className="text-[12px] font-medium leading-[1.5] text-center mt-9" style={{ color: '#5a5a5a' }}>
            By signing in you agree to UTD FSA&apos;s terms of membership.
          </p>

        </div>
      </div>

      <style>{`
        .google-btn:hover {
          box-shadow: 0 10px 30px -10px rgba(255,255,255,0.25);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}
