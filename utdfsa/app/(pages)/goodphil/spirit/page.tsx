// ── page.tsx ──────────────────────────────────────────────
// goodphil spirit page — utd fsa spirit performance category
//
// notes: fully static; hero uses spirit-hero.jpg (/public)
//        with a dark radial gradient fallback — no bg png or
//        logo png for spirit; spi-1/2/3.jpg for the mini CTA
//        photo collage; youtube video ids hardcoded in the
//        past-performances section; cta links to @fsautd on
//        instagram (spirit has no team-specific account)
// ──────────────────────────────────────────────────────────

'use client'

import { useRef } from 'react'
import SmoothImage from '@/components/SmoothImage'
import AnimatedTitle from '@/components/AnimatedTitle'
import BaybayinRule from '@/components/BaybayinRule'
import GoodphilNavRail from '@/components/GoodphilNavRail'
import { useRevealOnScroll, useStaggeredReveal } from '@/lib/useRevealOnScroll'

export default function SpiritPage() {
  // Baybayin subheader — opacity fade-in as it scrolls into view
  const baybayinRef = useRef<HTMLDivElement>(null)
  const baybayinVisible = useRevealOnScroll(baybayinRef, 0.3)

  // description paragraph — slides up 10px while fading in on scroll into view
  const paraRef = useRef<HTMLParagraphElement>(null)
  const paraVisible = useRevealOnScroll(paraRef, 0.3)

  // past-performances video vault — each card animates independently as it individually
  // scrolls into view (mirrors the officer board card pattern in AboutClient.tsx),
  // now with the shared never-blank + reduced-motion guard
  const perfCardRefs = useRef<(HTMLDivElement | null)[]>([])
  useStaggeredReveal(
    () => perfCardRefs.current.filter((c): c is HTMLDivElement => c !== null),
    (card, cards) => {
      const delay = cards.indexOf(card) * 150
      card.style.animation = 'none'
      void card.offsetHeight
      card.style.animation = `videoCardIn 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`
    },
    0.3,
  )

  return (
    <main className="bg-section-bg text-white overflow-x-clip">
      <GoodphilNavRail />

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}
      <section className="relative w-full h-[40vh] md:h-[600px] overflow-hidden">

        {/* Background layer: dark radial gradient (no bg PNG for Spirit) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(40,40,40,0.8) 0%, rgba(10,10,10,1) 100%)',
          }}
        />

        {/* Middle layer: spirit-hero.jpg — full-bleed cover at all sizes */}
        <div className="absolute inset-0 z-10">
          <SmoothImage
            src="/spirit-hero.jpg"
            alt="UTD FSA Spirit team"
            fill
            className="object-cover object-center"
            preload
            quality={85}
            sizes="100vw"
          />
        </div>

        {/* Top layer: SPIRIT title + Baybayin, centered over hero photo */}
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
            SPIRIT
          </h1>
        </AnimatedTitle>

      </section>

      {/* ── SECTION 2 — WHAT IS SPIRIT? ──────────────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">

        {/* heading + Baybayin stay centered, matching the Cultural/Modern convention */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <h2 className="font-display font-black text-white mb-4" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.01em' }}>
            WHAT IS UTD SPIRIT?
          </h2>
          <div ref={baybayinRef} style={{ opacity: baybayinVisible ? 1 : 0, transition: 'opacity 900ms var(--ease-smooth)' }}>
            <BaybayinRule word="ᜇᜒᜏ" size="clamp(16px,2vw,27px)" />
          </div>
        </div>

        {/* left-justified paragraph + mini Instagram CTA — same pattern as
            Cultural/Modern, minus the team logo badge (Spirit has none);
            links to the main FSA Instagram since Spirit isn't its own team */}
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
            <span className="font-bold text-white">Spirit</span>
            {' '}is UTD FSA&apos;s performance category in Goodphil, bringing together school pride, <span className="font-bold text-white">Filipino culture</span>, and <span className="font-bold text-accent-green">pure crowd energy.</span> From chants and skits to <span className="font-bold text-accent-gold">unforgettable performances</span>, Spirit is all about creating moments that get everyone on their feet. 
            <span className="font-bold text-accent-green"> No performance experience? No problem.</span> Spirit is one of the best ways to meet new people, <span className="font-bold text-accent-gold">make lasting memories</span>, and share plenty of laughs while preparing for one of the biggest weekends of the year. Whether you're performing or cheering from the sidelines, this is where <span className="font-bold text-accent-green spirit-glow">Comet pride shines the brightest</span> and the entire FSA community comes together.
          </p>

          <div className="flex flex-col items-center lg:items-stretch gap-7 mx-auto lg:mx-0 w-full max-w-[460px]">
            {/* staggered 3-photo collage: one tall portrait on the left, two
                stacked squares on the right, top-aligned */}
            <div className="flex gap-3 w-full">
              <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden">
                <SmoothImage
                  src="/spi-1.jpg"
                  alt="UTD FSA Spirit performing at Goodphil"
                  fill
                  className="object-cover object-top"
                  quality={95}
                  sizes="(max-width: 1024px) 45vw, 220px"
                />
              </div>

              {/* two stacked squares, top-aligned with the portrait */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <SmoothImage
                    src="/spi-2.jpg"
                    alt="UTD FSA Spirit performer mid-performance"
                    fill
                    className="object-cover object-[center_30%]"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <SmoothImage
                    src="/spi-3.jpg"
                    alt="UTD FSA Spirit group performance at Goodphil"
                    fill
                    className="object-cover object-[center_35%]"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
              </div>
            </div>

            <a
              href="https://instagram.com/fsautd"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-green text-[#0e0e0e] rounded-full font-sans font-bold text-sm transition-all duration-200 hover:brightness-[1.08]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Follow @fsautd
            </a>
          </div>
        </div>

      </section>

      {/* ── SECTION 3 — PAST PERFORMANCES ────────────────────────── */}
      {/* featured (most recent year) + 2-col secondary row for older years;
          each card is video + optional placement badge only — no photos/captions */}
      <section className="bg-[#2d452c] py-16 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">

          <h2
            className="font-display font-black text-white text-center w-full block mb-14"
            style={{
              fontSize: 'clamp(30px, 4.3vw, 65px)',
              letterSpacing: '3.25px',
              paddingLeft: '3.25px',
              textShadow: '0px 9.6px 4px rgba(255,251,251,0.26)',
            }}
          >
            PAST PERFORMANCES
          </h2>

          {/* Featured — Goodphil 2026, Austin (most recent year) */}
          <div className="mb-14" ref={(el) => { perfCardRefs.current[0] = el }}>
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.16] font-display font-bold text-[11px] uppercase tracking-[0.12em] text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                3rd Place
              </span>
            </div>
            <p
              className="font-display text-white text-center mb-4"
              style={{ fontSize: 'clamp(14px, 2vw, 30px)', letterSpacing: '1.5px' }}
            >
              <span className="font-black">GOODPHIL 2026 - </span>
              <span className="font-medium">AUSTIN</span>
            </p>
            <div className="max-w-[60rem] mx-auto">
              <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-3 mb-5">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/R79EE9wmbTc"
                  title="Goodphil 2026 - Austin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Secondary — earlier years */}
          <div className="grid sm:grid-cols-2 gap-8">

            {/* Performance — Goodphil 2025, College Station */}
            <div ref={(el) => { perfCardRefs.current[1] = el }}>
              <div className="flex justify-center mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 font-display font-bold text-[10px] uppercase tracking-[0.1em] text-accent-gold">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                  1st Place
                </span>
              </div>
              <p
                className="font-display text-white text-center mb-3"
                style={{ fontSize: 'clamp(13px, 1.6vw, 20px)', letterSpacing: '1px' }}
              >
                <span className="font-black">GOODPHIL 2025 - </span>
                <span className="font-medium">COLLEGE STATION</span>
              </p>
              <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-2.5 mb-4">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/02wg-b1WghI"
                  title="Goodphil 2025 - College Station"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video rounded-xl"
                />
              </div>
            </div>

            {/* Performance — Goodphil 2024, Arlington */}
            <div ref={(el) => { perfCardRefs.current[2] = el }}>
              <div className="flex justify-center mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.16] font-display font-bold text-[10px] uppercase tracking-[0.1em] text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  3rd Place
                </span>
              </div>
              <p
                className="font-display text-white text-center mb-3"
                style={{ fontSize: 'clamp(13px, 1.6vw, 20px)', letterSpacing: '1px' }}
              >
                <span className="font-black">GOODPHIL 2024 - </span>
                <span className="font-medium">ARLINGTON</span>
              </p>
              <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-2.5 mb-4">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/4JeGsfOV27E"
                  title="Goodphil 2024 - Arlington"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video rounded-xl"
                />
              </div>
            </div>

          </div>

          {/* Exit CTA — matches the Section 2 Instagram CTA pattern */}
          <div className="flex justify-center mt-14">
            <a
              href="https://instagram.com/fsautd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-green text-[#0e0e0e] rounded-full font-sans font-bold text-sm transition-all duration-200 hover:brightness-[1.08]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Watch More on Instagram
            </a>
          </div>

        </div>
      </section>

    </main>
  )
}
