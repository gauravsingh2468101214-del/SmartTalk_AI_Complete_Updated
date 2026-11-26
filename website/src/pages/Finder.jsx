import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RotateCcw, Share2 } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { ProductCard } from '../components/Cards.jsx'
import { Reveal } from '../components/fx.jsx'
import { products } from '../data.js'

// Simple scoring quiz. Each answer adds points to products. Highest scores win.
const Q = [
  ['Where will the display go?', [
    ['Indoors', { 'indoor-led-displays': 3, 'led-video-walls': 2, 'digital-signage-displays': 2, 'lcd-commercial-displays': 2 }],
    ['Outdoors', { 'outdoor-led-displays': 4, 'led-advertising-boards': 3 }],
    ['Behind or on glass', { 'transparent-led-displays': 5 }],
    ['A special shape or space', { 'custom-led-display-solutions': 5 }]]],
  ['How far away will most viewers be?', [
    ['Under 3 metres', { 'indoor-led-displays': 2, 'lcd-commercial-displays': 3, 'digital-signage-displays': 2 }],
    ['3 to 10 metres', { 'led-video-walls': 3, 'indoor-led-displays': 1, 'digital-signage-displays': 1 }],
    ['More than 10 metres', { 'outdoor-led-displays': 3, 'led-advertising-boards': 3, 'led-video-walls': 1 }]]],
  ['What will it mainly show?', [
    ['Text, data or dashboards', { 'lcd-commercial-displays': 3, 'indoor-led-displays': 1 }],
    ['Ads and bold video', { 'led-advertising-boards': 3, 'led-video-walls': 2, 'outdoor-led-displays': 2 }],
    ['Menus, offers or wayfinding', { 'digital-signage-displays': 4 }]]],
  ['How big should it be?', [
    ['Small (under 2 m)', { 'lcd-commercial-displays': 3, 'digital-signage-displays': 3 }],
    ['Medium (2 to 5 m)', { 'indoor-led-displays': 2, 'digital-signage-displays': 1, 'led-advertising-boards': 1 }],
    ['Large (over 5 m)', { 'led-video-walls': 3, 'outdoor-led-displays': 3, 'led-advertising-boards': 2 }]]]
]
const PITCH = ['P1.5 to P2.5 (fine pitch, close viewing)', 'P2.5 to P6 (medium distance)', 'P6 to P10 (long distance)']

export default function Finder() {
  const [ans, setAns] = useState(() => { const raw = new URLSearchParams(window.location.search).get('answers'); const values = raw ? raw.split(',').map(Number) : []; return values.length === Q.length && values.every((v, n) => Number.isInteger(v) && v >= 0 && v < Q[n][1].length) ? values : [] })
  const [i, setI] = useState(() => { const raw = new URLSearchParams(window.location.search).get('answers'); const values = raw ? raw.split(',').map(Number) : []; return values.length === Q.length && values.every((v, n) => Number.isInteger(v) && v >= 0 && v < Q[n][1].length) ? Q.length : 0 })
  const done = i >= Q.length
  const pick = idx => { setAns([...ans, idx]); setI(i + 1) }
  const score = {}; ans.forEach((a, q) => Object.entries(Q[q][1][a][1]).forEach(([k, v]) => { score[k] = (score[k] || 0) + v }))
  const top = products.map(p => [p, score[p.slug] || 0]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0])
  const tip = ans[1] === undefined ? '' : PITCH[ans[1]]
  return (
    <>
      <Seo title="Find my display" description="Answer four quick questions and get a display recommendation from KalpLabs." />
      <PageHero eyebrow="Display finder" title={<>Not sure what you need? <span className="text-grad">Answer four questions.</span></>} sub="We will suggest the display types that fit your site, plus a pixel pitch to start with." crumbs={[['/', 'Home']]} />
      <section className="wrap section pt-12">
        {!done ? (
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 flex items-center gap-2" aria-label={`Question ${i + 1} of ${Q.length}`}>{Q.map((_, n) => <i key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? 'bg-saffron' : 'bg-white/10'}`} />)}</div>
            <Reveal key={i}><p className="eyebrow">Question {i + 1} of {Q.length}</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{Q[i][0]}</h2>
              <div className="mt-8 grid gap-3">{Q[i][1].map(([l], idx) => <button key={l} onClick={() => pick(idx)} className="card flex items-center justify-between p-5 text-left text-lg font-semibold text-white transition hover:border-saffron hover:bg-white/5">{l}<ArrowRight className="text-saffron" size={20} /></button>)}</div></Reveal>
            {i > 0 && <button className="mt-6 text-sm text-white/40 hover:text-white" onClick={() => { setAns(ans.slice(0, -1)); setI(i - 1) }}>← Back</button>}
          </div>
        ) : (
          <div>
            <p className="eyebrow">Your matches</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">Start with these.</h2>
            {tip && <p className="mt-4 max-w-2xl text-lg text-white/60">For your viewing distance, a pixel pitch of <b className="text-white">{tip}</b> is a good starting point.</p>}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{top.map((p, n) => <Reveal key={p.slug} delay={n * 100} className="h-full"><ProductCard p={p} /></Reveal>)}</div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to={`/contact?interest=${encodeURIComponent(top[0].title)}`} className="btn btn-primary">Get a quote for {top[0].title}<ArrowRight size={18} /></Link>
              <Link to="/calculator" className="btn btn-ghost">Size my screen</Link>
              <Link to="/compare" className="btn btn-ghost">Compare displays</Link>
              <button className="btn btn-line" onClick={() => { const url = new URL(window.location.href); url.searchParams.set('answers', ans.join(',')); if (navigator.share) navigator.share({ title: 'My display finder results', url: url.toString() }).catch(() => {}); else navigator.clipboard?.writeText(url.toString()) }}><Share2 size={16}/>Share results</button>
              <button className="btn btn-line" onClick={() => { setI(0); setAns([]) }}><RotateCcw size={16} />Start again</button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
