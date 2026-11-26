import { useState } from 'react'
import { MEDIA } from '../media.js'
// Optional cinematic video behind the LED wall. Renders nothing unless MEDIA.heroVideo.src is set,
// and stays off for reduced-motion, Save-Data and slow connections.
export default function HeroVideo() {
  const v = MEDIA.heroVideo
  const [ok, setOk] = useState(false)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const c = typeof navigator !== 'undefined' ? navigator.connection : null
  if (!v?.src || reduce || c?.saveData || /(^|-)[23]g$/.test(c?.effectiveType || '')) return null
  return (
    <video aria-hidden src={v.src} poster={v.poster || undefined} autoPlay muted loop playsInline preload="metadata"
      onCanPlay={() => setOk(true)} onError={() => setOk(false)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${ok ? 'opacity-60' : 'opacity-0'}`} />
  )
}
