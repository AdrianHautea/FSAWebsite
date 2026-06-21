// ── page.tsx ──────────────────────────────────────────────
// goodphil about page — hero, what-is, participation rules,
// and team-grid linking to spirit/cultural/modern/sports
//
// notes: fully static; all photos served from /public —
//        hero-1-gp.jpg, hero-2-gp.jpg, what-is-gp.jpg,
//        spirit-gp.jpg, cultural-gp.jpg, modern-gp.jpg,
//        sports-gp.jpg
// ──────────────────────────────────────────────────────────

import Image from 'next/image'
import Link from 'next/link'
import AnimatedTitle from '@/components/AnimatedTitle'

export default function GoodphilAboutPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}

      {/* Mobile hero — simplified single-image layout for small screens */}
      <div className="block lg:hidden">
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
          <AnimatedTitle as="h1" animation="slideFromRight" className="absolute bottom-4 left-4 font-display font-black text-5xl text-white leading-none z-10">
            GOODPHIL
          </AnimatedTitle>
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

      {/* Desktop hero — hidden below lg */}
      <section className="hidden lg:block relative w-full overflow-hidden bg-[#1f1f1f] h-[900px]">

        {/* gp-back.png — background layer, left 58%, no padding */}
        <div className="absolute left-0 top-0 h-full z-0" style={{ width: '62%' }}>
          <img
            src="/gp-back.png"
            alt=""
            aria-hidden="true"
            style={{
              width: '120%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'left center',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>

        {/* stacked photos — right side, foreground, overlaps bg pattern on the left */}
        <div
          className="absolute z-10 flex flex-col gap-[30px]"
          style={{
            top: '60px',
            bottom: '128px',
            right: '50px',
            width: '47%',
          }}
        >
          <div className="flex-1 relative overflow-hidden rounded-sm">
            <Image
              src="/hero-1-gp.jpg"
              alt="Goodphil"
              fill
              className="object-cover object-center"
              priority
              quality={85}
              sizes="55vw"
            />
          </div>
          <div className="flex-1 relative overflow-hidden rounded-sm">
            <Image
              src="/hero-2-gp.jpg"
              alt=""
              fill
              className="object-cover object-center"
              priority
              quality={85}
              sizes="55vw"
            />
          </div>
        </div>

        {/* GOODPHIL title — overlaps bottom photo and bg pattern */}
        <AnimatedTitle
          as="h1"
          animation="slideFromRight"
          className="absolute font-display font-black text-white leading-none z-20"
          style={{
            bottom: '90px',
            right: '210px',
            fontSize: 'clamp(60px, 8vw, 120px)',
          }}
        >
          GOODPHIL
        </AnimatedTitle>

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
          <div className="relative z-10 min-h-[420px] md:min-h-[540px]">
            <h2 className="absolute inset-0 font-display font-black text-[clamp(40px,6.5vw,96px)] text-white leading-none">
              <span className="absolute top-8 left-8 md:top-16 md:left-16">WHAT</span>
              <span className="absolute top-1/2 right-8 md:right-16 -translate-y-1/2">IS</span>
              <span className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 w-full px-8 text-center">
                GOODPHIL?
              </span>
            </h2>
          </div>

        </div>

        {/* Body text */}
        <div className="max-w-[1218px] mx-auto px-8 py-16 text-center">

          <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed mb-6">
            Goodphil, also known as the GoodPhil Games, is an intercollegiate four-day competition where Filipino Student Associations across Texas and Oklahoma compete in a variety of sports and performances. The conference celebrates school pride, unity, community, Filipino culture, and unforgettable memories for all participants and spectators!
          </p>

          <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed">
            Goodphil is held annually in the Spring semester, rotating between one of five host schools every year ({' '}
            <span style={{ color: '#0064b1' }}>UTA</span>,{' '}
            <span style={{ color: '#dd4446' }}>TAMU</span>,{' '}
            <span style={{ color: '#d46920' }}>UT</span>,{' '}
            <span style={{ color: '#c34f62' }}>UH</span>,{' '}
            <span style={{ color: '#687eb0' }}>UTSA</span>
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

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed mb-16">
              All Goodphil participants must be members in good standing with the FSA they are affiliated in. In order to assure that participants represent their respective school&rsquo;s organization, certain requirements must be met in order to participate in Goodphil.
            </p>

            {/* Requirements card */}
            <div className="border-2 border-white rounded-[27px] p-8 md:p-12 text-left mx-auto max-w-[695px] mb-16">
              <p className="font-sans font-bold text-[clamp(16px,2vw,29px)] text-white mb-4">
                UTD FSA has the following core requirements:
              </p>
              <ul className="list-disc pl-8 font-sans font-bold text-[clamp(16px,2vw,29px)] text-white space-y-2">
                <li>
                  <Link href="/membership" className="underline">Be a paid member</Link>
                  {' '}of UTD FSA
                </li>
                <li>Earn 6 Goodphil points by attending UTD FSA events</li>
                <li>Attend 3 General Meetings</li>
                <li>Submit all Travel Forms (if you are a currently registered UTD student)</li>
              </ul>
            </div>

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed">
              Unless specifically specified by the host school, spectating Goodphil is free. We encourage all students to come out and support their friends and fellow peers as UTD FSA competes in a multitude of events!
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
          <div className="grid grid-cols-2 gap-6 max-w-[1400px] mx-auto">

            {[
              { name: 'SPIRIT',   photo: '/spirit-gp.jpg',   href: '/goodphil/spirit' },
              { name: 'CULTURAL', photo: '/cultural-gp.jpg', href: '/goodphil/cultural' },
              { name: 'MODERN',   photo: '/modern-goop.jpg',   href: '/goodphil/modern' },
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
                  className="object-cover object-[center_25%]"
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
