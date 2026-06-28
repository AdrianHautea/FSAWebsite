// ── OnboardingClient.tsx ─────────────────────────────────────────────────────
// multi-step client form driving the full pamilya onboarding flow (pick → profile → ading/kuyate application).
//
// data:  props — memberId, firstName, isKuyateOpen, initialType, existingProfile (from onboarding/page.tsx)
// deps:  POST /api/onboarding/submit
// notes: step order (pick → profile → ading|kuyate) must be preserved — see the IMPORTANT block near line 58

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toTitleCase, formatPhone } from '@/lib/format'

/**
 * Props — passed down from OnboardingPage server component (onboarding/page.tsx)
 *   memberId        — the Supabase members.id of the signed-in user; sent to the submit API
 *   firstName       — pre-filled greeting name pulled from the member row
 *   isKuyateOpen    — whether kuyate applications are currently open (from settings table);
 *                     when false, only ading + not-interested are offered in the pick step
 *   initialType     — when set, skips the pick step and goes straight to profile with memberType preset
 *   existingProfile — pre-fills the profile info step with data already on the member row
 */
interface Props {
  memberId: string
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
const fieldCls = 'w-full px-4 py-[14px] bg-[#141414] border border-white/10 rounded-[12px] text-white text-[15px] outline-none focus:border-accent-green focus:bg-[#171717] transition-colors placeholder:text-[#5a5a5a]'
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

export default function OnboardingClient({ memberId, firstName, isKuyateOpen, initialType, existingProfile }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'pick' | 'ading' | 'kuyate' | 'profile'>(initialType ? 'profile' : 'pick')
  const [memberType, setMemberType] = useState<MemberType | null>(initialType ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    // api: POST /api/onboarding/not-interested — marks onboarding_complete + member_type='not_interested'
    const res = await fetch('/api/onboarding/not-interested', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'something went wrong, please try again')
      setLoading(false)
      return
    }
    // route: /onboarding/basic-info — collects name, phone, year, major, pamilya preference
    router.push('/onboarding/basic-info')
  }

  function validateProfileForm(): string | null {
    if (!profileForm.first_name.trim())
      return 'First Name is required'
    if (!profileForm.last_name.trim())
      return 'Last Name is required'
    if (!profileForm.phone?.trim())
      return 'Phone Number is required'
    if (profileForm.phone.replace(/\D/g, '').length !== 10)
      return 'Phone Number must be 10 digits — e.g. (214) 333-4444'
    if (!profileForm.year)
      return 'Year is required — please select an option'
    if (!profileForm.major.trim())
      return 'Major is required'
    return null
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const validationError = validateProfileForm()
    if (validationError) {
      setError(validationError)
      return
    }

    // pre-fill ading phone from profile so the field arrives ready
    setAdingForm(p => ({ ...p, phone: profileForm.phone }))

    setStep(memberType!)
  }

  function validateAdingForm(): string | null {
    if (!adingForm.instagram?.trim())
      return 'Instagram handle is required'
    if (!adingForm.phone?.trim())
      return 'Phone Number is required'
    if (adingForm.phone && adingForm.phone.replace(/\D/g, '').length !== 10)
      return 'Phone Number must be 10 digits — e.g. (214) 333-4444'
    if (!adingForm.birthday)
      return 'Birthday is required'
    if (!adingForm.pronouns)
      return 'Pronouns is required — please select an option'
    if (!adingForm.activity_level)
      return 'Activity Level is required — please select a value'
    if (!adingForm.hangout_size_preference)
      return 'Hangout Size Preference is required — please select a value'
    if (!adingForm.availability?.days?.length)
      return 'Availability is required — please select at least one day'
    if (!adingForm.availability?.times?.trim())
      return 'Please describe what times you are free on those days'
    if (!adingForm.hobbies?.trim())
      return 'Hobbies is required'
    if (!adingForm.fave_music_genre?.trim())
      return 'Favorite Music Genre is required'
    if (!adingForm.fave_artist?.trim())
      return 'Favorite Artist is required'
    if (!adingForm.fave_food?.trim())
      return 'Favorite Food is required'
    if (!adingForm.fave_tv_show_movie?.trim())
      return 'Favorite TV Show or Movie is required'
    if (!adingForm.pam_vibe?.trim())
      return 'Pamilya Vibe is required'
    if (!adingForm.thoughts_on_drinking?.trim())
      return 'Thoughts on Drinking is required'
    if (!adingForm.dislikes?.trim())
      return 'Dislikes is required'
    if (!adingForm.pam_dealbreakers?.trim())
      return 'Things You Cannot Have in a Pam is required'
    if (!adingForm.pam_incompatibilities?.trim())
      return 'Please share who you cannot be in a pamilya with, or enter N/A'
    if (!adingForm.future_kuyate?.trim())
      return 'Please share your future kuya/ate, or enter N/A'
    return null
  }

  function validateKuyateForm(): string | null {
    if (!kuyateForm.instagram?.trim())
      return 'Instagram handle is required'
    if (!kuyateForm.pamilya_name?.trim())
      return 'Pamilya Name is required — select a pamilya or I am unsure'
    if (kuyateForm.wants_to_be_pam_head && !kuyateForm.pam_head_phone?.trim())
      return 'Phone Number is required when applying for Pamilya Head'
    if (kuyateForm.wants_to_be_pam_head && kuyateForm.pam_head_phone &&
      kuyateForm.pam_head_phone.replace(/\D/g, '').length !== 10)
      return 'Pamilya Head Phone Number must be 10 digits'
    if (!kuyateForm.why_kuyate?.trim())
      return 'Why do you want to be a Kuya/Ate is required'
    if (kuyateForm.why_kuyate && kuyateForm.why_kuyate.trim().length < 50)
      return 'Why do you want to be a Kuya/Ate must be at least 50 characters'
    if (!kuyateForm.acknowledges_responsibilities)
      return 'You must acknowledge your responsibilities before submitting'
    return null
  }

