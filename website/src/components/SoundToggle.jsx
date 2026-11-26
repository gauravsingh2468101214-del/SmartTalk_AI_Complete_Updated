import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { tick, setUi, setHum, pauseAudio, resumeAudio } from '../sound.js'

const KEY = 'kl-sound'
// Opt-in audio controls: soft UI sounds + an ambient "LED hum". Default OFF. The hum never auto-restarts on a new visit.
export default function SoundToggle() {
  const [open, setOpen] = useState(false)
  const [ui, setUiState] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const [hum, setHumState] = useState(false)
  const box = useRef(null)

  useEffect(() => { setUi(ui); try { localStorage.setItem(KEY, ui ? '1' : '0') } catch {} }, [ui])
  useEffect(() => { setHum(hum) }, [hum])
  useEffect(() => {
    const click = e => { if (e.target.closest?.('a,button,.btn,[role=button]')) tick() }
    const vis = () => (document.hidden ? pauseAudio() : resumeAudio())
    document.addEventListener('click', click, true); document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('click', click, true); document.removeEventListener('visibilitychange', vis) }
  }, [])
  useEffect(() => {
    if (!open) return
    const out = e => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const esc = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open])

  const on = ui || hum
  const Row = ({ label, sub, v, set }) => (
    <label key={label} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-white/5">
      <input type="checkbox" checked={v} onChange={e => set(e.target.checked)} className="mt-1 h-4 w-4 accent-[#F28C28]" />
      <span><span className="block text-sm font-medium text-white">{label}</span><span className="block text-xs text-white/45">{sub}</span></span>
    </label>
  )
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Sound settings"
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${on ? 'border-saffron text-saffron' : 'border-white/20 text-white/60 hover:text-white'}`}>
        {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      {open && (
        <div role="dialog" aria-label="Sound settings" className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-panel/95 p-3 shadow-2xl backdrop-blur-xl">
          <p className="eyebrow px-2 pb-1">Sound (optional)</p>
          {Row({ label: "Interface sounds", sub: "Soft clicks and a chime on success", v: ui, set: setUiState })}
          {Row({ label: "Ambient LED hum", sub: "Quiet background tone, off by default", v: hum, set: setHumState })}
        </div>
      )}
    </div>
  )
}
