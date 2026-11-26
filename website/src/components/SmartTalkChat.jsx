import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X, Send, Image as ImageIcon, MessageCircle, RotateCcw, Mic, Square, Volume2, VolumeX, Pause, Play, Library, Phone, Mail, Film, Music, Search } from 'lucide-react'
import { SMARTTALK, COMPANY, waLink } from '../config.js'
import { toSmartTalkQuery } from '../smarttalkQuery.js'

const API = SMARTTALK.apiUrl
const GREETING = {
  role: 'bot',
  text: 'Hello! I am SmartTalk AI.\n\nAsk me about our LED products, models, specifications, comparisons and case-study projects from the catalog.'
}

// Same clean-up the original SmartTalk page does, so catalog page tags never reach customers.
const clean = t => String(t || '')
  // Strip all catalogue/PDF provenance from customer-facing chat text.
  .replace(/^\s*(?:Catalog\s+page\s*:?\s*\d+.*|Source\s*:\s*.*|Sources\s*:\s*.*)\s*$/gim, '')
  .replace(/\bSource\s*:\s*[^|\n]*(?:\|\s*Page\s*:\s*\d+)?/gi, '')
  .replace(/\bCatalog\s+case-study\s+page\s*:?\s*\d+\b/gi, '')
  .replace(/\bPDF\s+pages?\s*:?\s*\d+(?:\s*[-–,]\s*\d+)*\b/gi, '')
  .replace(/\bCatalog\s+pages?\s*:?\s*\d+\b/gi, '')
  .replace(/\s*\|?\s*Page\s*:\s*\d+\b/gi, ' ')
  .replace(/\s+(?=Pixel Pitch:|Module Size:|Panel Size:|Panel Weight:|Refresh Rate:|Driving Mode \(Duty\):|Brightness:|Power Supply:|Receiving Card:|Max\/Average Power Consumption:|Working Temperature:|Best Viewing Distance:|Best Viewing Angle:|Lifetime:|IP Rating:)/gi, '\n')
  .replace(/\s*Series highlights\s*:/gi, '\n\nSeries highlights:')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const abs = u => (!u ? '' : /^https?:/i.test(u) ? u : `${API}${u.startsWith('/') ? '' : '/'}${u}`)


