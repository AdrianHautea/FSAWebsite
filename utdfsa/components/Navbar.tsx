'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import type { Member } from '@/types/database'

export default function Navbar() {
  const [member, setMember] = useState<Member | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [goodphilOpen, setGoodphilOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const goodphilRef = useRef<HTMLLIElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadMember() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('email', user.email!)
        .single()

      setMember(data)
    }
    loadMember()
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
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isOfficer = member?.role === 'officer' || member?.role === 'admin'

  return (
    <nav className="flex justify-between items-center px-6 py-4">

      {/* logo */}
      <Link href="/">*Insert Logo Here*</Link>

      {/* main nav links */}
      <ul className="flex gap-6 items-center">

        <li><Link href="/about">About Us</Link></li>

        <li><Link href="/pamilyas">Pamilyas</Link></li>

        {/* goodphil tab with subtabs dropdown */}
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
              <Link
                href="/goodphil/cultural"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => setGoodphilOpen(false)}
              >
                Cultural
              </Link>
              <Link
                href="/goodphil/modern"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => setGoodphilOpen(false)}
              >
                Modern
              </Link>
              <Link
                href="/goodphil/spirit"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => setGoodphilOpen(false)}
              >
                Spirit
              </Link>
              <Link
                href="/goodphil/sports"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => setGoodphilOpen(false)}
              >
                Sports
              </Link>
            </div>
          )}
        </li>

        <li><Link href="/archives">Archives</Link></li>

        <li><Link href="/events">Events</Link></li>

        {/* profile dropdown or sign-in button */}
        {member ? (
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold">
                {member.first_name?.[0]}{member.last_name?.[0]}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg py-1 z-50">

                {/* all members */}
                <Link
                  href="/member/profile"
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/member/orders"
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  Order History
                </Link>
                <Link
                  href="/member/attendance"
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  Attendance History
                </Link>

                {/* officers only */}
                {isOfficer && (
                  <>
                    <hr className="my-1" />
                    <Link
                      href="/officer/events"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Create Event
                    </Link>
                    <Link
                      href="/officer/forms"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Create Form
                    </Link>
                    <Link
                      href="/officer/scan"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Scan QR Codes
                    </Link>
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
              href="/login"
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