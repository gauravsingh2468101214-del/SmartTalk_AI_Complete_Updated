import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, Sparkles } from 'lucide-react'
import { products, industries, posts } from '../data.js'

const PAGES = [['/', 'Home'], ['/products', 'All products'], ['/services', 'Solutions by industry'], ['/calculator', 'Screen calculator'], ['/visualizer', 'See it on your wall'], ['/finder', 'Find my display'], ['/compare', 'Compare displays'], ['/support', 'Installation & support'], ['/blog', 'Insights'], ['/about', 'About us'], ['/contact', 'Contact & quote']]
// Ctrl/Cmd+K search across pages, products, solutions and articles.
export default function CommandPalette() {
  const [open, setOpen] = useState(false), [q, setQ] = useState(''), [idx, setIdx] = useState(0)
  const nav = useNavigate(), input = useRef(null)
  const all = useMemo(() => [
    ...PAGES.map(([to, t]) => ({ to, t, g: 'Pages' })),
    ...products.map(p => ({ to: `/products/${p.slug}`, t: p.title, s: p.blurb, g: 'Products' })),
    ...industries.map(p => ({ to: `/services/${p.slug}`, t: p.title, s: p.blurb, g: 'Solutions' })),
    ...posts.map(p => ({ to: `/blog/${p.slug}`, t: p.title, s: p.excerpt, g: 'Insights' }))
  ], [])
  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    const found = (k ? all.filter(i => (i.t + ' ' + (i.s || '')).toLowerCase().includes(k)) : all.slice(0, 11)).slice(0, 9)
    // First result: ask the SmartTalk Chatbot (opens the chat and sends the typed question)
    const ask = { chat: true, to: '#smarttalk-chatbot', t: k ? `Ask SmartTalk Chatbot: “${q.trim()}”` : 'SmartTalk Chatbot', s: 'AI product assistant · voice, Hindi / English, audio & video library', g: 'AI Chatbot' }
    return [ask, ...found]
  }, [q, all])
  useEffect(() => {
    const key = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) } else if (e.key === 'Escape') setOpen(false) }
    const ev = () => setOpen(true)
    addEventListener('keydown', key); addEventListener('kl-open-search', ev)
    return () => { removeEventListener('keydown', key); removeEventListener('kl-open-search', ev) }
  }, [])
  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => input.current?.focus(), 30) } }, [open])
  useEffect(() => setIdx(0), [q])
  if (!open) return null
  const go = i => { if (!i) return; setOpen(false); if (i.chat) { window.dispatchEvent(new CustomEvent('smarttalk-open', { detail: { q: q.trim() } })); return } nav(i.to) }
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(list.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') go(list[idx])
  }
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Search the site" className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search size={18} className="text-saffron" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search products, solutions, guides or ask SmartTalk Chatbot…" aria-label="Search" className="w-full bg-transparent py-4 text-white placeholder-white/30 outline-none" />
          <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/40 sm:block">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {list.length === 0 && <li className="p-6 text-center text-white/45">No results. Try “outdoor”, “retail” or “pitch”.</li>}
          {list.map((i, n) => (
            <li key={i.to} role="option" aria-selected={n === idx}>
              <button onMouseEnter={() => setIdx(n)} onClick={() => go(i)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${n === idx ? 'bg-white/10' : ''}`}>
                <span className="min-w-0"><span className="flex items-center gap-1.5 truncate text-white">{i.chat && <Sparkles size={14} className="shrink-0 text-saffron" />}<span className="truncate">{i.t}</span></span>{i.s && <span className="block truncate text-xs text-white/40">{i.s}</span>}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/35">{i.g}{n === idx && <CornerDownLeft size={13} className="text-saffron" />}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
