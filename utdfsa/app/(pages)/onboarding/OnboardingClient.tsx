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

// shared class strings for form fields — dark theme matching site design language
const fieldCls = 'w-full border border-white/30 rounded-lg p-2.5 text-sm text-white bg-brand-bg placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-accent-green focus:border-accent-green transition-colors'
const fieldDateCls = `${fieldCls} [&::-webkit-calendar-picker-indicator]:invert`

// Label class — uppercase tracking-wide matching site section label style
const labelCls = 'block font-display font-bold text-xs uppercase tracking-widest text-white/60 mb-1.5'

// ── IMPORTANT — do not restructure the step logic below ──────────────────────
// Rule 7: This is a multi-step form. The step flow (pick → profile → ading|kuyate)
// must be preserved exactly. Each step is a separate conditional return.
// Do not merge steps, reorder them, or replace the step state with a router-based flow.
// ─────────────────────────────────────────────────────────────────────────────

// Step progress indicator — shown on profile/ading/kuyate steps
function StepIndicator({ step, memberType }: { step: string; memberType: MemberType | null }) {
  const step2Label = memberType === 'kuyate' ? 'Kuya/Ate Application' : 'Ading Application'
  const s1Done = step === 'ading' || step === 'kuyate'
  const s1Active = step === 'profile'
  const s2Active = step === 'ading' || step === 'kuyate'

  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex items-center gap-2 shrink-0">
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-display font-black text-xs shrink-0 ${
          s1Done
            ? 'border-accent-green bg-accent-green text-[#0e0e0e]'
            : s1Active
            ? 'border-accent-green bg-accent-green text-[#0e0e0e]'
            : 'border-white/30 text-white/40'
        }`}>
          {s1Done ? '✓' : '1'}
        </div>
        <span className={`font-display font-bold text-xs uppercase tracking-wide whitespace-nowrap ${
          s1Active || s1Done ? 'text-white' : 'text-white/40'
        }`}>
          Tell Us About Yourself
        </span>
      </div>

      <div className={`flex-1 h-px ${s1Done ? 'bg-accent-green' : 'bg-white/20'}`} />

      <div className="flex items-center gap-2 shrink-0">
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-display font-black text-xs shrink-0 ${
          s2Active
            ? 'border-accent-green bg-accent-green text-[#0e0e0e]'
            : 'border-white/30 text-white/40'
        }`}>
          2
        </div>
        <span className={`font-display font-bold text-xs uppercase tracking-wide whitespace-nowrap ${
          s2Active ? 'text-white' : 'text-white/40'
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
    if (profileForm.phone && profileForm.phone.replace(/\D/g, '').length !== 10)
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
    if (!adingForm.hobbies?.trim())
      return 'Hobbies is required'
    if (!adingForm.fave_food?.trim())
      return 'Favorite Food is required'
    if (!adingForm.pam_vibe?.trim())
      return 'Pamilya Vibe is required'
    if (!adingForm.thoughts_on_drinking?.trim())
      return 'Thoughts on Drinking is required'
    if (!adingForm.dislikes?.trim())
      return 'Dislikes is required'
    if (!adingForm.pam_dealbreakers?.trim())
      return 'Things You Cannot Have in a Pam is required'
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
      <main className="bg-brand-bg min-h-screen text-white">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="font-display font-black text-[clamp(32px,5vw,56px)] text-white uppercase leading-none mb-2">
            Welcome,<br />{firstName}!
          </h1>
          <p className="font-sans text-sm text-white/50 mb-8">
            Before we get started, let us know which role fits you best.
          </p>

          <div className="flex flex-col items-center gap-6 w-full">

            {/* Cards row — side by side on sm+, stacked on mobile */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">

              {/* Ading card — full-bleed photo, aspect-[4/5] portrait */}
              {/* label differs based on whether kuyate is available — do not remove this condition */}
              <button
                onClick={() => handleMemberTypePick('ading')}
                disabled={loading}
                className="flex-1 relative aspect-[4/5] rounded-[27px] overflow-hidden disabled:opacity-50 hover:scale-[1.02] hover:brightness-110 transition-transform duration-200"
              >
                <Image
                  src="/ading-form.png"
                  alt="Ading"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-display font-black text-xl uppercase tracking-wide px-4">
                  {isKuyateOpen ? 'ADING FORM' : 'APPLY AS ADING'}
                </span>
              </button>

              {/* only renders when kuyate applications are open — do not remove this condition */}
              {isKuyateOpen && (
                <button
                  onClick={() => handleMemberTypePick('kuyate')}
                  disabled={loading}
                  className="flex-1 relative aspect-[4/5] rounded-[27px] overflow-hidden disabled:opacity-50 hover:scale-[1.02] hover:brightness-110 transition-transform duration-200"
                >
                  <Image
                    src="/kuyate-form.png"
                    alt="Kuya/Ate"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-display font-black text-xl uppercase tracking-wide px-4">
                    KUYA/ATE FORM
                  </span>
                </button>
              )}
            </div>

            {/* not interested — centered below cards; full button when kuyate is closed, subtle link when open */}
            {/* do not remove this condition */}
            {isKuyateOpen ? (
              <button
                onClick={handleNotInterested}
                disabled={loading}
                className="font-sans text-sm text-gray-400 hover:text-gray-200 cursor-pointer text-center disabled:opacity-50 transition-colors"
              >
                {loading ? 'saving...' : 'Not interested in the pamilya program'}
              </button>
            ) : (
              <button
                onClick={handleNotInterested}
                disabled={loading}
                className="p-6 border-2 border-white/20 rounded-[27px] text-left hover:border-white/40 transition-colors disabled:opacity-50 bg-brand-bg w-full max-w-2xl"
              >
                <h2 className="font-display font-black text-base text-white uppercase mb-1">Not Interested</h2>
                <p className="font-sans text-sm text-white/50">
                  I&rsquo;ll sit out the pamilya program for now. I can still apply later if I change my mind.
                </p>
              </button>
            )}

          </div>

          {/* only renders when handleNotInterested returns an API error — do not remove this condition */}
          {error && (
            <p className="font-sans text-sm text-red-400 mt-4">{error}</p>
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
        <div className="max-w-lg mx-auto px-6 py-12">
          <h1 className="font-display font-black text-[clamp(28px,4vw,48px)] text-white uppercase leading-none mb-6">
            Tell Us About Yourself
          </h1>
          <StepIndicator step={step} memberType={memberType} />

          <div className="border border-white/[7%] rounded-2xl bg-[#1a1a1a] p-6">
          <p className="font-sans text-sm text-white/50 mb-6">
            This information will appear on your member profile.
          </p>

          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className={labelCls}>
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={e => setProfileForm(p => ({
                    ...p,
                    first_name: toTitleCase(e.target.value)
                  }))}
                  className={fieldCls}
                  placeholder="Your preferred first name"
                  required
                />
              </div>
              <div className="flex-1">
                <label className={labelCls}>
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={e => setProfileForm(p => ({
                    ...p,
                    last_name: toTitleCase(e.target.value)
                  }))}
                  className={fieldCls}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={e => setProfileForm(p => ({
                  ...p,
                  phone: formatPhone(e.target.value)
                }))}
                className={fieldCls}
                placeholder="(xxx) xxx-xxxx"
                maxLength={14}
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                Year <span className="text-red-400">*</span>
              </label>
              <select
                value={profileForm.year}
                onChange={e => setProfileForm(p => ({ ...p, year: e.target.value }))}
                className={`${fieldCls} pr-8`}
                required
              >
                <option value="" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Select Your Year</option>
                <option value="Freshman" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Freshman</option>
                <option value="Sophomore" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Sophomore</option>
                <option value="Junior" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Junior</option>
                <option value="Senior" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Senior</option>
                <option value="Graduate" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Graduate</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Major <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={profileForm.major}
                onChange={e => setProfileForm(p => ({
                  ...p,
                  major: toTitleCase(e.target.value)
                }))}
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
              className="w-full bg-accent-green text-[#0e0e0e] font-display font-black uppercase tracking-widest py-3.5 rounded-lg hover:opacity-90 transition-opacity mt-2"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => setStep('pick')}
              className="font-sans text-sm text-white/40 hover:text-white/60 text-center transition-colors"
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
        <div className="max-w-lg mx-auto px-6 py-12">
          <h1 className="font-display font-black text-[clamp(28px,4vw,48px)] text-white uppercase leading-none mb-6">
            Ading Application
          </h1>
          <StepIndicator step={step} memberType={memberType} />

          <div className="border border-white/[7%] rounded-2xl bg-[#1a1a1a] p-6">
          <p className="font-sans text-sm text-white/50 mb-6">
            Help us place you in the right pamilya.
          </p>

          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5">

            {/* instagram */}
            <div>
              <label className={labelCls}>
                Instagram Handle <span className="text-red-400">*</span>
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
                Phone Number <span className="text-red-400">*</span>
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
                Birthday <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={adingForm.birthday}
                onChange={e => setAdingForm(p => ({ ...p, birthday: e.target.value }))}
                className={fieldDateCls}
                max={TODAY}
                required
              />
              {/* only renders when age is under 16 — do not remove this condition */}
              {birthdayAge !== null && birthdayAge < 16 && (
                <p className="font-sans text-xs text-amber-400 mt-1">
                  heads up — members must be at least 16 to participate in the pamilya program
                </p>
              )}
            </div>

            {/* pronouns */}
            <div>
              <label className={labelCls}>
                Pronouns <span className="text-red-400">*</span>
              </label>
              <select
                value={adingForm.pronouns}
                onChange={e => setAdingForm(p => ({ ...p, pronouns: e.target.value }))}
                className={fieldCls}
                required
              >
                <option value="" style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>Select pronouns</option>
                {PRONOUNS_OPTIONS.map(opt => (
                  <option key={opt} value={opt} style={{ color: '#ffffff', backgroundColor: '#0e0e0e' }}>{opt}</option>
                ))}
              </select>
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
                className="w-full accent-[#75ba78]"
              />
              <div className="flex justify-between font-sans text-xs text-white/40 mt-1">
                <span>1 — barely active</span>
                <span className="font-display font-bold text-sm text-accent-green">{adingForm.activity_level}</span>
                <span>10 — very active</span>
              </div>
            </div>

            {/* hobbies */}
            <div>
              <label className={labelCls}>
                Hobbies? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={adingForm.hobbies}
                onChange={e => setAdingForm(p => ({ ...p, hobbies: e.target.value }))}
                className={fieldCls}
                rows={2}
                maxLength={300}
                required
              />
              {adingForm.hobbies.length > 240 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.hobbies.length} / 300</p>
              )}
            </div>

            {/* fave music genre */}
            <div>
              <label className={labelCls}>
                Favorite Music Genre? <span className="text-red-400">*</span>
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
                Favorite Artist? <span className="text-red-400">*</span>
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
                Favorite Food? <span className="text-red-400">*</span>
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

            {/* pam vibe */}
            <div>
              <label className={labelCls}>
                What vibe are you looking for in a pam? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={adingForm.pam_vibe}
                onChange={e => setAdingForm(p => ({ ...p, pam_vibe: e.target.value }))}
                className={fieldCls}
                rows={3}
                placeholder="Describe the energy, personality, activities..."
                maxLength={500}
                required
              />
              {adingForm.pam_vibe.length > 400 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.pam_vibe.length} / 500</p>
              )}
            </div>

            {/* hangout size preference — 10 clickable icons; always has a value, no required needed */}
            <div>
              <label className={labelCls}>Hangout Size Preference?</label>
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAdingForm(p => ({ ...p, hangout_size_preference: n }))}
                    className={`flex-1 aspect-square rounded-full border-2 transition-colors ${
                      n <= adingForm.hangout_size_preference
                        ? 'bg-accent-green border-accent-green'
                        : 'border-white/30 hover:border-accent-green/50'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between font-sans text-xs text-white/40 mt-1">
                <span>Small</span>
                <span>Mix</span>
                <span>Big</span>
              </div>
            </div>

            {/* fave tv show / movie */}
            <div>
              <label className={labelCls}>
                Favorite TV Show or Movie? <span className="text-red-400">*</span>
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

            {/* availability — days checkboxes + times textarea */}
            <div>
              <label className={labelCls}>
                Availability? <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day} className="flex items-center gap-1.5 font-sans text-sm text-white/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adingForm.availability.days.includes(day)}
                      onChange={() => toggleAvailabilityDay(day)}
                      className="rounded accent-[#75ba78]"
                    />
                    {day}
                  </label>
                ))}
              </div>
              <label className="block font-sans text-xs text-white/40 mb-1">
                What times are you usually free on those days? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={adingForm.availability.times}
                onChange={e => setAdingForm(p => ({
                  ...p,
                  availability: { ...p.availability, times: e.target.value },
                }))}
                className={fieldCls}
                rows={2}
                maxLength={200}
                required
              />
              {adingForm.availability.times.length > 160 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.availability.times.length} / 200</p>
              )}
            </div>

            {/* thoughts on drinking */}
            <div>
              <label className={labelCls}>
                Thoughts on drinking? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={adingForm.thoughts_on_drinking}
                onChange={e => setAdingForm(p => ({ ...p, thoughts_on_drinking: e.target.value }))}
                className={fieldCls}
                rows={2}
                placeholder="Share your thoughts and comfort level..."
                maxLength={500}
                required
              />
              {adingForm.thoughts_on_drinking.length > 400 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.thoughts_on_drinking.length} / 500</p>
              )}
            </div>

            {/* dislikes */}
            <div>
              <label className={labelCls}>
                Dislikes? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={adingForm.dislikes}
                onChange={e => setAdingForm(p => ({ ...p, dislikes: e.target.value }))}
                className={fieldCls}
                rows={2}
                maxLength={500}
                required
              />
              {adingForm.dislikes.length > 400 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.dislikes.length} / 500</p>
              )}
            </div>

            {/* pam dealbreakers */}
            <div>
              <label className={labelCls}>
                Things You Cannot Have in a Pam? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={adingForm.pam_dealbreakers}
                onChange={e => setAdingForm(p => ({ ...p, pam_dealbreakers: e.target.value }))}
                className={fieldCls}
                rows={2}
                placeholder="Dealbreakers, things that would make you uncomfortable..."
                maxLength={500}
                required
              />
              {adingForm.pam_dealbreakers.length > 400 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.pam_dealbreakers.length} / 500</p>
              )}
            </div>

            {/* pam incompatibilities — optional */}
            <div>
              <label className={labelCls}>
                Who can&rsquo;t you be in a Pamilya with and why?
              </label>
              <textarea
                value={adingForm.pam_incompatibilities}
                onChange={e => setAdingForm(p => ({ ...p, pam_incompatibilities: e.target.value }))}
                className={fieldCls}
                rows={2}
                placeholder="Optional — share any conflicts or reasons you need to be separated from someone"
                maxLength={500}
              />
              {adingForm.pam_incompatibilities.length > 400 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.pam_incompatibilities.length} / 500</p>
              )}
            </div>

            {/* future kuyate */}
            <div>
              <label className={labelCls}>
                Future Kuya/Ate? <span className="text-red-400">*</span>
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

            {/* mbti */}
            <div>
              <label className={labelCls}>
                MBTI Type? <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={adingForm.mbti}
                onChange={e => setAdingForm(p => ({ ...p, mbti: e.target.value.toUpperCase() }))}
                className={fieldCls}
                placeholder="e.g. INFP, INTJ, ENFP"
                maxLength={4}
                required
              />
            </div>

            {/* additional notes — optional */}
            <div>
              <label className={labelCls}>
                Anything else that would help us sort you?
              </label>
              <textarea
                value={adingForm.additional_notes}
                onChange={e => setAdingForm(p => ({ ...p, additional_notes: e.target.value }))}
                className={fieldCls}
                rows={3}
                maxLength={1000}
              />
              {adingForm.additional_notes.length > 800 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{adingForm.additional_notes.length} / 1000</p>
              )}
            </div>

            {/* only renders when the submit API returns an error — do not remove this condition */}
            {error && (
              <p className="font-sans text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-green text-[#0e0e0e] font-display font-black uppercase tracking-widest py-3.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
            >
              {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Submitting...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('profile')}
              className="font-sans text-sm text-white/40 hover:text-white/60 text-center transition-colors"
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
        <div className="max-w-lg mx-auto px-6 py-12">
          <h1 className="font-display font-black text-[clamp(28px,4vw,48px)] text-white uppercase leading-none mb-6">
            Kuya / Ate Application
          </h1>
          <StepIndicator step={step} memberType={memberType} />

          <div className="border border-white/[7%] rounded-2xl bg-[#1a1a1a] p-6">
          <p className="font-sans text-sm text-white/50 mb-6">
            Tell us about your interest in being a pamilya leader.
          </p>

          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5">

            {/* instagram */}
            <div>
              <label className={labelCls}>
                Instagram Handle <span className="text-red-400">*</span>
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

            {/* pamilya name — free text since pams aren't finalized */}
            <div>
              <label className={labelCls}>
                Which pamilya are you applying to lead? <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={kuyateForm.pamilya_name}
                onChange={e => setKuyateForm(p => ({ ...p, pamilya_name: e.target.value }))}
                className={fieldCls}
                placeholder="e.g. Shiballers — enter n/a if unsure"
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
                  className={`flex-1 py-2.5 rounded-lg border-2 font-display font-bold text-xs uppercase tracking-widest transition-colors ${
                    kuyateForm.wants_to_be_pam_head
                      ? 'bg-accent-green border-accent-green text-[#0e0e0e]'
                      : 'border-white/30 text-white hover:border-accent-green/50'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setKuyateForm(p => ({ ...p, wants_to_be_pam_head: false }))}
                  className={`flex-1 py-2.5 rounded-lg border-2 font-display font-bold text-xs uppercase tracking-widest transition-colors ${
                    !kuyateForm.wants_to_be_pam_head
                      ? 'bg-accent-green border-accent-green text-[#0e0e0e]'
                      : 'border-white/30 text-white hover:border-accent-green/50'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* pam head phone — only shown when wants_to_be_pam_head is true */}
            {/* auto-fills from profileForm.phone on focus if the field is empty */}
            {kuyateForm.wants_to_be_pam_head && (
              <div>
                <label className={labelCls}>
                  Your Phone Number <span className="text-red-400">*</span>
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
                <p className="font-sans text-xs text-white/40 mt-1">
                  Your phone number will be shared with the pam chair.
                </p>
              </div>
            )}

            {/* why kuyate */}
            <div>
              <label className={labelCls}>
                Why do you want to be a kuya/ate? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={kuyateForm.why_kuyate}
                onChange={e => setKuyateForm(p => ({ ...p, why_kuyate: e.target.value }))}
                className={fieldCls}
                rows={4}
                maxLength={1000}
                required
              />
              <div className="flex justify-between items-center mt-1">
                {kuyateForm.why_kuyate.length > 0 && kuyateForm.why_kuyate.length < 50 ? (
                  <span className="font-sans text-xs text-amber-400">at least 50 characters required</span>
                ) : (
                  <span />
                )}
                <span className="font-sans text-xs text-white/40 ml-auto">{kuyateForm.why_kuyate.length} / 1000 characters</span>
              </div>
            </div>

            {/* additional notes — optional */}
            <div>
              <label className={labelCls}>
                Anything you&rsquo;d like us to know about your interest?
              </label>
              <textarea
                value={kuyateForm.additional_notes}
                onChange={e => setKuyateForm(p => ({ ...p, additional_notes: e.target.value }))}
                className={fieldCls}
                rows={3}
                maxLength={1000}
              />
              {kuyateForm.additional_notes.length > 800 && (
                <p className="font-sans text-xs text-white/40 text-right mt-0.5">{kuyateForm.additional_notes.length} / 1000</p>
              )}
            </div>

            {/* acknowledgement — visually separated, must be checked to submit */}
            <div className="border-t border-white/20 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kuyateForm.acknowledges_responsibilities}
                  onChange={e => setKuyateForm(p => ({ ...p, acknowledges_responsibilities: e.target.checked }))}
                  className="mt-0.5 rounded accent-[#75ba78]"
                />
                <span className="font-sans text-sm text-white/70">
                  I understand the responsibilities of being a kuya/ate and commit to fulfilling
                  them to the best of my ability.
                </span>
              </label>
            </div>

            {/* only renders when the submit API returns an error — do not remove this condition */}
            {error && (
              <p className="font-sans text-sm text-red-400">{error}</p>
            )}

            {/* disabled until acknowledges_responsibilities is checked */}
            <button
              type="submit"
              disabled={loading || !kuyateForm.acknowledges_responsibilities}
              className="w-full bg-accent-green text-[#0e0e0e] font-display font-black uppercase tracking-widest py-3.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
            >
              {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
              {loading ? 'Submitting...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('profile')}
              className="font-sans text-sm text-white/40 hover:text-white/60 text-center transition-colors"
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
