import { useCallback, useEffect, useState } from 'react'
// Short branded LED intro. Once per session, skippable, never shown for reduced motion.
export default function Preloader() {
  const [show, setShow] = useState(() => { try { return !sessionStorage.getItem('kl-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } })
  const [leave, setLeave] = useState(false)
  const done = useCallback(() => { try { sessionStorage.setItem('kl-intro', '1') } catch {} setLeave(true); setTimeout(() => setShow(false), 450) }, [])
  useEffect(() => { if (!show) return; const t = setTimeout(done, 1500); return () => clearTimeout(t) }, [show, done])
  if (!show) return null
  const col = i => { const s = (i % 5) + Math.floor(i / 5); return s < 3 ? '#F28C28' : s < 6 ? '#ffffff' : '#1DB954' }
  return (
    <div role="status" aria-label="Loading" className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink transition-opacity duration-500 ${leave ? 'opacity-0' : 'opacity-100'}`}>
      <div className="grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: 25 }).map((_, i) => <i key={i} className="h-3 w-3 rounded-full" style={{ background: col(i), boxShadow: `0 0 12px ${col(i)}`, animation: `blink .9s ${(i % 5) * 0.08 + Math.floor(i / 5) * 0.08}s infinite` }} />)}
      </div>
      <p className="mt-8 font-display text-3xl font-extrabold text-white">KalpLabs</p>
      <button onClick={done} className="mt-6 font-mono text-xs uppercase tracking-widest text-white/40 hover:text-white">Skip</button>
    </div>
  )
}
