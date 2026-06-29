// ── DeleteEventModal.tsx ──────────────────────────────────
// confirmation modal requiring the officer to type the event name before deletion.
//
// deps:  DELETE /api/officer/events/[id]
// notes: destructive — deletes all tickets and attendance records for the event.
//        the type-to-confirm pattern prevents accidental deletion.
'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'

export default function DeleteEventModal({
  eventName,
  eventId,
  onClose,
  onDeleted,
}: {
  eventName: string
  eventId: string
  onClose: () => void
  onDeleted: () => void
}) {
  // tracks what the officer has typed into the confirmation input
  const [typedValue, setTypedValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // delete button is only enabled when the typed text exactly matches the event name
  const isMatch = typedValue === eventName

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/officer/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to delete event.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} size="sm">
      <div className="bg-white rounded-xl shadow-xl w-full overflow-hidden">
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <h2 className="text-white font-bold text-lg">Delete Event</h2>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-gray-700">
            This action cannot be undone. Deleting this event will permanently
            remove all registration tickets and attendance records associated
            with it, including records for members who have already paid.
          </p>
          <p className="text-sm font-bold text-red-600">
            All paid ticket holders will lose their ticket records.
          </p>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Type the event name to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={e => setTypedValue(e.target.value)}
              placeholder={eventName}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end border-t pt-4">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              type="button"
              disabled={!isMatch || loading}
              onClick={handleDelete}
              className={`px-5 py-2 font-semibold rounded-lg text-sm transition-colors ${
                isMatch && !loading
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
