// ── OnboardingClient.tsx ─────────────────────────────────────────────────────
// multi-step client form driving the full pamilya onboarding flow (pick → profile → ading/kuyate application).
//
// data:  props — firstName, isKuyateOpen, initialType, existingProfile (from onboarding/page.tsx)
// deps:  POST /api/onboarding/submit
// notes: step order (pick → profile → ading|kuyate) must be preserved — see the IMPORTANT block near line 58

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toTitleCase, formatPhone } from '@/lib/format'

/**
 * Props — passed down from OnboardingPage server component (onboarding/page.tsx)
 *   firstName       — pre-filled greeting name pulled from the member row
 *   isKuyateOpen    — whether kuyate applications are currently open (from settings table);
 *                     when false, only ading + not-interested are offered in the pick step
 *   initialType     — when set, skips the pick step and goes straight to profile with memberType preset
 *   existingProfile — pre-fills the profile info step with data already on the member row
 */
interface Props {
  firstName: string
  isKuyateOpen: boolean
  initialType: 'ading' | 'kuyate' | null
  existingProfile: {
    first_name: string
    last_name: string
    phone: string | null
    year: string | null
    major: string | null
  }
}

// the two membership types members can pick from
type MemberType = 'ading' | 'kuyate'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const PRONOUNS_OPTIONS = ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They', 'Any', 'Prefer not to say'] as const

// extracts the first field-level error from a Zod .format() details object
function firstFieldError(details: Record<string, unknown>): string | null {
  for (const [key, val] of Object.entries(details)) {
    if (key === '_errors') continue
    const errs = (val as { _errors?: string[] })?._errors
    if (errs?.length) return `${key}: ${errs[0]}`
  }
  return null
}

// today's date as YYYY-MM-DD for birthday max attribute
const TODAY = new Date().toISOString().split('T')[0]

// returns age in full years from a YYYY-MM-DD string, or null if invalid
function calcAge(birthday: string): number | null {
  if (!birthday) return null
  const d = new Date(birthday)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  const age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  return (m < 0 || (m === 0 && today.getDate() < d.getDate())) ? age - 1 : age
}

// shared class strings for form fields — mockup design language
const fieldCls = 'w-full px-4 py-[14px] bg-[#141414] border border-white/10 rounded-xl text-white text-[15px] outline-none focus:border-accent-green focus:bg-[#171717] transition-colors placeholder:text-[#7a7a7a]'
const fieldDateCls = `${fieldCls} [&::-webkit-calendar-picker-indicator]:invert`
const textareaCls = `${fieldCls} min-h-[96px] resize-y leading-relaxed`
const labelCls = 'flex items-center gap-[5px] mb-[9px] text-[12px] font-bold tracking-[0.1em] text-[#9a9a9a] uppercase'

// ── IMPORTANT — do not restructure the step logic below ──────────────────────
// Rule 7: This is a multi-step form. The step flow (pick → profile → ading|kuyate)
// must be preserved exactly. Each step is a separate conditional return.
// Do not merge steps, reorder them, or replace the step state with a router-based flow.
// ─────────────────────────────────────────────────────────────────────────────

// step progress indicator — shown on profile/ading/kuyate steps
function StepIndicator({ step, memberType }: { step: string; memberType: MemberType | null }) {
  const step2Label = memberType === 'kuyate' ? 'Kuya/Ate Application' : 'Ading Application'
  const s1Done = step === 'ading' || step === 'kuyate'
  const s1Active = step === 'profile'
  const s2Active = step === 'ading' || step === 'kuyate'

  return (
    <div className="flex items-center gap-3 mb-9">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-display font-extrabold shrink-0 ${
          s1Done || s1Active ? 'bg-accent-green text-[#08130a]' : 'bg-[#1e1e1e] text-[#5a5a5a]'
        }`}>
          {s1Done
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            : '1'
          }
        </div>
        <span className={`font-display font-bold text-[11px] uppercase tracking-[0.08em] whitespace-nowrap ${
          s1Active || s1Done ? 'text-white' : 'text-[#5a5a5a]'
        }`}>
          Tell Us About You
        </span>
      </div>

      <div className={`flex-1 h-px ${s1Done ? 'bg-accent-green' : 'bg-white/[0.08]'}`} />

      <div className="flex items-center gap-2.5 shrink-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-display font-extrabold shrink-0 ${
          s2Active ? 'bg-accent-green text-[#08130a]' : 'bg-[#1e1e1e] text-[#5a5a5a]'
        }`}>
          2
        </div>
        <span className={`font-display font-bold text-[11px] uppercase tracking-[0.08em] whitespace-nowrap ${
          s2Active ? 'text-white' : 'text-[#5a5a5a]'
        }`}>
          {step2Label}
        </span>
      </div>
    </div>
  )
}

