'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toTitleCase, formatPhone } from '@/lib/format'

/**
 * Props — passed down from OnboardingPage server component (onboarding/page.tsx)
 *   memberId       — the Supabase members.id of the signed-in user; sent to the submit API
 *   firstName      — pre-filled greeting name pulled from the member row
 *   isKuyateOpen   — whether kuyate applications are currently open (from settings table);
 *                    when false, only ading + not-interested are offered in the pick step
 */
interface Props {
  memberId: string
  firstName: string
  isKuyateOpen: boolean
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

// shared class strings for form fields
const fieldCls = 'w-full border border-white rounded-lg p-2 text-sm text-white bg-transparent'
const fieldDateCls = `${fieldCls} [&::-webkit-calendar-picker-indicator]:invert`

// ── IMPORTANT — do not restructure the step logic below ──────────────────────
// Rule 7: This is a multi-step form. The step flow (pick → profile → ading|kuyate)
// must be preserved exactly. Each step is a separate conditional return.
// Do not merge steps, reorder them, or replace the step state with a router-based flow.
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingClient({ memberId, firstName, isKuyateOpen }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'pick' | 'ading' | 'kuyate' | 'profile'>('pick')
  const [memberType, setMemberType] = useState<MemberType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // basic profile fields — collected regardless of member type
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    year: '',
    major: '',
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

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!profileForm.first_name || !profileForm.last_name) {
      setError('first and last name are required')
      return
    }

    if (!profileForm.phone || profileForm.phone.replace(/\D/g, '').length < 10) {
      setError('a valid phone number is required')
      return
    }

    if (!profileForm.year) {
      setError('please select your year')
      return
    }

    if (!profileForm.major.trim()) {
      setError('major is required')
      return
    }

    // pre-fill ading phone from profile so the field arrives ready
    setAdingForm(p => ({ ...p, phone: profileForm.phone }))

