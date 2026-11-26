import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Download, MessageCircle, RotateCcw, MousePointer2 } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { calc } from '../components/PitchCalculator.jsx'
import { waLink } from '../config.js'

// "See it on your wall": drop a photo of your wall, drag and resize a virtual LED screen on it,
// choose pitch and content, then download the mockup or send the setup to the team. Runs fully in the browser.
const CW = 1280, CH = 720
const RATIOS = [['16:9', 16 / 9], ['4:3', 4 / 3], ['21:9', 21 / 9], ['1:1', 1]]
const PITCHES = [1.5, 2.5, 4, 6.67, 10]
const HANDLE = 26

function sampleWall(g) {
  const bg = g.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, '#2b2f3a'); bg.addColorStop(1, '#171a21'); g.fillStyle = bg; g.fillRect(0, 0, CW, CH)
  g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 2
  for (let x = 0; x < CW; x += 160) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH * 0.86); g.stroke() }
  const fl = g.createLinearGradient(0, CH * 0.86, 0, CH); fl.addColorStop(0, '#0e1015'); fl.addColorStop(1, '#07080b'); g.fillStyle = fl; g.fillRect(0, CH * 0.86, CW, CH)
  const sp = g.createRadialGradient(CW / 2, 0, 20, CW / 2, 0, CH); sp.addColorStop(0, 'rgba(255,220,170,.22)'); sp.addColorStop(1, 'transparent'); g.fillStyle = sp; g.fillRect(0, 0, CW, CH)
}
function coverDraw(g, el, w, h) {
  const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height
  if (!iw || !ih) return
  const s = Math.max(w / iw, h / ih); g.drawImage(el, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s)
}
function liveContent(g, w, h, t) {
  g.fillStyle = '#05060b'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'lighter'
  ;[['#7b2cff', 0], ['#ff3d77', 2], ['#38e1ff', 4], ['#f28c28', 1]].forEach(([c, o]) => {
    const x = w / 2 + Math.cos(t * 0.8 + o) * w * 0.3, y = h / 2 + Math.sin(t + o * 1.3) * h * 0.28, r = g.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.45)
    r.addColorStop(0, c); r.addColorStop(1, 'transparent'); g.fillStyle = r; g.fillRect(0, 0, w, h)
  }); g.globalCompositeOperation = 'source-over'
  g.fillStyle = '#fff'; g.font = `800 ${Math.max(6, h * 0.22)}px Arial`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('YOUR BRAND', w / 2, h / 2)
}

