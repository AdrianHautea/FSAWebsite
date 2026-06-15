// ============================================================
// UI — this page is fully static, safe to restyle everything
// photos are in public/ — cultural-hero.png, cultural-logo.png
// no background png for this page — use dark gradient instead
// youtube video IDs are hardcoded below
// ============================================================

import Image from 'next/image'

export default function CulturalPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}
      <section className="relative w-full h-[600px] overflow-hidden">

        {/* Background layer: dark radial gradient (no bg PNG for Cultural) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(40,40,40,0.8) 0%, rgba(10,10,10,1) 100%)',
          }}
        />

        {/* Middle layer: cultural-hero.png — flex-centered wrapper eliminates translate offsets */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 1 }}
        >
          <div className="relative w-[90%] md:w-[65%]" style={{ height: '85%' }}>
            <Image
              src="/cultural-hero.png"
              alt="UTD Pamana cultural dance team"
              fill
              className="object-contain"
              priority
              quality={90}
              sizes="(max-width: 768px) 90vw, 65vw"
            />
          </div>
        </div>

        {/* Top layer: CULTURAL title centered over hero photo */}
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
          CULTURAL
        </h1>

      </section>

      {/* ── SECTION 2 — WHAT IS UTD PAMANA? ──────────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-white mb-8" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
            WHAT IS UTD PAMANA?
          </h2>
          <p className="font-sans leading-relaxed" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)', fontWeight: 500 }}>
            <span className="font-bold text-[#e3ae3d]">UTD Pamana</span>
            {' '}is UTD FSA&apos;s official cultural dance team! This team competes at Isang Mahal and Goodphil. Pamana celebrates Filipino heritage through storytelling and powerful traditional-inspired performances.
          </p>
        </div>
      </section>

      {/* ── SECTION 3 — PAST PERFORMANCES ────────────────────────── */}
      <section className="bg-[#e3ae3d] py-16 px-6 md:px-8">
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
            <Image
              src="/cultural-logo.png"
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
            style={{ boxShadow: '0px 0px 40px 20px rgba(227,174,61,0.39)' }}
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
