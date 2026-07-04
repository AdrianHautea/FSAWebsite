// ── page.tsx ─────────────────────────────────────────────────
// home page — hero, marquee, mission statement, and upcoming events
//
// data:  next 4 upcoming visible events fetched server-side for SSR
// notes: z-10 overlay and z-20 logo/text layer the hero; marquee duplicates
//        8 items so the looping seam is never visible at any viewport width
// ─────────────────────────────────────────────────────────────
export const revalidate = 3600

import SmoothImage from "@/components/SmoothImage"
import PhotoCarousel from "@/components/PhotoCarousel"
import HeroSection from "@/components/HeroSection"
import UpcomingEventsSection from "@/components/UpcomingEventsSection"
import MissionStatementSection from "@/components/MissionStatementSection"
import WhoAreWeText from "@/components/WhoAreWeText"
import { createAdminClient } from "@/utils/supabase/server"
import { PUBLIC_EVENT_COLUMNS } from "@/lib/constants"
import type { Event } from "@/types/database"

export default async function Home() {
  const admin = createAdminClient()
  // explicit columns — never select('*') here; that would leak attend_qr_token to the public
  const { data: upcomingEvents } = await admin
    .from('events')
    .select(PUBLIC_EVENT_COLUMNS)
    .eq('is_visible', true)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(4)
  return (
    <main className="bg-brand-bg text-white overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative h-[50vh] sm:h-[70vh] md:h-screen w-full overflow-hidden">
        <h1 className="sr-only">UTD FSA — Filipino Student Association at The University of Texas at Dallas</h1>
        {/* Background photo — object-top keeps faces in frame */}
        <SmoothImage
          src="/hero-officers.jpg"
          alt="FSA Officers"
          fill
          className="object-cover object-top"
          preload
          sizes="100vw"
          quality={90}
        />

        {/* Dark overlay so text reads clearly over the busy photo */}
        {/* z-10 sits above the hero image but below the logo (z-20) */}
        <div className="absolute inset-0 bg-black/20 z-10" />

        <HeroSection />
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────── */}
      <div className="bg-brand-bg h-[42px] sm:h-[52px] md:h-[59px] flex items-center overflow-hidden">
        {/* 8 copies so the loop seam is never visible — animation slides to -50% */}
        <div className="flex gap-[34px] whitespace-nowrap w-max animate-marquee">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="inline-flex items-center gap-[34px] font-display font-bold text-[15px] sm:text-[22px] md:text-[32px] text-white shrink-0 tracking-wide">
              <span>PARA SA KULTURA.</span>
              <span>FOR THE CULTURE.</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── WHO ARE WE? ───────────────────────────────────────────── */}
      <section className="bg-section-bg">
        <div className="max-w-[1512px] mx-auto flex flex-col px-4 sm:px-8 lg:px-16 py-12 lg:py-20 gap-8">

          {/* Title and description */}
          <WhoAreWeText />

          {/* Photo carousel */}
          <div className="w-full flex items-center justify-center">
            <PhotoCarousel />
          </div>

        </div>
      </section>

      {/* ── FULL-BLEED PHOTO ──────────────────────────────────────── */}
      <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <SmoothImage src="/event-photo.jpg" alt="FSA Event" fill className="object-cover object-[center_60%]" sizes="100vw" />
      </div>

      {/* ── MISSION STATEMENT ─────────────────────────────────────── */}
      <MissionStatementSection />

      {/* ── UPCOMING EVENTS ───────────────────────────────────────── */}
      <UpcomingEventsSection events={(upcomingEvents ?? []) as unknown as Event[]} />

      {/* ── SECOND FULL-BLEED PHOTO ───────────────────────────────── */}
      <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <SmoothImage src="/event-photo-2.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </div>

    </main>
  )
}
