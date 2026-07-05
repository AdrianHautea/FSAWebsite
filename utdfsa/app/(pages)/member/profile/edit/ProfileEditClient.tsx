// ── ProfileEditClient.tsx ────────────────────────────────────
// client component — form for editing member profile fields
//
// data:  props from ProfileEditPage (member fields, loginEmail)
// deps:  POST /api/member/update-profile (saves changes to members table)
// notes: loginEmail (google oauth email) is displayed read-only;
//        contact_email is a separate field the user can override for notifications
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toTitleCase, formatPhone } from '@/lib/format'

interface MemberFields {
  first_name: string
  last_name: string
  phone: string | null
  year: string | null
  major: string | null
  contact_email: string | null
}

/**
 * Props — passed down from the ProfileEditPage server component (member/profile/edit/page.tsx)
 *   member     — current saved values for the editable profile fields
 *   loginEmail — the Google OAuth email address; read-only, cannot be changed here
 */
interface Props {
  member: MemberFields
  loginEmail: string
}

// ============================================================
// UI — safe to restyle everything below this line
// available data:
//   member — { first_name, last_name, phone, year, major, contact_email }
//   loginEmail — Google sign-in email (read-only, displayed but not editable)
//   form   — live form state mirroring member fields
//   loading (bool) — true while the save API call is in flight
//   error   (string | null) — API or validation error message
//   success (bool) — true after a successful save (triggers redirect)
// change classnames, layout, colors, and typography freely
// do not remove or rename the variables being rendered
// ============================================================
// ── component ─────────────────────────────────────────────────
export default function ProfileEditClient({ member, loginEmail }: Props) {
  const router = useRouter()
  useEffect(() => { router.prefetch('/member/profile') }, [router])
  // true while the POST /api/member/update-profile request is in flight
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  // true for ~1.2 s after a successful save, before the router redirect fires
  const [success, setSuccess] = useState(false)

  // live form state — initialized from the server-fetched member fields
  const [form, setForm] = useState({
    first_name: member.first_name ?? '',
    last_name: member.last_name ?? '',
    phone: member.phone ?? '',
    year: member.year ?? '',
    major: member.major ?? '',
    contact_email: member.contact_email ?? '',
  })

  // generic field updater — merges a single field into form state
  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ── handleSubmit ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = 'Required'
    if (!form.last_name.trim()) errs.last_name = 'Required'
    if (!form.contact_email.trim()) errs.contact_email = 'Required'
    if (!form.phone.trim()) errs.phone = 'Required'
    else if (form.phone.replace(/\D/g, '').length !== 10) errs.phone = 'Must be 10 digits — e.g. (214) 333-4444'
    if (!form.year) errs.year = 'Required'
    if (!form.major.trim()) errs.major = 'Required'
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})

    setLoading(true)

    try {
      // api: calls POST /api/member/update-profile — saves profile fields to the members table — do not change this endpoint
      const res = await fetch('/api/member/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error ?? 'Failed to save profile — please try again.')
        setLoading(false)
        return
      }

      setSuccess(true)
      // route: /member/profile — member profile view page — do not change this path
      setTimeout(() => router.push('/member/profile'), 1200)
    } catch {
      setServerError('Network error — please try again.')
      setLoading(false)
    }
  }

  const fieldCls = 'w-full px-4 py-3 bg-[#141414] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#7a7a7a] focus:outline-none focus:border-accent-green focus:bg-[#171717] transition-colors'
  const labelCls = 'block font-display font-bold text-xs uppercase tracking-widest text-white/60 mb-1.5'

  return (
    <main className="bg-brand-bg min-h-screen text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="font-display font-black text-[clamp(28px,4vw,48px)] text-white uppercase leading-none mb-6">
          Edit Profile
        </h1>

        {/* loginEmail is the Google OAuth address — shown read-only because it cannot be changed here */}
        <div className="mb-6 p-4 bg-[#141414] border border-white/10 rounded-xl">
          <span className={labelCls}>Login email</span>
          <p className="font-sans text-sm text-accent-gold">{loginEmail}</p>
          <p className="font-sans text-xs text-white/40 mt-1">
            This is tied to your Google account and cannot be changed here.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="first-name" className={labelCls}>First Name <span className="text-[#e8654f]">*</span></label>
              <input
                id="first-name"
                type="text"
                autoComplete="given-name"
                value={form.first_name}
                onChange={e => set('first_name', toTitleCase(e.target.value))}
                className={fieldCls}
                required
              />
              {fieldErrors.first_name && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.first_name}</p>}
            </div>
            <div className="flex-1">
              <label htmlFor="last-name" className={labelCls}>Last Name <span className="text-[#e8654f]">*</span></label>
              <input
                id="last-name"
                type="text"
                autoComplete="family-name"
                value={form.last_name}
                onChange={e => set('last_name', toTitleCase(e.target.value))}
                className={fieldCls}
                required
              />
              {fieldErrors.last_name && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.last_name}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="contact-email" className={labelCls}>
              Contact Email <span className="text-[#e8654f]">*</span>
              <span className="text-white/30 font-normal normal-case tracking-normal ml-1">
                (for event tickets and notifications)
              </span>
            </label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              value={form.contact_email}
              onChange={e => set('contact_email', e.target.value)}
              className={fieldCls}
              placeholder="your@email.com"
              required
            />
            {fieldErrors.contact_email && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.contact_email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className={labelCls}>Phone <span className="text-[#e8654f]">*</span></label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone ?? ''}
              onChange={e => set('phone', formatPhone(e.target.value))}
              className={fieldCls}
              placeholder="(xxx) xxx-xxxx"
              maxLength={14}
              required
            />
            {fieldErrors.phone && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label htmlFor="year" className={labelCls}>Year <span className="text-[#e8654f]">*</span></label>
            <div className="relative">
              <select
                id="year"
                value={form.year ?? ''}
                onChange={e => set('year', e.target.value)}
                className={`${fieldCls} appearance-none pr-10`}
                required
              >
                <option value="" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Select your year</option>
                <option value="Freshman" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Freshman</option>
                <option value="Sophomore" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Sophomore</option>
                <option value="Junior" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Junior</option>
                <option value="Senior" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Senior</option>
                <option value="Graduate" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Graduate</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7a7a7a]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {fieldErrors.year && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.year}</p>}
          </div>

          <div>
            <label htmlFor="major" className={labelCls}>Major <span className="text-[#e8654f]">*</span></label>
            <input
              id="major"
              type="text"
              value={form.major ?? ''}
              onChange={e => set('major', toTitleCase(e.target.value))}
              className={fieldCls}
              placeholder="e.g. Computer Science"
              required
            />
            {fieldErrors.major && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.major}</p>}
          </div>

          {/* only renders when the API returned a server error — do not remove this condition */}
          {serverError && <p role="alert" className="font-sans text-sm text-red-400">{serverError}</p>}

          {/* only renders for ~1.2 s after a successful save, before the router redirect fires — do not remove this condition */}
          {success && (
            <p role="status" className="font-sans text-sm text-green-400" style={{ animation: 'fadeUp 0.4s var(--ease-smooth) both' }}>
              Profile updated! Redirecting...
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-green text-[#0e0e0e] font-display font-black uppercase tracking-widest py-3.5 rounded-lg hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all mt-2"
          >
            {/* only shows "Saving..." while the API call is in flight — do not remove this condition */}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/member/profile')}
            className="font-sans text-sm text-white/40 hover:text-white/60 text-center transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  )
}