export default function Visualizer() {
  const cv = useRef(null), fileBg = useRef(null), fileContent = useRef(null)
  const s = useRef({ x: 380, y: 180, w: 520, ratio: 16 / 9, bg: null, content: null, vid: null, drag: null, vis: true, pitch: 2.5, bright: 1 })
  const [pitch, setPitch] = useState(2.5), [ratioIdx, setRatioIdx] = useState(0), [bright, setBright] = useState(1), [widthM, setWidthM] = useState(4), [hasContent, setHasContent] = useState(false), [hasBg, setHasBg] = useState(false)
  const st = s.current; st.pitch = pitch; st.bright = bright; st.ratio = RATIOS[ratioIdx][1]

  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d'), off = document.createElement('canvas'), og = off.getContext('2d', { willReadFrequently: true })
    const io = new IntersectionObserver(([e]) => { st.vis = e.isIntersecting }); io.observe(c)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf, last = 0, t = 0
    const draw = ui => {
      const w = st.w, h = w / st.ratio, x = st.x, y = st.y
      ctx.globalCompositeOperation = 'source-over'
      if (st.bg) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH); coverDraw(ctx, st.bg, CW, CH) } else sampleWall(ctx)
      const dot = Math.max(4, st.pitch * 2.4), cols = Math.max(2, Math.floor(w / dot)), rows = Math.max(2, Math.floor(h / dot))
      off.width = cols; off.height = rows
      if (st.content) coverDraw(og, st.content, cols, rows); else liveContent(og, cols, rows, t)
      const d = og.getImageData(0, 0, cols, rows).data, cw = w / cols, ch = h / rows, k = st.bright
      // soft light spill on the wall
      ctx.globalCompositeOperation = 'lighter'
      const gl = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, x + w / 2, y + h / 2, Math.max(w, h) * 0.9)
      gl.addColorStop(0, `rgba(255,170,90,${0.16 * k})`); gl.addColorStop(1, 'transparent'); ctx.fillStyle = gl; ctx.fillRect(0, 0, CW, CH)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#05070b'; ctx.fillRect(x - 6, y - 6, w + 12, h + 12)
      const r = Math.min(cw, ch) * 0.43
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = (j * cols + i) * 4
        ctx.fillStyle = `rgb(${Math.min(255, d[p] * k)},${Math.min(255, d[p + 1] * k)},${Math.min(255, d[p + 2] * k)})`
        ctx.beginPath(); ctx.arc(x + (i + 0.5) * cw, y + (j + 0.5) * ch, r, 0, 7); ctx.fill()
      }
      if (ui) {
        ctx.strokeStyle = 'rgba(242,140,40,.9)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(x - 6, y - 6, w + 12, h + 12); ctx.setLineDash([])
        ctx.fillStyle = '#F28C28'; ctx.fillRect(x + w - HANDLE + 6, y + h - HANDLE + 6, HANDLE, HANDLE)
        ctx.fillStyle = '#07090D'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↘', x + w - HANDLE / 2 + 6, y + h - HANDLE / 2 + 6)
      }
    }
    st.exportPng = () => { draw(false); c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'led-screen-mockup.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }, 'image/png'); draw(true) }
    const frame = now => {
      raf = requestAnimationFrame(frame)
      if (now - last < 40 || !st.vis || document.hidden) return
      t += reduce ? 0 : Math.min((now - last) / 1000, 0.1); last = now; draw(true)
    }
    draw(true); raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); io.disconnect(); st.vid?.pause?.() }
  }, [])

  const pos = e => { const r = cv.current.getBoundingClientRect(); return [(e.clientX - r.left) * (CW / r.width), (e.clientY - r.top) * (CH / r.height)] }
  const down = e => {
    const [px, py] = pos(e), w = st.w, h = w / st.ratio
    if (px > st.x + w - HANDLE && px < st.x + w + 10 && py > st.y + h - HANDLE && py < st.y + h + 10) st.drag = { type: 'size', ox: px, ow: w }
    else if (px > st.x && px < st.x + w && py > st.y && py < st.y + h) st.drag = { type: 'move', dx: px - st.x, dy: py - st.y }
    if (st.drag) cv.current.setPointerCapture(e.pointerId)
  }
  const move = e => {
    const [px, py] = pos(e), d = st.drag, w = st.w
    if (!d) { const h = w / st.ratio, onH = px > st.x + w - HANDLE && px < st.x + w + 10 && py > st.y + h - HANDLE && py < st.y + h + 10, inside = px > st.x && px < st.x + w && py > st.y && py < st.y + h; cv.current.style.cursor = onH ? 'nwse-resize' : inside ? 'move' : 'default'; return }
    if (d.type === 'move') { st.x = Math.max(0, Math.min(CW - w, px - d.dx)); st.y = Math.max(0, Math.min(CH - w / st.ratio, py - d.dy)) }
    else { st.w = Math.max(120, Math.min(CW - st.x, d.ow + (px - d.ox), (CH - st.y) * st.ratio)) }
  }
  const up = () => { st.drag = null }
  if (!st.w) st.w = 520
  // keep the screen inside the canvas when the ratio changes
  useEffect(() => { const h = st.w / st.ratio; if (st.y + h > CH) st.w = (CH - st.y) * st.ratio; if (st.x + st.w > CW) st.w = CW - st.x }, [ratioIdx])

  const load = (file, kind) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('video/')) {
      if (kind === 'bg') return
      const v = document.createElement('video'); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.play().catch(() => {}); st.vid?.pause?.(); st.vid = v; st.content = v; setHasContent(true); return
    }
    const img = new Image(); img.onload = () => { if (kind === 'bg') { st.bg = img; setHasBg(true) } else { st.vid?.pause?.(); st.vid = null; st.content = img; setHasContent(true) } }; img.src = url
  }
  const reset = () => { st.bg = null; st.content = null; st.vid?.pause?.(); st.vid = null; st.x = 380; st.y = 180; st.w = 520; setHasBg(false); setHasContent(false) }

  const hM = widthM / RATIOS[ratioIdx][1], res = calc(widthM, hM, pitch)
  const msg = `Hello KalpLabs, I tried the wall visualizer.\nScreen: about ${res.W.toFixed(1)} m x ${res.H.toFixed(1)} m (${RATIOS[ratioIdx][0]}), pixel pitch P${pitch}\nResolution: ${res.rx} x ${res.ry} px (${res.std})\nCabinets: ${res.cx} x ${res.cy}\nPlease share a quote and suggestions.`
  const chip = (on) => `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? 'border-saffron bg-saffron text-ink' : 'border-white/15 text-white/70 hover:border-white/40'}`
  return (
    <>
      <Seo title="See it on your wall" description="Upload a photo of your wall, place a virtual LED screen on it, choose the pixel pitch and download the mockup." />
      <PageHero eyebrow="Visualizer" title={<>See it on <span className="text-grad">your wall.</span></>} sub="Upload a photo of your space, drag and resize a virtual LED screen, pick the pixel pitch and content, then download the mockup or send it to our team." crumbs={[['/', 'Home']]} />
      <section className="wrap section grid gap-8 pt-12 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]">
            <canvas ref={cv} width={CW} height={CH} role="img" aria-label="Interactive wall mockup. Drag the screen to move it, drag the orange corner to resize."
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="block aspect-video w-full touch-none" />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/45"><MousePointer2 size={15} className="text-saffron" />Drag the screen to move it. Drag the orange corner to resize it.</p>
        </div>
        <aside className="card space-y-6 p-6">
          <div className="grid gap-2">
            <input ref={fileBg} type="file" accept="image/*" hidden onChange={e => { load(e.target.files[0], 'bg'); e.target.value = '' }} />
            <input ref={fileContent} type="file" accept="image/*,video/*" hidden onChange={e => { load(e.target.files[0], 'content'); e.target.value = '' }} />
            <button className="btn btn-line justify-start" onClick={() => fileBg.current.click()}><Upload size={17} />{hasBg ? 'Change wall photo' : 'Upload your wall photo'}</button>
            <button className="btn btn-line justify-start" onClick={() => fileContent.current.click()}><Upload size={17} />{hasContent ? 'Change screen content' : 'Upload screen content (image/video)'}</button>
            <p className="text-xs text-white/35">Files stay in your browser and are never uploaded.</p>
          </div>
          <div><p className="mb-2 text-sm text-white/60">Pixel pitch (mm)</p><div className="flex flex-wrap gap-1.5">{PITCHES.map(p => <button key={p} onClick={() => setPitch(p)} className={`${chip(p === pitch)} font-mono`}>P{p}</button>)}</div></div>
          <div><p className="mb-2 text-sm text-white/60">Shape</p><div className="flex flex-wrap gap-1.5">{RATIOS.map(([l], i) => <button key={l} onClick={() => setRatioIdx(i)} className={`${chip(i === ratioIdx)} font-mono`}>{l}</button>)}</div></div>
          <label className="block"><span className="flex justify-between text-sm text-white/60">Brightness<span className="font-mono text-white">{Math.round(bright * 100)}%</span></span>
            <input type="range" min="0.5" max="1.4" step="0.05" value={bright} onChange={e => setBright(+e.target.value)} className="mt-3 w-full" style={{ '--p': `${((bright - 0.5) / 0.9) * 100}%` }} /></label>
          <label className="block"><span className="flex justify-between text-sm text-white/60">Real screen width<span className="font-mono text-white">{widthM.toFixed(1)} m</span></span>
            <input type="range" min="1" max="20" step="0.5" value={widthM} onChange={e => setWidthM(+e.target.value)} className="mt-3 w-full" style={{ '--p': `${((widthM - 1) / 19) * 100}%` }} /></label>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 text-sm">
            {[['Size', `${res.W.toFixed(1)} × ${res.H.toFixed(1)} m`], ['Resolution', `${res.rx} × ${res.ry}`], ['Cabinets', `${res.cx} × ${res.cy}`], ['Class', res.std]].map(([k, v]) => <div key={k} className="bg-panel p-3"><dt className="text-xs text-white/45">{k}</dt><dd className="mt-0.5 font-mono text-white">{v}</dd></div>)}
          </dl>
          <div className="grid gap-2">
            <button className="btn btn-primary" onClick={() => st.exportPng?.()}><Download size={17} />Download mockup</button>
            <a className="btn bg-[#25D366] text-white hover:brightness-110" href={waLink(msg)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />Send to our team</a>
            <button className="text-sm text-white/40 hover:text-white" onClick={reset}><RotateCcw size={13} className="mr-1 inline" />Reset</button>
          </div>
          <p className="text-xs text-white/35">An illustration for planning. Final size and pitch are confirmed after a site survey. <Link to="/calculator" className="text-saffron hover:underline">Open the full calculator</Link></p>
        </aside>
      </section>
    </>
  )
}
