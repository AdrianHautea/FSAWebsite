// ── page.tsx ──────────────────────────────────────────────
// goodphil sports page — 9-sport grid, captain interest form,
// and captain meeting booking cta
//
// notes: fully static; hero: sports-hero.jpg (/public);
//        individual sport card photos listed inline per card;
//        captain form and booking links are hardcoded google
//        forms/calendar urls; no purple highlights anywhere
// ──────────────────────────────────────────────────────────

import Image from 'next/image'

export default function SportsPage() {
  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}
      <section className="relative w-full h-[40vh] md:h-[600px] overflow-hidden">

        {/* Background layer: dark radial gradient (no bg PNG for Sports) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(40,40,40,0.8) 0%, rgba(10,10,10,1) 100%)',
          }}
        />

        {/* Middle layer: sports-hero.jpg — full-bleed cover at all sizes */}
        <div className="absolute inset-0 z-10">
          <Image
            src="/sports-hero.jpg"
            alt="UTD FSA Sports team"
            fill
            className="object-cover object-top"
            priority
            quality={90}
            sizes="100vw"
          />
        </div>

        {/* Top layer: SPORTS title centered over hero photo */}
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
          SPORTS
        </h1>

      </section>

      {/* ── SECTION 2 — WHAT IS GOODPHIL SPORTS? ─────────────────── */}
      <section className="bg-section-bg py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-white mb-8" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
            WHAT IS GOODPHIL SPORTS?
          </h2>
          <p className="font-sans leading-relaxed text-white/60" style={{ fontSize: 'clamp(16px, 1.9vw, 29px)' }}>
            <span className="font-bold text-[#e3ae3d]">UTD FSA Sports</span>
            {' '}is the athletic branch of Goodphil competition. Members compete across multiple sports representing UTD FSA against other Filipino Student Associations. Whether you&apos;re a seasoned athlete or just looking to have fun, Sports is where FSA spirit meets friendly competition.
          </p>
        </div>
      </section>

      {/* ── SECTION 3 — OUR SPORTS ───────────────────────────────── */}
      <section className="bg-section-bg py-2">
        <div className="max-w-6xl mx-auto px-6">

          <h2 className="font-display font-black text-white text-center mb-8" style={{ fontSize: 'clamp(20px, 2vw, 30px)' }}>
            OUR SPORTS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Card 1: Men's Basketball — /mens-bbal.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/mens-bbal.jpg"
                  alt="Men's Basketball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Men&apos;s Basketball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Competing with intensity on the hardwood. Our men&apos;s basketball team brings the heat every Goodphil.</p>
              </div>
            </div>

            {/* Card 2: Women's Basketball — /womens-bbal.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/womens-bbal.jpg"
                  alt="Women's Basketball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Women&apos;s Basketball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Skill, speed, and teamwork. Our women&apos;s basketball team competes with heart and hustle.</p>
              </div>
            </div>

            {/* Card 3: Men's Volleyball — /mens-vb.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/mens-vb.jpg"
                  alt="Men's Volleyball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Men&apos;s Volleyball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Powerful spikes and sharp defense — our men&apos;s volleyball squad is built to compete.</p>
              </div>
            </div>

            {/* Card 4: Women's Volleyball — /womens-vb.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/womens-vb.jpg"
                  alt="Women's Volleyball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Women&apos;s Volleyball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Grace and power combined. Our women&apos;s volleyball team brings the rally energy every match.</p>
              </div>
            </div>

            {/* Card 5: Coed Volleyball — /coed-vb.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/coed-vb.jpg"
                  alt="Coed Volleyball"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Coed Volleyball</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Everyone plays together. Coed volleyball is one of the most exciting and inclusive events at Goodphil.</p>
              </div>
            </div>

            {/* Card 6: Men's Flag Football — /mens-ff.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/mens-ff.jpg"
                  alt="Men's Flag Football"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Men&apos;s Flag Football</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Strategy meets athleticism on the flag football field. Our men&apos;s team brings the plays and the passion.</p>
              </div>
            </div>

            {/* Card 7: Coed Soccer — /coed-soccer.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/coed-soccer.jpg"
                  alt="Coed Soccer"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Coed Soccer</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Footwork, teamwork, and pride. Coed soccer brings the whole org together on the pitch.</p>
              </div>
            </div>

            {/* Card 8: Ultimate Frisbee — /ultimate-frisbee.jpg */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
                <Image
                  src="/ultimate-frisbee.jpg"
                  alt="Ultimate Frisbee"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                />
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Ultimate Frisbee</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>High-energy, fast-paced, and always a crowd favorite. Ultimate Frisbee is Goodphil&apos;s wildcard sport.</p>
              </div>
            </div>

            {/* Card 9: Super Secret Special Sport — dark placeholder, no photo */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:brightness-105">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-xl bg-[#111] flex items-center justify-center border-b border-white/[0.08]">
                <span className="text-6xl">❓</span>
              </div>
              <div className="px-5 pt-[18px] pb-[22px]">
                <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: '19px', letterSpacing: '-0.01em' }}>Super Secret Special Sport</h3>
                <p className="text-[#8a8a8a] font-medium" style={{ fontSize: '13.5px', lineHeight: '1.55' }}>Every Goodphil brings a mystery sport. Nobody knows what it is until the day of — and that&apos;s the best part.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTIONS 4 & 5 — CAPTAIN CTAS (side-by-side on xl) ──── */}
      <section className="bg-section-bg px-6 md:px-8 pt-4 pb-20">
        <div className="max-w-5xl mx-auto flex flex-col xl:flex-row gap-6 items-stretch">

          {/* primary cta — captain interest form */}
          <div
            className="flex-1 relative border border-white/20 rounded-[26px] px-10 md:px-14 py-16 text-center overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #191919 0%, #111111 100%)' }}
          >
            <span
              className="font-display font-bold text-white/50 block mb-4"
              style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase' }}
            >
              Leadership
            </span>
            <h2
              className="font-display font-black text-white mb-4"
              style={{ fontSize: 'clamp(24px, 3vw, 38px)', letterSpacing: '-0.02em', lineHeight: 1.06 }}
            >
              WANT TO CAPTAIN A SPORT?
            </h2>
            <p
              className="font-sans text-white/60 mx-auto mb-8"
              style={{ maxWidth: '560px', fontSize: 'clamp(15px, 1.5vw, 16.5px)', lineHeight: 1.6, fontWeight: 500 }}
            >
              Sports captains lead their team throughout Goodphil season. If you&apos;re interested in taking on a leadership role, fill out the captain interest form below.
            </p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSc4CPQXu9A_CaCMmZO9xJiUl_7Up5R8bBxLPKlo2fFZpuxFGg/viewform?pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-10 py-4 bg-white text-[#0e0e0e] rounded-[13px] font-sans font-bold transition-opacity hover:opacity-90"
              style={{ fontSize: '15px', letterSpacing: '0.01em' }}
            >
              Fill Out Captain Interest Form
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>

          {/* secondary cta — book a captain meeting */}
          <div
            className="flex-1 border border-white/20 rounded-[26px] px-10 md:px-14 py-16 text-center flex flex-col items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #191919 0%, #111111 100%)' }}
          >
            <span
              className="font-display font-bold text-white/50 block mb-4"
              style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase' }}
            >
              Leadership
            </span>
            <h3
              className="font-display font-black text-white mb-4"
              style={{ fontSize: 'clamp(24px, 3vw, 38px)', letterSpacing: '-0.02em', lineHeight: 1.06 }}
            >
              BOOK A CAPTAIN MEETING
            </h3>
            <p
              className="font-sans text-[#8a8a8a] mx-auto mb-8"
              style={{ maxWidth: '560px', fontSize: 'clamp(15px, 1.5vw, 16.5px)', lineHeight: 1.6, fontWeight: 500 }}
            >
              Already a captain or interested in becoming one? Book a meeting with the Sports Coordinator to discuss your team, scheduling, and Goodphil prep.
            </p>
            <a
              href="https://calendar.app.google/DeGvXnzB5Ux2DEQa8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/40 text-white/80 rounded-[13px] font-sans font-bold transition-all duration-200 hover:border-white/60 hover:text-white"
              style={{ fontSize: '14.5px', letterSpacing: '0.01em' }}
            >
              Book a Meeting
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </a>
          </div>

        </div>
      </section>

    </main>
  )
}
