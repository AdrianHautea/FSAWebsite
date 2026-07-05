// ── ArchivesClient.tsx ───────────────────────────────────────
// client component — photo archive gallery grid with semester filter pills
//
// data:  galleries prop (Gallery[]) — passed from server component (archives/page.tsx)
//        fields used: id, title, cover_photo_url, google_photos_url, semester, year
// notes: filter options are derived from the galleries array at render time;
//        clicking a gallery card opens the google_photos_url in a new tab;
//        cards without a google_photos_url render as non-interactive divs
// ─────────────────────────────────────────────────────────────
'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Gallery } from '@/types/database'

interface Props {
  galleries: Gallery[]
}

export default function ArchivesClient({ galleries }: Props) {
  // activeFilter drives pill highlight immediately on click
  // displayFilter drives which cards render (lags by 220ms for crossfade)
  const [activeFilter, setActiveFilter] = useState('All')
  const [displayFilter, setDisplayFilter] = useState('All')
  const [gridVisible, setGridVisible] = useState(true)

  const titleRef   = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const gridRef    = useRef<HTMLDivElement>(null)

  // ── filter options ────────────────────────────────────────
  const filterOptions = useMemo(() => {
    const seen = new Set<string>()
    const options = ['All']
    for (const g of galleries) {
      if (g.semester && g.year) {
        const label = `${g.semester} ${g.year}`
        if (!seen.has(label)) { seen.add(label); options.push(label) }
      }
    }
    return options
  }, [galleries])

  const filtered = useMemo(() => {
    if (displayFilter === 'All') return galleries
    return galleries.filter(g => `${g.semester} ${g.year}` === displayFilter)
  }, [galleries, displayFilter])

  // ── header entrance (mount only) ─────────────────────────
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const sequence = [
      { ref: titleRef,    anim: 'archFadeUp24 700ms ease-out both' },
      { ref: subtitleRef, anim: 'archFadeUp16 600ms ease-out 150ms both' },
      { ref: filtersRef,  anim: 'archFadeUp12 500ms ease-out 250ms both' },
    ]

    if (reduced) {
      sequence.forEach(({ ref }) => { if (ref.current) ref.current.style.opacity = '1' })
      return
    }

    sequence.forEach(({ ref, anim }) => {
      const el = ref.current
      if (!el) return
      el.style.animation = 'none'
      void el.offsetHeight
      el.style.animation = anim
    })
  }, [])

  // ── gallery card entrance (mount only, scroll-triggered) ─
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const grid = gridRef.current
    if (!grid) return

    const cards = Array.from(grid.querySelectorAll('.gcard')) as HTMLElement[]
    cards.forEach(card => {
      card.style.opacity = '0'
      card.style.transform = 'translateY(24px) scale(0.98)'
    })

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting)
      visible.forEach((entry, i) => {
        const card = entry.target as HTMLElement
        const delay = Math.min(i * 75, 225)
        card.style.transition = `opacity 600ms ease-out ${delay}ms, transform 600ms ease-out ${delay}ms`
        card.style.opacity = '1'
        card.style.transform = 'translateY(0) scale(1)'
        observer.unobserve(card)
        // Remove inline styles after entrance so CSS hover transitions take back over
        setTimeout(() => { card.style.cssText = '' }, 600 + delay + 50)
      })
    }, { threshold: 0.05 })

    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  // ── filter change: crossfade grid, then swap cards ────────
  function handleFilterChange(option: string) {
    if (option === activeFilter) return
    setActiveFilter(option)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setDisplayFilter(option); return }
    setGridVisible(false)
    setTimeout(() => { setDisplayFilter(option); setGridVisible(true) }, 220)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">

      {/* Page header */}
      <div className="px-6 sm:px-10 lg:px-14 pt-14 pb-8">
        <h1
          ref={titleRef}
          className="font-display font-black leading-[0.96] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(42px,6vw,74px)', opacity: 0 }}
        >
          Archives
        </h1>
        <p
          ref={subtitleRef}
          className="text-[18px] text-[#8c8c8c] font-medium mt-4"
          style={{ opacity: 0 }}
        >
          Every moment, captured.
        </p>
      </div>

      {/* Filter pills */}
      <div
        ref={filtersRef}
        className="px-6 sm:px-10 lg:px-14 pb-7 flex items-center gap-2.5 flex-wrap"
        style={{ opacity: 0 }}
      >
        {filterOptions.map((option) => {
          const active = option === activeFilter
          return (
            <button
              key={option}
              onClick={() => handleFilterChange(option)}
              className="filter-pill px-4.5 py-2.5 rounded-xl text-[13px] font-bold tracking-[0.02em] transition-all duration-150 cursor-pointer"
              style={{
                background: active ? '#75ba78' : 'rgba(255,255,255,0.03)',
                color: active ? '#0e0e0e' : '#b8b8b8',
                border: `1px solid ${active ? '#75ba78' : 'rgba(255,255,255,0.13)'}`,
              }}
            >
              {option}
            </button>
          )
        })}
        <span className="ml-auto text-[13px] text-[#8c8c8c] font-medium">
          {filtered.length} {filtered.length === 1 ? 'gallery' : 'galleries'}
        </span>
      </div>

      {/* Gallery grid or empty state */}
      <div className="px-6 sm:px-10 lg:px-14 pb-14">
        {filtered.length === 0 ? (
          <div
            className="border border-dashed border-white/10 rounded-2xl min-h-[300px] flex flex-col items-center justify-center gap-4 text-center px-10 py-10"
            style={{ animation: 'archFadeUp24 500ms ease-out both' }}
          >
            <div className="w-[58px] h-[58px] rounded-2xl bg-white/[0.04] border border-white/[0.09] flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.7" />
                <path d="M21 15l-5-5L4 21" />
              </svg>
            </div>
            <p className="font-display font-bold text-[18px] text-[#cfcfcf] tracking-[-0.01em]">No galleries yet</p>
            <p className="text-[15px] text-[#7a7a7a] font-medium max-w-[280px] leading-relaxed">
              Check back soon — we&apos;re busy capturing the next chapter of the FSA pamilya.
            </p>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
            style={{ opacity: gridVisible ? 1 : 0, transition: 'opacity 200ms ease-out' }}
          >
            {filtered.map((gallery) => {
              const termLabel = [gallery.semester, gallery.year].filter(Boolean).join(' ')
              const linked = !!gallery.google_photos_url

              const inner = (
                <>
                  <div className="g-photo absolute inset-0 bg-[#161616]">
                    {gallery.cover_photo_url ? (
                      <Image
                        src={gallery.cover_photo_url}
                        alt={gallery.title}
                        fill
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
                        quality={85}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <span className="text-sm text-white/20 font-medium text-center">{gallery.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="g-reveal absolute inset-0">
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)' }}
                    />
                    <div className="absolute left-0 right-0 bottom-0 p-[18px] pb-4 flex flex-col gap-1">
                      <h3 className="font-display font-bold text-[17px] leading-[1.12] tracking-[-0.01em] text-white m-0">
                        {gallery.title}
                      </h3>
                      <div className="flex items-end justify-between gap-2.5 mt-0.5">
                        {termLabel && (
                          <span className="text-[13px] font-medium text-[#b3b3b3] tracking-[0.01em]">{termLabel}</span>
                        )}
                        {linked ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-bold tracking-[0.02em] text-[#75ba78] whitespace-nowrap ml-auto">
                            View Gallery
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium tracking-[0.01em] text-[#7a7a7a] whitespace-nowrap ml-auto">
                            Album coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )

              // unlinked cards get no click affordance (no pointer, no hover-only reveal) — see .gcard:not(.gcard-linked) below
              const cardClass = `gcard relative aspect-square rounded-lg overflow-hidden bg-[#161616]${linked ? ' gcard-linked cursor-pointer' : ''}`

              // route: gallery.google_photos_url — opens the Google Photos album in a new tab — do not change this path
              return linked ? (
                <Link key={gallery.id} href={gallery.google_photos_url!} target="_blank" rel="noopener noreferrer" className={cardClass}>
                  {inner}
                </Link>
              ) : (
                <div key={gallery.id} className={cardClass}>{inner}</div>
              )
            })}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="flex justify-center pt-10">
            <Link
              href="/membership"
              className="text-[14px] font-medium text-[#7a7a7a] hover:text-[#75ba78] transition-colors"
            >
              Want to be in the next album? Become a Member →
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes archFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes archFadeUp24 {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes archFadeUp16 {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes archFadeUp12 {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .arch-label, .arch-title, .arch-subtitle, .arch-filters {
            animation: none !important; opacity: 1 !important; transform: none !important;
          }
          .gcard { opacity: 1 !important; transform: none !important; }
          .gcard, .gcard .g-photo, .gcard .g-reveal { transition: none !important; }
        }
        .gcard-linked .g-reveal { opacity: 0; transition: opacity .3s ease; }
        .gcard-linked:hover .g-reveal { opacity: 1; }
        .gcard:not(.gcard-linked) .g-reveal { opacity: 1; }
        .gcard-linked .g-photo { transition: transform .35s cubic-bezier(.2,.7,.2,1); }
        .gcard-linked:hover .g-photo { transform: scale(1.04); }
        .gcard-linked { transition: transform .3s cubic-bezier(.2,.7,.2,1); }
        .gcard-linked:hover { transform: scale(1.02); z-index: 3; }
        .filter-pill:hover { border-color: rgba(255,255,255,0.34) !important; }
      `}</style>
    </div>
  )
}
