'use client'

import { useRef, type ReactNode } from 'react'
import { useRevealOnScroll } from '@/lib/useRevealOnScroll'

export default function ScrollFadeIn({
  children,
  className,
  threshold = 0.2,
}: {
  children: ReactNode
  className?: string
  threshold?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useRevealOnScroll(ref, threshold)
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(1.04)',
        transition: 'opacity 800ms var(--ease-smooth), transform 800ms var(--ease-smooth)',
      }}
    >
      {children}
    </div>
  )
}
