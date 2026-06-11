import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// createUserClient — for server components and api routes acting on behalf of the signed-in user
// reads/writes session cookies; row-level security policies apply
export async function createUserClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch (e) {
              console.error('[server.ts] failed to set cookie:', name, e)
            }
          })
        },
      },
    }
  )
}

// createAdminClient — for server-side operations that must bypass RLS (seeding, officer management)
// uses the service role key; never expose this client or its key to the browser
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}