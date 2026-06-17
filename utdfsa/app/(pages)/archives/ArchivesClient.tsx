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

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Gallery } from '@/types/database'

interface Props {
  galleries: Gallery[]
}

export default function ArchivesClient({ galleries }: Props) {
  // tracks the active semester filter; 'All' shows every gallery
  const [activeFilter, setActiveFilter] = useState('All')

  // ── filter options ────────────────────────────────────────
  // build unique "Semester Year" labels from galleries array in arrival order;
  // re-derived only when the galleries prop changes
  const filterOptions = useMemo(() => {
    const seen = new Set<string>()
    const options = ['All']
    for (const g of galleries) {
      if (g.semester && g.year) {
        const label = `${g.semester} ${g.year}`
        if (!seen.has(label)) {
          seen.add(label)
          options.push(label)
        }
      }
    }
    return options
  }, [galleries])

  // re-filters the gallery list whenever activeFilter or galleries prop changes
  const filtered = useMemo(() => {
    if (activeFilter === 'All') return galleries
    return galleries.filter(g => `${g.semester} ${g.year}` === activeFilter)
  }, [galleries, activeFilter])

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Page header */}
      <div className="px-6 sm:px-10 lg:px-14 pt-14 pb-8">
        <p className="font-display font-bold text-[12px] tracking-[0.2em] text-[#6f6f6f] uppercase mb-[18px]">
          Photo Archive
        </p>
        <h1 className="font-display font-black leading-[0.94] tracking-[-0.02em] text-white uppercase"
          style={{ fontSize: 'clamp(46px, 7vw, 78px)' }}>
          Archives
        </h1>
        <p className="text-[18px] text-[#8c8c8c] font-medium mt-4">
          Every moment, captured.
        </p>
      </div>

      {/* Filter pills */}
      <div className="px-6 sm:px-10 lg:px-14 pb-7 flex items-center gap-2.5 flex-wrap">
        {filterOptions.map((option) => {
          const active = option === activeFilter
          return (
            <button
              key={option}
              onClick={() => setActiveFilter(option)}
              className="filter-pill px-[18px] py-[9px] rounded-full text-[13px] font-bold tracking-[0.02em] transition-all duration-[180ms] cursor-pointer"
              style={{
                background: active ? '#466a47' : 'rgba(255,255,255,0.03)',
                color: active ? '#fff' : '#b8b8b8',
                border: `1px solid ${active ? '#466a47' : 'rgba(255,255,255,0.13)'}`,
              }}
            >
              {option}
            </button>
          )
        })}
        <span className="ml-auto text-[13px] text-[#5e5e5e] font-medium">
          {filtered.length} {filtered.length === 1 ? 'gallery' : 'galleries'}
        </span>
      </div>

      {/* Gallery grid or empty state */}
      <div className="px-6 sm:px-10 lg:px-14 pb-14">
        {/* only renders when filtered gallery count is zero — do not remove this condition */}
        {filtered.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl min-h-[300px] flex flex-col items-center justify-center gap-4 text-center px-10 py-10">
            <div className="w-[58px] h-[58px] rounded-2xl bg-white/[0.04] border border-white/[0.09] flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.7" />
                <path d="M21 15l-5-5L4 21" />
              </svg>
            </div>
            <p className="font-display font-bold text-[18px] text-[#cfcfcf] tracking-[-0.01em]">
              No galleries yet
            </p>
            <p className="text-[14.5px] text-[#7a7a7a] font-medium max-w-[280px] leading-relaxed">
              Check back soon — we&apos;re busy capturing the next chapter of the FSA pamilya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map((gallery) => {
              const termLabel = [gallery.semester, gallery.year].filter(Boolean).join(' ')

              const inner = (
                <>
                  {/* Cover photo */}
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

                  {/* Hover overlay */}
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
                          <span className="text-[12.5px] font-medium text-[#b3b3b3] tracking-[0.01em]">
                            {termLabel}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold tracking-[0.02em] text-[#75ba78] whitespace-nowrap ml-auto">
                          View Gallery
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )

              const cardClass = 'gcard relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-[#161616]'

              // route: gallery.google_photos_url — opens the Google Photos album in a new tab — do not change this path
              return gallery.google_photos_url ? (
                <Link
                  key={gallery.id}
                  href={gallery.google_photos_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClass}
                >
                  {inner}
                </Link>
              ) : (
                <div key={gallery.id} className={cardClass}>
                  {inner}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .gcard .g-reveal { opacity: 0; transition: opacity .3s ease; }
        .gcard:hover .g-reveal { opacity: 1; }
        .gcard .g-photo { transition: transform .35s cubic-bezier(.2,.7,.2,1); }
        .gcard:hover .g-photo { transform: scale(1.04); }
        .gcard { transition: transform .3s cubic-bezier(.2,.7,.2,1); }
        .gcard:hover { transform: scale(1.02); z-index: 3; }
        .filter-pill:hover { border-color: rgba(255,255,255,0.34) !important; }
      `}</style>
    </div>
  )
}
