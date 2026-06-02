'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toTitleCase, toSentenceCase, formatPhone } from '@/lib/format'

interface Props {
  memberId: string
  firstName: string
}

// the two membership types members can pick from
type MemberType = 'ading' | 'kuyate'

export default function OnboardingClient({ memberId, firstName }: Props) {
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

  // placeholder ading form — replace these fields once you have real questions
  const [adingForm, setAdingForm] = useState({
    preferred_pamilya: '',
    additional_notes: '',
  })

  // placeholder kuyate form — replace these fields once you have real questions
  const [kuyateForm, setKuyateForm] = useState({
    additional_notes: '',
  })

  function handleMemberTypePick(type: MemberType) {
    setMemberType(type)
    setStep('profile') // always collect profile info first
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!profileForm.first_name || !profileForm.last_name) {
      setError('first and last name are required')
      return
    }

    // move to the form for their chosen member type
    setStep(memberType!)
  }

  async function handleFinalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

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

    // redirect to profile on success
    router.push('/member/profile')
  }

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
            className="p-6 border-2 rounded-lg text-left hover:border-blue-500 transition-colors"
          >
            <h2 className="font-bold text-lg mb-1">Ading</h2>
            <p className="text-sm text-gray-500">
              I'm new and want to be placed in a pamilya as a member.
            </p>
          </button>

          <button
            onClick={() => handleMemberTypePick('kuyate')}
            className="p-6 border-2 rounded-lg text-left hover:border-blue-500 transition-colors"
          >
            <h2 className="font-bold text-lg mb-1">Kuya / Ate</h2>
            <p className="text-sm text-gray-500">
              I want to be a pamilya leader and mentor new members.
            </p>
          </button>
        </div>
      </main>
    )
  }

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
                First name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileForm.first_name}
                onChange={e => setProfileForm(p => ({
                  ...p,
                  first_name: toTitleCase(e.target.value)
                }))}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Your preferred first name"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileForm.last_name}
                onChange={e => setProfileForm(p => ({
                  ...p,
                  last_name: toTitleCase(e.target.value)
                }))}
                className="w-full border rounded-lg p-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm(p => ({
                ...p,
                phone: formatPhone(e.target.value)
              }))}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="(xxx) xxx-xxxx"
              maxLength={14}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <select
              value={profileForm.year}
              onChange={e => setProfileForm(p => ({ ...p, year: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm"
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
            <label className="block text-sm font-medium mb-1">Major</label>
            <input
              type="text"
              value={profileForm.major}
              onChange={e => setProfileForm(p => ({
                ...p,
                major: toTitleCase(e.target.value)
              }))}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="e.g. Computer Science"
            />
          </div>

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

  // step 3a — ading-specific questions (placeholder until pam chair provides questions)
  if (step === 'ading') {
    return (
      <main className="max-w-lg mx-auto p-8">
        <p className="text-sm text-gray-400 mb-1">Step 2 of 2</p>
        <h1 className="text-2xl font-bold mb-2">Ading application</h1>
        <p className="text-gray-500 mb-6">
          Help us place you in the right pamilya.
        </p>

        <form onSubmit={handleFinalSubmit} className="flex flex-col gap-4">
          {/* 
            placeholder field — replace this entire section with 
            real questions once pam chair provides them.
            add the corresponding columns to ading_applications table first,
            then add them here and to the adingForm state above.
          */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Preferred Pamilya (optional)
            </label>
            <select
              value={adingForm.preferred_pamilya}
              onChange={e => setAdingForm(p => ({ ...p, preferred_pamilya: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="">No Preference</option>
              <option value="Shiballers">Shiballers</option>
              <option value="Gutom Gang">Gutom Gang</option>
              <option value="Sushi Cuchi">Sushi Cuchi</option>
              <option value="Hanobe">Hanobe</option>
              <option value="Moganda">Moganda</option>
              <option value="SDIYBT">SDIYBT</option>
              <option value="Arigyattos">Arigyattos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Anything else you'd like us to know?
            </label>
            <textarea
              value={adingForm.additional_notes}
              onChange={e => setAdingForm(p => ({ ...p, additional_notes: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm"
              rows={3}
              placeholder="optional"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
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

  // step 3b — kuyate-specific questions (placeholder)
  if (step === 'kuyate') {
    return (
      <main className="max-w-lg mx-auto p-8">
        <p className="text-sm text-gray-400 mb-1">Step 2 of 2</p>
        <h1 className="text-2xl font-bold mb-2">Kuya / Ate Application</h1>
        <p className="text-gray-500 mb-6">
          Tell us about your interest in being a pamilya head.
        </p>

        <form onSubmit={handleFinalSubmit} className="flex flex-col gap-4">
          {/* 
            placeholder — replace with real kuyate questions from pam chair.
            add columns to kuyate_applications table first, then add fields here.
          */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Anything you'd like us to know about your interest?
            </label>
            <textarea
              value={kuyateForm.additional_notes}
              onChange={e => setKuyateForm(p => ({ ...p, additional_notes: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm"
              rows={4}
              placeholder="optional for now — real questions coming soon"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
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