'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toTitleCase, formatPhone } from '@/lib/format'

interface BasicInfoForm {
  first_name: string
  last_name: string
  phone: string
  year: string
  major: string
  pamilya: string
}

interface Props {
  initial: BasicInfoForm
}

const PAMILYAS = ['Shiballers', 'Gutom Gang', 'Sushi Cuchi', 'Hanobe', 'Moganda', 'SDIYBT', 'Arigyattos']

export default function BasicInfoClient({ initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<BasicInfoForm>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof BasicInfoForm>(field: K, value: BasicInfoForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('first and last name are required')
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
      setError(data.error ?? 'something went wrong, please try again')
      setLoading(false)
      return
    }

    // route: /member/profile — final destination after basic info is saved
    router.push('/member/profile')
  }

  // ============================================================
  // UI — safe to restyle everything below this line
  // available data:
  //   form — { first_name, last_name, phone, year, major, pamilya }
  //   loading (bool) — true while the submit API call is in flight
  //   error (string | null) — validation or API error
  // change classnames, layout, colors, and typography freely
  // do not remove or rename the variables being rendered
  // ============================================================
  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Tell us about yourself</h1>
      <p className="text-gray-700 mb-6">
        This information helps us get to know you better.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => set('first_name', toTitleCase(e.target.value))}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="Your preferred first name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => set('last_name', toTitleCase(e.target.value))}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', formatPhone(e.target.value))}
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="(xxx) xxx-xxxx"
            maxLength={14}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select
            value={form.year}
            onChange={e => set('year', e.target.value)}
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
            value={form.major}
            onChange={e => set('major', toTitleCase(e.target.value))}
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="e.g. Computer Science"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pamilya Preference</label>
          <select
            value={form.pamilya}
            onChange={e => set('pamilya', e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          >
            <option value="">No Preference</option>
            {PAMILYAS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* only renders when there is a validation or API error — do not remove this condition */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2"
        >
          {/* only shows "saving..." while the API call is in flight — do not remove this condition */}
          {loading ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>
    </main>
  )
}
