// ── Modal.tsx ─────────────────────────────────────────────
// reusable overlay modal with backdrop blur and escape-key dismiss
//
// data:  props — onClose callback, optional size (sm/md/lg), children
// notes: z-[300] so it layers above the navbar (z-[60]) and mobile menu (z-40)

'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  scrollable?: boolean
  panelClassName?: string
  label?: string
  children: React.ReactNode
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({ onClose, size = 'md', scrollable = true, panelClassName, label, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // close modal on escape key press; re-registers if onClose reference changes
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // lock body scroll while modal is mounted; pad to prevent scrollbar-removal layout shift
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.documentElement.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.documentElement.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.documentElement.style.overflow = ''
      document.documentElement.style.paddingRight = ''
    }
  }, [])

  // move focus into the modal panel when it opens
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return (
    // z-[300]: above navbar (z-[60]), mobile menu (z-40), and any page content; clicking backdrop dismisses
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-sm bg-black/70"
      onClick={onClose}
    >
      {/* stop propagation so clicks inside the panel don't bubble up and close the modal */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative w-full ${sizeClass[size]} max-h-[90dvh] ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} rounded-2xl shadow-2xl outline-none ${panelClassName ?? ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
