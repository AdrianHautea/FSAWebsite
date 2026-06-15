// ============================================================
// UI — this page is fully static, safe to restyle everything
// no data fetching or auth logic present
// photos are in public/ — filenames listed at top of file
//
// PHOTOS:
//   /hero-1-gp.jpg       — hero full-bleed background
//   /hero-2-gp.jpg       — hero second layered image (right side)
//   /what-is-gp.jpg      — "What Is Goodphil?" section
//   /spirit-gp.jpg       — Spirit team card
//   /cultural-gp.jpg     — Cultural team card
//   /modern-gp.jpg       — Modern team card
//   /sports-gp.jpg       — Sports team card
// ============================================================

import Image from 'next/image'
import Link from 'next/link'

export default function GoodphilAboutPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}

      {/* Mobile hero — simplified single-image layout for small screens */}
      <div className="block md:hidden">
        <div className="relative w-full h-[50vh] overflow-hidden bg-[#1f1f1f]">
          <Image
            src="/hero-2-gp.jpg"
            alt="Goodphil"
            fill
            className="object-cover object-center"
            priority
            quality={85}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/30" />
          <h1 className="absolute bottom-4 left-4 font-display font-black text-5xl text-white leading-none z-10">
            GOODPHIL
          </h1>
        </div>
        <div className="bg-brand-bg h-[56px] flex items-center overflow-hidden">
          <div className="flex gap-8 whitespace-nowrap w-max animate-marquee">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="font-display font-bold text-[18px] text-white shrink-0">
                THE INTERCOLLEGIATE COMPETITION OF THE YEAR.
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop hero — flex layout, hidden on mobile */}
      <section className="hidden md:block relative w-full overflow-hidden bg-[#1f1f1f] h-[1040px]">

        {/* Inner flex row: gp-back.png watermark left, stacked photos right */}
        <div className="flex flex-row h-full w-full">

          {/* Left child: gp-back.png — same visible width as original (50% of hero) */}
          <div className="relative h-full overflow-hidden flex-shrink-0" style={{ flexBasis: '50%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gp-back.png"
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: 'auto',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </div>

          {/* Right child: two photos stacked — padding replicates original vertical centering */}
          <div
            className="flex-1 flex flex-col h-full gap-[30px]"
            style={{ paddingTop: '215px', paddingBottom: '215px', paddingRight: '50px' }}
          >
            <div className="flex-1 relative overflow-hidden">
              <Image
                src="/hero-1-gp.jpg"
                alt="Goodphil"
                fill
                className="object-cover object-center"
                priority
                quality={85}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="flex-1 relative overflow-hidden">
              <Image
                src="/hero-2-gp.jpg"
                alt=""
                fill
                className="object-cover object-center"
                priority
                quality={85}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

        </div>

        {/* GOODPHIL title — overlaps bottom edge of second photo, 80px from right */}
        <h1
          className="absolute font-display font-black text-9xl text-white leading-none text-right"
          style={{
            top: '82%',
            transform: 'translateY(-50%)',
            right: '80px',
            zIndex: 10,
          }}
        >
          GOODPHIL
        </h1>

        {/* Autoscroll marquee bar — pinned to the very bottom of the hero */}
        <div className="absolute bottom-0 left-0 right-0 bg-brand-bg h-[68px] z-30 flex items-center overflow-hidden">
          <div className="flex gap-8 whitespace-nowrap w-max animate-marquee">
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
            <Image
              src="/what-is-gp.jpg"
              alt="Goodphil competition"
              fill
              className="object-cover object-center"
              sizes="100vw"
              quality={85}
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Staggered heading overlaid on the photo — matches Figma's 4-line layout */}
          <div className="relative z-10 px-8 md:px-16 py-12 md:py-20">
            <h2 className="font-display font-black text-[clamp(40px,6.5vw,96px)] text-white leading-none">
              <span className="block">WHAT</span>
              <span className="block text-right pr-4 md:pr-16">IS</span>
              <span className="block">&nbsp;</span>
              <span className="block pl-[8%] md:pl-[12%]">GOODPHIL?</span>
            </h2>
          </div>

        </div>

        {/* Body text */}
        <div className="max-w-[1218px] mx-auto px-8 py-16 text-center">

          {/* Vertical decorative divider — separator between photo/heading and text */}
          <div className="w-px h-24 bg-white/50 mx-auto mb-8" />

          <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white leading-relaxed mb-6">
            Goodphil, also known as the GoodPhil Games, is an intercollegiate four-day competition where Filipino Student Associations across Texas and Oklahoma compete in a variety of sports and performances. The conference celebrates school pride, unity, community, Filipino culture, and unforgettable memories for all participants and spectators!
          </p>

          <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white leading-relaxed">
            Goodphil is held annually in the Spring semester, rotating between one of five host schools every year ({' '}
            <span style={{ color: '#d46920' }}>UT</span>,{' '}
            <span style={{ color: '#dd4446' }}>TAMU</span>,{' '}
            <span style={{ color: '#d46920' }}>UTA</span>,{' '}
            <span style={{ color: '#75ba78' }}>UTD</span>,{' '}
            <span style={{ color: '#687eb1' }}>UTSA</span>
            ).
          </p>
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

            <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white leading-relaxed mb-16">
              All Goodphil participants must be members in good standing with the FSA they are affiliated in. In order to assure that participants represent their respective school&rsquo;s organization, certain requirements must be met in order to participate in Goodphil.
            </p>

            {/* Requirements card */}
            <div className="border-2 border-white rounded-[27px] p-8 md:p-12 text-left mx-auto max-w-[695px] mb-16">
              <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white mb-4">
                UTD FSA has the following core requirements:
              </p>
              <ul className="list-disc pl-8 font-sans font-bold text-[clamp(16px,2vw,29px)] text-white space-y-2">
                <li>
                  <Link href="/login" className="underline">Be a paid member</Link>
                  {' '}of UTD FSA
                </li>
                <li>Earn 6 Goodphil points by attending UTD FSA events</li>
                <li>Attend 3 General Meetings</li>
                <li>Submit all Travel Forms (if you are a currently registered UTD student)</li>
              </ul>
            </div>

            <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white leading-relaxed">
              Unless specifically specified by the host school, spectating Goodphil is free. We encourage all students to come out and support their friends and fellow peers as UTD FSA competes in a multitude of events!
            </p>

          </div>
        </div>

      </section>

      {/* ── SECTION 4 — ALL COMPETING GOODPHIL TEAMS ─────────────── */}
      <section>

        {/* Section heading bar */}
        <div className="bg-brand-bg py-8 px-4">
          <h2 className="font-display font-black text-[clamp(14px,4.2vw,64px)] text-white text-center whitespace-nowrap">
            ALL COMPETING GOODPHIL TEAMS
          </h2>
        </div>

        <div className="bg-section-bg px-8 py-12">
          <div className="grid grid-cols-2 gap-6 max-w-[1400px] mx-auto">

            {[
              { name: 'SPIRIT',   photo: '/spirit-gp.jpg',   href: '/goodphil/spirit' },
              { name: 'CULTURAL', photo: '/cultural-gp.jpg', href: '/goodphil/cultural' },
              { name: 'MODERN',   photo: '/modern-gp.jpg',   href: '/goodphil/modern' },
              { name: 'SPORTS',   photo: '/sports-gp.jpg',   href: '/goodphil/sports' },
            ].map(({ name, photo, href }) => (
              <Link
                key={name}
                href={href}
                className="relative h-32 sm:h-48 lg:h-56 rounded-xl overflow-hidden block hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
              >
                <Image
                  src={photo}
                  alt={name}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 700px"
                  quality={85}
                />
                <div className="absolute inset-0 bg-black/40" />
                <span className="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(20px,4vw,64px)] text-white text-center leading-none">
                  {name}
                </span>
              </Link>
            ))}

          </div>
        </div>

      </section>

    </main>
  )
}
