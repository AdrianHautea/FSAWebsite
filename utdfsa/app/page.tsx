// ── page.tsx ─────────────────────────────────────────────────
// home page — hero, marquee, mission statement, and upcoming events
//
// data:  next 4 upcoming visible events fetched server-side for SSR
// notes: z-10 overlay and z-20 logo/text layer the hero; marquee duplicates
//        8 items so the looping seam is never visible at any viewport width
// ─────────────────────────────────────────────────────────────
import Image from "next/image"
import PhotoCarousel from "@/components/PhotoCarousel"
import HeroSection from "@/components/HeroSection"
import UpcomingEventsSection from "@/components/UpcomingEventsSection"
import { createAdminClient } from "@/utils/supabase/server"
import type { Event } from "@/types/database"

export default async function Home() {
  const admin = createAdminClient()
  const { data: upcomingEvents } = await admin
    .from('events')
    .select('*')
    .eq('is_visible', true)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(4)
  return (
    <main className="bg-brand-bg text-white overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative h-[50vh] sm:h-[70vh] md:h-screen w-full overflow-hidden">
        {/* Background photo — object-top keeps faces in frame */}
        <Image
          src="/hero-officers.jpg"
          alt="FSA Officers"
          fill
          className="object-cover object-top"
          priority
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
          <div className="w-full flex flex-col">
            <h2 className="font-display font-black text-[37px] md:text-[54px] text-white leading-none tracking-[-3.2px] mb-6 lg:mb-8">
              WHO ARE{'\n'}WE?
            </h2>
            <p className="font-sans text-[16px] md:text-[20px] text-white/60 leading-relaxed">
              UTD FSA is a student-led social organization at UT Dallas, created to unite students who
              are interested in promoting Filipino-American culture. Through many aspects of unity, such
              as dance, sports, and social events, UTD FSA aims to celebrate &amp; foster community
              through Filipino traditions.
            </p>
          </div>

          {/* Photo carousel */}
          <div className="w-full flex items-center justify-center">
            <PhotoCarousel />
          </div>

        </div>
      </section>

      {/* ── FULL-BLEED PHOTO ──────────────────────────────────────── */}
      <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <Image src="/event-photo.jpg" alt="FSA Event" fill className="object-cover object-[center_60%]" sizes="100vw" />
      </div>

      {/* ── MISSION STATEMENT ─────────────────────────────────────── */}
      <section className="bg-section-bg px-4 sm:px-8 lg:px-16 py-14 sm:py-20 lg:py-24 min-h-[400px] lg:min-h-[575px]">
        <div className="max-w-[1241px] mx-auto text-center">
          <h2 className="font-display font-black text-[36px] sm:text-[52px] lg:text-[64px] xl:text-[96px] text-white tracking-[-2px] sm:tracking-[-3px] lg:tracking-[-4.8px] leading-none mb-10 lg:mb-16">
            MISSION STATEMENT
          </h2>
          <div className="font-sans text-[16px] sm:text-[18px] xl:text-[24px] text-white/60 leading-relaxed max-w-[1100px] mx-auto space-y-6">
            <p>
              The <span className="text-accent-green">Filipino Student Association</span> at the{' '}
              <span className="text-accent-gold">University of Texas at Dallas</span> was founded in
              2001, aiming to cultivate a community that empowers, uplift student voices, and celebrate
              Filipino culture through service, leadership, and unity.
            </p>
            <p>
              All students are welcomed, regardless of race, ethnicity, sexual orientation, religion, or
              background. Through community outreach, social engagement, and cultural awareness, UTD FSA
              strives to ensure pride in Filipino identity, whilst offering a space for students to
              belong, grow, and lead towards a brighter future.
            </p>
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS ───────────────────────────────────────── */}
      <UpcomingEventsSection events={(upcomingEvents ?? []) as Event[]} />

      {/* ── SECOND FULL-BLEED PHOTO ───────────────────────────────── */}
      <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <Image src="/event-photo-2.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </div>

    </main>
  )
}
