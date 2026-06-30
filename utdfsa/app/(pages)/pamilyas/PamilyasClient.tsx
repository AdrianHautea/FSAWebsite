'use client'

import { useState, useEffect, useRef, type PointerEvent } from 'react'
import Modal from '@/components/Modal'
import SmoothImage from '@/components/SmoothImage'
import { BlurInImg } from '@/components/SmoothImage'
import Link from 'next/link'
import AnimatedTitle from '@/components/AnimatedTitle'

export type MemberState = {
  isLoggedIn: boolean
  isMember: boolean
  memberType: string | null
  hasAdingApp: boolean
  hasKuyateApp: boolean
  onboardingComplete: boolean
}

// ── Pamilyas Carousel ─────────────────────────────────────────────────────────

const PAM_SLIDES = [
  { src: '/pam1.jpg', alt: 'Pamilya 1' },
  { src: '/pam2.jpg', alt: 'Pamilya 2' },
  { src: '/pam3.jpg', alt: 'Pamilya 3' },
  { src: '/pam4.jpg', alt: 'Pamilya 4' },
  { src: '/pam5.jpg', alt: 'Pamilya 5' },
]

// FIX 2: rotate removed from PosConfig — cards stack flat with no vertical tilt
type PosConfig = {
  scale: number
  translateX: string
  zIndex: number
  opacity: number
}

const DESKTOP: PosConfig[] = [
  { scale: 0.70, translateX: '-90%', zIndex: 30, opacity: 0.50 },
  { scale: 0.85, translateX: '-55%', zIndex: 40, opacity: 0.75 },
  { scale: 1.00, translateX: '0%',   zIndex: 50, opacity: 1.00 },
  { scale: 0.85, translateX: '55%',  zIndex: 40, opacity: 0.75 },
  { scale: 0.70, translateX: '90%',  zIndex: 30, opacity: 0.50 },
]

const MOBILE_POS: PosConfig[] = [
  { scale: 0.65, translateX: '-85%', zIndex: 30, opacity: 0.50 },
  { scale: 0.82, translateX: '-50%', zIndex: 40, opacity: 0.75 },
  { scale: 1.00, translateX: '0%',   zIndex: 50, opacity: 1.00 },
  { scale: 0.82, translateX: '50%',  zIndex: 40, opacity: 0.75 },
  { scale: 0.65, translateX: '85%',  zIndex: 30, opacity: 0.50 },
]

