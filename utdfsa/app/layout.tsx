// ── layout.tsx ───────────────────────────────────────────────
// root layout — wraps every page with Navbar, Footer, and fonts
//
// data:  members (id, first_name, last_name, avatar_url, role) — looked up by auth email
// deps:  supabase user client, @vercel/analytics, @vercel/speed-insights
// notes: member is fetched server-side so Navbar receives data before hydration;
//        the three google fonts are registered as CSS custom properties via @theme
// ─────────────────────────────────────────────────────────────
import type { Metadata } from "next"
import { Geist, Geist_Mono, Unbounded } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { createUserClient } from "@/utils/supabase/server"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "UTD FSA - Filipino Student Association | The University of Texas at Dallas",
  description: "The Filipino Student Association at The University of Texas at Dallas. Join events, become a member, explore pamilyas, cultural programs, and connect with the Filipino-American community at UTD.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── auth + member prefetch ────────────────────────────────
  // fetch member server-side so Navbar has data immediately on hydration
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialMember = null

  // only query members table when a supabase session exists
  if (user?.email) {
    // members table — fetch minimal fields needed by Navbar avatar + role badge
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name, avatar_url, role')
      .eq('email', user.email)
      .maybeSingle()

    initialMember = data
  }

  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} h-full antialiased`}>
      <head>
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} />}
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <Navbar initialMember={initialMember} />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}