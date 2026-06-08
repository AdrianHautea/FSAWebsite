'use client'

import { useState } from 'react'
import Image from 'next/image'

const slides = [
  { src: '/carousel-1.jpg', alt: 'FSA Event 1' },
  { src: '/carousel-2.jpg', alt: 'FSA Event 2' },
  { src: '/carousel-3.jpg', alt: 'FSA Event 3' },
  { src: '/carousel-4.jpg', alt: 'FSA Event 4' },
  { src: '/carousel-5.jpg', alt: 'FSA Event 5' },
]

export default function PhotoCarousel() {
  const [current, setCurrent] = useState(0)

  const prev = () => setCurrent(i => (i - 1 + slides.length) % slides.length)
  const next = () => setCurrent(i => (i + 1) % slides.length)

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Viewport: clips the sliding track so side cards peek in */}
      <div className="overflow-hidden w-full">
        {/* Sliding track — CSS variables handle desktop vs mobile offset/width */}
        <div
          className="flex transition-all duration-300"
          style={{
            transform: `translateX(calc(var(--carousel-offset) - ${current} * var(--carousel-card-w)))`,
          }}
        >
          {slides.map((slide, i) => (
            // Outer slot sets flex width; inner card receives the visual transforms
            <div
              key={i}
              className="shrink-0 px-2"
              style={{ width: 'var(--carousel-card-w)' }}
            >
              <div
                className={`relative h-96 overflow-hidden rounded-[40px] bg-[#2a2a2a] transition-all duration-300 ${
                  i === current
                    ? 'opacity-100 scale-100'
                    : 'opacity-60 scale-95'
                }`}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 85vw, 320px"
                  quality={85}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation: arrows + dot indicators */}
      <div className="flex items-center justify-center gap-2 shrink-0">
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="p-2 text-white hover:opacity-70 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5 px-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
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
          className="p-2 text-white hover:opacity-70 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </div>
  )
}