    setStep(memberType!)
  }

  async function handleFinalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

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

  // step 1 — pick member type
  if (step === 'pick') {
    return (
      <main className="max-w-lg mx-auto p-8">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {firstName}!
        </h1>
        <p className="text-gray-500 mb-8">
          Before we get started, let us know which role fits you best.
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleMemberTypePick('ading')}
            disabled={loading}
            className="p-6 border-2 rounded-lg text-left hover:border-blue-500 transition-colors disabled:opacity-50"
          >
            {/* label differs based on whether kuyate is available — do not remove this condition */}
            <h2 className="font-bold text-lg mb-1">{isKuyateOpen ? 'Ading' : 'Apply as Ading'}</h2>
            <p className="text-sm text-gray-500">
              I'm new and want to be placed in a pamilya as a member.
            </p>
          </button>

          {/* only renders when kuyate applications are open — do not remove this condition */}
          {isKuyateOpen && (
            <button
              onClick={() => handleMemberTypePick('kuyate')}
              disabled={loading}
              className="p-6 border-2 rounded-lg text-left hover:border-blue-500 transition-colors disabled:opacity-50"
            >
              <h2 className="font-bold text-lg mb-1">Kuya / Ate</h2>
              <p className="text-sm text-gray-500">
                I want to be a pamilya leader and mentor new members.
              </p>
            </button>
          )}

          {/* not interested — full button when kuyate is closed, subtle text link when open */}
          {/* do not remove this condition */}
          {isKuyateOpen ? (
            <button
              onClick={handleNotInterested}
              disabled={loading}
              className="text-sm text-gray-400 hover:text-gray-600 text-center mt-2 disabled:opacity-50"
            >
              {loading ? 'saving...' : 'Not interested in the pamilya program'}
            </button>
          ) : (
            <button
              onClick={handleNotInterested}
              disabled={loading}
              className="p-6 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <h2 className="font-bold text-lg mb-1 text-gray-900">Not Interested</h2>
              <p className="text-sm text-gray-600">
                I'll sit out the pamilya program for now. I can still apply later if I change my mind.
              </p>
            </button>
          )}
        </div>

        {/* only renders when handleNotInterested returns an API error — do not remove this condition */}
        {error && (
          <p className="text-sm text-red-500 mt-4">{error}</p>
        )}
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

  // step 2 — basic profile info (same for both types)
  if (step === 'profile') {
    return (
      <main className="max-w-lg mx-auto p-8">
        <p className="text-sm text-gray-400 mb-1">Step 1 of 2</p>
        <h1 className="text-2xl font-bold mb-2">Tell us about yourself</h1>
        <p className="text-gray-500 mb-6">
          This information will appear on your member profile.
        </p>

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                First Name <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium mb-1">
                Last Name <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Phone Number <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Year <span className="text-red-500">*</span>
            </label>
            <select
              value={profileForm.year}
              onChange={e => setProfileForm(p => ({ ...p, year: e.target.value }))}
              className={fieldCls}
              required
            >
              <option value="">Select Your Year</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate">Graduate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Major <span className="text-red-500">*</span>
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
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mt-2"
          >
            Continue
          </button>

          <button
            type="button"
            onClick={() => setStep('pick')}
            className="text-sm text-gray-400 hover:text-gray-600 text-center"
          >
            ← Go Back
          </button>
        </form>
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

  // step 3a — ading-specific questions
  if (step === 'ading') {
    const birthdayAge = calcAge(adingForm.birthday)

    return (
      <main className="max-w-lg mx-auto p-8">
        <p className="text-sm text-gray-400 mb-1">Step 2 of 2</p>
        <h1 className="text-2xl font-bold mb-2">Ading Application</h1>
        <p className="text-gray-500 mb-6">
          Help us place you in the right pamilya.
        </p>

        <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5">

          {/* instagram */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Instagram Handle <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Phone Number <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Birthday <span className="text-red-500">*</span>
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
              <p className="text-xs text-amber-500 mt-1">
                heads up — members must be at least 16 to participate in the pamilya program
              </p>
            )}
          </div>

          {/* pronouns */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Pronouns <span className="text-red-500">*</span>
            </label>
            <select
              value={adingForm.pronouns}
              onChange={e => setAdingForm(p => ({ ...p, pronouns: e.target.value }))}
              className={fieldCls}
              required
            >
              <option value="">Select pronouns</option>
              {PRONOUNS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* activity level slider — always has a value, no required needed */}
          <div>
            <label className="block text-sm font-medium mb-2">How active can you be?</label>
            <input
              type="range"
              min={1}
              max={10}
              value={adingForm.activity_level}
              onChange={e => setAdingForm(p => ({ ...p, activity_level: Number(e.target.value) }))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 — barely active</span>
              <span className="font-bold text-blue-600 text-sm">{adingForm.activity_level}</span>
              <span>10 — very active</span>
            </div>
          </div>

          {/* hobbies */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Hobbies? <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.hobbies.length} / 300</p>
            )}
          </div>

          {/* fave music genre */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Favorite Music Genre? <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Favorite Artist? <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Favorite Food? <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              What vibe are you looking for in a pam? <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.pam_vibe.length} / 500</p>
            )}
          </div>

          {/* hangout size preference — 10 clickable icons; always has a value, no required needed */}
          <div>
            <label className="block text-sm font-medium mb-2">Hangout Size Preference?</label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAdingForm(p => ({ ...p, hangout_size_preference: n }))}
                  className={`flex-1 aspect-square rounded-full border-2 transition-colors ${
                    n <= adingForm.hangout_size_preference
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-white hover:border-blue-300'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Small</span>
              <span>Mix</span>
              <span>Big</span>
            </div>
          </div>

          {/* fave tv show / movie */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Favorite TV Show or Movie? <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-2">
              Availability? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DAYS_OF_WEEK.map(day => (
                <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adingForm.availability.days.includes(day)}
                    onChange={() => toggleAvailabilityDay(day)}
                    className="rounded"
                  />
                  {day}
                </label>
              ))}
            </div>
            <label className="block text-sm text-gray-400 mb-1">
              What times are you usually free on those days?
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.availability.times.length} / 200</p>
            )}
          </div>

          {/* thoughts on drinking */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Thoughts on drinking? <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.thoughts_on_drinking.length} / 500</p>
            )}
          </div>

          {/* dislikes */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Dislikes? <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.dislikes.length} / 500</p>
            )}
          </div>

          {/* pam dealbreakers */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Things You Cannot Have in a Pam? <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.pam_dealbreakers.length} / 500</p>
            )}
          </div>

          {/* future kuyate */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Future Kuya/Ate? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={adingForm.future_kuyate}
              onChange={e => setAdingForm(p => ({ ...p, future_kuyate: e.target.value }))}
              className={fieldCls}
              placeholder="Leave blank if unsure"
              maxLength={100}
              required
            />
          </div>

          {/* mbti */}
          <div>
            <label className="block text-sm font-medium mb-1">
              MBTI Type? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={adingForm.mbti}
              onChange={e => setAdingForm(p => ({ ...p, mbti: e.target.value.toUpperCase() }))}
              className={fieldCls}
              placeholder="e.g. INFP — leave blank if unsure"
              maxLength={4}
              required
            />
          </div>

          {/* additional notes — optional */}
          <div>
            <label className="block text-sm font-medium mb-1">
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
              <p className="text-xs text-gray-400 text-right mt-0.5">{adingForm.additional_notes.length} / 1000</p>
            )}
          </div>

          {/* only renders when the submit API returns an error — do not remove this condition */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
            {loading ? 'submitting...' : 'Complete Sign Up'}
          </button>

          <button
            type="button"
            onClick={() => setStep('profile')}
            className="text-sm text-gray-400 hover:text-gray-600 text-center"
          >
            ← Go Back
          </button>
        </form>
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

  // step 3b — kuyate-specific questions
  if (step === 'kuyate') {
    return (
      <main className="max-w-lg mx-auto p-8">
        <p className="text-sm text-gray-400 mb-1">Step 2 of 2</p>
        <h1 className="text-2xl font-bold mb-2">Kuya / Ate Application</h1>
        <p className="text-gray-500 mb-6">
          Tell us about your interest in being a pamilya leader.
        </p>

        <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5">

          {/* instagram */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Instagram Handle <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium mb-1">
              Which pamilya are you applying to lead? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={kuyateForm.pamilya_name}
              onChange={e => setKuyateForm(p => ({ ...p, pamilya_name: e.target.value }))}
              className={fieldCls}
              placeholder="e.g. Shiballers — leave blank if unsure"
              maxLength={100}
              required
            />
          </div>

          {/* pam head toggle — boolean, always has a value */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Are you interested in being a pamilya head?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKuyateForm(p => ({ ...p, wants_to_be_pam_head: true }))}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  kuyateForm.wants_to_be_pam_head
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-white text-white hover:border-blue-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setKuyateForm(p => ({ ...p, wants_to_be_pam_head: false }))}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  !kuyateForm.wants_to_be_pam_head
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-white text-white hover:border-blue-300'
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
              <label className="block text-sm font-medium mb-1">
                Your Phone Number <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-400 mt-1">
                Your phone number will be shared with the pam chair.
              </p>
            </div>
          )}

          {/* why kuyate */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Why do you want to be a kuya/ate? <span className="text-red-500">*</span>
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
                <span className="text-xs text-amber-500">at least 50 characters required</span>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400 ml-auto">{kuyateForm.why_kuyate.length} / 1000 characters</span>
            </div>
          </div>

          {/* additional notes — optional */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Anything you'd like us to know about your interest?
            </label>
            <textarea
              value={kuyateForm.additional_notes}
              onChange={e => setKuyateForm(p => ({ ...p, additional_notes: e.target.value }))}
              className={fieldCls}
              rows={3}
              maxLength={1000}
            />
            {kuyateForm.additional_notes.length > 800 && (
              <p className="text-xs text-gray-400 text-right mt-0.5">{kuyateForm.additional_notes.length} / 1000</p>
            )}
          </div>

          {/* acknowledgement — visually separated, must be checked to submit */}
          <div className="border-t border-white/20 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={kuyateForm.acknowledges_responsibilities}
                onChange={e => setKuyateForm(p => ({ ...p, acknowledges_responsibilities: e.target.checked }))}
                className="mt-0.5 rounded"
              />
              <span className="text-sm">
                I understand the responsibilities of being a kuya/ate and commit to fulfilling
                them to the best of my ability.
              </span>
            </label>
          </div>

          {/* only renders when the submit API returns an error — do not remove this condition */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* disabled until acknowledges_responsibilities is checked */}
          <button
            type="submit"
            disabled={loading || !kuyateForm.acknowledges_responsibilities}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {/* only shows "submitting..." while the API call is in flight — do not remove this condition */}
            {loading ? 'submitting...' : 'Complete Sign Up'}
          </button>

          <button
            type="button"
            onClick={() => setStep('profile')}
            className="text-sm text-gray-400 hover:text-gray-600 text-center"
          >
            ← Go Back
          </button>
        </form>
      </main>
    )
  }

  return null
}
