// ── layout.tsx ───────────────────────────────────────────────
// root layout — wraps every page with Navbar, Footer, and fonts
//
// data:  members (id, first_name, last_name, avatar_url, role) — looked up by auth email
// deps:  supabase user client, @vercel/analytics, @vercel/speed-insights
// notes: member is fetched server-side so Navbar receives data before hydration;
//        the four google fonts are registered as CSS custom properties via @theme
// ─────────────────────────────────────────────────────────────
import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { Geist, Geist_Mono, Unbounded, Noto_Sans_Tagalog } from "next/font/google"
import "./globals.css"
import SiteChrome from "@/components/SiteChrome"
import { createUserClient } from "@/utils/supabase/server"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" })
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  display: "swap",
})
const notoTagalog = Noto_Sans_Tagalog({
  variable: "--font-tagalog",
  subsets: ["tagalog"],
  weight: "400",
  display: "swap",
})

export const viewport: Viewport = {
  viewportFit: 'cover',
}

const SITE_URL = "https://www.utdfsa.org"
const SITE_DESCRIPTION = "The Filipino Student Association at The University of Texas at Dallas. Join events, become a member, explore pamilyas, cultural programs, and connect with the Filipino-American community at UTD."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UTD FSA — Filipino Student Association at UT Dallas",
    template: "%s | UTD FSA",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "UTD FSA",
    locale: "en_US",
    images: [{ url: "/og/home.jpg", width: 1200, height: 630, alt: "UTD FSA members" }],
  },
  twitter: {
    card: "summary_large_image",
  },
}

// sitewide Organization structured data — one instance is enough for the whole
// site per Google's guidance, so it lives in the root layout rather than per-page
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UTD FSA — Filipino Student Association at UT Dallas",
  alternateName: "UTD FSA",
  url: SITE_URL,
  logo: `${SITE_URL}/logo-head.png`,
  description: SITE_DESCRIPTION,
  sameAs: [
    "https://instagram.com/fsautd",
    "https://youtube.com/@fsautd",
    "https://tiktok.com/@utdfsa",
    "https://discord.gg/uVRmuF3BT",
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // nonce set per-request by proxy.ts — required for the inline JSON-LD script below
  // to run under a nonce-based CSP (script-src no longer allows 'unsafe-inline')
  const nonce = (await headers()).get('x-nonce')

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} ${notoTagalog.variable} h-full antialiased`}>
      <head>
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} />}
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <script
          type="application/ld+json"
          nonce={nonce ?? undefined}
          // browsers zero out the nonce attribute in the DOM after parsing (CSP
          // hardening, prevents nonce exfiltration) — React sees that as a hydration
          // mismatch even though the script already ran fine server-side
          suppressHydrationWarning
          // static, no user input — safe to inline
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[400] focus:px-4 focus:py-2 focus:bg-accent-green focus:text-black focus:font-semibold focus:rounded-lg focus:text-sm"
        >
          Skip to main content
        </a>
        <SiteChrome initialMember={initialMember}>
          <div id="main-content" tabIndex={-1} className="outline-none flex-1 flex flex-col">
            {children}
          </div>
        </SiteChrome>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}