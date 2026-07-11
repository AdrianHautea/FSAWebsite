// ── Modal.tsx ─────────────────────────────────────────────
// reusable overlay modal with backdrop blur and escape-key dismiss
//
// data:  props — onClose callback, optional size (sm/md/lg), children
// notes: z-[300] so it layers above the navbar (z-[60]) and mobile menu (z-40)

'use client'

import { useEffect, useRef } from 'react'

// tracks mounted Modal instances so Escape only closes the top-most one when modals are stacked
const modalStack: symbol[] = []

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
  const idRef = useRef(Symbol('modal'))

  // register this instance's position in the stack once on mount — separate from the
  // keydown effect below so an onClose identity change never double-pushes
  useEffect(() => {
    const id = idRef.current
    modalStack.push(id)
    return () => {
      const i = modalStack.indexOf(id)
      if (i !== -1) modalStack.splice(i, 1)
    }
  }, [])

  // close modal on escape key press, but only if this is the top-most mounted modal —
  // otherwise one Escape would close every stacked modal at once
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === idRef.current) onClose()
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
        style={{ colorScheme: 'dark' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
