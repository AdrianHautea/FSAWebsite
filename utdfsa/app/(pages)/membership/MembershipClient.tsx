// ── MembershipClient.tsx ─────────────────────────────────────
// client component — membership purchase page with stripe checkout
//
// data:  props from MembershipPage (prices in cents, early-bird flag and deadline, membership year)
// deps:  POST /api/membership/checkout (creates a stripe checkout session)
// notes: all prices are stored and passed in cents; formatPrice converts to display dollars;
//        early-bird pricing is determined server-side by comparing now vs. earlyBirdDeadline
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  displayPrice: number
  regularPrice: number
  isEarlyBird: boolean
  earlyBirdDeadline: string
  membershipYear: string
}

// formats cents to a dollar string
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const BENEFITS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2 2 2 0 000 4 2 2 0 010 4 2 2 0 01-2 2H6a2 2 0 01-2-2 2 2 0 000-4 2 2 0 010-4z" />
        <path d="M14 6v12" strokeDasharray="2 2" />
      </svg>
    ),
    title: 'Member Event Pricing',
    desc: 'Discounted tickets on every party / social event.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.2c2.5.4 4.5 2.5 4.5 5.3" />
      </svg>
    ),
    title: 'Pamilya Placement',
    desc: 'Get sorted into a pamilya and meet your ates, kuyas, and fellow adings.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
    title: 'Points & Attendance',
    desc: 'Track your points and attendance history toward Goodphil eligibility.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="10" width="16" height="11" rx="2.5" />
        <path d="M8 10V7a4 4 0 018 0v3" />
      </svg>
    ),
    title: 'Member-Only Content',
    desc: 'Access exclusive resources, photo dumps, and member announcements.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 4l4 3 4-3 4 3-3 4v9H7v-9L4 7z" />
      </svg>
    ),
    title: 'Merch & Perks',
    desc: 'First dibs on limited FSA merch drops and partner discounts.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 5.9L12 16.9 6.7 19.3l1.2-5.9L3.4 9.3l6-.7z" />
      </svg>
    ),
    title: 'Officer Eligibility',
    desc: 'Membership is your first step toward running for the officer board.',
  },
]

const CHECKS = [
  'Member pricing on all events',
  'Pamilya placement',
  'Points & attendance tracking',
  'Member-only content',
]

const FAQS = [
  {
    q: 'How long does membership last?',
    a: 'Membership covers the full 2026–2027 academic year, from fall through spring. You only pay once per year.',
  },
  {
    q: 'Do I have to be Filipino to join?',
    a: 'Not at all! UTD FSA is open to everyone. We welcome anyone interested in celebrating Filipino-American culture and community.',
  },
  {
    q: 'What is a Pamilya?',
    a: 'A Pamilya is your FSA family — a small group of members and upperclassmen (kuyas / ates) who hang out, support each other, and compete together throughout the year.',
  },
  {
    q: 'I have an officer code — where do I enter it?',
    a: 'After you start checkout you can enter your officer code on the next page to apply your discount before paying.',
  },
]

