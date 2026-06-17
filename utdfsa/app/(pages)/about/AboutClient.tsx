// ── AboutClient.tsx ──────────────────────────────────────────
// client component — about page UI with officer board and past officers accordion
//
// data:  none — all officer data is hardcoded in constants below
// notes: officer photos not yet available; placeholder silhouettes used.
//        update OFFICERS_2025_2026 and PAST_OFFICERS each semester.
//        accordion uses a single openYear string so only one year shows at a time.
// ─────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import Image from 'next/image'

// ── officer data ──────────────────────────────────────────────
// update position/name entries each year; add new year block to PAST_OFFICERS
const OFFICERS_2025_2026 = [
  { position: 'President',           name: 'Genna Ibarra' },
  { position: 'Vice President',      name: 'Simon Choi' },
  { position: 'Secretary',           name: 'Kevalin Staats' },
  { position: 'Treasurer',           name: 'Tristan Casillan' },
  { position: 'Board Advisor',       name: 'Leo dos Remedios' },
  { position: 'Event Coordinator',   name: 'Kim Pham' },
  { position: 'Pamilya Chair',       name: 'Christopher Hay' },
  { position: 'Webmaster',           name: 'Adrian Hautea' },
  { position: 'Sports Coordinator',  name: 'Nikhil Jeeva' },
  { position: 'Sports Coordinator',  name: 'Shayna Silvestre' },
  { position: 'Modern Director',     name: 'Livy Ker' },
  { position: 'Cultural Director',   name: 'Gianna Toledo' },
  { position: 'Cultural Ambassador', name: 'Raffi Abeleda' },
  { position: 'Historian',           name: 'Aliyah Carabeo' },
  { position: 'Marketing Chair',     name: 'Lance Martinez' },
  { position: 'Graphics Chair',      name: 'Skylar Dang' },
  { position: 'Philanthropy Chair',  name: 'Kenneth Le' },
  { position: 'Fundraising Chair',   name: 'Brian Leung' },
]

const PAST_OFFICERS = [
  {
    year: '2025-2026',
    officers: [
      { position: 'President',           names: 'DJ Sagutaon' },
      { position: 'Vice President',      names: 'Leo dos Remedios' },
      { position: 'Secretary',           names: 'Genna Ibarra' },
      { position: 'Treasurer',           names: 'Renzo Artates' },
      { position: 'Board Advisor',       names: 'Czar Nonot' },
      { position: 'Fundraising Chair',   names: 'Ariana Halili' },
      { position: 'Event Coordinator',   names: 'Livy Ker' },
      { position: 'Sports Coordinators', names: 'Richard Aryata, Phuc Tran' },
      { position: 'Historian',           names: 'Lance Martinez' },
      { position: 'Marketing Chair',     names: 'Lauren Siacunco' },
      { position: 'Graphics Chairs',     names: 'Michael Dao, Zoe Zhang' },
      { position: 'Pamilya Chair',       names: 'Josh Eromonsele' },
      { position: 'Webmaster',           names: 'Josh Eromonsele' },
      { position: 'Cultural Ambassador', names: 'Patrick Enerio' },
      { position: 'Cultural Director',   names: 'Tristan Casillan' },
      { position: 'Philanthropy Chair',  names: 'Simon Choi' },
      { position: 'Modern Director',     names: 'Kaden Thephavong' },
    ],
  },
  {
    year: '2024-2025',
    officers: [
      { position: 'President',           names: 'Alvin Bagaoisan' },
      { position: 'Vice President',      names: 'DJ Sagutaon' },
      { position: 'Secretary',           names: 'Vy Tran' },
      { position: 'Treasurer',           names: 'Czar Nonot' },
      { position: 'Event Coordinator',   names: 'Jennifer Chen' },
      { position: 'Historian',           names: 'Russell Ha' },
      { position: 'Marketing Chair',     names: 'Katherine Tran' },
      { position: 'Graphics Chair',      names: 'DJ Sagutaon' },
      { position: 'Pamilya Chair',       names: 'Leo dos Remedios' },
      { position: 'Sports Coordinators', names: 'Brian Luu, Keanu Lee' },
      { position: 'Cultural Ambassador', names: 'Nathan Bucasas' },
      { position: 'Cultural Director',   names: 'Renzo Artates' },
      { position: 'Modern Director',     names: 'Kaden Thephavong' },
      { position: 'Spirit Directors',    names: 'Helena Ramning, Yuan Paulino' },
      { position: 'Fundraising Chair',   names: 'Phat Phung' },
      { position: 'Philanthropy Chair',  names: 'Christopher Chang' },
    ],
  },
  {
    year: '2023-2024',
    officers: [
      { position: 'President',           names: 'Sabrina Uy Tesy' },
      { position: 'Vice President',      names: 'Chris Chan' },
      { position: 'Secretary',           names: 'Julia Nguyen' },
      { position: 'Treasurer',           names: 'Yuan Paulino' },
      { position: 'Event Coordinator',   names: 'Jennifer Chen' },
      { position: 'Historian',           names: 'Adit Patel' },
      { position: 'Graphics Chair',      names: 'Arianna Poblete' },
      { position: 'Pamilya Chair',       names: 'Kevin Ly' },
      { position: 'Sports Coordinators', names: 'Maya Bhaidasna, Marshall Mao' },
      { position: 'Cultural Ambassador', names: 'Alvin Bagaoisan' },
      { position: 'Cultural Director',   names: 'Helena Ramning' },
      { position: 'Modern Directors',    names: 'DJ Sagutaon, Zamira Miranda' },
      { position: 'Fundraising Chair',   names: 'Vy Tran' },
      { position: 'Philanthropy Chair',  names: 'Weber Tsao' },
      { position: 'Spirit Directors',    names: 'Christina Lam, Helena Ramning' },
    ],
  },
  {
    year: '2022-2023',
    officers: [
      { position: 'President',                              names: 'Lani Bergantin' },
      { position: 'Vice President',                         names: 'Eric Brian Roca' },
      { position: 'Secretary',                              names: 'Erica Nah' },
      { position: 'Event Coordinator',                      names: 'Leah Miranda' },
      { position: 'Historian',                              names: 'Kyle Zeng' },
      { position: 'Graphics Chair',                         names: 'Amber Bui' },
      { position: 'Pamilya Chair',                          names: 'Catalina Chang' },
      { position: 'Sports Coordinators',                    names: 'Thach Huynh, Sonny Ton' },
      { position: 'Cultural Ambassador / Spirit Director',  names: 'Rafa Evangelista' },
      { position: 'Cultural Director',                      names: 'Sabrina Uy Tesy' },
      { position: 'Modern Directors',                       names: 'Christina Lam, Lynn Pham' },
      { position: 'Philanthropy Chair',                     names: 'Chris Chan' },
    ],
  },
]

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/fsautd',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@fsautd',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@utdfsa',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.29 8.29 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
      </svg>
    ),
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/uVRmuF3BT',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057c.002.023.016.045.034.059a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.104 13.1 13.1 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    label: 'Email',
    href: 'mailto:fsautd@gmail.com',
    icon: (
      <img src="/gmail.svg" alt="Gmail" width={28} height={28} className="w-7 h-7 opacity-60" />
    ),
  },
]

