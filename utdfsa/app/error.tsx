'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error boundary]', error)
  }, [error])

  return (
    <main className="bg-brand-bg min-h-screen flex items-center justify-center text-white px-6">
      <div className="text-center max-w-sm">
        <h1 className="font-display font-black text-4xl uppercase mb-3">Something went wrong</h1>
        <p className="font-sans text-white/50 text-sm mb-6">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <button
          onClick={reset}
          className="font-display font-bold text-xs uppercase tracking-widest px-6 py-3 bg-accent-green text-[#0e0e0e] rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Try Again
        </button>
      </div>
    </main>
  )
}
