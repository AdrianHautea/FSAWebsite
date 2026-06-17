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
      <div className="px-6 py-8 flex items-center justify-between gap-8">
        {/* logo + tagline */}
        <div className="flex flex-col gap-2">
          <Link href="/" aria-label="UTD FSA home">
            <Image
              src="/logo-head.png"
              alt="UTD FSA"
              width={120}
              height={40}
              style={{ height: '40px', width: 'auto' }}
            />
          </Link>
          <p className="font-sans text-xs text-white/30 tracking-wide">
            University of Texas at Dallas Filipino Student Association
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
                className="w-8 h-8 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:border-white/60 hover:text-white transition-colors"
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
          <p className="font-display font-semibold text-[11.7px] text-white text-right leading-relaxed">
            &ldquo;WHO&rsquo;S GOT THAT GOOD D?&rdquo; &ldquo;WE GOT THAT GOOD D!&rdquo;<br />
            &ldquo;ONE, TWO, THREE! GIMME A U-T-D!&rdquo;
          </p>
        </div>
      </div>

      {/* credit bar */}
      <div className="border-t border-white/10 py-3 px-6">
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium text-center">
          WEBSITE CURATED BY THE UTD FSA 2026-27 WEB COMMITTEE
        </p>
      </div>
    </footer>
  )
}