export default function AboutClient() {
  // tracks which past-officer accordion row is expanded; empty string = all collapsed
  const [openYear, setOpenYear] = useState<string>('2025-2026')

  // ── accordion toggle ──────────────────────────────────────
  // clicking the same open year collapses it; clicking a different year opens it
  function toggleYear(year: string) {
    setOpenYear(prev => prev === year ? '' : year)
  }

  return (
    <main className="bg-brand-bg text-white overflow-x-hidden">

      {/* ── SECTION 1 — WHO WE ARE ──────────────────────────────────── */}
      {/* hero height: compact on mobile, taller on desktop */}
      <section className="relative w-full overflow-hidden"
        style={{ minHeight: 'clamp(320px, 50vh, 620px)' }}>

        {/* background photo — object-center keeps composition */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/about-us-hero.jpg"
            alt="UTD FSA"
            fill
            className="object-cover object-center"
            priority
            quality={90}
            sizes="100vw"
          />
        </div>

        {/* dark overlay — ensures text stays readable over any photo */}
        <div className="absolute inset-0 z-10 bg-black/55" />

        {/* text content — centered, sits above overlay */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 py-20 min-h-[inherit]"
          style={{ minHeight: 'clamp(320px, 50vh, 620px)' }}>
          <div className="max-w-3xl mx-auto">

            <h1
              className="font-display font-black text-white mb-8"
              style={{ fontSize: 'clamp(36px, 5.5vw, 80px)', letterSpacing: '-0.02em' }}
            >
              ABOUT US
            </h1>
            <p
              className="font-sans text-white leading-relaxed max-w-2xl mx-auto"
              style={{ fontSize: 'clamp(15px, 1.5vw, 18px)' }}
            >
              UTD FSA is a student-led social organization at the University of Texas at Dallas,
              created to unite students who are interested in promoting Filipino-American culture.
              Through dance, sports, social events, and community outreach, UTD FSA aims to celebrate
              and foster community through Filipino traditions and heritage.
            </p>

          </div>
        </div>

      </section>

      {/* ── SECTION 2 — OFFICER BOARD ───────────────────────────────── */}
      <section className="py-16 px-6 bg-section-bg">
        <div className="max-w-6xl mx-auto">
          <h2
            className="font-display font-black text-white text-center mb-12"
            style={{ fontSize: 'clamp(16px, 2.2vw, 32px)', letterSpacing: '0.02em' }}
          >
            2026-2027 OFFICER BOARD
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {OFFICERS_2025_2026.map(({ position, name }) => (
              <div
                key={`${position}-${name}`}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden hover:brightness-110 transition-all duration-200"
              >
                {/* replace this div with Next.js Image when officer photos are available:
                    <Image src="/officers/[name].jpg" alt="[Name]" fill
                      className="object-cover object-top" /> */}
                <div className="relative w-full aspect-square bg-[#1e1e1e] flex items-center justify-center overflow-hidden">
                  <svg
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-12 h-12 text-gray-600"
                  >
                    <circle cx="40" cy="28" r="16" fill="currentColor" />
                    <path d="M8 72c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="currentColor" />
                  </svg>
                </div>
                <div className="px-4 py-3">
                  <p className="font-sans text-white/45 text-[11px] uppercase tracking-widest mb-1 leading-snug">
                    {position}
                  </p>
                  <p className="font-sans font-bold text-white text-sm leading-snug">
                    {name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — CONTACT US ──────────────────────────────────── */}
      <section className="py-16 px-6 bg-brand-bg">
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="font-display font-black text-white mb-6"
            style={{ fontSize: 'clamp(16px, 2.2vw, 32px)', letterSpacing: '0.02em' }}
          >
            GET IN TOUCH
          </h2>
          <p
            className="font-sans text-white/60 leading-relaxed mb-8"
            style={{ fontSize: 'clamp(14px, 1.4vw, 17px)' }}
          >
            Have questions about UTD FSA? Reach out to us on Instagram — we respond to DMs and
            are happy to help with anything from membership questions to event details.
          </p>
          <a
            href="https://instagram.com/fsautd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-3 border border-white/30 rounded-full text-white font-sans font-semibold text-sm tracking-wide hover:border-white/60 hover:bg-white/5 transition-all duration-200"
          >
            <InstagramIcon className="w-4 h-4" />
            @utdfsa
          </a>
        </div>
      </section>

      {/* ── SECTION 4 — CONNECT WITH US ─────────────────────────────── */}
      <section className="py-16 px-6 bg-section-bg">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="font-display font-black text-white mb-10"
            style={{ fontSize: 'clamp(16px, 2.2vw, 32px)', letterSpacing: '0.02em' }}
          >
            CONNECT WITH US
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {SOCIALS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target={href === '#' ? undefined : '_blank'}
                rel={href === '#' ? undefined : 'noopener noreferrer'}
                className="flex flex-col items-center gap-3 px-8 py-6 bg-[#1a1a1a] border border-white/10 rounded-xl text-white/60 hover:text-white hover:brightness-110 hover:border-white/20 transition-all duration-200 min-w-[110px]"
              >
                {icon}
                <span className="font-sans text-xs font-semibold tracking-wide">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — PAST OFFICERS ───────────────────────────────── */}
      <section className="py-16 px-6 bg-brand-bg">
        <div className="max-w-4xl mx-auto">
          <h2
            className="font-display font-black text-white text-center mb-10"
            style={{ fontSize: 'clamp(16px, 2.2vw, 32px)', letterSpacing: '0.02em' }}
          >
            PAST OFFICER BOARDS
          </h2>
          <div className="flex flex-col gap-3">
            {PAST_OFFICERS.map(({ year, officers }) => {
              const isOpen = openYear === year
              // format "2024-2025" → "2024 – 2025" for display
              const displayYear = year.replace('-', ' – ')
              return (
                <div key={year}>
                  <button
                    className={`w-full flex items-center justify-between py-4 px-6 bg-[#1a1a1a] border border-white/10 text-left hover:bg-[#222] transition-colors duration-200 ${isOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
                    onClick={() => toggleYear(year)}
                  >
                    <span className="font-sans font-bold text-white text-base">{displayYear}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="bg-[#161616] border border-t-0 border-white/10 rounded-b-xl px-6 py-2">
                      {officers.map(({ position, names }, i) => (
                        <div
                          key={`${year}-${position}`}
                          className={`flex gap-6 py-3 ${i < officers.length - 1 ? 'border-b border-white/10' : ''}`}
                        >
                          <span className="font-sans text-[11px] uppercase tracking-widest text-white/40 w-52 flex-shrink-0 pt-0.5">
                            {position}
                          </span>
                          <span className="font-sans text-sm text-white">{names}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

    </main>
  )
}
