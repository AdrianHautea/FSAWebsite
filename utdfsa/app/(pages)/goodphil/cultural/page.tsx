// ── page.tsx ──────────────────────────────────────────────
// goodphil cultural page — utd pamana dance team profile
//
// notes: fully static; photos:
//        cultural-hero.jpg, cultural-logo.svg, carousel-4.jpg (all in /public);
//        youtube video ids hardcoded in the past-performances
//        section; cta links to @utdpamana on instagram
// ──────────────────────────────────────────────────────────

'use client'

import { useRef } from 'react'
import SmoothImage from '@/components/SmoothImage'
import AnimatedTitle from '@/components/AnimatedTitle'
import BaybayinRule from '@/components/BaybayinRule'
import GoodphilNavRail from '@/components/GoodphilNavRail'
import { useRevealOnScroll, useStaggeredReveal } from '@/lib/useRevealOnScroll'

export default function CulturalPage() {
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

        {/* middle layer: cultural-hero.jpg — full-bleed at all sizes */}
        <div className="absolute inset-0 z-10">
          <SmoothImage
            src="/cultural-hero.jpg"
            alt="UTD Pamana cultural dance team"
            fill
            className="object-cover object-[center_43%]"
            preload
            quality={85}
            sizes="100vw"
          />
        </div>

        {/* dark overlay — mobile only, keeps title readable */}
        <div className="absolute inset-0 bg-black/40 md:hidden z-[2]" />

        {/* Top layer: CULTURAL title + Baybayin, centered over hero photo */}
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
            CULTURAL
          </h1>
        </AnimatedTitle>

      </section>

      {/* ── SECTION 2 — WHAT IS UTD PAMANA? ──────────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">

        {/* heading + Baybayin stay centered, matching the Sports/Spirit/Modern convention */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <h2 className="font-display font-black text-white mb-4" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.01em' }}>
            WHAT IS UTD PAMANA?
          </h2>
          <div ref={baybayinRef} style={{ opacity: baybayinVisible ? 1 : 0, transition: 'opacity 900ms var(--ease-smooth)' }}>
            <BaybayinRule word="ᜃᜓᜎ᜔ᜆᜓᜍ" size="clamp(16px,2vw,27px)" />
          </div>
        </div>

        {/* left-justified paragraph + mini Instagram CTA — replaces the old
            bottom-of-page logo+pill block, moved up beside the copy itself.
            Wide container + a lighter text:photo ratio than a plain 1fr/300px
            split, so the paragraph gets real horizontal room and the photo
            cluster isn't squeezed into a single cramped thumbnail column
            (~20% wider than the previous 6xl/380px pass — less dead gutter
            on wide monitors, more room for the photos to read at size). */}
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
            <span className="font-bold text-white">UTD Pamana</span>
            , the Tagalog word for <span className="font-bold italic text-accent-green">&ldquo;legacy&rdquo; or &ldquo;inheritance,&rdquo;</span> represents the traditions and stories passed down from generation to generation. As UTD FSA&apos;s cultural dance team, Pamana honors Filipino heritage through performances <span className="font-bold text-accent-gold">inspired by the country&rsquo;s rich history, music, and traditions.</span> Every fall, the team spends <span className="font-bold text-white">2–3 months</span> rehearsing before taking the stage at Isang Mahal, where they perform alongside cultural dance teams from Filipino Student Associations across Texas. They also proudly represent UTD FSA at Goodphil, <span className="font-bold text-accent-green">carrying on a legacy</span> that continues to inspire every new generation of dancers.
          </p>

          <div className="flex flex-col items-center lg:items-stretch gap-7 mx-auto lg:mx-0 w-full max-w-[460px]">
            {/* staggered 3-photo collage: one tall portrait on the left, two
                stacked squares on the right offset downward — a considered
                composition instead of a single flat thumbnail */}
            <div className="flex gap-3 w-full">
              {/* tall portrait — outer wrapper stays unclipped so the logo badge
                  can overhang the photo's bottom edge; the image itself is
                  clipped by an inner layer */}
              <div className="relative flex-1 aspect-[3/4]">
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <SmoothImage
                    src="/cult-1.jpg"
                    alt="UTD Pamana performing at Goodphil"
                    fill
                    className="object-cover object-top"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
                {/* Pamana logo badge — overlaps the photo's bottom-left corner, cut out
                    from the section background so it reads as a floating identity stamp */}
                <div className="absolute -bottom-5 left-4 w-14 h-14 rounded-full overflow-hidden border-4 border-section-bg bg-section-bg">
                  <SmoothImage
                    src="/cultural-logo.svg"
                    alt="UTD Pamana logo"
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>
              </div>

              {/* two stacked squares, top-aligned with the portrait */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <SmoothImage
                    src="/cult-2.jpg"
                    alt="UTD Pamana dancer mid-performance"
                    fill
                    className="object-cover object-[center_30%]"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <SmoothImage
                    src="/cult-3.jpg"
                    alt="UTD Pamana group performance at Goodphil"
                    fill
                    className="object-cover object-[center_35%]"
                    quality={95}
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                </div>
              </div>
            </div>

            <a
              href="https://www.instagram.com/utdpamana"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-green text-[#0e0e0e] rounded-full font-sans font-bold text-sm transition-all duration-200 hover:brightness-[1.08]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Follow @utdpamana
            </a>
          </div>
        </div>

      </section>

      {/* ── SECTION 3 — PAST PERFORMANCES ────────────────────────── */}
      <section className="bg-[#2d452c] py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto">

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

          {/* Performance 1 — Goodphil 2026, Austin */}
          <div className="mb-12" ref={(el) => { perfCardRefs.current[0] = el }}>
            <p
              className="font-display text-white text-center mb-4"
              style={{ fontSize: 'clamp(14px, 2vw, 30px)', letterSpacing: '1.5px' }}
            >
              <span className="font-black">GOODPHIL 2026 - </span>
              <span className="font-medium">AUSTIN</span>
            </p>
            <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-3">
              <iframe
                src="https://www.youtube-nocookie.com/embed/q6mxXQuX4ek"
                title="Goodphil 2026 - Austin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-xl"
              />
            </div>
          </div>

          {/* Performance 2 — Goodphil 2025, College Station */}
          <div className="mb-12" ref={(el) => { perfCardRefs.current[1] = el }}>
            <p
              className="font-display text-white text-center mb-4"
              style={{ fontSize: 'clamp(14px, 2vw, 30px)', letterSpacing: '1.5px' }}
            >
              <span className="font-black">GOODPHIL 2025 - </span>
              <span className="font-medium">COLLEGE STATION</span>
            </p>
            <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-3">
              <iframe
                src="https://www.youtube-nocookie.com/embed/ru_9K8ygmRg"
                title="Goodphil 2025 - College Station"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-xl"
              />
            </div>
          </div>

          {/* Performance 3 — Goodphil 2024, Arlington */}
          <div ref={(el) => { perfCardRefs.current[2] = el }}>
            <p
              className="font-display text-white text-center mb-4"
              style={{ fontSize: 'clamp(14px, 2vw, 30px)', letterSpacing: '1.5px' }}
            >
              <span className="font-black">GOODPHIL 2024 - </span>
              <span className="font-medium">ARLINGTON</span>
            </p>
            <div className="bg-[rgba(255,255,255,0.79)] rounded-xl overflow-hidden p-3">
              <iframe
                src="https://www.youtube-nocookie.com/embed/j9v1Lt1-xu4"
                title="Goodphil 2024 - Arlington"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-xl"
              />
            </div>
          </div>

        </div>
      </section>

    </main>
  )
}
