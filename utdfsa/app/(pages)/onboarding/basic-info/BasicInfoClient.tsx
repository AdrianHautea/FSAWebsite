// ── BasicInfoClient.tsx ───────────────────────────────────
// client form for collecting/updating a member's basic profile fields
//
// data:  props — initial (BasicInfoForm) pre-filled from the server component
// deps:  POST /api/onboarding/update-basic-info
// notes: reached from the onboarding "not interested" path or as a standalone profile edit.
//        does not set onboarding_complete — that is handled by the onboarding flow.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toTitleCase, formatPhone } from '@/lib/format'

interface BasicInfoForm {
  first_name: string
  last_name: string
  phone: string
  year: string
  major: string
}

interface Props {
  initial: BasicInfoForm
}

export default function BasicInfoClient({ initial }: Props) {
  const router = useRouter()
  useEffect(() => { router.prefetch('/member/profile'); router.prefetch('/onboarding') }, [router])
  // all editable profile fields; seeded from pre-filled server data via props
  const [form, setForm] = useState<BasicInfoForm>(initial)
  // true while POST /api/onboarding/update-basic-info is in flight
  const [loading, setLoading] = useState(false)
  // validation or api error shown inline above the submit button
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof BasicInfoForm>(field: K, value: BasicInfoForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required')
      return
    }
    if (!form.phone?.trim()) {
      setError('Phone number is required')
      return
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number — e.g. (214) 333-4444')
      return
    }
    if (!form.year) {
      setError('Please select your year')
      return
    }
    if (!form.major.trim()) {
      setError('Major is required')
      return
    }
    setLoading(true)
    setError(null)

    // api: POST /api/onboarding/update-basic-info — saves profile fields, does not touch onboarding_complete
    const res = await fetch('/api/onboarding/update-basic-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to save — please try again.')
      setLoading(false)
      return
    }

    // route: /member/profile — final destination after basic info is saved
    router.push('/member/profile')
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   form — { first_name, last_name, phone, year, major }
  //   loading (bool) — true while the submit API call is in flight
  //   error (string | null) — validation or API error
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================
  const fieldCls = 'w-full px-4 py-[14px] bg-[#141414] border border-white/10 rounded-xl text-white text-[15px] outline-none focus:border-accent-green focus:bg-[#171717] transition-colors placeholder:text-[#7a7a7a]'
  const labelCls = 'flex items-center gap-[5px] mb-[9px] text-[12px] font-bold tracking-[0.1em] text-[#9a9a9a] uppercase'

  return (
    <main className="bg-brand-bg min-h-screen text-white">
      <div className="max-w-[660px] mx-auto px-6 py-14">
        {/* badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/30 mb-6">
          <span className="w-[7px] h-[7px] rounded-full bg-accent-green shrink-0" />
          <span className="font-display font-bold text-[11px] tracking-[0.12em] text-accent-green uppercase">No pamilya — that&apos;s okay</span>
        </div>

        <h1 className="font-display font-black text-[clamp(36px,5vw,62px)] leading-[0.94] tracking-[-0.03em] text-white mb-5">
          Tell Us About Yourself
        </h1>

        <p className="font-sans text-[15px] text-[#9a9a9a] leading-[1.6] mb-10">
          You can still be a full member without joining a pamilya. This sets up your member profile so you don&apos;t miss a thing.
        </p>

        <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-[20px] p-6 md:p-10">
          <div className="flex flex-col gap-5">
            <p className="font-sans text-[14px] text-[#7a7a7a] leading-[1.6]">
              This information will appear on your member profile.
            </p>
            <div className="h-px bg-white/[0.07]" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  First name <span className="text-[#e8654f]">*</span>
                </label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => set('first_name', toTitleCase(e.target.value))}
                  className={fieldCls}
                  placeholder="Your preferred name"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Last name <span className="text-[#e8654f]">*</span>
                </label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => set('last_name', toTitleCase(e.target.value))}
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Phone Number <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', formatPhone(e.target.value))}
                className={fieldCls}
                placeholder="(xxx) xxx-xxxx"
                maxLength={14}
              />
            </div>

            <div>
              <label className={labelCls}>
                Year <span className="text-[#e8654f]">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.year}
                  onChange={e => set('year', e.target.value)}
                  className={`${fieldCls} appearance-none pr-10`}
                >
                  <option value="" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Select Your Year</option>
                  <option value="Freshman" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Freshman</option>
                  <option value="Sophomore" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Sophomore</option>
                  <option value="Junior" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Junior</option>
                  <option value="Senior" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Senior</option>
                  <option value="Graduate" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Graduate</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7a7a7a]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Major <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={form.major}
                onChange={e => set('major', toTitleCase(e.target.value))}
                className={fieldCls}
                placeholder="e.g. Computer Science"
              />
            </div>

            {/* only renders when there is a validation or API error — do not remove this condition */}
            {error && (
              <p className="font-sans text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] disabled:opacity-50 transition-all mt-2"
            >
              {/* only shows "saving..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Saving…' : 'Save & Continue'}
            </button>

            <button
              onClick={() => router.push('/onboarding')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] transition-colors"
            >
              ← Back to pamilya options
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
