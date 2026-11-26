import { useState } from 'react'
// Lazy, async image that renders nothing if the file is missing, so whatever is underneath (the animated scene) shows instead.
export default function SmartImage({ src, alt = '', className = '', width, height, sizes, srcSet, priority = false }) {
  const [bad, setBad] = useState(false)
  const [ready, setReady] = useState(false)
  if (!src || bad) return null
  return (
    <img src={src} alt={alt} width={width} height={height} sizes={sizes} srcSet={srcSet}
      loading={priority ? 'eager' : 'lazy'} decoding="async"
      onLoad={() => setReady(true)} onError={() => setBad(true)}
      className={`${className} transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
  )
}
