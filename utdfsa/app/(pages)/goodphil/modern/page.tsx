// ── page.tsx ──────────────────────────────────────────────
// goodphil modern page — utd maharlika dance team profile
//
// notes: fully static; photos:
//        modern-hero.jpg, modern-logo.svg, mod-1/2/3.jpg (all in /public);
//        youtube video ids hardcoded in the past-performances
//        section; cta links to @utdmaharlika on instagram
// ──────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef, useState } from 'react'
import SmoothImage from '@/components/SmoothImage'
import AnimatedTitle from '@/components/AnimatedTitle'
import BaybayinRule from '@/components/BaybayinRule'
import GoodphilNavRail from '@/components/GoodphilNavRail'
import { useRevealOnScroll, useStaggeredReveal } from '@/lib/useRevealOnScroll'

export default function ModernPage() {
  // Right-column reveal (photo collage + logo badge + Instagram CTA pill) —
  // ref sits on that column itself, not the whole Section-2 <section>. The
  // section also contains the heading + long paragraph, so on mobile's short
  // hero (h-[40vh]) a big chunk of that tall section is already on screen at
  // load, tripping the 30%-of-element threshold before the user scrolls —
  // even though the photo group is still stacked below the fold. Targeting
  // the column directly means it only reveals once it's actually in view.
  const headingRef = useRef<HTMLDivElement>(null)
  const headingVisible = useRevealOnScroll(headingRef, 0.3)

  // title (h2) + Baybayin fire on page load instead of on scroll — only the
  // paragraph/photos/CTA below stay scroll-triggered via headingVisible
  const [titleVisible, setTitleVisible] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setTitleVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // "noble warrior class" — color eases from white to green as it enters the viewport
  const nobleRef = useRef<HTMLSpanElement>(null)
  const nobleVisible = useRevealOnScroll(nobleRef, 0.6)

  // past-performances video vault — each card animates independently as it individually
  // scrolls into view (mirrors the officer board card pattern in AboutClient.tsx),
  // now with the shared never-blank + reduced-motion guard
  // recruitment CTA — own scroll trigger since it sits below the Section-2
  // fold; heading/subtext/button stagger in on the same reveal like the
  // Instagram CTA pill above it
  const ctaRef = useRef<HTMLDivElement>(null)
  const ctaVisible = useRevealOnScroll(ctaRef, 0.3)

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

        {/* full-bleed hero photo */}
        <div className="absolute inset-0 z-10">
          <SmoothImage
            src="/modern-hero.jpg"
            alt="UTD Maharlika modern dance team"
            fill
            className="object-cover object-center"
            preload
            quality={85}
            sizes="100vw"
          />
        </div>

        {/* dark overlay — mobile only, keeps title readable */}
        <div className="absolute inset-0 bg-black/40 md:hidden z-[2]" />

        {/* Top layer: MODERN title + Baybayin, centered over hero photo */}
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
            MODERN
          </h1>
        </AnimatedTitle>

      </section>

      {/* ── SECTION 2 — WHAT IS UTD MAHARLIKA? ──────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">

        {/* heading + Baybayin stay centered, matching the Cultural page convention */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <h2
            className="font-display font-black text-white mb-4"
            style={{
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              letterSpacing: '-0.01em',
              opacity: titleVisible ? 1 : 0,
              transform: titleVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth)',
            }}
          >
            WHAT IS UTD MAHARLIKA?
          </h2>
          <div style={{ opacity: titleVisible ? 1 : 0, transition: 'opacity 900ms var(--ease-smooth)', transitionDelay: titleVisible ? '160ms' : '0ms' }}>
            <BaybayinRule word="ᜋᜓᜇᜒᜍ᜔ᜈ᜔" size="clamp(16px,2vw,27px)" />
          </div>
        </div>

        {/* left-justified paragraph + mini Instagram CTA — same pattern as the
            Cultural page: wide container, staggered 3-photo collage + logo
            badge sitting beside the copy instead of a separate bottom block */}
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_460px] gap-10 lg:gap-16 items-start">
          <p
            className="font-sans leading-relaxed text-white/60 text-left"
            style={{
              fontSize: 'clamp(16px, 1.9vw, 29px)',
              opacity: titleVisible ? 1 : 0,
              transform: titleVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth)',
              transitionDelay: titleVisible ? '510ms' : '0ms',
            }}
          >
            <span className="font-bold text-white">UTD Maharlika</span>
            {' '}comes from the Tagalog word referring to the{' '}
            <span
              ref={nobleRef}
              className="font-bold"
              style={{ color: nobleVisible ? 'var(--accent-green)' : '#fff', transition: 'color 900ms var(--ease-smooth)' }}
            >
              noble warrior class
            </span>
            {' '}of pre-colonial Philippines—a name that reflects confidence, strength, and pride. Established in 2002, UTD FSA&apos;s modern dance team brings those qualities to life through <span className="font-bold text-accent-gold">hip hop and a variety of contemporary dance styles.</span> Each fall, the team dedicates <span className="font-bold text-white">2–3 months</span> of intense rehearsals in preparation for Isang Mahal, where they perform alongside modern dance teams from Filipino Student Associations across Texas, before taking that same passion to the Goodphil stage. Beyond the performances, Maharlika is built on <span className="font-bold text-accent-green">teamwork, resilience, and the friendships formed</span> through every late-night practice.
          </p>

          <div ref={headingRef} className="flex flex-col items-center lg:items-stretch gap-7 mx-auto lg:mx-0 w-full max-w-[460px]">
            {/* staggered 3-photo collage: one tall portrait on the left, two
                stacked squares on the right, top-aligned */}
            <div className="flex gap-3 w-full">
              {/* tall portrait — outer wrapper stays unclipped so the logo badge
                  can overhang the photo's bottom edge; the image itself is
                  clipped by an inner layer */}
              <div className="relative flex-1 aspect-[3/4]">
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                  style={{
                    clipPath: headingVisible ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                    transition: 'clip-path 700ms var(--ease-smooth)',
                    transitionDelay: headingVisible ? '320ms' : '0ms',
                  }}
                >
                  <SmoothImage
                    src="/mod-1.jpg"
                    alt="UTD Maharlika performing at Goodphil"
                    fill
                    className="object-cover object-top"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
                {/* Maharlika logo badge — overlaps the photo's bottom-left corner, cut out
                    from the section background so it reads as a floating identity stamp;
                    stamps in just after the photo above finishes unraveling (320ms delay
                    + 700ms duration = settles ~1020ms) */}
                <div
                  className="absolute -bottom-5 left-4 w-14 h-14 rounded-full overflow-hidden border-4 border-section-bg bg-section-bg"
                  style={{
                    opacity: headingVisible ? 1 : 0,
                    transform: headingVisible ? 'scale(1)' : 'scale(0.6)',
                    transition: 'opacity 500ms var(--ease-smooth), transform 500ms var(--ease-smooth)',
                    transitionDelay: headingVisible ? '1120ms' : '0ms',
                  }}
                >
                  <SmoothImage
                    src="/modern-logo.svg"
                    alt="UTD Maharlika logo"
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>
              </div>

              {/* two stacked squares, top-aligned with the portrait */}
              <div className="flex-1 flex flex-col gap-3">
                <div
                  className="relative aspect-square rounded-2xl overflow-hidden"
                  style={{
                    clipPath: headingVisible ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                    transition: 'clip-path 700ms var(--ease-smooth)',
                    transitionDelay: headingVisible ? '320ms' : '0ms',
                  }}
                >
                  <SmoothImage
                    src="/mod-2.jpg"
                    alt="UTD Maharlika dancer mid-performance"
                    fill
                    className="object-cover object-[center_30%]"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
                <div
                  className="relative aspect-square rounded-2xl overflow-hidden"
                  style={{
                    clipPath: headingVisible ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                    transition: 'clip-path 700ms var(--ease-smooth)',
                    transitionDelay: headingVisible ? '320ms' : '0ms',
                  }}
                >
                  <SmoothImage
                    src="/mod-3.jpg"
                    alt="UTD Maharlika group performance at Goodphil"
                    fill
                    className="object-cover object-[center_35%]"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
              </div>
            </div>

            <a
              href="https://www.instagram.com/utdmaharlika"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-green text-[#0e0e0e] rounded-full font-sans font-bold text-sm transition-all duration-200 hover:brightness-[1.08]"
              style={{
                opacity: headingVisible ? 1 : 0,
                transform: headingVisible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth), filter 200ms, background-color 200ms',
                transitionDelay: headingVisible ? '480ms' : '0ms',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Follow @utdmaharlika
            </a>
          </div>
        </div>

      </section>

      {/* ── SECTION 2.5 — RECRUITMENT CTA ────────────────────────── */}
      {/* stepped one tone above section-bg (raised black) so it reads as its
          own beat before dropping into the green Past Performances block;
          single focused action, no photos/Baybayin — this section's job is
          the ask, not the story */}
      <section className="bg-surface-raised py-16 px-6 md:px-8">
        <div ref={ctaRef} className="max-w-2xl mx-auto text-center">
          <h2
            className="font-display font-black text-white mb-4"
            style={{
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              letterSpacing: '-0.01em',
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth)',
            }}
          >
            Ready to Dance With Us?
          </h2>
          <p
            className="font-sans leading-relaxed text-white/60 mx-auto mb-8"
            style={{
              fontSize: 'clamp(16px, 1.5vw, 19px)',
              maxWidth: '52ch',
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth)',
              transitionDelay: ctaVisible ? '140ms' : '0ms',
            }}
          >
            Whether you&apos;re an experienced dancer or trying something new, Maharlika welcomes members who are ready to grow, perform, and discover what they&apos;re capable of.
          </p>
          <a
            href="https://forms.gle/adY8cCiyYHcLSmgz8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent-green text-[#0e0e0e] rounded-full font-sans font-bold text-base transition-all duration-200 hover:brightness-[1.08]"
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 700ms var(--ease-smooth), transform 700ms var(--ease-smooth), filter 200ms, background-color 200ms',
              transitionDelay: ctaVisible ? '280ms' : '0ms',
            }}
          >
            Join Maharlika
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>
      </section>

      {/* ── SECTION 3 — PAST PERFORMANCES ────────────────────────── */}
      {/* Goodphil group (featured + 2-col secondary row for older years) followed
          by the Isang Mahal group (2-col row, most-recent-first); each card is
          video + optional placement badge — containers/behavior match across groups */}
      <section className="bg-[#2d452c] py-16 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">

          <h2
            className="font-display font-black text-white text-center w-full block mb-14"
            style={{
              fontSize: 'clamp(30px, 4.3vw, 65px)',
              letterSpacing: '3.25px',
              paddingLeft: '3.25px',
              textShadow: '0px 9.6px 4px rgba(180,180,180,0.26)',
            }}
          >
            PAST PERFORMANCES
          </h2>

          {/* Group divider — GOODPHIL */}
          <div className="flex items-center gap-4 max-w-3xl mx-auto mb-10">
            <div className="h-px flex-1 bg-white/15" />
            <span
              className="font-display font-black text-white/90 uppercase"
              style={{ fontSize: 'clamp(18px, 2.4vw, 30px)', letterSpacing: '0.14em' }}
            >
              Goodphil
            </span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {/* Featured — Goodphil 2026, Austin (most recent year) */}
          <div className="mb-14" ref={(el) => { perfCardRefs.current[0] = el }}>
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
                  src="https://www.youtube-nocookie.com/embed/Xj-rTIWYX3U"
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.16] font-display font-bold text-[10px] uppercase tracking-[0.1em] text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  3rd Place
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
                  src="https://www.youtube-nocookie.com/embed/ngXiLlF_lYY?start=127"
                  title="Goodphil 2025 - College Station"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video rounded-xl"
                />
              </div>
            </div>

            {/* Performance — Goodphil 2024, Arlington */}
            <div ref={(el) => { perfCardRefs.current[2] = el }}>
              {/* invisible placeholder — reserves the same height as the 2025 card's
                  placement badge so both cards' video/photo/caption stay row-aligned;
                  swap for a real badge if 2024's placement result is ever supplied */}
              <div className="flex justify-center mb-2">
                <span className="invisible inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-transparent font-display font-bold text-[10px] uppercase tracking-[0.1em]">
                  <span className="w-1.5 h-1.5 rounded-full" />
                  placeholder
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
                  src="https://www.youtube-nocookie.com/embed/OM55XxSDYew"
                  title="Goodphil 2024 - Arlington"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video rounded-xl"
                />
              </div>
            </div>

          </div>

          {/* Group divider — ISANG MAHAL */}
          <div className="flex items-center gap-4 max-w-3xl mx-auto mt-16 mb-10">
            <div className="h-px flex-1 bg-white/15" />
            <span
              className="font-display font-black text-white/90 uppercase"
              style={{ fontSize: 'clamp(18px, 2.4vw, 30px)', letterSpacing: '0.14em' }}
            >
              Isang Mahal
            </span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <div className="grid sm:grid-cols-2 gap-8">

            {/* Performance — Isang Mahal 2024, College Station (no placement) */}
            <div ref={(el) => { perfCardRefs.current[3] = el }}>
              <p
                className="font-display text-white text-center mb-3"
                style={{ fontSize: 'clamp(13px, 1.6vw, 20px)', letterSpacing: '1px' }}
              >
                <span className="font-black">ISANG MAHAL 2024 - </span>
                <span className="font-medium">COLLEGE STATION</span>
              </p>
              <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-2.5 mb-4">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/gVq9zsGRIgY"
                  title="Isang Mahal 2024 - College Station"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video rounded-xl"
                />
              </div>
            </div>

            {/* Performance — Isang Mahal 2023, College Station (no placement) */}
            <div ref={(el) => { perfCardRefs.current[4] = el }}>
              <p
                className="font-display text-white text-center mb-3"
                style={{ fontSize: 'clamp(13px, 1.6vw, 20px)', letterSpacing: '1px' }}
              >
                <span className="font-black">ISANG MAHAL 2023 - </span>
                <span className="font-medium">COLLEGE STATION</span>
              </p>
              <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-2.5 mb-4">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/0P2wnd3Ncnk"
                  title="Isang Mahal 2023 - College Station"
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
              href="https://www.instagram.com/utdmaharlika"
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
