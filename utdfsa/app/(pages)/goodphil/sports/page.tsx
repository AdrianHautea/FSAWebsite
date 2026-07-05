// ── page.tsx ──────────────────────────────────────────────
// goodphil sports page — 9-sport grid, captain interest form,
// and captain meeting booking cta
//
// notes: fully static; hero: sports-hero.jpg (/public);
//        individual sport card photos listed inline per card;
//        captain form and booking links are hardcoded google
//        forms/calendar urls; no purple highlights anywhere;
//        captain CTA stack sits beside the description (left-
//        justified paragraph, same wide-grid pattern as the
//        Cultural/Modern/Spirit mini CTAs); Our Sports section
//        uses bg-brand-bg (#0e0e0e), same dark tone as the About
//        page's "Get in Touch" section
// ──────────────────────────────────────────────────────────

'use client'

import { useRef } from 'react'
import SmoothImage from '@/components/SmoothImage'
import AnimatedTitle from '@/components/AnimatedTitle'
import BaybayinRule from '@/components/BaybayinRule'
import GoodphilNavRail from '@/components/GoodphilNavRail'
import { useRevealOnScroll, useStaggeredReveal } from '@/lib/useRevealOnScroll'

export default function SportsPage() {
  // Baybayin subheader — opacity fade-in as it scrolls into view
  const baybayinRef = useRef<HTMLDivElement>(null)
  const baybayinVisible = useRevealOnScroll(baybayinRef, 0.3)

  // description paragraph — slides up 10px while fading in on scroll into view
  const paraRef = useRef<HTMLParagraphElement>(null)
  const paraVisible = useRevealOnScroll(paraRef, 0.3)

  // sports card grid — row-staggered scroll-triggered fade-up (same pattern as
  // About's officer board), now with the shared never-blank + reduced-motion guard
  const sportsGridRef = useRef<HTMLDivElement>(null)
  useStaggeredReveal(
    () => (sportsGridRef.current ? (Array.from(sportsGridRef.current.children) as HTMLElement[]) : []),
    (card, cards) => {
      // reveal the whole row together, keyed on shared offsetTop
      const top = card.offsetTop
      cards
        .filter(c => Math.abs(c.offsetTop - top) < 4)
        .forEach(c => {
          if (c.dataset.revealed) return
          c.dataset.revealed = '1'
          c.style.animation = 'none'
          void c.offsetHeight
          c.style.animation = 'fadeUp 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'
        })
    },
    0.4,
  )

  // leadership CTA cards — simple fade-in when scrolled into view
  const leadershipRef1 = useRef<HTMLDivElement>(null)
  const leadership1Visible = useRevealOnScroll(leadershipRef1, 0.3)
  const leadershipRef2 = useRef<HTMLDivElement>(null)
  const leadership2Visible = useRevealOnScroll(leadershipRef2, 0.3)

  return (
    <main className="bg-section-bg text-white overflow-x-clip">
      <GoodphilNavRail />

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}
      <section className="relative w-full h-[40vh] md:h-[600px] overflow-hidden">

        {/* Background layer: dark radial gradient (no bg PNG for Sports) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(40,40,40,0.8) 0%, rgba(10,10,10,1) 100%)',
          }}
        />

        {/* Middle layer: sports-hero.jpg — full-bleed cover at all sizes */}
        <div className="absolute inset-0 z-10">
          <SmoothImage
            src="/sports-hero.jpg"
            alt="UTD FSA Sports team"
            fill
            className="object-cover object-[center_20%]"
            preload
            quality={85}
            sizes="100vw"
          />
        </div>

        {/* Top layer: SPORTS title + Baybayin, centered over hero photo */}
        <AnimatedTitle
          as="div"
          animation="fadeIn"
          className="absolute z-30 w-full flex flex-col items-center select-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            gap: 'clamp(12px, 1.5vw, 24px)',
          }}
        >
          <h1
            className="text-center font-display font-black text-white leading-none"
            style={{
              fontSize: 'clamp(48px, 8.5vw, 128px)',
              textShadow: '0px 4px 28px rgba(0,0,0,0.72), 0px 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            SPORTS
          </h1>
        </AnimatedTitle>

      </section>

      {/* ── SECTION 2 — WHAT IS GOODPHIL SPORTS? ─────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">

        {/* heading + Baybayin stay centered, matching the Cultural/Modern/Spirit convention */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <h2 className="font-display font-black text-white mb-4" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.01em' }}>
            WHAT IS UTD FSA SPORTS?
          </h2>
          <div ref={baybayinRef} style={{ opacity: baybayinVisible ? 1 : 0, transition: 'opacity 900ms var(--ease-smooth)' }}>
            <BaybayinRule word="ᜉᜎᜃᜐᜈ᜔" size="clamp(16px,2vw,27px)" />
          </div>
        </div>

        {/* left-justified paragraph + captain CTA stack — same wide-grid pattern
            as Cultural/Modern/Spirit's mini CTAs, but the right column holds the
            two captain CTA cards (Sports has no team photo collage) */}
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_460px] gap-10 lg:gap-16 items-start">
          <p
            ref={paraRef}
            className="font-sans leading-relaxed text-white/60 text-left"
            style={{
              fontSize: 'clamp(16px, 1.9vw, 29px)',
              opacity: paraVisible ? 1 : 0,
              transform: paraVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth)',
            }}
          >
            <span className="font-bold text-white">UTD FSA Sports</span>
            {' '}is where UTD FSA&apos;s <span className="font-bold text-accent-green">competitive spirit comes alive.</span> Throughout the weekend, members represent UTD in a variety of sports while competing against Filipino Student Associations from across Texas.
            From first-time players to seasoned competitors, <span className="font-bold text-accent-green">there's a place for everyone.</span> You'll build friendships, challenge yourself, and experience the excitement of representing UTD alongside your FSA family. Whether you're <span className="font-bold text-accent-gold">chasing a championship or trying a new sport with friends</span>, it's all about teamwork, sportsmanship, and <span className="font-bold text-accent-green">creating lasting memories both on and off the court.</span>
          </p>

          <div className="flex flex-col gap-6 mx-auto lg:mx-0 w-full max-w-[460px]">

            {/* primary cta — captain interest form */}
            <div
              ref={leadershipRef1}
              className="relative border border-white/20 rounded-[22px] px-8 py-10 text-center overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #191919 0%, #111111 100%)',
                opacity: leadership1Visible ? 1 : 0,
                transition: 'opacity 700ms var(--ease-smooth)',
              }}
            >
              <h3
                className="font-display font-black text-white mb-3"
                style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
              >
                WANT TO CAPTAIN A SPORT?
              </h3>
              <p
                className="font-sans text-white/60 mb-6"
                style={{ fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500 }}
              >
                Sports captains lead their team throughout Goodphil season. If you&apos;re interested in taking on a leadership role, fill out the captain interest form below.
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSc4CPQXu9A_CaCMmZO9xJiUl_7Up5R8bBxLPKlo2fFZpuxFGg/viewform?pli=1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-accent-green text-[#0e0e0e] rounded-[13px] font-sans font-bold transition-all duration-200 hover:brightness-[1.08]"
                style={{ fontSize: '14px', letterSpacing: '0.01em' }}
              >
                Fill Out Captain Interest Form
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </div>

            {/* secondary cta — book a captain meeting */}
            <div
              ref={leadershipRef2}
              className="border border-white/20 rounded-[22px] px-8 py-10 text-center flex flex-col items-center"
              style={{
                background: 'linear-gradient(180deg, #191919 0%, #111111 100%)',
                opacity: leadership2Visible ? 1 : 0,
                transition: 'opacity 700ms var(--ease-smooth)',
              }}
            >
              <h3
                className="font-display font-black text-white mb-3"
                style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
              >
                BOOK A CAPTAIN MEETING
              </h3>
              <p
                className="font-sans text-[#8a8a8a] mb-6"
                style={{ fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500 }}
              >
                Already a captain or interested in becoming one? Book a meeting with a Sports Coordinator to discuss your team, scheduling, and Goodphil prep.
              </p>
              <a
                href="https://calendar.app.google/DeGvXnzB5Ux2DEQa8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 border border-white/40 text-white/80 rounded-[13px] font-sans font-bold transition-all duration-200 hover:border-white/60 hover:text-white"
                style={{ fontSize: '14px', letterSpacing: '0.01em' }}
              >
                Book a Meeting
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </a>
            </div>

          </div>
        </div>

      </section>

      {/* ── SECTION 3 — OUR SPORTS ───────────────────────────────── */}
      <section className="bg-brand-bg py-16 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">

          <h2 className="font-display font-black text-white text-center mb-8" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.01em' }}>
            OUR SPORTS
          </h2>

          <div ref={sportsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Card 1: Men's Basketball — /mens-bbal.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/mens-bbal.jpg"
                  alt="Men's Basketball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Men&apos;s Basketball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Full-court, no easy buckets. The bracket that draws the biggest crowd every year.</p>
              </div>
            </div>

            {/* Card 2: Women's Basketball — /womens-bbal.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/womens-bbal.jpg"
                  alt="Women's Basketball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Women&apos;s Basketball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Fast breaks and tight defense. Consistently one of the closest brackets at Goodphil.</p>
              </div>
            </div>

            {/* Card 3: Men's Volleyball — /mens-vb.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/mens-vb.jpg"
                  alt="Men's Volleyball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Men&apos;s Volleyball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Six on a side, points won at the net. Rewards teams that actually practice together.</p>
              </div>
            </div>

            {/* Card 4: Women's Volleyball — /womens-vb.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/womens-vb.jpg"
                  alt="Women's Volleyball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Women&apos;s Volleyball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Long rallies, louder sidelines. Usually the last court still going in the gym.</p>
              </div>
            </div>

            {/* Card 5: Coed Volleyball — /coed-vb.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/coed-vb.jpg"
                  alt="Coed Volleyball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Coed Volleyball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Mixed rosters, no separate bracket. First-timers and veterans share the same side of the net.</p>
              </div>
            </div>

            {/* Card 6: Men's Flag Football — /mens-ff.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/mens-ff.jpg"
                  alt="Men's Flag Football"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Men&apos;s Flag Football</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>No pads, no excuses. Playbooks get drawn up in the group chat the week before.</p>
              </div>
            </div>

            {/* Card 7: Coed Soccer — /coed-soccer.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/coed-soccer.jpg"
                  alt="Coed Soccer"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Coed Soccer</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Full pitch, mixed roster. The one bracket where cleats actually matter.</p>
              </div>
            </div>

            {/* Card 8: Ultimate Frisbee — /ultimate-frisbee.jpg */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <SmoothImage
                  src="/ultimate-frisbee.jpg"
                  alt="Ultimate Frisbee"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Ultimate Frisbee</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Self-officiated, no refs. Whoever calls the foul best usually wins the argument.</p>
              </div>
            </div>

            {/* Card 9: Super Secret Special Sport — dark placeholder, no photo */}
            <div className="bg-[#181818] border border-white/[0.12] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl bg-[#111] flex items-center justify-center border-b border-white/[0.08]">
                <span className="text-6xl">❓</span>
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Super Secret Special Sport</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Announced day-of, every year. Not even the host school always knows in advance.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </main>
  )
}
