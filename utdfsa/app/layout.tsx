import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import { createUserClient } from "@/utils/supabase/server"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "UTD FSA",
  description: "University of Texas at Dallas Filipino Student Association",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // fetch member server-side so Navbar has data immediately on hydration
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialMember = null

  if (user?.email) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    initialMember = data
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar initialMember={initialMember} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}