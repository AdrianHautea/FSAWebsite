'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import type { Member } from '@/types/database'

/**
 * Props — passed down from the root layout server component (app/layout.tsx)
 *   initialMember — the logged-in Member row at SSR time; null when not signed in.
 *     The client-side auth listener keeps this in sync with subsequent sign-in/sign-out events.
 */
interface NavbarProps {
  initialMember: Pick<Member, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'role'> | null
}

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   member (Member | null) — full member row when signed in, null otherwise;
//     fields: id, first_name, last_name, avatar_url, role, membership_status, …
//   isOfficer (bool) — true when member.role is 'officer' or 'admin'
//   pathname (string) — current page path, used to build the ?next= redirect
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
export default function Navbar({ initialMember }: NavbarProps) {
  type NavbarMember = Pick<Member, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'role'>
  const [member, setMember] = useState<NavbarMember | null>(initialMember)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [goodphilOpen, setGoodphilOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const goodphilRef = useRef<HTMLLIElement>(null)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    // only listen for changes after initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data } = await supabase
            .from('members')
            .select('id, first_name, last_name, avatar_url, role')
            .eq('email', session.user.email!)
            .maybeSingle()
          setMember(data ?? null)
        }
        if (event === 'SIGNED_OUT') {
          setMember(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (goodphilRef.current && !goodphilRef.current.contains(e.target as Node)) {
        setGoodphilOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    // route: /auth/logout — server route that clears the Supabase session cookie — do not change this path
    window.location.href = '/auth/logout'
  }

  const isOfficer = member?.role === 'officer' || member?.role === 'admin'
  const pathname = usePathname()

  return (
    <nav className="flex justify-between items-center px-6 py-4">
      {/* route: / — home page — do not change this path */}
      <Link href="/">
        <img
          src="/logo.jpg"
          alt="UTD FSA Logo"
          className="h-10 w-auto"
        />
      </Link>

      <ul className="flex gap-6 items-center">
        {/* route: /about — About Us page — do not change this path */}
        <li><Link href="/about">About Us</Link></li>
        {/* route: /pamilyas — Pamilyas info page — do not change this path */}
        <li><Link href="/pamilyas">Pamilyas</Link></li>

        <li className="relative" ref={goodphilRef}>
          <button
            onClick={() => setGoodphilOpen(prev => !prev)}
            className="flex items-center gap-1"
          >
            Goodphil
            <span className="text-xs">▾</span>
          </button>

          {/* only renders when the Goodphil dropdown button has been clicked — do not remove this condition */}
          {goodphilOpen && (
            <div className="absolute top-full left-0 mt-2 w-40 bg-white shadow-lg rounded-lg py-1 z-50">
              {/* route: /goodphil/about — About Goodphil page — do not change this path */}
              <Link href="/goodphil/about" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>About Goodphil</Link>
              <hr className="my-1" />
              {/* route: /goodphil/cultural — Cultural Goodphil branch page — do not change this path */}
              <Link href="/goodphil/cultural" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Cultural</Link>
              {/* route: /goodphil/modern — Modern Goodphil branch page — do not change this path */}
              <Link href="/goodphil/modern" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Modern</Link>
              {/* route: /goodphil/spirit — Spirit Goodphil branch page — do not change this path */}
              <Link href="/goodphil/spirit" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Spirit</Link>
              {/* route: /goodphil/sports — Sports Goodphil branch page — do not change this path */}
              <Link href="/goodphil/sports" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Sports</Link>
            </div>
          )}
        </li>

        {/* route: /archives — public photo archives page — do not change this path */}
        <li><Link href="/archives">Archives</Link></li>
        {/* route: /events — public events listing page — do not change this path */}
        <li><Link href="/events">Events</Link></li>

        {/* only renders the avatar/dropdown when a member is signed in; otherwise shows the Sign In button — do not remove this condition */}
        {member ? (
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-2"
            >
              {/* only renders the Google avatar image when member.avatar_url is set — do not remove this condition */}
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement
                    if (sibling) sibling.style.display = 'flex'
                  }}
                />
              ) : null}
              {/* fallback initials avatar shown when avatar_url is absent or fails to load — do not remove */}
              <div
                className="w-8 h-8 rounded-full bg-gray-400 items-center justify-center text-white text-sm font-bold"
                style={{ display: member.avatar_url ? 'none' : 'flex' }}
              >
                {member.first_name?.[0]}{member.last_name?.[0]}
              </div>
            </button>

            {/* only renders when the avatar button has been clicked — do not remove this condition */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg py-1 z-50">
                {/* route: /member/profile — member profile page — do not change this path */}
                <Link href="/member/profile" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Profile</Link>
                {/* route: /member/orders — member ticket order history page — do not change this path */}
                <Link href="/member/orders" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Order History</Link>
                {/* route: /member/attendance — member attendance history page — do not change this path */}
                <Link href="/member/attendance" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Attendance History</Link>

                {/* only renders officer-specific links when member.role is 'officer' or 'admin' — do not remove this condition */}
                {isOfficer && (
                  <>
                    <hr className="my-1" />
                    {/* route: /officer/events — officer event management dashboard — do not change this path */}
                    <Link href="/officer/events" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Manage Events</Link>
                    {/* route: /officer/gallery — officer gallery management dashboard — do not change this path */}
                    <Link href="/officer/gallery" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Create Gallery</Link>
                    {/* route: /officer/scan — officer QR code ticket scanner — do not change this path */}
                    <Link href="/officer/scan" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Scan QR Codes</Link>
                    {/* route: /officer/goodphil — goodphil eligibility lookup — do not change this path */}
                    <Link href="/officer/goodphil" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Goodphil Eligibility</Link>
                    {/* route: /officer/applications — ading and kuyate application review — do not change this path */}
                    <Link href="/officer/applications" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Applications</Link>
                  </>
                )}

                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Log Out
                </button>
              </div>
            )}
          </li>
        ) : (
          <li>
            {/* route: /login?next=<pathname> — sign-in page; ?next causes a redirect back here after auth — do not change this path */}
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Sign In
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
