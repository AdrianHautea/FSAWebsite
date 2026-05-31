'use client'

import { useState } from 'react'

interface Props {
  displayPrice: number
  regularPrice: number
  isEarlyBird: boolean
  earlyBirdDeadline: string
  membershipYear: string
}

// formats cents to a dollar string
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function MembershipClient({
  displayPrice,
  regularPrice,
  isEarlyBird,
  earlyBirdDeadline,
  membershipYear,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePayment() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/membership/checkout', {
      method: 'POST',
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? 'something went wrong, please try again')
      setLoading(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Become a Member</h1>
      <p className="text-gray-500 mb-8">
        Join UTD FSA and get access to all events, pamilya placement, and more!
      </p>

      <div className="border rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-semibold text-lg">UTD FSA Membership</h2>
            <p className="text-sm text-gray-500">{membershipYear}</p>
          </div>

          <div className="text-right">
            {isEarlyBird ? (
              <>
                {/* show discounted price prominently, crossed out regular price */}
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(displayPrice)}
                </p>
                <p className="text-sm text-gray-400 line-through">
                  {formatPrice(regularPrice)}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  Early Bird Pricing
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ends {new Date(earlyBirdDeadline).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold">{formatPrice(displayPrice)}</p>
            )}
          </div>
        </div>

        <ul className="text-sm text-gray-600 flex flex-col gap-1 mb-6">
          <li>✓ Member pricing on all events</li>
          <li>✓ Pamilya placement</li>
          <li>✓ Points tracking and attendance history</li>
          <li>✓ Access to member-only content</li>
        </ul>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'redirecting to payment...' : `pay ${formatPrice(displayPrice)}`}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Secure payment powered by stripe. Have an officer code? You can enter it on the next page.
      </p>
    </main>
  )
}