// ---------------- Voice helpers (browser Web Speech API – no backend change needed) ----------------
const LANGS = [{ code: 'en-IN', label: 'English' }, { code: 'hi-IN', label: 'हिन्दी' }]
const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// Text that is read aloud: no labels like "Catalog page", no URLs, no bullets / symbols.
const speakable = t => String(t || '')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[•■●▪◆►*_#`|]/g, ' ')
  .replace(/\s*\n\s*/g, '. ')
  .replace(/\.\s*\./g, '.')
  .replace(/\s+/g, ' ')
  .trim()

// Browsers stop long utterances after ~15 s, so speak in short sentence groups.
function chunks(text, max = 180) {
  const parts = text.match(/[^.!?।]+[.!?।]*/g) || [text]
  const out = []
  let cur = ''
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = p } else cur += p
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const fmtSize = b => { const n = Number(b) || 0; return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB` }

// Chat-side shortcut: contact intent is answered with the real WhatsApp / Call / Email buttons.
const CONTACT_INTENT = /\b(whats\s?app|call\s+(me|us|you)|phone|mobile\s+number|contact\s+(us|you|team|details|number)|talk\s+to\s+(a\s+)?(human|sales|team|person|someone)|e-?mail\s+(id|address|us|you)|send\s+(an?\s+)?e-?mail|sampark|संपर्क|फ़ोन|फोन|कॉल)\b/i

function Text({ text }) {
  return (
    <div className="space-y-1 text-[14px] leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />
        const m = line.match(/^([A-Za-z][A-Za-z0-9 /().&-]{1,40}):\s*(.*)$/)
        return m
          ? <p key={i}><span className="font-semibold text-saffron">{m[1]}:</span> {m[2]}</p>
          : <p key={i}>{line}</p>
      })}
    </div>
  )
}

function Images({ images }) {
  const [all, setAll] = useState(false)
  const items = (images || [])
    .map(im => typeof im === 'string' ? { url: im } : im)
    .filter(im => im && (im.url || im.image_url || im.src))
  if (!items.length) return null
  const shown = all ? items : items.slice(0, 6)
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.2em] text-neon"><ImageIcon size={12} /> Related images</div>
      <div className="grid grid-cols-2 gap-2">
        {shown.map((im, i) => {
          const src = abs(im.url || im.image_url || im.src)
          const name = im.name || im.title || im.model || 'Product image'
          return (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-white/10 bg-ink">
              <img src={src} alt={name} loading="lazy" className="h-24 w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="block truncate px-2 py-1.5 text-[11px] text-white/70">{name}</span>
            </a>
          )
        })}
      </div>
      {items.length > 6 && !all && <button onClick={() => setAll(true)} className="mt-2 w-full rounded-lg border border-white/15 py-1.5 text-xs text-white/70 transition hover:border-saffron hover:text-saffron">Show all {items.length} images</button>}
    </div>
  )
}

function Sources({ sources }) {
  if (!Array.isArray(sources) || !sources.length) return null
  const labels = [...new Set(sources.map(s => typeof s === 'string' ? s : `${s.name || s.source || s.filename || 'Company Catalog'}${s.page ? ` · p.${s.page}` : ''}`))].slice(0, 6)
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {labels.map(l => <span key={l} className="rounded-full border border-india/30 bg-india/10 px-2 py-0.5 text-[10px] text-india">{l}</span>)}
    </div>
  )
}


function contactReference(question, answer = '') {
  const q = String(question || '')
  const combined = `${q} ${answer || ''}`
  const questionModel = q.match(/\b(?:WA|WB|WC|WM|WV|WS)[A-Z0-9.-]*\d[A-Z0-9.-]*\b/i)?.[0]
  const answerModel = String(answer || '').match(/\b(?:WA|WB|WC|WM|WV|WS)[A-Z0-9.-]*\d[A-Z0-9.-]*\b/i)?.[0]
  const questionCategory = /\boutdoor\b/i.test(q) ? 'Outdoor LED Display'
    : /\bindoor\b/i.test(q) ? 'Indoor LED Display' : ''
  const answerCategory = /\b(outdoor|billboard|roadside|weatherproof|rental outdoor)\b/i.test(combined)
    ? 'Outdoor LED Display'
    : /\b(indoor|fine.?pitch|COB|control room|showroom)\b/i.test(combined)
      ? 'Indoor LED Display' : ''
  const category = questionCategory || answerCategory
  const categorySearch = /\b(indoor|outdoor)\b.*\b(led|display|screen)\b|\b(led|display|screen)\b.*\b(indoor|outdoor)\b/i.test(q)
  const product = questionModel || (categorySearch ? category : answerModel || q.trim())
  if (!product) return null
  const params = new URLSearchParams({ interest: product, source: 'SmartTalk AI' })
  if (category) params.set('category', category)
  params.set('reference', q)
  const productsHref = category === 'Outdoor LED Display'
    ? '/products/outdoor-led-displays'
    : category === 'Indoor LED Display'
      ? '/products/indoor-led-displays'
      : '/products'
  return { product, category, productsHref, contactHref: `/contact?${params.toString()}`, isCategorySearch: categorySearch }
}

function ContactButtons({ compact = false }) {
  const base = compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-1.5 text-xs'
  return (
    <div className="flex flex-wrap gap-1.5">
      <a href={waLink()} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-full bg-[#25D366] font-semibold text-white transition hover:brightness-110 ${base}`}><MessageCircle size={13} /> WhatsApp</a>
      <a href={`tel:${COMPANY.mobileHref}`} className={`inline-flex items-center gap-1.5 rounded-full bg-india font-semibold text-ink transition hover:brightness-110 ${base}`}><Phone size={13} /> Call</a>
      <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Enquiry from SmartTalk AI chat')}`} className={`inline-flex items-center gap-1.5 rounded-full bg-neon font-semibold text-ink transition hover:brightness-110 ${base}`}><Mail size={13} /> Email</a>
    </div>
  )
}

