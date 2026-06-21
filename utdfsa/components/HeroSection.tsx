'use client'
// ── HeroSection.tsx ───────────────────────────────────────
// client component that owns the hero logo + subtitle text so
// entrance animations can be reliably restarted on every visit:
//   - Next.js soft navigation (useEffect runs on each mount)
//   - bfcache restoration (pageshow with e.persisted)
// The reflow trick (void el.offsetHeight) forces the browser to
// restart a CSS animation even if the element is already in the DOM.

import { useEffect, useRef } from 'react'
import Image from 'next/image'

export default function HeroSection() {
  const logoRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLParagraphElement>(null)
  const rightRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const ANIM = '0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'

    function play() {
      const targets: [React.RefObject<HTMLElement | null>, string][] = [
        [logoRef,  'heroFadeIn'],
        [leftRef,  'heroSlideFromLeft'],
        [rightRef, 'heroSlideFromRight'],
      ]
      targets.forEach(([ref, name]) => {
        const el = ref.current
        if (!el) return
        el.style.animation = 'none'
        void el.offsetHeight        // force reflow — restarts the animation
        el.style.animation = `${name} ${ANIM}`
      })
    }

    const rafId = requestAnimationFrame(play)
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) play() }
    window.addEventListener('pageshow', onPageShow)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return (
    <>
      {/* Logo — starts invisible; useEffect applies heroFadeIn */}
      <div
        ref={logoRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{ opacity: 0 }}
      >
        <div className="w-[200px] h-[200px] sm:w-[360px] sm:h-[360px] md:w-[515px] md:h-[515px]">
          <Image
            src="/hero-logo.svg"
            alt="UTD FSA"
            width={515}
            height={515}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>

      {/* Left subtitle — starts invisible; useEffect applies heroSlideFromLeft */}
      <p
        ref={leftRef}
        className="hidden 2xl:block absolute left-16 top-1/2 font-display font-semibold text-[11px] lg:text-[20px] text-white tracking-wide uppercase z-20"
        style={{ opacity: 0 }}
      >
        Filipino Student Association
      </p>

      {/* Right subtitle — starts invisible; useEffect applies heroSlideFromRight */}
      <p
        ref={rightRef}
        className="hidden 2xl:block absolute right-16 top-1/2 font-display font-semibold text-[11px] lg:text-[20px] text-white tracking-wide uppercase text-right max-w-[454px] z-20"
        style={{ opacity: 0 }}
      >
        University of Texas at Dallas
      </p>
    </>
  )
}
