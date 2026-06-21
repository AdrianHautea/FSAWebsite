'use client'

import { useEffect, useRef } from 'react'

type AnimationType = 'fadeIn' | 'fadeUp' | 'slideFromRight'

const KEYFRAME: Record<AnimationType, string> = {
  fadeIn:          'heroFadeIn',
  fadeUp:          'fadeUp',
  slideFromRight:  'slideFromRight',
}

const TIMING = '0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

type Props = {
  as?: 'h1' | 'h2' | 'p' | 'div' | 'span'
  animation: AnimationType
  delay?: number
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export default function AnimatedTitle({
  as: Tag = 'div',
  animation,
  delay = 0,
  className,
  style,
  children,
}: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const name = KEYFRAME[animation]

    function play() {
      const el = ref.current
      if (!el) return
      el.style.animation = 'none'
      void el.offsetHeight
      el.style.animation = `${name} ${TIMING} ${delay}ms both`
    }

    const rafId = requestAnimationFrame(play)
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) play() }
    window.addEventListener('pageshow', onPageShow)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [animation, delay])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const El = Tag as any
  return (
    <El ref={ref} className={className} style={{ ...style, opacity: 0 }}>
      {children}
    </El>
  )
}
