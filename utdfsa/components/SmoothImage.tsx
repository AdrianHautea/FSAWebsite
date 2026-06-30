'use client'

import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react'
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

// Plain-img variant — same blur-up fade-in, no next/image wrapper.
// Uses a ref to catch the already-cached case: plain <img> fires the load event
// synchronously before React attaches onLoad, so img.complete is checked on mount.
export function BlurInImg({ style, onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => { if (ref.current?.complete) setLoaded(true) }, [])
  return (
    <img
      {...props}
      ref={ref}
      style={blurStyle(loaded, style)}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
    />
  )
}
