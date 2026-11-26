import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Maximize2 } from 'lucide-react'
import { MEDIA } from '../media.js'

// If MEDIA.showreel.src is set this shows your real video. Otherwise it plays a generated LED showreel
// (canvas, no files) so the section is never empty. Pauses off-screen and respects reduced motion.
const W = 96, H = 54, DUR = 5
const SCENES = [
  { name: 'Outdoor', draw(g, t) {
    const k = (Math.sin(t * 0.7) + 1) / 2, gr = g.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, `hsl(${18 + k * 22},95%,${52 + k * 8}%)`); gr.addColorStop(1, '#1a0b2e'); g.fillStyle = gr; g.fillRect(0, 0, W, H)
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(W * 0.72, H * (0.72 - k * 0.22), 11, 0, 7); g.fill()
    g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText('BRIGHT IN DAYLIGHT', 5, H - 7)
  } },
  { name: 'Fine pitch', draw(g, t) {
    g.fillStyle = '#05060b'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'
    ;[['#7b2cff', 0], ['#ff3d77', 2], ['#38e1ff', 4], ['#f28c28', 1]].forEach(([c, o]) => {
      const x = W / 2 + Math.cos(t * 0.9 + o) * W * 0.32, y = H / 2 + Math.sin(t * 1.1 + o * 1.3) * H * 0.3, r = g.createRadialGradient(x, y, 0, x, y, 30)
      r.addColorStop(0, c); r.addColorStop(1, 'transparent'); g.fillStyle = r; g.fillRect(0, 0, W, H)
    }); g.globalCompositeOperation = 'source-over'
  } },
  { name: 'Video wall', draw(g, t) {
    g.fillStyle = '#04121b'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 16; i++) {
      const h = (0.25 + 0.7 * Math.abs(Math.sin(t * 2 + i * 0.7))) * (H - 6), gr = g.createLinearGradient(0, H, 0, H - h)
      gr.addColorStop(0, '#1db954'); gr.addColorStop(1, '#38e1ff'); g.fillStyle = gr; g.fillRect(i * 6 + 1, H - h - 2, 4, h)
    }
  } },
  { name: 'Signage', draw(g, t) {
    g.fillStyle = '#150b2e'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#f28c28'; g.font = 'bold 20px Arial'; const s = 'NEW ARRIVALS · OFFERS · WELCOME · '; g.fillText(s + s, -((t * 28) % 230), 24)
    g.fillStyle = '#38e1ff'; g.font = '10px monospace'; g.fillText('NOW SHOWING · SCREEN 2 · ' + 'OPEN TODAY · '.repeat(3), -((t * 18) % 150), 44)
  } }
]

function Generated() {
  const wrap = useRef(null), cv = useRef(null)
  const [playing, setPlaying] = useState(() => !(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [prog, setProg] = useState(0)
  const st = useRef({ t: 0, vis: false, playing })
  st.current.playing = playing

  useEffect(() => {
    const canvas = cv.current, ctx = canvas.getContext('2d')
    const off = document.createElement('canvas'); off.width = W; off.height = H; const g = off.getContext('2d', { willReadFrequently: true })
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth; canvas.width = w * d; canvas.height = (w * 9 / 16) * d }
    size(); const ro = new ResizeObserver(size); ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { st.current.vis = e.isIntersecting }); io.observe(canvas)
    let raf, last = 0, ui = 0
    const frame = now => {
      raf = requestAnimationFrame(frame)
      if (now - last < 33) return
      const dt = (now - last) / 1000; last = now
      const s = st.current; if (!s.vis || document.hidden) return
      if (s.playing) s.t = (s.t + Math.min(dt, 0.1)) % (SCENES.length * DUR)
      const sc = SCENES[Math.floor(s.t / DUR)]; g.globalCompositeOperation = 'source-over'; sc.draw(g, s.t)
      const d = g.getImageData(0, 0, W, H).data, cw = canvas.width / W, ch = canvas.height / H, r = Math.min(cw, ch) * 0.42
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4; ctx.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`
        ctx.beginPath(); ctx.arc((x + 0.5) * cw, (y + 0.5) * ch, r, 0, 7); ctx.fill()
      }
      if (now - ui > 120) { ui = now; setProg(s.t / (SCENES.length * DUR)) }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [])

  const seek = v => { st.current.t = v * SCENES.length * DUR * 0.9999; setProg(v) }
  const full = () => { const el = wrap.current; if (document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen?.() }
  const cur = Math.floor(prog * SCENES.length)
  return (
    <div ref={wrap} className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]">
      <canvas ref={cv} role="img" aria-label="Generated LED showreel: outdoor, fine pitch, video wall and signage scenes" className="block aspect-video w-full" />
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-panel px-4 py-3">
        <button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause showreel' : 'Play showreel'} className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron text-ink hover:bg-white">
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <input type="range" min="0" max="1" step="0.001" value={prog} onChange={e => seek(+e.target.value)} aria-label="Showreel position" className="min-w-[120px] flex-1" style={{ '--p': `${prog * 100}%` }} />
        <div className="flex gap-1">
          {SCENES.map((s, i) => (
            <button key={s.name} onClick={() => seek(i / SCENES.length)} className={`rounded-full px-3 py-1 font-mono text-[11px] transition ${i === cur ? 'bg-saffron text-ink' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{s.name}</button>
          ))}
        </div>
        <button onClick={full} aria-label="Toggle fullscreen" className="text-white/60 hover:text-white"><Maximize2 size={18} /></button>
      </div>
    </div>
  )
}

export default function Showreel() {
  const v = MEDIA.showreel
  if (v?.src) return (
    <video controls playsInline preload="metadata" poster={v.poster || undefined} className="w-full rounded-2xl border border-white/10 bg-black">
      <source src={v.src} />{v.captions && <track kind="captions" src={v.captions} srcLang="en" label="English" default />}
    </video>
  )
  return <Generated />
}
