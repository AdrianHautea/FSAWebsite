'use client'

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
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Sign in to UTD FSA</h1>
      <button
        onClick={handleGoogleLogin}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Sign in with Google
      </button>
    </main>
  )
}