function PamilyasCarousel() {
  const [current, setCurrent] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [timerKey, setTimerKey] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % PAM_SLIDES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [timerKey])

  const total = PAM_SLIDES.length
  const resetTimer = () => setTimerKey(k => k + 1)
  const prev = () => { setCurrent(i => (i - 1 + total) % total); resetTimer() }
  const next = () => { setCurrent(i => (i + 1) % total); resetTimer() }
  const dragStart = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const suppressClick = useRef(false)
  const positions = isMobile ? MOBILE_POS : DESKTOP

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    dragStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const isHorizontalSwipe = Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.25

    dragStart.current = null
    e.currentTarget.releasePointerCapture(start.pointerId)

    if (!isHorizontalSwipe) return

    suppressClick.current = true
    if (dx < 0) next()
    else prev()

    window.setTimeout(() => {
      suppressClick.current = false
    }, 120)
  }

  const handlePointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    dragStart.current = null
    if (start) e.currentTarget.releasePointerCapture(start.pointerId)
  }

  // 4:3 landscape dimensions — larger than before to fill the section
  const cardW = isMobile ? 320 : 640
  const cardH = isMobile ? 240 : 480

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* stage height accommodates 4:3 active card with breathing room */}
      <div
        className="relative h-[280px] md:h-[560px] cursor-grab touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {PAM_SLIDES.map((slide, slideIdx) => {
          let offset = (slideIdx - current + total) % total
          if (offset > Math.floor(total / 2)) offset -= total
          const pos = positions[offset + 2]

          return (
            <div
              key={slideIdx}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${cardW}px`,
                height: `${cardH}px`,
                // FIX 2: rotate removed — cards stack flat
                transform: `translateX(-50%) translateY(-50%) translateX(${pos.translateX}) scale(${pos.scale})`,
                zIndex: pos.zIndex,
                opacity: pos.opacity,
                transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              className="rounded-2xl overflow-hidden bg-[#2a2a2a] cursor-pointer"
              onClick={offset < 0 ? () => { if (!suppressClick.current) prev() } : offset > 0 ? () => { if (!suppressClick.current) next() } : undefined}
            >
              <SmoothImage
                src={slide.src}
                alt={slide.alt}
                fill
                draggable={false}
                className="object-cover object-center"
                sizes="(max-width: 768px) 50vw, 40vw"
                quality={90}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-2 shrink-0">
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="p-3 text-white hover:opacity-70 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5 px-2">
          {PAM_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); resetTimer() }}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full bg-white transition-all duration-200 ${
                i === current ? 'w-4 h-4' : 'w-3 h-3 opacity-50'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          aria-label="Next slide"
          className="p-3 text-white hover:opacity-70 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Form Card ─────────────────────────────────────────────────────────────────

function FormCard({
  photo,
  title,
  href,
  externalHref,
  onClick,
}: {
  photo: string
  title: string
  href?: string
  externalHref?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <SmoothImage
        src={photo}
        alt={title}
        fill
        className="object-cover object-top"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        quality={85}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {/* FIX 3: title vertically and horizontally centered */}
      <span className="absolute inset-0 flex items-center justify-center text-center text-white font-display font-black text-xl uppercase tracking-wide px-4">
        {title}
      </span>
    </>
  )

  const cls = 'relative aspect-[4/5] rounded-[27px] overflow-hidden block hover:scale-[1.02] hover:brightness-110 transition-all duration-200 cursor-pointer bg-transparent border-0 p-0 w-full'

  // FIX 4: external link (protection form) opens in new tab
  if (externalHref) {
    return (
      <a href={externalHref} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    )
  }
  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>
  }
  // FIX 5: popup trigger — card is always clickable
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PamilyasClient({
  memberState,
  isKuyateOpen,
}: {
  memberState: MemberState
  isKuyateOpen: boolean
}) {
  // FIX 5: popup state replaces the submitted badge
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null)

  // ── Card prop helpers ────────────────────────────────────────────────────────

  function kuyateCardProps(): { href?: string; onClick?: () => void } {
    // not logged in → login with redirect
    if (!memberState.isLoggedIn)
      return { href: '/login?next=/pamilyas' }

    // logged in but not a paid member → membership page
    if (!memberState.isMember)
      return { href: '/membership' }

    // already submitted a kuyate app → already submitted popup
    if (memberState.memberType === 'kuyate' && memberState.hasKuyateApp)
      return { onClick: () => setPopup({
        title: 'Application Submitted',
        message: 'You have already submitted your Kuya/Ate application. The pam chair will be in touch after the sorting process.',
      })}

    // already submitted an ading app → cross-apply block popup
    if (memberState.memberType === 'ading' && memberState.hasAdingApp)
      return { onClick: () => setPopup({
        title: 'Already Applied as Ading',
        message: 'You have already submitted an Ading application. You cannot apply as both Ading and Kuya/Ate.',
      })}

    // kuyate applications are closed → closed popup
    if (!isKuyateOpen)
      return { onClick: () => setPopup({
        title: 'Applications Closed',
        message: 'Kuya/Ate applications have closed for this semester.',
      })}

    // not_interested member → reapply flow with type param
    if (memberState.memberType === 'not_interested')
      return { href: '/onboarding?reapply=true&type=kuyate' }

    // member with no type yet → normal onboarding
    return { href: '/onboarding' }
  }

  function adingCardProps(): { href?: string; onClick?: () => void } {
    // not logged in → login with redirect
    if (!memberState.isLoggedIn)
      return { href: '/login?next=/pamilyas' }

    // logged in but not a paid member → membership page
    if (!memberState.isMember)
      return { href: '/membership' }

    // already submitted an ading app → already submitted popup
    if (memberState.memberType === 'ading' && memberState.hasAdingApp)
      return { onClick: () => setPopup({
        title: 'Application Submitted',
        message: 'You have already submitted your Ading application. The pam chair will be in touch after the sorting process.',
      })}

    // already submitted a kuyate app → cross-apply block popup
    if (memberState.memberType === 'kuyate' && memberState.hasKuyateApp)
      return { onClick: () => setPopup({
        title: 'Already Applied as Kuya/Ate',
        message: 'You have already submitted a Kuya/Ate application. You cannot apply as both Kuya/Ate and Ading.',
      })}

    // not_interested member → reapply flow with type param
    if (memberState.memberType === 'not_interested')
      return { href: '/onboarding?reapply=true&type=ading' }

    // member with no type yet → normal onboarding
    return { href: '/onboarding' }
  }

  function protectionCardProps(): { href?: string; externalHref?: string } {
    if (!memberState.isLoggedIn) return { href: '/login?next=/pamilyas' }
    if (!memberState.isMember) return { href: '/membership' }
    // FIX 4: real Google Forms URL, opens in new tab
    return {
      externalHref: 'https://docs.google.com/forms/d/e/1FAIpQLSdlewwrMBLXLK_4oRI_J7bb2fh-uR11_G4asmzaa26LUXes2Q/viewform?usp=dialog',
    }
  }

  const kuyate = kuyateCardProps()
  const ading = adingCardProps()
  const protection = protectionCardProps()

  return (
    <main className="bg-section-bg text-white overflow-x-hidden">

      {/* FIX 5: popup modal — renders when popup is not null */}
      {popup && (
        <Modal onClose={() => setPopup(null)} size="sm">
          <div className="bg-[#262626] rounded-2xl p-6 text-center shadow-2xl">
            <h3 className="font-display font-black text-white text-lg uppercase mb-3">
              {popup.title}
            </h3>
            <p className="font-sans text-white/60 text-sm leading-relaxed mb-6">
              {popup.message}
            </p>
            <button
              onClick={() => setPopup(null)}
              className="w-full bg-accent-green text-[#0e0e0e] font-display font-black uppercase tracking-widest py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Got it
            </button>
          </div>
        </Modal>
      )}

      {/* ── SECTION 1 — HERO ──────────────────────────────────────── */}

      {/* Mobile hero — simplified single-image layout */}
      <div className="block lg:hidden">
        <div className="relative w-full h-[50vh] overflow-hidden bg-[#1f1f1f]">
          <SmoothImage
            src="/pam-hero.jpg"
            alt="Pamilyas"
            fill
            className="object-cover object-center"
            preload
            quality={85}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
          <AnimatedTitle as="h1" animation="slideFromRight" className="absolute bottom-4 left-4 font-display font-black text-5xl text-white leading-none z-10">
            PAMILYAS
          </AnimatedTitle>
        </div>
      </div>

      {/* Desktop hero */}
      <section className="hidden lg:block relative w-full overflow-hidden bg-[#1f1f1f] h-[870px]">

        {/* pam-hero-bg.jpg — background layer, right 55%, no padding */}
        <div className="absolute right-0 top-0 h-full z-0" style={{ width: '57%' }}>
          <BlurInImg
            src="/pam-hero-bg.png"
            alt=""
            aria-hidden="true"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>

        {/* pam-hero.jpg — floating photo card, foreground layer */}
        {/* left-anchored with padding, overlaps bg pattern slightly on the right */}
        <div
          className="absolute z-10 overflow-hidden shadow-2xl"
          style={{
            top: '40px',
            bottom: '40px',
            left: '40px',
            width: '52%',
          }}
        >
          <SmoothImage
            src="/pam-hero.jpg"
            alt="Pamilyas"
            fill
            className="object-cover object-top"
            preload
            quality={85}
            sizes="52vw"
          />
        </div>

        {/* PAMILYAS title */}
        <AnimatedTitle
          as="h1"
          animation="slideFromRight"
          className="absolute font-display font-black text-white leading-none text-right z-10"
          style={{
            bottom: '100px',
            right: '80px',
            fontSize: 'clamp(60px, 8.5vw, 128px)',
          }}
        >
          PAMILYAS
        </AnimatedTitle>

  </section>

      {/* ── SECTION 2 — WHAT IS A PAMILYA? ───────────────────────── */}
      <section>

        <div className="bg-brand-bg py-10 px-4">
          <h2 className="font-display font-black text-[clamp(18px,4.2vw,64px)] text-white text-center whitespace-nowrap">
            WHAT IS A PAMILYA?
          </h2>
          <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed text-center max-w-[1218px] mx-auto mt-8">
            Pamilyas (&lsquo;pam&rsquo; for short), which is also the Tagalog word for family, are smaller &ldquo;families&rdquo;
            within UTD FSA where members have an opportunity to foster friendships, guidance, and a place to belong.
          </p>
        </div>

        <div className="bg-section-bg">
          <div className="max-w-[1218px] mx-auto px-8 pt-12 pb-6 text-center">

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed mb-8">
              Each pam consists of Kuyas (older brothers), Ates (older sisters), and Adings (younger siblings).
              By treating others like family, regardless of blood relation, pamilyas help members turn UTD FSA
              into a second home throughout their college years.
            </p>

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed mb-8">
              Each pamilya is different, consisting of different hobbies, interests, and people! The Pamilya Chair
              and UTD FSA Officer Board does their best to ensure that each ading is paired with a pam that best
              suits them, providing a positive experience in UTD FSA.
            </p>

            <p className="font-sans text-[clamp(16px,2vw,29px)] text-white/60 leading-relaxed">
              The pamilya system is exclusive to UTD FSA members only &mdash; be sure to pay your dues before
              filling out the Kuya/Ate OR Ading Form!
            </p>

          </div>
        </div>

      </section>

      {/* ── SECTION 3 — PAMILYA CAROUSEL ─────────────────────────── */}
      <section className="bg-section-bg px-8 pt-4 pb-12">
        <PamilyasCarousel />
      </section>

      {/* ── SECTION 4 — MEET THE PAMILYAS (coming soon) ──────────── */}
      <section>

        <div className="bg-brand-bg py-10 px-4">
          <h2 className="font-display font-black text-[clamp(18px,4.2vw,64px)] text-white text-center whitespace-nowrap">
            MEET THE PAMILYAS
          </h2>
        </div>

        <div className="bg-section-bg py-16 px-8">
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="font-sans font-semibold text-[#1f1f1f] text-lg leading-relaxed">
                Pamilyas will be revealed at the 2nd General Meeting. Check back soon!
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* ── SECTION 5 — WHERE DO I SIGN UP? ──────────────────────── */}
      <section>

        <div className="bg-brand-bg py-10 px-4">
          <h2 className="font-display font-black text-[clamp(18px,4.2vw,64px)] text-white text-center whitespace-nowrap">
            WHERE DO I SIGN UP?
          </h2>
        </div>

        <div className="bg-section-bg px-8 py-12">

          <p className="font-sans font-normal text-[clamp(16px,1.5vw,22px)] text-white/70 text-center mb-10 max-w-[1194px] mx-auto">
            Select the form that best fits the role you&rsquo;ll play in your UTD FSA pamilya experience!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[1218px] mx-auto">

            <FormCard
              photo="/kuyate-form.png"
              title="KUYA/ATE FORM"
              href={kuyate.href}
              onClick={kuyate.onClick}
            />

            <FormCard
              photo="/ading-form.png"
              title="ADING FORM"
              href={ading.href}
              onClick={ading.onClick}
            />

            <FormCard
              photo="/protect-form.png"
              title="PAMILYA PROTECTION FORM"
              href={protection.href}
              externalHref={protection.externalHref}
            />

          </div>
        </div>

      </section>

    </main>
  )
}
