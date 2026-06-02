'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import type { Member } from '@/types/database'

interface NavbarProps {
  initialMember: Member | null
}

export default function Navbar({ initialMember }: NavbarProps) {
  const [member, setMember] = useState<Member | null>(initialMember)
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
            .select('*')
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
    window.location.href = '/auth/logout'
  }

  const isOfficer = member?.role === 'officer' || member?.role === 'admin'
  const pathname = usePathname()

  return (
    <nav className="flex justify-between items-center px-6 py-4">
      <Link href="/">
        <img
          src="/logo.jpg"
          alt="UTD FSA Logo"
          className="h-10 w-auto"
        />
      </Link>

      <ul className="flex gap-6 items-center">
        <li><Link href="/about">About Us</Link></li>
        <li><Link href="/pamilyas">Pamilyas</Link></li>

        <li className="relative" ref={goodphilRef}>
          <button
            onClick={() => setGoodphilOpen(prev => !prev)}
            className="flex items-center gap-1"
          >
            Goodphil
            <span className="text-xs">▾</span>
          </button>

          {goodphilOpen && (
            <div className="absolute top-full left-0 mt-2 w-36 bg-white shadow-lg rounded-lg py-1 z-50">
              <Link href="/goodphil/cultural" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Cultural</Link>
              <Link href="/goodphil/modern" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Modern</Link>
              <Link href="/goodphil/spirit" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Spirit</Link>
              <Link href="/goodphil/sports" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setGoodphilOpen(false)}>Sports</Link>
            </div>
          )}
        </li>

        <li><Link href="/archives">Archives</Link></li>
        <li><Link href="/events">Events</Link></li>

        {member ? (
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-2"
            >
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
              <div
                className="w-8 h-8 rounded-full bg-gray-400 items-center justify-center text-white text-sm font-bold"
                style={{ display: member.avatar_url ? 'none' : 'flex' }}
              >
                {member.first_name?.[0]}{member.last_name?.[0]}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg py-1 z-50">
                <Link href="/member/profile" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Profile</Link>
                <Link href="/member/orders" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Order History</Link>
                <Link href="/member/attendance" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Attendance History</Link>

                {isOfficer && (
                  <>
                    <hr className="my-1" />
                    <Link href="/officer/events" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Manage Events</Link>
                    <Link href="/officer/gallery" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Create Gallery</Link>
                    <Link href="/officer/scan" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>Scan QR Codes</Link>
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