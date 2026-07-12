// ── page.tsx ─────────────────────────────────────────────────
// home page — hero, marquee, mission statement, and upcoming events
//
// data:  next 4 upcoming visible events fetched server-side for SSR
// notes: z-10 overlay and z-20 logo/text layer the hero; marquee duplicates
//        8 items so the looping seam is never visible at any viewport width.
//        the events query itself is cached via getCachedVisibleEvents (see
//        lib/data/events.ts) — there is no route-segment `revalidate` export
//        here because auth.getUser() below reads cookies() unconditionally,
//        which forces this whole page to render dynamically per request
//        regardless of that export; unstable_cache is the real cache boundary.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from "next"
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

import SmoothImage from "@/components/SmoothImage"
import PhotoCarousel from "@/components/PhotoCarousel"
import HeroSection from "@/components/HeroSection"
import UpcomingEventsSection from "@/components/UpcomingEventsSection"
import MissionStatementSection from "@/components/MissionStatementSection"
import WhoAreWeText from "@/components/WhoAreWeText"
import ScrollFadeIn from "@/components/ScrollFadeIn"
import { createAdminClient, createUserClient } from "@/utils/supabase/server"
import { getCachedVisibleEvents } from "@/lib/data/events"
import { isMembershipActive } from "@/lib/membership"

export default async function Home() {
  const admin = createAdminClient()

  // filtered/sliced live (not baked into the cached query) so "upcoming" stays
  // correct as events start, without needing a separate cache entry per window
  const visibleEvents = await getCachedVisibleEvents()
  const now = new Date()
  const upcomingEvents = visibleEvents
    .filter(e => new Date(e.event_date) >= now)
    .slice(0, 4)

  // resolve caller server-side — same pattern as app/(pages)/events/page.tsx — so the
  // Register/Already-registered button state is correct on first paint instead of
  // popping in after a client-side auth/registration waterfall
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  let member: {
    id: string
    membership_status: string
    membership_expires_at: string | null
    first_name: string
    last_name: string
    email: string
    contact_email: string | null
  } | null = null
  let registeredEventIds = new Set<string>()

  if (user?.email) {
    const { data } = await admin
      .from('members')
      .select('id, membership_status, membership_expires_at, first_name, last_name, email, contact_email')
      .eq('email', user.email)
      .maybeSingle()
    member = data

    if (member && isMembershipActive(member)) {
      const { data: regs } = await admin
        .from('event_registrations')
        .select('event_id')
        .eq('member_id', member.id)
        .eq('payment_status', 'paid')
      registeredEventIds = new Set(
        (regs ?? []).map(r => r.event_id).filter(Boolean) as string[]
      )
    }
  }

  const isMember = isMembershipActive(member)

  return (
    <main className="bg-brand-bg text-white overflow-x-clip">

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
      <ScrollFadeIn className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <SmoothImage src="/event-photo.jpg" alt="FSA Event" fill className="object-cover object-[center_60%]" sizes="100vw" />
      </ScrollFadeIn>

      {/* ── MISSION STATEMENT ─────────────────────────────────────── */}
      <MissionStatementSection />

      {/* ── UPCOMING EVENTS ───────────────────────────────────────── */}
      <UpcomingEventsSection
        events={upcomingEvents}
        isMember={isMember}
        member={member}
        registeredEventIds={[...registeredEventIds]}
      />

      {/* ── SECOND FULL-BLEED PHOTO ───────────────────────────────── */}
      <ScrollFadeIn className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <SmoothImage src="/event-photo-2.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </ScrollFadeIn>

    </main>
  )
}