// ============================================================
// UI — safe to restyle everything below this line
// available data (props from MembershipPage):
//   displayPrice (number, cents) — price to show (early bird or regular)
//   regularPrice (number, cents) — full regular price (for strikethrough)
//   isEarlyBird (bool) — true when early bird pricing is active
//   earlyBirdDeadline (ISO string) — when early bird ends
//   membershipYear (string) — e.g. "2024–2025"
// handlePayment: do not modify — POSTs to /api/membership/checkout
//   and redirects to the Stripe checkout URL
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function MembershipClient({
  displayPrice,
  regularPrice,
  isEarlyBird,
  earlyBirdDeadline,
  membershipYear,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState([true, false, false, false])

  // ── handlePayment ────────────────────────────────────────────
  // opens the stripe checkout page; on success stripe redirects back with ?success=true
  async function handlePayment() {
    setLoading(true)
    setError(null)

    // api: calls POST /api/membership/checkout — creates a stripe checkout session and returns the redirect URL — do not change this endpoint
    const res = await fetch('/api/membership/checkout', {
      method: 'POST',
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? 'something went wrong, please try again')
      setLoading(false)
    }
  }

  const earlyBirdEnd = new Date(earlyBirdDeadline).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  // step 01 desc uses membershipYear prop so it lives inside the component
  const steps = [
    {
      num: '01',
      title: 'Pay your dues',
      desc: `Check out securely through Stripe — membership covers the full ${membershipYear} school year.`,
    },
    {
      num: '02',
      title: 'Make your account',
      desc: 'Set up your member profile so you can be sorted and start tracking points right away.',
    },
    {
      num: '03',
      title: 'Show up',
      desc: 'Scan in at events to earn points, meet your pamilya, and become part of the family.',
    },
  ]

  return (
    <main className="bg-brand-bg min-h-screen text-white overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto">

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative px-6 md:px-14 pt-16 md:pt-20 pb-14 md:pb-20">
          {/* green radial glow — brand accent only, no purple/orange */}
          <div
            aria-hidden
            className="absolute -top-10 -left-14 w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(147,208,123,0.12) 0%, transparent 68%)' }}
          />

          <div className="relative z-10 md:grid md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:items-center">

            {/* left: copy */}
            <div>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/30 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span className="font-display font-bold text-[11px] tracking-[0.12em] text-accent-green uppercase">
                  Membership open · {membershipYear}
                </span>
              </div>

              <h1 className="font-display font-black text-[clamp(48px,6.5vw,84px)] leading-[0.92] tracking-[-0.03em] text-white">
                BECOME<br />A MEMBER
              </h1>

              <p className="max-w-[440px] text-lg leading-[1.65] text-[#9a9a9a] font-medium mt-6">
                Join UTD FSA and unlock member pricing on every event, your pamilya placement, points tracking, and a whole community waiting to call you family.
              </p>

              {/* stats — "12 pamilyas" omitted per design spec */}
              <div className="flex items-center gap-7 mt-9">
                <div>
                  <div className="font-display font-extrabold text-[30px] text-white tracking-[-0.02em]">600+</div>
                  <div className="text-[12.5px] text-[#7a7a7a] font-semibold tracking-[0.04em] mt-0.5">ACTIVE MEMBERS</div>
                </div>
                <span className="w-px h-10 bg-white/10" />
                <div>
                  <div className="font-display font-extrabold text-[30px] text-white tracking-[-0.02em]">20+</div>
                  <div className="text-[12.5px] text-[#7a7a7a] font-semibold tracking-[0.04em] mt-0.5">EVENTS A YEAR</div>
                </div>
              </div>
            </div>

            {/* desktop: 3-photo collage — left tall (2:3), top-right + bottom-right (1:1) */}
            <div className="hidden md:grid grid-cols-2 grid-rows-[170px_170px] gap-3.5 relative z-10">
              <div className="row-span-2 relative rounded-[18px] overflow-hidden border border-white/[0.08]">
                <Image
                  src="/mem1.jpg"
                  alt="FSA pamilya"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 25vw, 320px"
                />
              </div>
              <div className="relative rounded-[18px] overflow-hidden border border-white/[0.08]">
                <Image
                  src="/mem2.jpg"
                  alt="FSA events"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 20vw, 256px"
                />
              </div>
              <div className="relative rounded-[18px] overflow-hidden border border-white/[0.08]">
                <Image
                  src="/mem3.jpg"
                  alt="Goodphil"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 20vw, 256px"
                />
              </div>
            </div>

          </div>

          {/* mobile: single pamilya photo at 3:2 below the copy block */}
          <div className="md:hidden relative aspect-[3/2] rounded-2xl overflow-hidden border border-white/[0.08] mt-8 z-10">
            <Image
              src="/mem1.jpg"
              alt="FSA pamilya"
              fill
              className="object-cover"
              sizes="90vw"
            />
          </div>
        </section>

        {/* ── BENEFITS + PRICING ──────────────────────────── */}
        <section className="px-6 md:px-14 pb-7 grid md:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch">

          {/* benefits panel */}
          <div className="bg-[#101010] border border-white/[0.08] rounded-[20px] p-7 md:p-9">
            <h2 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-white mb-6">What you get</h2>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {BENEFITS.map(b => (
                <div
                  key={b.title}
                  className="flex gap-3.5 items-start p-4 bg-[#161616] border border-white/[0.07] rounded-[14px] hover:border-accent-green/30 transition-colors"
                >
                  <div className="shrink-0 w-9 h-9 rounded-[10px] bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green">
                    {b.icon}
                  </div>
                  <div>
                    <div className="text-[14.5px] font-bold text-white tracking-[-0.01em] mb-1">{b.title}</div>
                    <div className="text-[12.5px] leading-[1.5] text-[#8c8c8c] font-medium">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* pricing card */}
          <div
            className="relative bg-gradient-to-br from-[#161616] to-[#101010] border border-accent-green/30 rounded-[20px] p-7 md:p-8 flex flex-col"
            style={{ boxShadow: '0 30px 70px -40px rgba(147,208,123,0.16)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-display font-extrabold text-[17px] tracking-[-0.01em] text-white">UTD FSA MEMBERSHIP</div>
                <div className="text-[13px] text-[#8c8c8c] font-semibold mt-1">{membershipYear} · Full Year</div>
              </div>
              {/* only renders when early bird pricing is active */}
              {isEarlyBird && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green/10 border border-accent-green/30 text-[10.5px] font-extrabold tracking-[0.07em] text-accent-green uppercase whitespace-nowrap">
                  Early Bird
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 mt-6 mb-1">
              <span className="font-display font-black text-[50px] tracking-[-0.03em] text-accent-green leading-none">
                {formatPrice(displayPrice)}
              </span>
              {/* only renders when early bird pricing is active — shows crossed-out regular price */}
              {isEarlyBird && (
                <span className="text-[20px] font-semibold text-[#5e5e5e] line-through">{formatPrice(regularPrice)}</span>
              )}
            </div>
            {/* only renders when early bird pricing is active */}
            {isEarlyBird && (
              <div className="text-[13px] text-[#9a9a9a] font-medium">
                Early-bird pricing ends <span className="text-[#cfcfcf] font-bold">{earlyBirdEnd}</span>
              </div>
            )}

            <div className="h-px bg-white/[0.08] my-5" />

            <div className="flex flex-col gap-3 mb-6">
              {CHECKS.map(c => (
                <div key={c} className="flex items-center gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-accent-green/10 flex items-center justify-center">
                    <svg
                      width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      className="text-accent-green"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-[14px] text-[#dcdcdc] font-semibold">{c}</span>
                </div>
              ))}
            </div>

            {/* only renders when handlePayment returns an API error */}
            {error && (
              <p className="font-sans text-sm text-red-400 mb-4">{error}</p>
            )}

            <button
              onClick={handlePayment}
              disabled={loading}
              className="mt-auto w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.01em] cursor-pointer hover:brightness-[1.08] hover:shadow-[0_16px_38px_-14px_rgba(147,208,123,0.4)] active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
            >
              {loading ? 'Redirecting to payment...' : `Pay ${formatPrice(displayPrice)}`}
            </button>

            <div className="flex items-center justify-center gap-2 mt-3.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="1.8">
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
              <span className="text-[11.5px] text-[#7a7a7a] font-medium text-center">
                Secure payment powered by Stripe · officer code on next page
              </span>
            </div>
          </div>

        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section className="px-6 md:px-14 py-12">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-white whitespace-nowrap">How it works</h2>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {steps.map(s => (
              <div key={s.num} className="bg-[#101010] border border-white/[0.08] rounded-2xl p-6">
                <div className="font-display font-black text-[18px] text-accent-green mb-4">{s.num}</div>
                <div className="text-[16px] font-bold text-white tracking-[-0.01em] mb-2">{s.title}</div>
                <div className="text-[13.5px] leading-[1.6] text-[#8c8c8c] font-medium">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="px-6 md:px-14 pb-16">
          <div className="flex items-center gap-4 mb-7">
            <h2 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-white whitespace-nowrap">Questions</h2>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((f, i) => (
              <div
                key={i}
                onClick={() => setFaqOpen(prev => prev.map((v, j) => j === i ? !v : v))}
                className="border border-white/[0.08] rounded-[14px] bg-[#101010] overflow-hidden cursor-pointer hover:border-white/[0.16] transition-colors"
              >
                <div className="flex items-center justify-between gap-4 px-6 py-5">
                  <span className="text-[15.5px] font-bold text-white tracking-[-0.01em]">{f.q}</span>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="2.2"
                    className="shrink-0 transition-transform duration-300 ease-in-out"
                    style={{ transform: faqOpen[i] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {faqOpen[i] && (
                  <div className="px-6 pb-5 text-[14px] leading-[1.65] text-[#9a9a9a] font-medium">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
