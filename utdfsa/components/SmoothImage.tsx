// ── SmoothImage.tsx ───────────────────────────────────────
// blur-up fade-in image wrapper around next/image
// ──────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

function blurStyle(loaded: boolean, style?: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    filter: loaded ? 'blur(0px)' : 'blur(8px)',
    opacity: loaded ? 1 : 0.7,
    transition: 'filter 500ms ease-out, opacity 500ms ease-out',
  }
}

// Wrap next/image with a blur-up fade-in effect.
export default function SmoothImage({ style, onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false)
  return (
    <Image
      {...props}
      style={blurStyle(loaded, style)}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
    />
  )
}
