// ============================================================
// UI — this page is fully static, safe to restyle everything
// photos are in public/ — spirit-hero.png (no background png,
// no logo png — spirit has neither)
// youtube video IDs are hardcoded below
// ============================================================

import Image from 'next/image'

export default function SpiritPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}
      <section className="relative w-full h-[600px] overflow-hidden">

        {/* Background layer: dark radial gradient (no bg PNG for Spirit) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(40,40,40,0.8) 0%, rgba(10,10,10,1) 100%)',
          }}
        />

        {/* Middle layer: spirit-hero.png — flex-centered wrapper eliminates translate offsets */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 1 }}
        >
          <div className="relative w-[90%] md:w-[65%]" style={{ height: '85%' }}>
            <Image
              src="/spirit-hero.png"
              alt="UTD FSA Spirit team"
              fill
              className="object-contain"
              priority
              quality={90}
              sizes="(max-width: 768px) 90vw, 65vw"
            />
          </div>
        </div>

        {/* Top layer: SPIRIT title centered over hero photo */}
        <h1
          className="absolute z-20 w-full text-center font-display font-black text-white leading-none select-none"
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
          <p className="font-sans leading-relaxed" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)', fontWeight: 500 }}>
            <span className="font-bold text-[#e3ae3d]">Spirit</span>
            {' '}is UTD FSA&apos;s performance category in Goodphil that blends school spirit, pop culture, and Filipino and FSA identity. Expect chants, skits, and energy that ignites the crowd.
          </p>
        </div>
      </section>

      {/* ── SECTION 3 — PAST PERFORMANCES ────────────────────────── */}
      <section className="bg-[#1a3461] py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto">

          <h2
            className="font-display font-black text-white text-center mb-14"
            style={{
              fontSize: 'clamp(30px, 4.3vw, 65px)',
              letterSpacing: '3.25px',
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
            style={{ boxShadow: '0px 0px 40px 20px rgba(255,255,255,0.12)' }}
          >
            <h2 className="font-display font-black text-[#0e0e0e] mb-4" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
              INTERESTED IN JOINING SPIRIT?
            </h2>
            <p className="font-sans leading-relaxed text-gray-600" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)', fontWeight: 500 }}>
              Stay tuned for upcoming Goodphil updates in the Spring!
            </p>
          </div>
        </div>
      </section>

    </main>
  )
}
