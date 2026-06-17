// ── page.tsx ──────────────────────────────────────────────
// goodphil spirit page — utd fsa spirit performance category
//
// notes: fully static; hero uses spirit-hero.jpg (/public)
//        with a dark radial gradient fallback — no bg png or
//        logo png for spirit; youtube video ids hardcoded in
//        the past-performances section
// ──────────────────────────────────────────────────────────

import Image from 'next/image'

export default function SpiritPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

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
          <Image
            src="/spirit-hero.jpg"
            alt="UTD FSA Spirit team"
            fill
            className="object-cover object-center"
            priority
            quality={90}
            sizes="100vw"
          />
        </div>

        {/* Top layer: SPIRIT title centered over hero photo */}
        <h1
          className="absolute z-30 w-full text-center font-display font-black text-white leading-none select-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(48px, 8.5vw, 128px)',
            textShadow: '0px 4px 28px rgba(0,0,0,0.72), 0px 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          SPIRIT
        </h1>

      </section>

      {/* ── SECTION 2 — WHAT IS SPIRIT? ──────────────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-white mb-8" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
            WHAT IS SPIRIT?
          </h2>
          <p className="font-sans leading-relaxed text-white/60" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)' }}>
            <span className="font-bold text-[#e3ae3d]">Spirit</span>
            {' '}is UTD FSA&apos;s performance category in Goodphil that blends school spirit, pop culture, and Filipino and FSA identity. Expect chants, skits, and energy that ignites the crowd.
          </p>
        </div>
      </section>

      {/* ── SECTION 3 — PAST PERFORMANCES ────────────────────────── */}
      <section className="bg-[#1a3461] py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto">

          <h2
            className="font-display font-black text-white text-center w-full block mb-14"
            style={{
              fontSize: 'clamp(30px, 4.3vw, 65px)',
              letterSpacing: '3.25px',
              paddingLeft: '3.25px',
              textShadow: '0px 16px 4px rgba(255,251,251,0.26)',
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
                src="https://www.youtube-nocookie.com/embed/R79EE9wmbTc"
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
                src="https://www.youtube-nocookie.com/embed/02wg-b1WghI"
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
                src="https://www.youtube-nocookie.com/embed/4JeGsfOV27E"
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
        <div className="max-w-[956px] mx-auto">
          <div
            className="bg-white rounded-[70px] px-10 py-8 text-center mx-auto max-w-2xl"
            style={{ boxShadow: '0px 0px 8px 2px rgba(255,255,255,0.05)' }}
          >
            <h2 className="font-display font-black text-[#0e0e0e] mb-4" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
              INTERESTED IN JOINING SPIRIT?
            </h2>
            <p className="font-sans leading-relaxed text-gray-600" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)' }}>
              Stay tuned for upcoming Goodphil updates in the Spring!
            </p>
          </div>
        </div>
      </section>

    </main>
  )
}