function MediaLibrary() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(false)
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  useEffect(() => {
    const ctl = new AbortController()
    fetch(`${API}/media/list`, { signal: ctl.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setItems(Array.isArray(d) ? d : d.items || []))
      .catch(e => { if (e.name !== 'AbortError') setErr(true) })
    return () => ctl.abort()
  }, [])
  const url = it => it.url ? abs(it.url) : `${API}/media/file/${encodeURIComponent(it.kind)}/${encodeURIComponent(it.filename)}`
  const list = (items || []).filter(it => (kind === 'all' || it.kind === kind) && `${it.title || ''} ${it.filename || ''}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="flex-1 overflow-y-auto bg-ink/60 px-3.5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search audio / video…" aria-label="Search media library" className="field !rounded-full !py-2 !pl-9 text-sm" />
        </div>
        <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Media type" className="field !w-auto !rounded-full !py-2 text-sm">
          <option value="all">All</option><option value="audio">Audio</option><option value="video">Video</option>
        </select>
      </div>
      {err && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-white/80">Media library could not be loaded. Please check that SmartTalk AI is running.</p>}
      {!err && items === null && <p className="py-6 text-center text-sm text-white/50">Loading media library…</p>}
      {!err && items && !list.length && <p className="py-6 text-center text-sm text-white/50">{items.length ? 'No media matches your search.' : 'No audio or video files have been added yet.'}</p>}
      <div className="space-y-3">
        {list.map(it => (
          <div key={it.id || it.filename} className="overflow-hidden rounded-xl border border-white/10 bg-panel">
            {it.kind === 'video'
              ? <video src={url(it)} controls preload="metadata" playsInline className="max-h-48 w-full bg-black" />
              : <audio src={url(it)} controls preload="metadata" className="w-full p-2" />}
            <div className="flex items-center gap-2 px-3 py-2 text-xs">
              {it.kind === 'video' ? <Film size={13} className="text-saffron" /> : <Music size={13} className="text-saffron" />}
              <span className="min-w-0 flex-1 truncate text-white/85">{it.title || it.filename}</span>
              <span className="shrink-0 text-white/40">{fmtSize(it.size_bytes)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SmartTalkChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(null)
  const [nudge, setNudge] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  // voice + library state
  const [view, setView] = useState('chat')            // 'chat' | 'library'
  const [lang, setLang] = useState('en-IN')
  const [listening, setListening] = useState(false)
  const [speech, setSpeech] = useState('idle')        // idle | speaking | paused
  const [muted, setMuted] = useState(false)
  const [autoRead, setAutoRead] = useState(false)
  const [voiceMsg, setVoiceMsg] = useState('')
  const recRef = useRef(null)
  const mutedRef = useRef(false)
  const langRef = useRef('en-IN')
  const queueRef = useRef([])
  const viaMicRef = useRef(false)
  const autoRef = useRef(false)
  const sendRef = useRef(null)
  const pendingRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy, open])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 6000)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!open) return
    const ctl = new AbortController()
    fetch(`${API}/health`, { signal: ctl.signal }).then(r => setOnline(r.ok)).catch(() => setOnline(false))
    return () => ctl.abort()
  }, [open])

  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { autoRef.current = autoRead }, [autoRead])
  // stop all voice when the chat closes / page unloads
  useEffect(() => {
    if (!open) { stopSpeech(); stopListening() }
  }, [open])
  useEffect(() => () => { stopSpeech(); stopListening() }, [])

  function pickVoice(code) {
    const vs = window.speechSynthesis.getVoices() || []
    const base = code.slice(0, 2)
    return vs.find(v => v.lang === code) || vs.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(base)) || null
  }

  function stopSpeech(msg) {
    queueRef.current = []
    if (canSpeak) window.speechSynthesis.cancel()
    setSpeech('idle')
    if (msg) setVoiceMsg(msg)
  }

  function speakNext() {
    const next = queueRef.current.shift()
    if (next === undefined) { setSpeech('idle'); setVoiceMsg('Voice finished'); return }
    const u = new SpeechSynthesisUtterance(next)
    u.lang = langRef.current
    const v = pickVoice(langRef.current)
    if (v) u.voice = v
    u.volume = mutedRef.current ? 0 : 1
    u.onend = () => speakNext()
    u.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted') { setSpeech('idle'); setVoiceMsg('Voice playback error') } }
    window.speechSynthesis.speak(u)
  }

  function speak(text) {
    if (!canSpeak) { setVoiceMsg('Voice playback is not supported by this browser.'); return }
    const t = speakable(text)
    if (!t) { setVoiceMsg('No answer available to play.'); return }
    window.speechSynthesis.cancel()
    queueRef.current = chunks(t)
    if (langRef.current.startsWith('hi') && !pickVoice('hi-IN')) setVoiceMsg('Hindi voice is not installed on this device – using the default voice.')
    else setVoiceMsg(mutedRef.current ? 'Voice muted' : 'Playing voice…')
    setSpeech('speaking')
    speakNext()
  }

  function pauseSpeech() {
    if (!canSpeak || speech !== 'speaking') return
    window.speechSynthesis.pause(); setSpeech('paused'); setVoiceMsg('Voice paused')
  }
  function resumeSpeech() {
    if (!canSpeak || speech !== 'paused') return
    window.speechSynthesis.resume(); setSpeech('speaking'); setVoiceMsg('Voice resumed')
  }
  function toggleMute() {
    const m = !mutedRef.current
    mutedRef.current = m; setMuted(m)
    // volume of a sentence already being spoken cannot change, so silence it and keep the rest muted
    if (m && speech !== 'idle') stopSpeech('Muted – next answers will stay silent')
    else setVoiceMsg(m ? 'Muted' : 'Sound on')
  }

  function stopListening() { try { recRef.current?.stop() } catch { /* already stopped */ } }

  function toggleMic() {
    if (!SpeechRec) { setVoiceMsg('Voice input is not supported in this browser. Please use Chrome or Edge.'); return }
    if (listening) { stopListening(); return }
    stopSpeech()
    const rec = new SpeechRec()
    rec.lang = langRef.current
    rec.continuous = false
    rec.interimResults = false
    rec.onstart = () => { setListening(true); setVoiceMsg('Listening…') }
    rec.onresult = e => {
      const t = e.results?.[0]?.[0]?.transcript?.trim()
      if (t) { viaMicRef.current = true; setVoiceMsg('Voice captured'); send(t) }
    }
    rec.onerror = e => {
      setVoiceMsg(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone permission is blocked. Allow it in the browser address bar.'
        : e.error === 'no-speech' ? 'I did not hear anything. Please try again.' : 'Voice input error. Please try again.')
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try { rec.start() } catch { setListening(false) }
  }

  // Opened from the site search (Ctrl+K -> "SmartTalk Chatbot")
  useEffect(() => {
    const onOpen = e => { pendingRef.current = e.detail?.q || ''; setView('chat'); setNudge(false); setOpen(true) }
    window.addEventListener('smarttalk-open', onOpen)
    return () => window.removeEventListener('smarttalk-open', onOpen)
  }, [])
  useEffect(() => {
    if (open && pendingRef.current !== null) {
      const q = pendingRef.current; pendingRef.current = null
      if (q) setTimeout(() => sendRef.current?.(q), 200)
    }
  }, [open])

  async function send(text) {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: q }])
    const spoke = viaMicRef.current; viaMicRef.current = false
    if (CONTACT_INTENT.test(q)) {
      const reply = 'You can reach our team directly using the options below.'
      setMsgs(m => [...m, { role: 'bot', text: reply, contact: true }])
      if (spoke || autoRef.current) speak(reply)
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: toSmartTalkQuery(q) }) })
      if (!r.ok) throw new Error(String(r.status))
      const d = await r.json()
      setOnline(true)
      const answer = clean(d.answer || d.response) || 'Sorry, I could not find an answer.'
      const referenceCandidate = contactReference(q, answer)
      const hasProductAnswer = ['product', 'structured_product', 'catalog', 'series_group', 'product_compare'].includes(d.response_type)
      const productReference = hasProductAnswer || referenceCandidate?.isCategorySearch ? referenceCandidate : null
      setMsgs(m => [...m, { role: 'bot', text: answer, images: d.images, sources: d.sources, productReference }])
      if (spoke || autoRef.current) speak(answer)
    } catch {
      setOnline(false)
      setMsgs(m => [...m, { role: 'bot', error: true, text: 'SmartTalk AI is not reachable right now. Please try again in a moment, or talk to our team directly.' }])
    } finally { setBusy(false) }
  }

  sendRef.current = send
  const onlyGreeting = msgs.length === 1

  return (
    <>
      {open && (
        <section role="dialog" aria-label="SmartTalk AI chat"
          className="fixed inset-x-3 bottom-24 z-[60] flex h-[min(700px,calc(100dvh-8rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-panel shadow-[0_30px_90px_rgba(0,0,0,.7),0_0_0_1px_rgba(242,140,40,.15)] [animation:fadein_.3s_ease] sm:inset-x-auto sm:right-5 sm:w-[400px]">
          {/* header */}
          <header className="relative flex items-center gap-3 overflow-hidden border-b border-white/10 bg-gradient-to-r from-saffron/25 via-panel to-india/15 px-4 py-3.5">
            <div className="led-grid pointer-events-none absolute inset-0 opacity-[.05]" aria-hidden />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-saffron to-[#FFB45E] text-ink shadow-[0_0_24px_rgba(242,140,40,.5)]"><Sparkles size={20} /></div>
            <div className="relative min-w-0 flex-1">
              <h2 className="font-display text-[15px] font-bold leading-tight">{SMARTTALK.name}</h2>
              <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className={`h-2 w-2 rounded-full ${online === false ? 'bg-red-500' : 'bg-india'} ${online !== false ? 'animate-pulse' : ''}`} />
                {online === false ? 'Offline' : 'Product assistant · Online'}
              </p>
            </div>
            <button onClick={() => setView(v => v === 'library' ? 'chat' : 'library')} aria-label={view === 'library' ? 'Back to chat' : 'Open audio and video library'} aria-pressed={view === 'library'} title="Audio & Video Library" className={`relative rounded-lg p-2 transition hover:bg-white/10 hover:text-white ${view === 'library' ? 'bg-saffron/20 text-saffron' : 'text-white/60'}`}><Library size={16} /></button>
            <button onClick={() => { stopSpeech(); setView('chat'); setMsgs([GREETING]); setInput('') }} aria-label="Restart chat" title="Restart chat" className="relative rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><RotateCcw size={16} /></button>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="relative rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </header>

          {/* voice toolbar: language + pause / resume / stop / mute */}
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-panel px-3 py-2" role="toolbar" aria-label="Voice controls">
            <select value={lang} onChange={e => { setLang(e.target.value); langRef.current = e.target.value; stopSpeech() }} aria-label="Voice language" title="Voice language (Hindi / English)" className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-xs text-white focus:border-saffron focus:outline-none">
              {LANGS.map(l => <option key={l.code} value={l.code} className="bg-panel">{l.label}</option>)}
            </select>
            <button type="button" onClick={pauseSpeech} disabled={speech !== 'speaking'} aria-label="Pause voice" title="Pause" className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-saffron disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/70"><Pause size={15} /></button>
            <button type="button" onClick={resumeSpeech} disabled={speech !== 'paused'} aria-label="Resume voice" title="Resume" className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-saffron disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/70"><Play size={15} /></button>
            <button type="button" onClick={() => stopSpeech('Voice stopped')} disabled={speech === 'idle'} aria-label="Stop voice" title="Stop" className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-saffron disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/70"><Square size={15} /></button>
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute voice' : 'Mute voice'} aria-pressed={muted} title={muted ? 'Unmute' : 'Mute'} className={`rounded-lg p-1.5 transition hover:bg-white/10 ${muted ? 'text-saffron' : 'text-white/70 hover:text-saffron'}`}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-white/60">
              <input type="checkbox" checked={autoRead} onChange={e => setAutoRead(e.target.checked)} className="accent-[#F28C28]" /> Auto-read
            </label>
          </div>
          {voiceMsg && <p className="border-b border-white/10 bg-ink/70 px-3.5 py-1 text-[11px] text-white/60" role="status">{voiceMsg}</p>}

          {view === 'library' ? <MediaLibrary /> : (
          <>
          {/* messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-ink/60 px-3.5 py-4" aria-live="polite">
            {msgs.map((m, i) => m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-saffron to-[#FFB45E] px-3.5 py-2.5 text-[14px] font-medium text-ink shadow-lg">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-saffron/15 text-saffron"><Sparkles size={14} /></div>
                <div className={`max-w-[88%] rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-white/90 ${m.error ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-panel'}`}>
                  <Text text={m.text} />
                  <Images images={m.images} />
                  {m.productReference && <div className="mt-3 overflow-hidden rounded-xl border border-saffron/30 bg-gradient-to-br from-saffron/10 via-panel to-india/10 p-3">
                    <p className="text-[10px] uppercase tracking-[.16em] text-saffron">Helpful links</p>
                    <p className="mt-1 text-sm font-semibold text-white">{m.productReference.product}</p>
                    {m.productReference.category && <p className="mt-0.5 text-xs text-white/60">{m.productReference.category}</p>}
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <Link to={m.productReference.productsHref} className="inline-flex items-center justify-center rounded-lg border border-saffron/40 bg-saffron px-3 py-2 text-xs font-bold text-ink transition hover:bg-[#FFB45E]">
                        View {m.productReference.category || 'All'} Products <span className="ml-1" aria-hidden="true">↗</span>
                      </Link>
                      <Link to={m.productReference.contactHref} className="inline-flex items-center justify-center rounded-lg border border-india/40 bg-india/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-india/25">
                        Contact Us · Enquire about this product <span className="ml-1" aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </div>}
                  {m.contact && <div className="mt-3"><ContactButtons /></div>}
                  {!m.error && canSpeak && <button type="button" onClick={() => speak(m.text)} aria-label="Listen to this answer" className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-saffron hover:text-saffron"><Volume2 size={12} /> Listen</button>}
                  {m.error && <a href={waLink()} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"><MessageCircle size={14} /> WhatsApp {COMPANY.mobile}</a>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron/15 text-saffron"><Sparkles size={14} /></div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-white/10 bg-panel px-4 py-3" aria-label="SmartTalk AI is typing">
                  {[0, 1, 2].map(n => <span key={n} className="h-2 w-2 animate-bounce rounded-full bg-saffron" style={{ animationDelay: `${n * 0.15}s` }} />)}
                </div>
              </div>
            )}
            {onlyGreeting && (
              <div className="pt-1">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-white/40">Quick questions</p>
                <div className="flex flex-wrap gap-2">
                  {SMARTTALK.quickQuestions.map(q => (
                    <button key={q} onClick={() => send(q)} className="rounded-full border border-white/15 bg-white/[.04] px-3 py-1.5 text-left text-xs text-white/80 transition hover:border-saffron hover:text-saffron">{q}</button>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* input */}
          <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-center gap-2 border-t border-white/10 bg-panel p-3" aria-label="SmartTalk Chatbot search">
            <button type="button" onClick={toggleMic} aria-label={listening ? 'Stop listening' : 'Speak your question'} aria-pressed={listening} title={SpeechRec ? (listening ? 'Stop listening' : 'Speak your question') : 'Voice input is not supported in this browser'} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${listening ? 'animate-pulse border-red-500 bg-red-500/20 text-red-400' : 'border-white/15 text-white/70 hover:border-saffron hover:text-saffron'}`}><Mic size={18} /></button>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={500} placeholder={listening ? 'Listening…' : 'SmartTalk Chatbot – type or speak your question…'} aria-label="Your message" className="field !rounded-full !py-2.5 text-sm" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron text-ink transition hover:bg-white disabled:opacity-40 disabled:hover:bg-saffron"><Send size={18} /></button>
          </form>
          </>
          )}
          {/* contact options (existing WhatsApp / Call / Email) */}
          <div className="flex items-center gap-2 border-t border-white/10 bg-ink/80 px-3 py-2">
            <span className="shrink-0 text-[10px] uppercase tracking-[.15em] text-white/40">Talk to us</span>
            <ContactButtons compact />
          </div>
        </section>
      )}

      {/* launcher (sits above the WhatsApp button) */}
      {!open && nudge && (
        <div className="fixed bottom-[92px] right-24 z-[60] hidden rounded-2xl rounded-br-sm border border-white/10 bg-panel px-3.5 py-2 text-xs text-white/80 shadow-xl [animation:fadein_.4s_ease] sm:block">Ask about our products &amp; projects 👋</div>
      )}
      <button onClick={() => { setOpen(o => !o); setNudge(false) }} aria-label={open ? 'Close SmartTalk AI chat' : 'Open SmartTalk AI chat'} aria-expanded={open}
        className="group fixed bottom-24 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-[#FFB45E] text-ink shadow-[0_10px_40px_rgba(242,140,40,.5)] transition hover:scale-105">
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-saffron/40 [animation-duration:2.8s]" aria-hidden />}
        <span className="relative">{open ? <X size={24} /> : <Sparkles size={26} />}</span>
      </button>
    </>
  )
}
