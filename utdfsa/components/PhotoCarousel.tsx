// ── PhotoCarousel.tsx ─────────────────────────────────────
// 5-card fan carousel with auto-advance and manual navigation
//
// data:  no props — slide images are hardcoded static assets in /public
// notes: all 5 cards are always in the DOM; position/scale/opacity animate via inline styles.
//        timerKey resets the auto-advance interval on manual navigation to avoid immediate skip.

'use client'

import { useState, useEffect, useRef, type PointerEvent } from 'react'
import SmoothImage from '@/components/SmoothImage'

const slides = [
  { src: '/carousel-1.jpg', alt: 'FSA Event 1' },
  { src: '/carousel-2.jpg', alt: 'FSA Event 2' },
  { src: '/carousel-3.jpg', alt: 'FSA Event 3' },
  { src: '/carousel-4.jpg', alt: 'FSA Event 4' },
  { src: '/carousel-5.jpg', alt: 'FSA Event 5' },
]

type PosConfig = {
  scale: number
  translateX: string
  zIndex: number
  opacity: number
}

// Five fan positions: index 0 = far-left (-2), index 2 = active center, index 4 = far-right (+2)
const DESKTOP: PosConfig[] = [
  { scale: 0.70, translateX: '-90%', zIndex: 5,  opacity: 0.50 },
  { scale: 0.85, translateX: '-55%', zIndex: 10, opacity: 0.75 },
  { scale: 1.00, translateX: '0%',   zIndex: 20, opacity: 1.00 },
  { scale: 0.85, translateX: '55%',  zIndex: 10, opacity: 0.75 },
  { scale: 0.70, translateX: '90%',  zIndex: 5,  opacity: 0.50 },
]

const MOBILE: PosConfig[] = [
  { scale: 0.65, translateX: '-85%', zIndex: 5,  opacity: 0.50 },
  { scale: 0.82, translateX: '-50%', zIndex: 10, opacity: 0.75 },
  { scale: 1.00, translateX: '0%',   zIndex: 20, opacity: 1.00 },
  { scale: 0.82, translateX: '50%',  zIndex: 10, opacity: 0.75 },
  { scale: 0.65, translateX: '85%',  zIndex: 5,  opacity: 0.50 },
]

export default function PhotoCarousel() {
  // index of the currently centered slide (0–4)
  const [current, setCurrent] = useState(0)
  // switches between MOBILE and DESKTOP position configs at 768px
  const [isMobile, setIsMobile] = useState(false)
  // incrementing this key restarts the auto-advance useEffect (manual-nav debounce)
  const [timerKey, setTimerKey] = useState(0)

  // responsive breakpoint detection: sets isMobile on mount and on every window resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // auto-advance every 4 s; timerKey in dep array lets manual nav reset the interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % slides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [timerKey])

  const total = slides.length
  const resetTimer = () => setTimerKey(k => k + 1)
  const prev = () => { setCurrent(i => (i - 1 + total) % total); resetTimer() }
  const next = () => { setCurrent(i => (i + 1) % total); resetTimer() }
  const dragStart = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const suppressClick = useRef(false)

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

  const positions = isMobile ? MOBILE : DESKTOP
  // 4:3 landscape card dimensions; smaller on mobile to fit the narrower stage
  const cardW = isMobile ? 442 : 552
  const cardH = isMobile ? 331 : 414

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Stage — all 5 cards always in the DOM; only styles change per transition */}
      <div
        className="relative h-[380px] md:h-[506px] cursor-grab touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {slides.map((slide, slideIdx) => {
          // wrap offset into [-2, +2] range so the two flanking cards always exist
          let offset = (slideIdx - current + total) % total
          if (offset > Math.floor(total / 2)) offset -= total
          const pos = positions[offset + 2] // -2→[0], -1→[1], 0→[2], +1→[3], +2→[4]

          return (
            <div
              key={slideIdx}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${cardW}px`,
                height: `${cardH}px`,
                // Center on anchor, apply fan offset, then scale + rotate in place
                transform: `translateX(-50%) translateY(-50%) translateX(${pos.translateX}) scale(${pos.scale})`,
                zIndex: pos.zIndex,
                opacity: pos.opacity,
                transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              className="rounded-2xl overflow-hidden bg-[#2a2a2a] cursor-pointer"
              // Clicking a side card navigates in that direction
              onClick={offset < 0 ? () => { if (!suppressClick.current) prev() } : offset > 0 ? () => { if (!suppressClick.current) next() } : undefined}
            >
              <SmoothImage
                src={slide.src}
                alt={slide.alt}
                fill
                draggable={false}
                className="object-cover object-top"
                sizes="(max-width: 768px) 50vw, 33vw"
                quality={95}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          )
        })}
      </div>

      {/* Navigation: arrows + dot indicators */}
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
          {slides.map((_, i) => (
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
