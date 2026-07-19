// ── page.tsx ──────────────────────────────────────────────
// goodphil about page — hero, what-is, participation rules,
// and team-grid linking to spirit/cultural/modern/sports
//
// notes: fully static; all photos served from /public —
//        hero-1-gp.jpg, hero-2-gp.jpg, what-is-gp.jpg,
//        spirit-gp.jpg, cultural-gp.jpg, modern-goop.jpg,
//        sports-gp.jpg
// ──────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import SmoothImage from '@/components/SmoothImage'
import Link from 'next/link'
import AnimatedLetters from '@/components/AnimatedLetters'
import GoodphilNavRail from '@/components/GoodphilNavRail'
import HeroWatermark from '@/components/HeroWatermark'
import { useRevealOnScroll } from '@/lib/useRevealOnScroll'

// host-school logo grid data — colors match the hover hex already used on the
// UTA/TAMU/UT/UH/UTSA abbreviation spans in the "rotating between five host
// schools" paragraph, so the logo tiles stay color-consistent with the text above
const HOST_SCHOOLS = [
  { abbr: 'UTA',  name: 'The University of Texas at Arlington',  logo: '/uta-logo.png',  color: '#0064b1' },
  { abbr: 'UTSA', name: 'The University of Texas at San Antonio', logo: '/utsa-logo.png', color: '#687eb0' },
  { abbr: 'UH',   name: 'The University of Houston',              logo: '/uh-logo.png',   color: '#c34f62' },
  { abbr: 'TAMU', name: 'Texas A&M University',                   logo: '/tamu-logo.png', color: '#dd4446' },
  { abbr: 'UT',   name: 'The University of Texas at Austin',      logo: '/ut-logo.png',   color: '#d46920' },
] as const

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function GoodphilAboutPage() {
  // "WHAT IS GOODPHIL?" heading — three words fade in in sequence on scroll
  const headingRef = useRef<HTMLDivElement>(null)
  const headingVisible = useRevealOnScroll(headingRef, 0.3)

  // team grid — staggered fade/slide-up once scrolled into view
  const teamGridRef = useRef<HTMLDivElement>(null)
  const teamGridVisible = useRevealOnScroll(teamGridRef, 0.2)

  // requirements card — fades in and scales up slightly once scrolled into view
  const reqCardRef = useRef<HTMLDivElement>(null)
  const reqCardVisible = useRevealOnScroll(reqCardRef, 0.25)

  // host-school logo grid — staggered fade/slide-up once scrolled into view
  const hostSchoolsRef = useRef<HTMLDivElement>(null)
  const hostSchoolsVisible = useRevealOnScroll(hostSchoolsRef, 0.2)

  // "Filipino Student Associations..." clause — green highlight sweeps in behind the text on scroll
  const highlightRef = useRef<HTMLSpanElement>(null)
  const [highlightVisible, setHighlightVisible] = useState(false)

  useEffect(() => {
    const el = highlightRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setHighlightVisible(true)
      observer.disconnect()
    }, { threshold: 0.6 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="bg-section-bg text-white overflow-x-clip">
      <GoodphilNavRail />

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}

      {/* Mobile/compact hero — simplified single-image layout. Covers everything
          below xl (not just lg) since the watermark hero below is only pixel-
          accurate at >=1280px per the design handoff; below that this one is
          the more correct layout, not a compromise. */}
      <div className="block xl:hidden">
        <div className="relative w-full h-[50vh] overflow-hidden bg-[#1f1f1f]">
          <SmoothImage
            src="/hero-2-gp.jpg"
            alt="Goodphil"
            fill
            className="object-cover object-center"
            preload
            quality={85}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/30" />
          <AnimatedLetters as="h1" text="GOODPHIL" className="absolute bottom-4 left-4 font-display font-black text-5xl text-white leading-none z-10" />
        </div>
        <div className="bg-brand-bg h-[56px] flex items-center overflow-hidden">
          <div className="flex gap-8 whitespace-nowrap w-max animate-marquee" style={{ animationDuration: '78s' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="font-display font-bold text-[18px] text-white shrink-0">
                THE INTERCOLLEGIATE COMPETITION OF THE YEAR.
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop hero — hidden below xl. Watermark hero design
          (design_handoff_hero_sections/goodphil-hero.html): drifting "GOODPHIL"
          watermark + vignette replaces the old gp-back.png pattern layer; photos
          and title stay the same live assets, repositioned to the new spec.
          Fixed pixel values throughout (no clamp/vw/vh) — safe because this only
          ever renders at >=1280px (xl:), matching the handoff's own fidelity
          boundary and its 660px-tall reference container (adapted from its 100svh
          model since this page's navbar sits in normal flow above the hero, not
          overlaid). Marquee ticker below is real content (not part of the
          handoff) — kept as-is; the title block's fixed 96px bottom offset
          already clears its 68px height with a 28px margin. */}
      <section className="hidden xl:block relative w-full overflow-hidden bg-[#0b0b0b] h-[660px]">

        <HeroWatermark word="GOODPHIL" vignetteOrigin="58% 46%" topBleedRow />

        {/* stacked hero-1-gp.jpg / hero-2-gp.jpg — right-anchored photo pair */}
        <div
          className="absolute z-10 flex flex-col"
          style={{ right: '76px', top: '78px', width: '600px', gap: '16px' }}
        >
          <div
            className="relative overflow-hidden rounded-[6px]"
            style={{
              height: '212px',
              boxShadow: '0 26px 70px rgba(0,0,0,0.6)',
              animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 720ms both',
            }}
          >
            <SmoothImage
              src="/hero-1-gp.jpg"
              alt="Goodphil"
              fill
              className="object-cover object-center"
              preload
              quality={85}
              sizes="600px"
            />
          </div>
          <div
            className="relative overflow-hidden rounded-[6px]"
            style={{
              height: '212px',
              boxShadow: '0 26px 70px rgba(0,0,0,0.6)',
              animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 880ms both',
            }}
          >
            <SmoothImage
              src="/hero-2-gp.jpg"
              alt=""
              fill
              className="object-cover object-center"
              preload
              quality={85}
              sizes="600px"
            />
          </div>
        </div>

        {/* GOODPHIL title + tagline — left-aligned; 96px bottom offset clears
            the 68px marquee bar below with a 28px margin */}
        <div
          className="absolute z-20 flex flex-col items-start"
          style={{ left: '76px', bottom: '96px', gap: '14px' }}
        >
          <AnimatedLetters
            as="h1"
            text="GOODPHIL"
            className="font-display font-black text-white leading-none"
            style={{ fontSize: '104px', letterSpacing: '-0.02em', lineHeight: 0.98 }}
          />
          <span
            className="font-sans font-semibold uppercase"
            style={{ fontSize: '16px', letterSpacing: '0.14em', color: '#9a9a9a' }}
          >
            The biggest Filipino intercollegiate event in the South
          </span>
        </div>

        {/* Autoscroll marquee bar — pinned to the very bottom of the hero */}
        <div className="absolute bottom-0 left-0 right-0 bg-brand-bg h-[68px] z-30 flex items-center overflow-hidden">
          <div className="flex gap-8 whitespace-nowrap w-max animate-marquee" style={{ animationDuration: '78s' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="font-display font-bold text-[clamp(22px,3.5vw,52px)] text-white shrink-0"
              >
                THE INTERCOLLEGIATE COMPETITION OF THE YEAR.
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* ── SECTION 2 — WHAT IS GOODPHIL? ────────────────────────── */}
      <section className="bg-section-bg">

        {/* Photo with staggered "WHAT IS GOODPHIL?" heading overlaid */}
        <div className="relative min-h-[420px] md:min-h-[540px] w-full overflow-hidden">

          {/* Background photo + overlay */}
          <div className="absolute inset-0">
            <SmoothImage
              src="/what-is-gp.jpg"
              alt="Goodphil competition"
              fill
              className="object-cover object-center"
              sizes="100vw"
              quality={85}
              preload
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Staggered heading overlaid on the photo — matches Figma's 4-line layout;
              the three words also fade in in sequence (WHAT → IS → GOODPHIL?) on scroll */}
          <div ref={headingRef} className="relative z-10 min-h-[420px] md:min-h-[540px]">
            <h2 className="absolute inset-0 font-display font-black text-[clamp(40px,6.5vw,96px)] text-white leading-none">
              <span
                className="absolute top-8 left-8 md:top-16 md:left-16"
                style={{
                  opacity: headingVisible ? 1 : 0,
                  transition: 'opacity 1641ms var(--ease-smooth)',
                }}
              >
                WHAT
              </span>
              <span
                className="absolute top-1/2 right-8 md:right-16 -translate-y-1/2"
                style={{
                  opacity: headingVisible ? 1 : 0,
                  transition: 'opacity 1641ms var(--ease-smooth)',
                  transitionDelay: headingVisible ? '422ms' : '0ms',
                }}
              >
                IS
              </span>
              <span
                className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 w-full px-8 text-center"
                style={{
                  opacity: headingVisible ? 1 : 0,
                  transition: 'opacity 1641ms var(--ease-smooth)',
                  transitionDelay: headingVisible ? '845ms' : '0ms',
                }}
              >
                GOODPHIL?
              </span>
            </h2>
          </div>

        </div>

        {/* Body text */}
        <div className="max-w-[1218px] mx-auto px-8 py-16 text-center">

          <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed mb-6">
            <span className="font-bold text-white">GoodPhil</span>, also known as the GoodPhil Games, brings Filipino Student Associations{' '}
            <span
              ref={highlightRef}
              className="relative z-0 inline-block font-bold text-white"
              style={{ paddingInline: '0.22em', marginInline: '-0.22em' }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '-0.06em 0',
                  zIndex: -1,
                  borderRadius: '4px',
                  background: 'rgba(117,186,120,0.32)',
                  transformOrigin: 'left center',
                  transform: highlightVisible ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  transitionDelay: highlightVisible ? '300ms' : '0ms',
                }}
              />
              from across Texas and Oklahoma
            </span>
            {' '}together for <span className="font-bold text-accent-gold">four days of sports, performances, friendly competition, and guest performances!</span> Every
            school spends months preparing for this weekend, <span className="font-bold text-accent-green">creating traditions, strengthening friendships, and building school pride</span>{' '}
            before finally coming together to <span className="font-bold text-white">compete, cheer each other on, and celebrate as one FSA community.</span>
          </p>

          <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed">
            Goodphil is held annually during the Spring, rotating between five host schools:
          </p>

          {/* Host-school logo grid — 3-2 layout. Each tile is tinted to that
              school's signature color (same hexes as the hover states above),
              composited over the section's dark background rather than a
              painted-in base — the low tint keeps UT's thin line-art and TAMU's
              maroon legible while the border carries the color identity. */}
          <div
            ref={hostSchoolsRef}
            className="max-w-[650px] mx-auto mt-12 flex flex-wrap justify-center gap-6"
          >
            {HOST_SCHOOLS.map((school, i) => (
              <div
                key={school.abbr}
                style={{
                  transform: hostSchoolsVisible ? 'translateY(0)' : 'translateY(16px)',
                  opacity: hostSchoolsVisible ? 1 : 0,
                  transition: `transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms, opacity 600ms ease-out ${i * 80}ms`,
                }}
                className="w-[calc(50%-12px)] md:w-[190px]"
              >
                <div
                  style={{
                    backgroundColor: hexToRgba(school.color, 0.12),
                    borderColor: hexToRgba(school.color, 0.35),
                    '--host-border-hover': hexToRgba(school.color, 0.7),
                  } as CSSProperties}
                  className="h-full rounded-2xl border p-5 flex flex-col items-center gap-3 transition-all duration-300 ease-out hover:scale-[1.03] hover:[border-color:var(--host-border-hover)]"
                >
                  <div className="relative w-full h-[88px]">
                    <Image
                      src={school.logo}
                      alt={`${school.abbr} FSA logo`}
                      fill
                      className="object-contain"
                      sizes="190px"
                    />
                  </div>
                  <p className="font-sans text-[13px] font-semibold text-white/70 text-center leading-snug text-balance">
                    {school.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ── SECTION 3 — HOW CAN I PARTICIPATE? ───────────────────── */}
      <section>

        {/* Section heading bar */}
        <div className="bg-brand-bg py-8 px-4">
          <h2 className="font-display font-black text-[clamp(22px,4vw,64px)] text-white text-center whitespace-nowrap">
            HOW CAN I PARTICIPATE?
          </h2>
        </div>

        <div className="bg-section-bg">
          <div className="max-w-[1218px] mx-auto px-8 py-16 text-center">

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed mb-16">
              All Goodphil participants must be <span className="font-bold text-accent-green">members in good standing </span> with the FSA they are affiliated in. In order to assure that participants represent their respective school&rsquo;s organization, certain requirements must be met in order to participate in Goodphil.
            </p>

            {/* Requirements card — fades in and scales up slightly once scrolled into view */}
            <div
              ref={reqCardRef}
              className="border-2 border-white rounded-[27px] p-8 md:p-14 text-left mx-auto max-w-[695px] mb-16"
              style={{
                transform: reqCardVisible ? 'scale(1.02)' : 'scale(0.96)',
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white mb-6">
                UTD FSA has the following core requirements:
              </p>
              <ul className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white space-y-5">
                <li className="flex items-start gap-3">
                  <span className="text-accent-green shrink-0">&#10003;</span>
                  <span>
                    <Link href="/membership" className="underline">Be a paid member</Link>
                    {' '}of UTD FSA
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent-green shrink-0">&#10003;</span>
                  <span>
                    Earn <span className="font-bold text-accent-green">6 Goodphil points</span> by attending UTD FSA events
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent-green shrink-0">&#10003;</span>
                  <span>
                    Attend <span className="font-bold text-accent-green">3 General Meetings</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent-green shrink-0">&#10003;</span>
                  <span>
                    Submit all Travel Forms (if you are a currently registered UTD student)
                  </span>
                </li>
              </ul>
            </div>

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed">
              Unless specifically specified by the host school, spectating Goodphil <span className="font-bold text-accent-green">is free!</span> Come out and support UTD FSA as we compete across <span className="font-bold text-white">sports, spirit, modern, and cultural events!</span>
            </p>

          </div>
        </div>

      </section>

      {/* ── SECTION 4 — ALL COMPETING GOODPHIL TEAMS ─────────────── */}
      <section>

        {/* Section heading bar */}
        <div className="bg-brand-bg py-8 px-4 flex justify-center">
          <h2 className="w-full mx-auto font-display font-black text-[clamp(14px,4.2vw,64px)] text-white text-center md:whitespace-nowrap">
            ALL COMPETING GOODPHIL TEAMS
          </h2>
        </div>

        <div className="bg-section-bg px-8 py-12">
          <div ref={teamGridRef} className="grid grid-cols-2 gap-6 max-w-[1400px] mx-auto">

            {[
              { name: 'SPIRIT',   photo: '/spirit-gp.jpg',   href: '/goodphil/spirit' },
              { name: 'CULTURAL', photo: '/cultural-gp.jpg', href: '/goodphil/cultural' },
              { name: 'MODERN',   photo: '/modern-goop.jpg',   href: '/goodphil/modern' },
              { name: 'SPORTS',   photo: '/sports-gp.jpg',   href: '/goodphil/sports' },
            ].map(({ name, photo, href }, i) => (
              <div
                key={name}
                style={{
                  transform: teamGridVisible ? 'translateY(0)' : 'translateY(16px)',
                  opacity: teamGridVisible ? 1 : 0,
                  transition: `transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms, opacity 600ms ease-out ${i * 100}ms`,
                }}
              >
                <Link
                  href={href}
                  className="relative h-32 sm:h-48 lg:h-56 rounded-xl overflow-hidden block hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
                >
                  <SmoothImage
                    src={photo}
                    alt={name}
                    fill
                    className="object-cover object-[center_25%]"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 700px"
                    quality={85}
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <span className="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(20px,4vw,64px)] text-white text-center leading-none">
                    {name}
                  </span>
                </Link>
              </div>
            ))}

          </div>
        </div>

      </section>

    </main>
  )
}
