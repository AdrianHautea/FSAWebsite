import Image from "next/image"
import PhotoCarousel from "@/components/PhotoCarousel"

export default function Home() {
  return (
    <main className="bg-brand-bg text-white overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] md:h-screen w-full overflow-hidden">
        {/* Background photo — object-top keeps faces in frame */}
        <Image
          src="/hero-officers.jpg"
          alt="FSA Officers"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
          quality={90}
        />

        {/* Dark overlay so text reads clearly over the busy photo */}
        <div className="absolute inset-0 bg-black/20 z-10" />

        {/* Centered FSA logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="relative w-[515px] h-[515px]">
            <Image
              src="/main-logo.svg"
              alt="UTD FSA"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 80vw, 515px"
            />
          </div>
        </div>

        {/* Left subtitle */}
        <p className="absolute left-16 top-1/2 -translate-y-1/2 font-display font-semibold text-[20px] text-white tracking-wide uppercase z-20">
          Filipino Student Association
        </p>

        {/* Right subtitle */}
        <p className="absolute right-16 top-1/2 -translate-y-1/2 font-display font-semibold text-[20px] text-white tracking-wide uppercase text-right max-w-[454px] z-20">
          University of Texas at Dallas
        </p>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────── */}
      <div className="bg-brand-bg h-[59px] flex items-center overflow-hidden">
        <div className="flex gap-10 whitespace-nowrap w-max animate-marquee">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="font-display font-bold text-[32px] text-white shrink-0 tracking-wide">
              PARA SA KULTURA. FOR THE CULTURE.
            </span>
          ))}
        </div>
      </div>

      {/* ── WHO ARE WE? ───────────────────────────────────────────── */}
      <section className="bg-section-bg min-h-[724px]">
        <div className="max-w-[1512px] mx-auto flex px-16 py-20 gap-0">

          {/* Left: text */}
          <div className="w-[420px] shrink-0 flex flex-col justify-start">
            <h2 className="font-display font-black text-[64px] text-white leading-none tracking-[-3.2px] underline decoration-solid mb-8">
              WHO ARE{'\n'}WE?
            </h2>
            <p className="font-sans font-bold text-[20px] text-white leading-relaxed">
              UTD FSA is a student-led social organization at UT Dallas, created to unite students who
              are interested in promoting Filipino-American culture. Through many aspects of unity, such
              as dance, sports, and social events, UTD FSA aims to celebrate &amp; foster community
              through Filipino traditions.
            </p>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-white/20 mx-12 self-stretch shrink-0" />

          {/* Right: photo carousel */}
          <div className="flex-1 flex items-center justify-center">
            <PhotoCarousel />
          </div>

        </div>
      </section>

      {/* ── FULL-BLEED PHOTO ──────────────────────────────────────── */}
      <div className="relative h-[220px] md:h-[320px] lg:h-[420px] w-full overflow-hidden">
        <Image src="/event-photo.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </div>

      {/* ── MISSION STATEMENT ─────────────────────────────────────── */}
      <section className="bg-section-bg px-16 py-24 min-h-[575px]">
        <div className="max-w-[1241px] mx-auto text-center">
          <h2 className="font-display font-black text-[64px] xl:text-[96px] text-white tracking-[-4.8px] underline decoration-solid leading-none mb-16">
            MISSION STATEMENT
          </h2>
          <div className="font-sans font-bold text-[20px] xl:text-[24px] text-white leading-relaxed max-w-[1100px] mx-auto space-y-6">
            <p>
              The <span className="text-accent-green">Filipino Student Association</span> at the{' '}
              <span className="text-accent-gold">University of Texas at Dallas</span> was founded in
              2001, aiming to cultivate a community that empowers, uplift student voices, and celebrate
              Filipino culture through service, leadership, and unity.
            </p>
            <p>
              All students are welcomed, regardless of race, ethnicity, sexual orientation, religion, or
              background. Through community outreach, social engagement, and cultural awareness, UTD FSA
              strives to ensure pride in Filipino identity, whilst offering a space for students to
              belong, grow, and lead towards a brighter future.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECOND FULL-BLEED PHOTO ───────────────────────────────── */}
      <div className="relative h-[220px] md:h-[320px] lg:h-[420px] w-full overflow-hidden">
        <Image src="/event-photo-2.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-brand-bg">
        <div className="max-w-[1512px] mx-auto px-10 py-8 flex items-start justify-between gap-8">

          {/* Logo */}
          <Image src="/main-logo.svg" alt="UTD FSA" width={120} height={104} className="object-contain shrink-0" />

          {/* Right side: social icons + chant */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-3 items-center">
              <a href="#" aria-label="Instagram" className="hover:opacity-70 transition-opacity">
                <Image src="/instagram.svg" alt="Instagram" width={48} height={48} />
              </a>
              <a href="#" aria-label="YouTube" className="hover:opacity-70 transition-opacity">
                <Image src="/youtube.svg" alt="YouTube" width={48} height={48} />
              </a>
              <a href="#" aria-label="TikTok" className="hover:opacity-70 transition-opacity">
                <Image src="/tiktok.svg" alt="TikTok" width={48} height={48} />
              </a>
              <a href="#" aria-label="Discord" className="hover:opacity-70 transition-opacity">
                <Image src="/discord.svg" alt="Discord" width={48} height={48} />
              </a>
              <a href="#" aria-label="Email" className="hover:opacity-70 transition-opacity">
                <Image src="/gmail.svg" alt="Email" width={48} height={48} />
              </a>
            </div>

            <p className="font-display font-semibold text-[14px] text-white text-right leading-relaxed">
              &ldquo;WHO&rsquo;S GOT THAT GOOD D?&rdquo; &ldquo;WE GOT THAT GOOD D!&rdquo;<br />
              &ldquo;ONE, TWO, THREE! GIMME A U-T-D!&rdquo;
            </p>
          </div>

        </div>

        {/* Copyright bar */}
        <div className="bg-dropdown-bg py-2">
          <p className="font-display font-semibold text-[13px] text-white text-center tracking-wide">
            WEBSITE CURATED BY THE UTD FSA 2025-26 WEB COMMITTEE
          </p>
        </div>
      </footer>

    </main>
  )
}
