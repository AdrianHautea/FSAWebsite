// ── Footer.tsx ────────────────────────────────────────────
// site-wide footer with social icon links and credit bar
//
// data:  no props — all social links are hardcoded constants
// notes: mailto links omit target/_blank; external links open in new tab

import Image from 'next/image'
import Link from 'next/link'

// ── social links ─────────────────────────────────────────
const SOCIALS = [
  { href: 'https://instagram.com/fsautd',  label: 'Instagram', icon: '/instagram.svg' },
  { href: 'https://youtube.com/@fsautd',   label: 'YouTube',   icon: '/youtube.svg'   },
  { href: 'https://tiktok.com/@utdfsa',    label: 'TikTok',    icon: '/tiktok.svg'    },
  { href: 'https://discord.gg/uVRmuF3BT', label: 'Discord',   icon: '/discord.svg'   },
  { href: 'mailto:fsautd@gmail.com',       label: 'Email',     icon: '/gmail.svg'     },
]

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-brand-bg mt-auto">
      <div className="px-6 py-6 flex items-center justify-between gap-8">
        {/* logo + tagline */}
        <div className="flex flex-col gap-2">
          <Link href="/" aria-label="UTD FSA home">
            <Image
              src="/bare-logo.svg"
              alt="UTD FSA"
              width={43}
              height={43}
              style={{ width: '43px', height: '43px' }}
            />
          </Link>
          <p className="font-sans text-xs text-white/30 tracking-wide">
            University of Texas at Dallas Filipino Student Association
          </p>
        </div>

        {/* credit content — center column, desktop only; mobile version is below */}
        <div className="hidden md:flex flex-col items-center gap-1.5">
          <Link href="/privacy" className="text-white/50 text-[11px] uppercase tracking-widest font-medium hover:text-white/65 transition-colors whitespace-nowrap">
            Privacy Policy
          </Link>
          <p className="text-white/60 text-xs uppercase tracking-widest font-medium text-center">
            WEBSITE CURATED BY THE UTD FSA 2026-27 WEB COMMITTEE
          </p>
        </div>

        {/* right: social links + slogan */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            {SOCIALS.map(({ href, label, icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                // mailto links don't need a new tab or noopener rel
                target={href.startsWith('mailto') ? undefined : '_blank'}
                rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                className="w-11 h-11 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:border-white/60 hover:text-white transition-colors"
              >
                <Image
                  src={icon}
                  alt={label}
                  width={16}
                  height={16}
                  style={{ width: '16px', height: '16px', opacity: 0.6 }}
                />
              </a>
            ))}
          </div>
          <p className="font-display font-semibold text-[9px] text-white text-right leading-relaxed">
            &ldquo;WHO&rsquo;S GOT THAT GOOD D?&rdquo; &ldquo;WE GOT THAT GOOD D!&rdquo;<br />
            &ldquo;ONE, TWO, THREE! GIMME A U-T-D!&rdquo;
          </p>
        </div>
      </div>

      {/* credit bar — mobile only; desktop version lives as center column above */}
      <div className="md:hidden py-3 px-6 flex flex-col items-center justify-center gap-1.5">
        <Link href="/privacy" className="text-white/50 text-[11px] uppercase tracking-widest font-medium hover:text-white/65 transition-colors whitespace-nowrap">
          Privacy Policy
        </Link>
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium text-center">
          WEBSITE CURATED BY THE UTD FSA 2026-27 WEB COMMITTEE
        </p>
      </div>

      {/* institutional disclaimer — required non-link text, visually recedes below all other footer content */}
      <div className="border-t border-white/10 py-3 px-6">
        <p className="font-sans text-[11px] text-white/45 text-center leading-[1.6] max-w-2xl mx-auto">
          This website is published by the Filipino Student Association at UTD, a registered student organization. This website is not an official publication of The University of Texas at Dallas and does not represent the views of the University or its officers.
        </p>
      </div>
    </footer>
  )
}
