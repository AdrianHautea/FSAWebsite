import Image from "next/image"
import PhotoCarousel from "@/components/PhotoCarousel"

export default function Home() {
  return (
    <main className="bg-brand-bg text-white overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative h-[50vh] sm:h-[70vh] md:h-screen w-full overflow-hidden">
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
          <div className="relative w-[200px] h-[200px] sm:w-[360px] sm:h-[360px] md:w-[515px] md:h-[515px]">
            <Image
              src="/main-logo.svg"
              alt="UTD FSA"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 640px) 200px, (max-width: 768px) 360px, 515px"
            />
          </div>
        </div>

        {/* Left subtitle */}
        <p className="hidden sm:block absolute left-4 sm:left-8 lg:left-16 top-1/2 -translate-y-1/2 font-display font-semibold text-[11px] sm:text-[15px] lg:text-[20px] text-white tracking-wide uppercase z-20">
          Filipino Student Association
        </p>

        {/* Right subtitle */}
        <p className="hidden sm:block absolute right-4 sm:right-8 lg:right-16 top-1/2 -translate-y-1/2 font-display font-semibold text-[11px] sm:text-[15px] lg:text-[20px] text-white tracking-wide uppercase text-right max-w-[110px] sm:max-w-[260px] lg:max-w-[454px] z-20">
          University of Texas at Dallas
        </p>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────── */}
      <div className="bg-brand-bg h-[42px] sm:h-[52px] md:h-[59px] flex items-center overflow-hidden">
        <div className="flex gap-10 whitespace-nowrap w-max animate-marquee">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="font-display font-bold text-[15px] sm:text-[22px] md:text-[32px] text-white shrink-0 tracking-wide">
              PARA SA KULTURA. FOR THE CULTURE.
            </span>
          ))}
        </div>
      </div>

      {/* ── WHO ARE WE? ───────────────────────────────────────────── */}
      <section className="bg-section-bg">
        <div className="max-w-[1512px] mx-auto flex flex-col lg:flex-row px-4 sm:px-8 lg:px-16 py-12 lg:py-20 gap-0">

          {/* Left: text */}
          <div className="w-full lg:w-[420px] lg:shrink-0 flex flex-col justify-start">
            <h2 className="font-display font-black text-[44px] md:text-[64px] text-white leading-none tracking-[-3.2px] underline decoration-solid mb-6 lg:mb-8">
              WHO ARE{'\n'}WE?
            </h2>
            <p className="font-sans font-bold text-[16px] md:text-[20px] text-white leading-relaxed">
              UTD FSA is a student-led social organization at UT Dallas, created to unite students who
              are interested in promoting Filipino-American culture. Through many aspects of unity, such
              as dance, sports, and social events, UTD FSA aims to celebrate &amp; foster community
              through Filipino traditions.
            </p>
          </div>

          {/* Vertical divider — hidden on mobile, shown on lg */}
          <div className="hidden lg:block w-px bg-white/20 mx-12 self-stretch shrink-0" />

          {/* Right: photo carousel */}
          <div className="flex-1 flex items-center justify-center mt-8 lg:mt-0">
            <PhotoCarousel />
          </div>

        </div>
      </section>

      {/* ── FULL-BLEED PHOTO ──────────────────────────────────────── */}
      <div className="relative h-[400px] md:h-[600px] lg:h-[800px] w-full overflow-hidden">
        <Image src="/event-photo.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </div>

      {/* ── MISSION STATEMENT ─────────────────────────────────────── */}
      <section className="bg-section-bg px-4 sm:px-8 lg:px-16 py-14 sm:py-20 lg:py-24 min-h-[400px] lg:min-h-[575px]">
        <div className="max-w-[1241px] mx-auto text-center">
          <h2 className="font-display font-black text-[36px] sm:text-[52px] lg:text-[64px] xl:text-[96px] text-white tracking-[-2px] sm:tracking-[-3px] lg:tracking-[-4.8px] underline decoration-solid leading-none mb-10 lg:mb-16">
            MISSION STATEMENT
          </h2>
          <div className="font-sans font-bold text-[16px] sm:text-[18px] xl:text-[24px] text-white leading-relaxed max-w-[1100px] mx-auto space-y-6">
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
      <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full overflow-hidden">
        <Image src="/event-photo-2.jpg" alt="FSA Event" fill className="object-cover" sizes="100vw" />
      </div>

    </main>
  )
}
