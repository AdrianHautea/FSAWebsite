// ── page.tsx ──────────────────────────────────────────────
// goodphil cultural page — utd pamana dance team profile
//
// notes: fully static; photos:
//        cultural-hero.jpg, cultural-logo.svg (all in /public);
//        youtube video ids hardcoded in the past-performances
//        section; cta links to @utdpamana on instagram
// ──────────────────────────────────────────────────────────

import SmoothImage from '@/components/SmoothImage'
import AnimatedTitle from '@/components/AnimatedTitle'

export default function CulturalPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

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
            quality={80}
            sizes="100vw"
          />
        </div>

        {/* dark overlay — mobile only, keeps title readable */}
        <div className="absolute inset-0 bg-black/40 md:hidden z-[2]" />

        {/* Top layer: CULTURAL title centered over hero photo */}
        <AnimatedTitle
          as="h1"
          animation="fadeIn"
          className="absolute z-30 w-full text-center font-display font-black text-white leading-none select-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(48px, 8.5vw, 128px)',
            textShadow: '0px 4px 28px rgba(0,0,0,0.72), 0px 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          CULTURAL
        </AnimatedTitle>

      </section>

      {/* ── SECTION 2 — WHAT IS UTD PAMANA? ──────────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-white mb-8" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
            WHAT IS UTD PAMANA?
          </h2>
          <p className="font-sans leading-relaxed text-white/60" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)' }}>
            <span className="font-bold text-[#75ba78]">UTD Pamana</span>
            {' '}is UTD FSA&apos;s official cultural dance team! This team competes at Isang Mahal and Goodphil. Pamana celebrates Filipino heritage through storytelling and powerful traditional-inspired performances.
          </p>
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
          <div className="mb-12">
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
          <div className="mb-12">
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
          <div>
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

      {/* ── SECTION 4 — INTERESTED IN JOINING? ───────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">
        <div className="flex flex-col items-center gap-8 max-w-[956px] mx-auto">

          {/* Pamana logo */}
          <div className="relative w-[264px] h-[264px] rounded-full overflow-hidden flex-shrink-0">
            <SmoothImage
              src="/cultural-logo.svg"
              alt="UTD Pamana logo"
              width={264}
              height={264}
              className="w-full h-full object-cover"
              quality={90}
            />
          </div>

          {/* CTA pill button */}
          <a
            href="https://www.instagram.com/utdpamana"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full py-5 px-8 bg-white rounded-[70px] text-center transition-opacity hover:opacity-90"
            style={{ boxShadow: '0px 0px 8px 2px rgba(227,174,61,0.05)' }}
          >
            <p
              className="font-sans text-[#0e0e0e] text-center"
              style={{ fontSize: 'clamp(13px, 1.9vw, 29px)', fontWeight: 590 }}
            >
              Interested in joining Pamana? Follow us on instagram!{' '}
              <span className="text-[#e3ae3d]">@utdpamana</span>
            </p>
          </a>

        </div>
      </section>

    </main>
  )
}