export default function OnboardingClient({ firstName, isKuyateOpen, initialType, existingProfile }: Props) {
  const router = useRouter()
  useEffect(() => {
    router.prefetch('/onboarding/basic-info')
    router.prefetch('/member/profile')
  }, [router])
  const [step, setStep] = useState<'pick' | 'ading' | 'kuyate' | 'profile' | 'submitted'>(initialType ? 'profile' : 'pick')
  const [memberType, setMemberType] = useState<MemberType | null>(initialType ?? null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  // basic profile fields — collected regardless of member type
  const [profileForm, setProfileForm] = useState({
    first_name: existingProfile.first_name ?? '',
    last_name: existingProfile.last_name ?? '',
    phone: existingProfile.phone ?? '',
    year: existingProfile.year ?? '',
    major: existingProfile.major ?? '',
  })

  // DATA ─────────────────────────────────────────────────────────────────────
  // adingForm — all ading application fields; additional_notes is optional
  // ──────────────────────────────────────────────────────────────────────────
  const [adingForm, setAdingForm] = useState({
    instagram: '',
    phone: '',
    birthday: '',
    pronouns: '',
    activity_level: 5,
    hobbies: '',
    fave_music_genre: '',
    fave_artist: '',
    fave_food: '',
    pam_vibe: '',
    hangout_size_preference: 5,
    fave_tv_show_movie: '',
    availability: { days: [] as string[], times: '' },
    thoughts_on_drinking: '',
    dislikes: '',
    pam_dealbreakers: '',
    pam_incompatibilities: '',
    future_kuyate: '',
    mbti: '',
    additional_notes: '',
  })

  // DATA ─────────────────────────────────────────────────────────────────────
  // kuyateForm — all kuyate application fields; additional_notes is optional
  // ──────────────────────────────────────────────────────────────────────────
  const [kuyateForm, setKuyateForm] = useState({
    instagram: '',
    pamilya_name: '',
    wants_to_be_pam_head: false,
    pam_head_phone: '',
    why_kuyate: '',
    acknowledges_responsibilities: false,
    additional_notes: '',
  })

  // privacy policy acknowledgment gates — separate from form data; not sent to the api
  const [adingPrivacyAck, setAdingPrivacyAck] = useState(false)
  const [kuyatePrivacyAck, setKuyatePrivacyAck] = useState(false)

  function toggleAvailabilityDay(day: string) {
    setAdingForm(p => ({
      ...p,
      availability: {
        ...p.availability,
        days: p.availability.days.includes(day)
          ? p.availability.days.filter(d => d !== day)
          : [...p.availability.days, day],
      },
    }))
  }

  function handleMemberTypePick(type: MemberType) {
    setMemberType(type)
    setStep('profile') // always collect profile info first
  }

  async function handleNotInterested() {
    setLoading(true)
    setServerError(null)
    try {
      // api: POST /api/onboarding/not-interested — marks onboarding_complete + member_type='not_interested'
      const res = await fetch('/api/onboarding/not-interested', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error ?? 'Something went wrong — please try again.')
        setLoading(false)
        return
      }
      // route: /onboarding/basic-info — collects name, phone, year, major, pamilya preference
      router.push('/onboarding/basic-info')
    } catch {
      setServerError('Network error — please try again.')
      setLoading(false)
    }
  }

  function validateProfileForm(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!profileForm.first_name.trim()) errs.first_name = 'Required'
    if (!profileForm.last_name.trim()) errs.last_name = 'Required'
    if (!profileForm.phone?.trim()) errs.phone = 'Required'
    else if (profileForm.phone.replace(/\D/g, '').length !== 10) errs.phone = 'Must be 10 digits — e.g. (214) 333-4444'
    if (!profileForm.year) errs.year = 'Required'
    if (!profileForm.major.trim()) errs.major = 'Required'
    return errs
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const errs = validateProfileForm()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})

    // pre-fill ading phone from profile so the field arrives ready
    setAdingForm(p => ({ ...p, phone: profileForm.phone }))

    setStep(memberType!)
  }

  function validateAdingForm(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!adingForm.instagram?.trim()) errs.instagram = 'Required'
    if (!adingForm.phone?.trim()) errs.phone = 'Required'
    else if (adingForm.phone.replace(/\D/g, '').length !== 10) errs.phone = 'Must be 10 digits — e.g. (214) 333-4444'
    if (!adingForm.birthday) errs.birthday = 'Required'
    else {
      const age = calcAge(adingForm.birthday)
      if (age !== null && age < 16) errs.birthday = 'You must be at least 16 years old to apply'
    }
    if (!adingForm.pronouns) errs.pronouns = 'Required'
    if (!adingForm.availability?.days?.length) errs.availability_days = 'Select at least one day'
    if (!adingForm.availability?.times?.trim()) errs.availability_times = 'Required'
    if (!adingForm.hobbies?.trim()) errs.hobbies = 'Required'
    if (!adingForm.fave_music_genre?.trim()) errs.fave_music_genre = 'Required'
    if (!adingForm.fave_artist?.trim()) errs.fave_artist = 'Required'
    if (!adingForm.fave_food?.trim()) errs.fave_food = 'Required'
    if (!adingForm.fave_tv_show_movie?.trim()) errs.fave_tv_show_movie = 'Required'
    if (!adingForm.pam_vibe?.trim()) errs.pam_vibe = 'Required'
    if (!adingForm.thoughts_on_drinking?.trim()) errs.thoughts_on_drinking = 'Required'
    if (!adingForm.dislikes?.trim()) errs.dislikes = 'Required'
    if (!adingForm.pam_dealbreakers?.trim()) errs.pam_dealbreakers = 'Required'
    if (!adingForm.pam_incompatibilities?.trim()) errs.pam_incompatibilities = 'Required'
    if (!adingForm.future_kuyate?.trim()) errs.future_kuyate = 'Required'
    return errs
  }

  function validateKuyateForm(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!kuyateForm.instagram?.trim()) errs.instagram = 'Required'
    if (!kuyateForm.pamilya_name?.trim()) errs.pamilya_name = 'Required'
    if (kuyateForm.wants_to_be_pam_head && !kuyateForm.pam_head_phone?.trim()) errs.pam_head_phone = 'Required when applying for Pamilya Head'
    else if (kuyateForm.wants_to_be_pam_head && kuyateForm.pam_head_phone &&
      kuyateForm.pam_head_phone.replace(/\D/g, '').length !== 10) errs.pam_head_phone = 'Must be 10 digits'
    if (!kuyateForm.why_kuyate?.trim()) errs.why_kuyate = 'Required'
    else if (kuyateForm.why_kuyate.trim().length < 50) errs.why_kuyate = 'At least 50 characters required'
    if (!kuyateForm.acknowledges_responsibilities) errs.acknowledges_responsibilities = 'You must acknowledge your responsibilities before submitting'
    return errs
  }

  async function handleFinalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const errs = memberType === 'ading' ? validateAdingForm() : validateKuyateForm()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      // api: calls POST /api/onboarding/submit — saves profile + application data and marks onboarding complete — do not change this endpoint
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberType,
          profileForm,
          applicationForm: memberType === 'ading' ? adingForm : kuyateForm,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const firstErr = data.details ? firstFieldError(data.details as Record<string, unknown>) : null
        if (firstErr) {
          const colonIdx = firstErr.indexOf(': ')
          if (colonIdx > -1) {
            setFieldErrors({ [firstErr.slice(0, colonIdx)]: firstErr.slice(colonIdx + 2) })
          } else {
            setServerError(firstErr)
          }
        } else {
          setServerError(data.error ?? 'Something went wrong — please try again.')
        }
        setLoading(false)
        return
      }

      setStep('submitted')
    } catch {
      setServerError('Network error — please try again.')
      setLoading(false)
    }
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data (step === 'pick'):
  //   firstName (string) — greeting name from the member row
  //   isKuyateOpen (bool) — whether kuyate applications are currently open;
  //     when false: show "Apply as Ading" + full "Not Interested" button only
  //     when true: show ading + kuyate buttons with "Not Interested" as a subtle text link
  //   loading (bool) — true while handleNotInterested API call is in flight
  //   error (string | null) — set if handleNotInterested returns an error
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================

  // step: pick — member chooses ading, kuyate, or not interested
  // do not reorder steps or change the step transition logic
  if (step === 'pick') {
    return (
      <main className="bg-brand-bg min-h-screen text-white overflow-x-clip">
        <div className="relative flex flex-col items-center text-center px-6 py-16 md:py-20 max-w-[1280px] mx-auto">

          {/* membership confirmed badge */}
          <div className="relative z-10 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-accent-green/10 border border-accent-green/30 mb-7">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="font-display font-bold text-[12px] tracking-[0.12em] text-accent-green uppercase">Membership confirmed</span>
          </div>

          <h1 className="relative z-10 font-display font-black text-[clamp(42px,6vw,76px)] leading-[0.94] tracking-[-0.03em] text-white">
            Welcome,<br />
            <span className="text-accent-green">{firstName}!</span>
          </h1>

          <p className="relative z-10 max-w-[560px] text-lg leading-[1.6] text-[#9a9a9a] font-medium mt-6">
            You&rsquo;re officially part of the UTD FSA family! Before we get started, let us know which role fits you best.
          </p>

          {/* step hint */}
          <div className="relative z-10 inline-flex items-center gap-2 mt-5 text-[12px] font-bold tracking-[0.1em] text-[#6a6a6a] uppercase">
            <span className="w-[18px] h-[18px] rounded-full bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green text-[10px] font-extrabold">1</span>
            Choose your pamilya role
          </div>

          {/* role cards — 2-col when kuyate open, single centered card when closed */}
          <div className={`relative z-10 grid gap-6 w-full max-w-[920px] mt-11 ${isKuyateOpen ? 'sm:grid-cols-2' : 'sm:max-w-[480px]'}`}>

            {/* ading card — label differs based on whether kuyate is available */}
            {/* do not remove the isKuyateOpen condition on the title */}
            <button
              onClick={() => handleMemberTypePick('ading')}
              disabled={loading}
              className="relative rounded-[22px] overflow-hidden border border-white/10 cursor-pointer text-left h-60 sm:h-[420px] bg-[#101010] hover:border-accent-green/60 hover:-translate-y-1.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Image
                src="/ading-form.png"
                alt="Ading"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 90vw, 45vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,7,7,0.15)] via-[rgba(7,7,7,0.45)] to-[rgba(7,7,7,0.94)]" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 md:p-8">
                <span className="self-start inline-flex px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/[0.18] text-[9px] sm:text-[10px] font-extrabold tracking-[0.1em] text-[#e6e6e6] uppercase mb-2.5 sm:mb-3.5">
                  New Member
                </span>
                <h2 className="font-display font-extrabold text-[23px] sm:text-[30px] leading-none tracking-[-0.02em] text-white mb-1.5 sm:mb-2.5">
                  {isKuyateOpen ? 'ADING FORM' : 'APPLY AS ADING'}
                </h2>
                <p className="hidden sm:block text-[14px] leading-[1.55] text-[#c2c2c2] font-medium mb-5 max-w-[340px]">
                  Join as an ading and get paired with kuyates who will guide you through your UTD FSA experience.
                </p>
                <p className="sm:hidden text-[13px] leading-[1.5] text-[#c2c2c2] font-medium mb-3.5">
                  Get paired with kuyates for your UTD FSA experience.
                </p>
                <span className="inline-flex items-center gap-2 sm:gap-2.5 font-display text-[12px] sm:text-[13px] font-bold tracking-[0.01em] text-accent-green">
                  I&rsquo;m an ading
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </div>
            </button>

            {/* kuyate card — only renders when kuyate applications are open */}
            {/* do not remove this condition */}
            {isKuyateOpen && (
              <button
                onClick={() => handleMemberTypePick('kuyate')}
                disabled={loading}
                className="relative rounded-[22px] overflow-hidden border border-white/10 cursor-pointer text-left h-60 sm:h-[420px] bg-[#101010] hover:border-accent-green/60 hover:-translate-y-1.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Image
                  src="/kuyate-form.png"
                  alt="Kuya/Ate"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 90vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,7,7,0.15)] via-[rgba(7,7,7,0.45)] to-[rgba(7,7,7,0.94)]" />
                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 md:p-8">
                  <span className="self-start inline-flex px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/[0.18] text-[9px] sm:text-[10px] font-extrabold tracking-[0.1em] text-[#e6e6e6] uppercase mb-2.5 sm:mb-3.5">
                    Returning / Mentor
                  </span>
                  <h2 className="font-display font-extrabold text-[23px] sm:text-[30px] leading-none tracking-[-0.02em] text-white mb-1.5 sm:mb-2.5">
                    KUYA/ATE FORM
                  </h2>
                  <p className="hidden sm:block text-[14px] leading-[1.55] text-[#c2c2c2] font-medium mb-5 max-w-[340px]">
                    Step up as a kuya or ate to mentor incoming adings, share your experience, and lead your pamilya.
                  </p>
                  <p className="sm:hidden text-[13px] leading-[1.5] text-[#c2c2c2] font-medium mb-3.5">
                    Mentor incoming adings and lead your pamilya.
                  </p>
                  <span className="inline-flex items-center gap-2 sm:gap-2.5 font-display text-[12px] sm:text-[13px] font-bold tracking-[0.01em] text-accent-green">
                    I&rsquo;m a kuya/ate
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </div>
              </button>
            )}

          </div>

          {/* not interested — text link when kuyate is open, prominent card when closed */}
          {/* do not remove this condition */}
          {isKuyateOpen ? (
            <button
              onClick={handleNotInterested}
              disabled={loading}
              className="relative z-10 mt-9 text-[14px] font-semibold text-[#8e8e8e] hover:text-[#cfcfcf] cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'saving...' : (
                <>
                  Not interested in the pamilya program
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNotInterested}
              disabled={loading}
              className="relative z-10 mt-9 p-6 border-2 border-white/20 rounded-[22px] text-left hover:border-white/40 transition-colors disabled:opacity-50 bg-brand-bg w-full max-w-[920px]"
            >
              <h2 className="font-display font-black text-base text-white uppercase mb-1">Not Interested</h2>
              <p className="font-sans text-sm text-white/50">
                I&rsquo;ll sit out the pamilya program for now. I can still apply later if I change my mind.
              </p>
            </button>
          )}

          {/* only renders when handleNotInterested returns an API error — do not remove this condition */}
          {serverError && (
            <p role="alert" className="relative z-10 font-sans text-sm text-red-400 mt-4">{serverError}</p>
          )}

        </div>
      </main>
    )
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data (step === 'profile'):
  //   profileForm — { first_name, last_name, phone, year, major }
  //   error (string | null) — validation error from handleProfileSubmit
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================

  // step: profile — member fills in name, phone, year, and major (required for both ading and kuyate)
  // do not reorder steps or change the step transition logic
  if (step === 'profile') {
    return (
      <main className="bg-brand-bg min-h-screen text-white">
        <div className="max-w-[660px] mx-auto px-6 py-16">
          <h1 className="font-display font-black text-[clamp(36px,5vw,62px)] leading-[0.94] tracking-[-0.03em] text-white mb-8">
            Tell Us About Yourself
          </h1>
          <StepIndicator step={step} memberType={memberType} />

          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-[20px] p-6 md:p-10">
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  First Name <span className="text-[#e8654f]">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={e => setProfileForm(p => ({ ...p, first_name: toTitleCase(e.target.value) }))}
                  className={fieldCls}
                  placeholder="Your preferred name"
                  required
                />
                {fieldErrors.first_name && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.first_name}</p>}
              </div>
              <div>
                <label className={labelCls}>
                  Last Name <span className="text-[#e8654f]">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={e => setProfileForm(p => ({ ...p, last_name: toTitleCase(e.target.value) }))}
                  className={fieldCls}
                  required
                />
                {fieldErrors.last_name && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.last_name}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Phone Number <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={e => setProfileForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                className={fieldCls}
                placeholder="(xxx) xxx-xxxx"
                maxLength={14}
                required
              />
              {fieldErrors.phone && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.phone}</p>}
            </div>

            <div>
              <label className={labelCls}>
                Year <span className="text-[#e8654f]">*</span>
              </label>
              <div className="relative">
                <select
                  value={profileForm.year}
                  onChange={e => setProfileForm(p => ({ ...p, year: e.target.value }))}
                  className={`${fieldCls} appearance-none pr-10`}
                  required
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
              {fieldErrors.year && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.year}</p>}
            </div>

            <div>
              <label className={labelCls}>
                Major <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={profileForm.major}
                onChange={e => setProfileForm(p => ({ ...p, major: toTitleCase(e.target.value) }))}
                className={fieldCls}
                placeholder="e.g. Computer Science"
                required
              />
              {fieldErrors.major && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.major}</p>}
            </div>

            {/* only renders when the API returned a server error — do not remove this condition */}
            {serverError && (
              <p role="alert" className="font-sans text-sm text-red-400">{serverError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all mt-2"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => setStep('pick')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] cursor-pointer transition-colors"
            >
              ← Go Back
            </button>
          </form>
          </div>
        </div>
      </main>
    )
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data (step === 'ading'):
  //   adingForm — {
  //     instagram, phone (pre-filled from profile), birthday, pronouns,
  //     activity_level (1–10), hobbies, fave_music_genre, fave_artist,
  //     fave_food, pam_vibe, hangout_size_preference (1–10), fave_tv_show_movie,
  //     availability { days, times }, thoughts_on_drinking, dislikes,
  //     pam_dealbreakers, future_kuyate, mbti, additional_notes (optional)
  //   }
  //   loading (bool) — true while the submit API call is in flight
  //   error (string | null) — API error from handleFinalSubmit
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================

  // step: ading — member completes the ading application questionnaire for pamilya placement
  // do not reorder steps or change the step transition logic
  if (step === 'ading') {
    const birthdayAge = calcAge(adingForm.birthday)

    return (
      <main className="bg-brand-bg min-h-screen text-white">
        <div className="max-w-[660px] mx-auto px-6 py-16">
          <h1 className="font-display font-black text-[clamp(36px,5vw,62px)] leading-[0.94] tracking-[-0.03em] text-white mb-8">
            Ading Application
          </h1>
          <StepIndicator step={step} memberType={memberType} />

          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-[20px] p-6 md:p-10">
          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5">

            {/* intro text */}
            <p className="font-sans text-[14px] text-[#7a7a7a] leading-[1.6]">
              Help us pair you with a pamilya that fits — there are no wrong answers.
            </p>

            {/* contacts & basics divider */}
            <div className="flex items-center gap-3.5">
              <span className="font-display text-[13px] font-bold text-white whitespace-nowrap">Contact &amp; Basics</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* instagram */}
            <div>
              <label className={labelCls}>
                Instagram Handle <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={adingForm.instagram}
                onChange={e => setAdingForm(p => ({ ...p, instagram: e.target.value }))}
                onBlur={() => setAdingForm(p => ({ ...p, instagram: p.instagram.replace(/^@/, '') }))}
                className={fieldCls}
                placeholder="@yourhandle"
                maxLength={51}
                required
              />
              {fieldErrors.instagram && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.instagram}</p>}
            </div>

            {/* phone — pre-filled from profile step */}
            <div>
              <label className={labelCls}>
                Phone Number <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="tel"
                value={adingForm.phone}
                onChange={e => setAdingForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                className={fieldCls}
                placeholder="(xxx) xxx-xxxx"
                maxLength={14}
                required
              />
              {fieldErrors.phone && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.phone}</p>}
            </div>

            {/* birthday — white calendar icon via CSS invert; warn if under 16 */}
            <div>
              <label className={labelCls}>
                Birthday <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="date"
                value={adingForm.birthday}
                onChange={e => setAdingForm(p => ({ ...p, birthday: e.target.value }))}
                className={`${fieldDateCls} max-w-[240px]`}
                max={TODAY}
                required
              />
              {/* only renders when age is under 16 — do not remove this condition */}
              {birthdayAge !== null && birthdayAge < 16 && (
                <p className="font-sans text-xs text-amber-400 mt-1.5">
                  heads up — members must be at least 16 to participate in the pamilya program
                </p>
              )}
              {fieldErrors.birthday && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.birthday}</p>}
            </div>

            {/* pronouns */}
            <div>
              <label className={labelCls}>
                Pronouns <span className="text-[#e8654f]">*</span>
              </label>
              <div className="relative">
                <select
                  value={adingForm.pronouns}
                  onChange={e => setAdingForm(p => ({ ...p, pronouns: e.target.value }))}
                  className={`${fieldCls} appearance-none pr-10`}
                  required
                >
                  <option value="" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Select pronouns</option>
                  {PRONOUNS_OPTIONS.map(opt => (
                    <option key={opt} value={opt} style={{ color: '#ffffff', backgroundColor: '#141414' }}>{opt}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7a7a7a]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
              {fieldErrors.pronouns && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.pronouns}</p>}
            </div>

            {/* — about you — */}
            <div className="flex items-center gap-3.5 pt-1">
              <span className="font-display text-[13px] font-bold text-white whitespace-nowrap">About You</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* activity level slider — always has a value, no required needed */}
            <div>
              <label className={labelCls}>How active can you be?</label>
              <input
                type="range"
                min={1}
                max={10}
                value={adingForm.activity_level}
                onChange={e => setAdingForm(p => ({ ...p, activity_level: Number(e.target.value) }))}
                className="w-full accent-[#93d07b] mt-1"
              />
              <div className="flex justify-between font-sans text-xs text-[#7a7a7a] mt-1.5">
                <span>1 — barely active</span>
                <span className="font-display font-bold text-[13px] text-accent-green">{adingForm.activity_level}</span>
                <span>10 — very active</span>
              </div>
            </div>

            {/* hobbies */}
            <div>
              <label className={labelCls}>
                What Kind of Hobbies Are You Into? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.hobbies}
                onChange={e => setAdingForm(p => ({ ...p, hobbies: e.target.value }))}
                className={textareaCls}
                maxLength={300}
                required
              />
              {adingForm.hobbies.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.hobbies.length} / 300</p>
              )}
              {fieldErrors.hobbies && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.hobbies}</p>}
            </div>

            {/* — interests — */}
            <div className="flex items-center gap-3.5 pt-1">
              <span className="font-display text-[13px] font-bold text-white whitespace-nowrap">Interests</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* fave music genre */}
            <div>
              <label className={labelCls}>
                Favorite Music Genre? <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={adingForm.fave_music_genre}
                onChange={e => setAdingForm(p => ({ ...p, fave_music_genre: e.target.value }))}
                className={fieldCls}
                maxLength={100}
                required
              />
              {fieldErrors.fave_music_genre && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.fave_music_genre}</p>}
            </div>

            {/* fave artist */}
            <div>
              <label className={labelCls}>
                Favorite Artist? <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={adingForm.fave_artist}
                onChange={e => setAdingForm(p => ({ ...p, fave_artist: e.target.value }))}
                className={fieldCls}
                maxLength={100}
                required
              />
              {fieldErrors.fave_artist && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.fave_artist}</p>}
            </div>

            {/* fave food */}
            <div>
              <label className={labelCls}>
                Favorite Food? <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={adingForm.fave_food}
                onChange={e => setAdingForm(p => ({ ...p, fave_food: e.target.value }))}
                className={fieldCls}
                maxLength={100}
                required
              />
              {fieldErrors.fave_food && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.fave_food}</p>}
            </div>

            {/* fave tv show / movie */}
            <div>
              <label className={labelCls}>
                Favorite TV Show or Movie? <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={adingForm.fave_tv_show_movie}
                onChange={e => setAdingForm(p => ({ ...p, fave_tv_show_movie: e.target.value }))}
                className={fieldCls}
                maxLength={200}
                required
              />
              {fieldErrors.fave_tv_show_movie && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.fave_tv_show_movie}</p>}
            </div>

            {/* — pam match — */}
            <div className="flex items-center gap-3.5 pt-1">
              <span className="font-display text-[13px] font-bold text-white whitespace-nowrap">Pam Matching</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* pam vibe */}
            <div>
              <label className={labelCls}>
                What vibe are you looking for in a pam? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.pam_vibe}
                onChange={e => setAdingForm(p => ({ ...p, pam_vibe: e.target.value }))}
                className={textareaCls}
                placeholder="Describe the energy, personality, activities..."
                maxLength={500}
                required
              />
              {adingForm.pam_vibe.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.pam_vibe.length} / 500</p>
              )}
              {fieldErrors.pam_vibe && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.pam_vibe}</p>}
            </div>

            {/* hangout size preference — dots span full form width */}
            <div>
              <label className={labelCls}>Hangout Size Preference?</label>
              <div className="flex justify-between w-full mt-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAdingForm(p => ({ ...p, hangout_size_preference: n }))}
                    className={`w-6 h-6 sm:w-[30px] sm:h-[30px] rounded-full border-2 transition-all ${
                      n <= adingForm.hangout_size_preference
                        ? 'bg-accent-green border-accent-green'
                        : 'border-white/[0.18] hover:border-accent-green/50'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between font-sans text-xs text-[#7a7a7a] mt-1.5">
                <span>Small</span>
                <span>Big</span>
              </div>
            </div>

            {/* availability — day chips + times textarea */}
            <div>
              <label className={labelCls}>
                Availability? <span className="text-[#e8654f]">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleAvailabilityDay(day)}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all ${
                      adingForm.availability.days.includes(day)
                        ? 'bg-accent-green border-accent-green text-[#08130a]'
                        : 'bg-[#141414] border-white/[0.12] text-[#b5b5b5] hover:border-accent-green/50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {fieldErrors.availability_days && <p role="alert" className="font-sans text-xs text-red-400 mb-2">{fieldErrors.availability_days}</p>}
              <label className={labelCls}>
                What times are you usually free on those days? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.availability.times}
                onChange={e => setAdingForm(p => ({
                  ...p,
                  availability: { ...p.availability, times: e.target.value },
                }))}
                className={textareaCls}
                maxLength={200}
                required
              />
              {adingForm.availability.times.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.availability.times.length} / 200</p>
              )}
              {fieldErrors.availability_times && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.availability_times}</p>}
            </div>

            {/* — compatibility — */}
            <div className="flex items-center gap-3.5 pt-1">
              <span className="font-display text-[13px] font-bold text-white whitespace-nowrap">Compatibility</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* thoughts on drinking */}
            <div>
              <label className={labelCls}>
                Thoughts on drinking? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.thoughts_on_drinking}
                onChange={e => setAdingForm(p => ({ ...p, thoughts_on_drinking: e.target.value }))}
                className={textareaCls}
                placeholder="Share your thoughts and comfort level... (enter n/a if unsure)"
                maxLength={500}
                required
              />
              {adingForm.thoughts_on_drinking.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.thoughts_on_drinking.length} / 500</p>
              )}
              {fieldErrors.thoughts_on_drinking && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.thoughts_on_drinking}</p>}
            </div>

            {/* dislikes */}
            <div>
              <label className={labelCls}>
                Dislikes? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.dislikes}
                onChange={e => setAdingForm(p => ({ ...p, dislikes: e.target.value }))}
                className={textareaCls}
                maxLength={500}
                required
              />
              {adingForm.dislikes.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.dislikes.length} / 500</p>
              )}
              {fieldErrors.dislikes && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.dislikes}</p>}
            </div>

            {/* pam dealbreakers — own row, min-height matches hobbies */}
            <div>
              <label className={labelCls}>
                Things You Cannot Have in a Pam? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.pam_dealbreakers}
                onChange={e => setAdingForm(p => ({ ...p, pam_dealbreakers: e.target.value }))}
                className={textareaCls}
                placeholder="Dealbreakers, things that would make you uncomfortable... (enter n/a if unsure)"
                maxLength={500}
                required
              />
              {adingForm.pam_dealbreakers.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.pam_dealbreakers.length} / 500</p>
              )}
              {fieldErrors.pam_dealbreakers && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.pam_dealbreakers}</p>}
            </div>

            {/* pam incompatibilities — own row, required */}
            <div>
              <label className={labelCls}>
                Who can&rsquo;t you be in a pamilya with and why? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={adingForm.pam_incompatibilities}
                onChange={e => setAdingForm(p => ({ ...p, pam_incompatibilities: e.target.value }))}
                className={textareaCls}
                placeholder="Share any conflicts, or enter N/A if none"
                maxLength={500}
                required
              />
              {adingForm.pam_incompatibilities.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.pam_incompatibilities.length} / 500</p>
              )}
              {fieldErrors.pam_incompatibilities && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.pam_incompatibilities}</p>}
            </div>

            {/* — wrap up — */}
            <div className="flex items-center gap-3.5 pt-1">
              <span className="font-display text-[13px] font-bold text-white whitespace-nowrap">Wrap Up</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* future kuyate — text input per user instruction */}
            <div>
              <label className={labelCls}>
                Who do you think will be your future kuya/ate? <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={adingForm.future_kuyate}
                onChange={e => setAdingForm(p => ({ ...p, future_kuyate: e.target.value }))}
                className={fieldCls}
                placeholder="Enter N/A if unsure"
                maxLength={100}
                required
              />
              {fieldErrors.future_kuyate && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.future_kuyate}</p>}
            </div>

            {/* mbti — dropdown of all 16 valid types */}
            <div>
              <label className={labelCls}>
                MBTI Type? <span className="text-[#e8654f]">*</span>
              </label>
              <div className="relative">
                <select
                  value={adingForm.mbti}
                  onChange={e => setAdingForm(p => ({ ...p, mbti: e.target.value }))}
                  className={`${fieldCls} appearance-none pr-10`}
                >
                  <option value="" style={{ color: '#ffffff', backgroundColor: '#141414' }}>Not sure / don&apos;t know</option>
                  <option value="INTJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>INTJ</option>
                  <option value="INTP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>INTP</option>
                  <option value="ENTJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ENTJ</option>
                  <option value="ENTP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ENTP</option>
                  <option value="INFJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>INFJ</option>
                  <option value="INFP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>INFP</option>
                  <option value="ENFJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ENFJ</option>
                  <option value="ENFP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ENFP</option>
                  <option value="ISTJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ISTJ</option>
                  <option value="ISFJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ISFJ</option>
                  <option value="ESTJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ESTJ</option>
                  <option value="ESFJ" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ESFJ</option>
                  <option value="ISTP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ISTP</option>
                  <option value="ISFP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ISFP</option>
                  <option value="ESTP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ESTP</option>
                  <option value="ESFP" style={{ color: '#ffffff', backgroundColor: '#141414' }}>ESFP</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7a7a7a]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>

            {/* additional notes — optional */}
            <div>
              <label className={labelCls}>
                Anything else that would help us sort you?
              </label>
              <textarea
                value={adingForm.additional_notes}
                onChange={e => setAdingForm(p => ({ ...p, additional_notes: e.target.value }))}
                className={textareaCls}
                maxLength={1000}
              />
              {adingForm.additional_notes.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.additional_notes.length} / 1000</p>
              )}
            </div>

            {/* privacy policy acknowledgment — blocks submission until checked */}
            <div className="rounded-[14px] border border-white/[0.08] bg-[#0a0a0a] px-5 py-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`w-[22px] h-[22px] shrink-0 rounded-[5px] border-2 flex items-center justify-center transition-all mt-0.5 ${
                  adingPrivacyAck
                    ? 'bg-accent-green border-accent-green'
                    : 'bg-[#141414] border-white/[0.18] hover:border-accent-green/40'
                }`}>
                  {adingPrivacyAck && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#08130a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={adingPrivacyAck}
                  onChange={e => setAdingPrivacyAck(e.target.checked)}
                />
                <span className="font-sans text-[14px] text-[#a8a8a8] leading-[1.55]">
                  I have read and agree to the{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-green underline underline-offset-2 hover:opacity-80 transition-opacity">
                    UTD FSA Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            {/* only renders when the submit API returns a server error — do not remove this condition */}
            {serverError && (
              <p role="alert" className="font-sans text-sm text-red-400">{serverError}</p>
            )}

            {/* disabled until privacy policy is acknowledged */}
            <button
              type="submit"
              disabled={loading || !adingPrivacyAck}
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all mt-2"
            >
              {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Submitting...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('profile')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] cursor-pointer transition-colors"
            >
              ← Go Back
            </button>
          </form>
          </div>
        </div>
      </main>
    )
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data (step === 'kuyate'):
  //   kuyateForm — {
  //     instagram, pamilya_name (free text),
  //     wants_to_be_pam_head (bool), pam_head_phone (shown when wants_to_be_pam_head;
  //       auto-fills from profileForm.phone on focus if empty),
  //     why_kuyate (min 50 chars), acknowledges_responsibilities (must be true to submit),
  //     additional_notes (optional, last field)
  //   }
  //   loading (bool) — true while the submit API call is in flight
  //   error (string | null) — API error from handleFinalSubmit
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================

  // step: kuyate — member completes the kuyate application and acknowledges leadership responsibilities
  // do not reorder steps or change the step transition logic
  if (step === 'kuyate') {
    return (
      <main className="bg-brand-bg min-h-screen text-white">
        <div className="max-w-[660px] mx-auto px-6 py-16">
          <h1 className="font-display font-black text-[clamp(36px,5vw,62px)] leading-[0.94] tracking-[-0.03em] text-white mb-8">
            Kuya / Ate Application
          </h1>
          <StepIndicator step={step} memberType={memberType} />

          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-[20px] p-6 md:p-10">
          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5">

            {/* intro text */}
            <p className="font-sans text-[14px] text-[#7a7a7a] leading-[1.6]">
              Tell us about your interest in being a kuya/ate.
            </p>

            {/* instagram */}
            <div>
              <label className={labelCls}>
                Instagram Handle <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={kuyateForm.instagram}
                onChange={e => setKuyateForm(p => ({ ...p, instagram: e.target.value }))}
                onBlur={() => setKuyateForm(p => ({ ...p, instagram: p.instagram.replace(/^@/, '') }))}
                className={fieldCls}
                placeholder="@yourhandle"
                maxLength={51}
                required
              />
              {fieldErrors.instagram && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.instagram}</p>}
            </div>

            <div className="h-px bg-white/[0.07]" />

            {/* pamilya name — free text since pams aren't finalized */}
            <div>
              <label className={labelCls}>
                Which pamilya are you applying to lead? <span className="text-[#e8654f]">*</span>
              </label>
              <input
                type="text"
                value={kuyateForm.pamilya_name}
                onChange={e => setKuyateForm(p => ({ ...p, pamilya_name: e.target.value }))}
                className={fieldCls}
                placeholder="e.g. [Pam Name] — enter n/a if unsure"
                maxLength={100}
                required
              />
              {fieldErrors.pamilya_name && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.pamilya_name}</p>}
            </div>

            {/* pam head toggle — boolean, always has a value */}
            <div>
              <label className={labelCls}>
                Are you interested in being a pamilya head?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKuyateForm(p => ({ ...p, wants_to_be_pam_head: true }))}
                  className={`flex-1 py-3 rounded-[10px] border-2 font-display font-bold text-[13px] uppercase tracking-[0.06em] transition-all ${
                    kuyateForm.wants_to_be_pam_head
                      ? 'bg-accent-green border-accent-green text-[#08130a]'
                      : 'border-white/[0.12] text-[#b5b5b5] hover:border-accent-green/50'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setKuyateForm(p => ({ ...p, wants_to_be_pam_head: false }))}
                  className={`flex-1 py-3 rounded-[10px] border-2 font-display font-bold text-[13px] uppercase tracking-[0.06em] transition-all ${
                    !kuyateForm.wants_to_be_pam_head
                      ? 'bg-accent-green border-accent-green text-[#08130a]'
                      : 'border-white/[0.12] text-[#b5b5b5] hover:border-accent-green/50'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* pam head phone — only shown when wants_to_be_pam_head is true */}
            {/* auto-fills from profileForm.phone on focus if the field is empty */}
            {kuyateForm.wants_to_be_pam_head && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-[14px] p-4">
                <label className={labelCls}>
                  Your Phone Number <span className="text-[#e8654f]">*</span>
                </label>
                <input
                  type="tel"
                  value={kuyateForm.pam_head_phone}
                  onChange={e => setKuyateForm(p => ({ ...p, pam_head_phone: formatPhone(e.target.value) }))}
                  onFocus={() => {
                    if (!kuyateForm.pam_head_phone) {
                      setKuyateForm(p => ({ ...p, pam_head_phone: profileForm.phone }))
                    }
                  }}
                  className={fieldCls}
                  placeholder="(xxx) xxx-xxxx"
                  maxLength={14}
                  required
                />
                <p className="font-sans text-xs text-accent-green/70 mt-2">
                  Your number will be shared with the pam chair.
                </p>
                {fieldErrors.pam_head_phone && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.pam_head_phone}</p>}
              </div>
            )}

            {/* why kuyate */}
            <div>
              <label className={labelCls}>
                Why do you want to be a kuya/ate? <span className="text-[#e8654f]">*</span>
              </label>
              <textarea
                value={kuyateForm.why_kuyate}
                onChange={e => setKuyateForm(p => ({ ...p, why_kuyate: e.target.value }))}
                className={textareaCls}
                maxLength={1000}
                required
              />
              <div className="flex justify-between items-center mt-1.5">
                {kuyateForm.why_kuyate.length > 0 && kuyateForm.why_kuyate.length < 50 ? (
                  <span className="font-sans text-xs text-amber-400">at least 50 characters required</span>
                ) : (
                  <span />
                )}
                <span className="font-sans text-xs text-[#7a7a7a] ml-auto">{kuyateForm.why_kuyate.length} / 1000 characters</span>
              </div>
              {fieldErrors.why_kuyate && <p role="alert" className="font-sans text-xs text-red-400 mt-1">{fieldErrors.why_kuyate}</p>}
            </div>

            {/* additional notes — optional */}
            <div>
              <label className={labelCls}>
                Anything else you&rsquo;d like us to know about you?
              </label>
              <textarea
                value={kuyateForm.additional_notes}
                onChange={e => setKuyateForm(p => ({ ...p, additional_notes: e.target.value }))}
                className={textareaCls}
                maxLength={1000}
              />
              {kuyateForm.additional_notes.length > 0 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{kuyateForm.additional_notes.length} / 1000</p>
              )}
            </div>

            {/* acknowledgement — custom checkbox, must be checked to submit */}
            <div className="border-t border-white/[0.07] pt-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`w-[22px] h-[22px] shrink-0 rounded-[5px] border-2 flex items-center justify-center transition-all mt-0.5 ${
                  kuyateForm.acknowledges_responsibilities
                    ? 'bg-accent-green border-accent-green'
                    : 'bg-[#141414] border-white/[0.18] hover:border-accent-green/40'
                }`}>
                  {kuyateForm.acknowledges_responsibilities && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#08130a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={kuyateForm.acknowledges_responsibilities}
                  onChange={e => setKuyateForm(p => ({ ...p, acknowledges_responsibilities: e.target.checked }))}
                />
                <span className="font-sans text-[14px] text-[#a8a8a8] leading-[1.55]">
                  I understand the responsibilities of being a kuya/ate and commit to fulfilling
                  them to the best of my ability.
                </span>
              </label>
              {fieldErrors.acknowledges_responsibilities && <p role="alert" className="font-sans text-xs text-red-400 mt-2">{fieldErrors.acknowledges_responsibilities}</p>}
            </div>

            {/* privacy policy acknowledgment — blocks submission until checked */}
            <div className="rounded-[14px] border border-white/[0.08] bg-[#0a0a0a] px-5 py-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`w-[22px] h-[22px] shrink-0 rounded-[5px] border-2 flex items-center justify-center transition-all mt-0.5 ${
                  kuyatePrivacyAck
                    ? 'bg-accent-green border-accent-green'
                    : 'bg-[#141414] border-white/[0.18] hover:border-accent-green/40'
                }`}>
                  {kuyatePrivacyAck && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#08130a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={kuyatePrivacyAck}
                  onChange={e => setKuyatePrivacyAck(e.target.checked)}
                />
                <span className="font-sans text-[14px] text-[#a8a8a8] leading-[1.55]">
                  I have read and agree to the{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-green underline underline-offset-2 hover:opacity-80 transition-opacity">
                    UTD FSA Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            {/* only renders when the submit API returns a server error — do not remove this condition */}
            {serverError && (
              <p role="alert" className="font-sans text-sm text-red-400">{serverError}</p>
            )}

            {/* disabled until acknowledges_responsibilities and privacy policy are both checked */}
            <button
              type="submit"
              disabled={loading || !kuyateForm.acknowledges_responsibilities || !kuyatePrivacyAck}
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all mt-2"
            >
              {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Submitting...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('profile')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] cursor-pointer transition-colors"
            >
              ← Go Back
            </button>
          </form>
          </div>
        </div>
      </main>
    )
  }

  // step: submitted — shown after handleFinalSubmit succeeds
  if (step === 'submitted') {
    const kindLabel = memberType === 'kuyate' ? 'Kuya / Ate' : 'Ading'

    const nextSteps = [
      { num: '01', title: 'Application Reviewed', desc: 'The pamilya committee reads through every response to find your most compatible pamilya.', hasLine: true, active: true },
      { num: '02', title: 'Placement Announced', desc: 'All sorting results will be announced at the 2nd General Meeting. Late applications will have an email sent regarding their pamilya result.', hasLine: true, active: false },
      { num: '03', title: 'Meet Your Pamilya', desc: 'Show up to the reveal event, meet your ates, kuyas, and fellow adings!', hasLine: false, active: false },
    ]

    return (
      <main className="bg-brand-bg min-h-screen text-white overflow-x-clip">
        <div className="relative flex flex-col items-center text-center px-6 py-16 md:py-20 max-w-[660px] mx-auto">

          {/* radial glow */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(117,186,120,0.14) 0%, transparent 70%)' }}
          />

          {/* checkmark medallion */}
          <div className="relative z-10 w-[104px] h-[104px] flex items-center justify-center mb-8">
            <span
              className="absolute inset-0 rounded-full border-2 border-accent-green"
              style={{ animation: 'fsa-ring 2.4s ease-out infinite' }}
            />
            <div
              className="w-[104px] h-[104px] rounded-full bg-accent-green/[0.12] border border-accent-green/[0.34] flex items-center justify-center"
              style={{ animation: 'fsa-check-pop 0.55s cubic-bezier(0.2,0.8,0.2,1) both' }}
            >
              <span
                className="w-16 h-16 rounded-full bg-accent-green flex items-center justify-center"
                style={{ boxShadow: '0 12px 34px -10px rgba(117,186,120,0.5)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#08130a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            </div>
          </div>

          {/* kind label pill */}
          <div className="relative z-10 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-accent-green/[0.12] border border-accent-green/[0.34] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            <span className="font-display font-bold text-[11px] tracking-[0.12em] text-accent-green uppercase">{kindLabel} application received</span>
          </div>

          {/* heading */}
          <h1 className="relative z-10 font-display font-black text-[clamp(42px,8vw,62px)] leading-[0.94] tracking-[-0.03em] text-white">
            APPLICATION<br />SUBMITTED
          </h1>

          {/* subtext */}
          <p className="relative z-10 max-w-[480px] text-[17px] leading-[1.6] text-[#9a9a9a] font-medium mt-5">
            Thanks, {firstName} — your {kindLabel.toLowerCase()} {' '}application is in! The pamilya committee reviews every application and you&rsquo;ll hear about your placement before the next big event.
          </p>

          {/* what happens next */}
          <div className="relative z-10 w-full bg-[#0d0d0d] border border-white/[0.08] rounded-[20px] p-7 md:p-8 mt-9 text-left">
            <div className="flex items-center gap-3.5 mb-6">
              <span className="font-display font-bold text-[13px] text-white whitespace-nowrap">What happens next</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>
            <div className="flex flex-col">
              {nextSteps.map(s => (
                <div key={s.num} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center self-stretch">
                    <span className={`shrink-0 w-[34px] h-[34px] rounded-full border flex items-center justify-center font-display text-[12px] font-extrabold ${
                      s.active
                        ? 'bg-accent-green border-accent-green text-[#08130a]'
                        : 'bg-[#141414] border-white/[0.18] text-[#7a7a7a]'
                    }`}>
                      {s.num}
                    </span>
                    {s.hasLine && <span className="w-px flex-1 min-h-[22px] bg-white/10 my-1.5" />}
                  </div>
                  <div className="pb-5">
                    <div className="text-[15px] font-bold text-white tracking-[-0.01em] mb-1">{s.title}</div>
                    <div className="text-[13.5px] leading-[1.55] text-[#8c8c8c] font-medium">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* action buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-3.5 w-full mt-7">
            <button
              onClick={() => router.push('/member/profile')}
              className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] cursor-pointer transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08130a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              GO TO MY PROFILE
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 flex items-center justify-center gap-2.5 py-4 border border-white/[0.14] rounded-[14px] bg-[#141414] text-white font-display font-extrabold text-[15px] tracking-[0.02em] hover:border-white/30 hover:bg-[#191919] cursor-pointer transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
              </svg>
              BACK TO HOMEPAGE
            </button>
          </div>

        </div>
      </main>
    )
  }

  return null
}