  async function handleFinalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const appValidationError = memberType === 'ading'
      ? validateAdingForm()
      : validateKuyateForm()
    if (appValidationError) {
      setError(appValidationError)
      setLoading(false)
      return
    }

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
      setError(data.error ?? 'something went wrong, please try again')
      setLoading(false)
      return
    }

    // route: /member/profile — member profile page shown after onboarding completes — do not change this path
    router.push('/member/profile')
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
      <main className="bg-brand-bg min-h-screen text-white overflow-x-hidden">
        <div className="relative flex flex-col items-center text-center px-6 py-16 md:py-20 max-w-[1280px] mx-auto">

          {/* membership confirmed badge */}
          <div className="relative z-10 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-accent-green/10 border border-accent-green/30 mb-7">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="font-display font-bold text-[11.5px] tracking-[0.12em] text-accent-green uppercase">Membership confirmed</span>
          </div>

          <h1 className="relative z-10 font-display font-black text-[clamp(42px,6vw,76px)] leading-[0.94] tracking-[-0.03em] text-white">
            Welcome,<br />
            <span className="text-accent-green">{firstName}!</span>
          </h1>

          <p className="relative z-10 max-w-[560px] text-lg leading-[1.6] text-[#9a9a9a] font-medium mt-6">
            You&rsquo;re officially part of the family! Before we get started, let us know which role fits you best.
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
                  Join as an ading and get paired with kuya &amp; ate mentors who guide you through your FSA experience.
                </p>
                <p className="sm:hidden text-[12.5px] leading-[1.5] text-[#c2c2c2] font-medium mb-3.5">
                  Get paired with kuya &amp; ate mentors for your FSA experience.
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
                  <p className="sm:hidden text-[12.5px] leading-[1.5] text-[#c2c2c2] font-medium mb-3.5">
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
              className="relative z-10 mt-9 text-[14px] font-semibold text-[#8e8e8e] hover:text-[#cfcfcf] cursor-pointer inline-flex items-center gap-2 transition-colors duration-200 disabled:opacity-50"
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
          {error && (
            <p className="relative z-10 font-sans text-sm text-red-400 mt-4">{error}</p>
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
            </div>

            {/* only renders when handleProfileSubmit finds a validation error — do not remove this condition */}
            {error && (
              <p className="font-sans text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] disabled:opacity-50 transition-all mt-2"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => setStep('pick')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] transition-colors"
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
            <div className="flex items-center gap-[14px]">
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
            </div>

            {/* — about you — */}
            <div className="flex items-center gap-[14px] pt-1">
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
              {adingForm.hobbies.length > 240 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.hobbies.length} / 300</p>
              )}
            </div>

            {/* — interests — */}
            <div className="flex items-center gap-[14px] pt-1">
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
            </div>

            {/* — pam match — */}
            <div className="flex items-center gap-[14px] pt-1">
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
              {adingForm.pam_vibe.length > 400 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.pam_vibe.length} / 500</p>
              )}
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
              {adingForm.availability.times.length > 160 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.availability.times.length} / 200</p>
              )}
            </div>

            {/* — compatibility — */}
            <div className="flex items-center gap-[14px] pt-1">
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
              {adingForm.thoughts_on_drinking.length > 400 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.thoughts_on_drinking.length} / 500</p>
              )}
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
              {adingForm.dislikes.length > 400 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.dislikes.length} / 500</p>
              )}
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
              {adingForm.pam_dealbreakers.length > 400 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.pam_dealbreakers.length} / 500</p>
              )}
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
              {adingForm.pam_incompatibilities.length > 400 && (
                <p className="font-sans text-xs text-[#7a7a7a] text-right mt-1">{adingForm.pam_incompatibilities.length} / 500</p>
              )}
            </div>

            {/* — wrap up — */}
            <div className="flex items-center gap-[14px] pt-1">
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
              {adingForm.additional_notes.length > 800 && (
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

            {/* only renders when the submit API returns an error — do not remove this condition */}
            {error && (
              <p className="font-sans text-sm text-red-400">{error}</p>
            )}

            {/* disabled until privacy policy is acknowledged */}
            <button
              type="submit"
              disabled={loading || !adingPrivacyAck}
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] disabled:opacity-50 transition-all mt-2"
            >
              {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Submitting...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('profile')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] transition-colors"
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
              {kuyateForm.additional_notes.length > 800 && (
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

            {/* only renders when the submit API returns an error — do not remove this condition */}
            {error && (
              <p className="font-sans text-sm text-red-400">{error}</p>
            )}

            {/* disabled until acknowledges_responsibilities and privacy policy are both checked */}
            <button
              type="submit"
              disabled={loading || !kuyateForm.acknowledges_responsibilities || !kuyatePrivacyAck}
              className="w-full py-4 rounded-[14px] bg-accent-green text-[#08130a] font-display font-extrabold text-[15px] tracking-[0.02em] hover:brightness-[1.08] disabled:opacity-50 transition-all mt-2"
            >
              {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Submitting...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('profile')}
              className="w-full text-center text-[#8e8e8e] text-[14px] font-semibold hover:text-[#cfcfcf] transition-colors"
            >
              ← Go Back
            </button>
          </form>
          </div>
        </div>
      </main>
    )
  }

  return null
}
