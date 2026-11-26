import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { products } from '../data.js'
import { TYPICAL } from '../typical.js'

const ENV = { indoor: 'Indoor', outdoor: 'Outdoor', special: 'Special' }
const ORDER = ['Pixel pitch', 'Panel size', 'Transparency', 'Resolution', 'Brightness', 'Refresh rate', 'Ingress protection', 'Viewing distance', 'Build', 'Operation', 'Content', 'Mounting', 'Weight', 'Shapes', 'Cabinets']

export default function Compare() {
  const [sel, setSel] = useState(() => { const requested = new URLSearchParams(window.location.search).get('product'); return requested && products.some(p => p.slug === requested) ? [requested, ...['outdoor-led-displays', 'indoor-led-displays', 'led-video-walls'].filter(x => x !== requested).slice(0, 2)] : ['outdoor-led-displays', 'indoor-led-displays', 'led-video-walls'] })
  const toggle = slug => setSel(s => s.includes(slug) ? (s.length > 2 ? s.filter(x => x !== slug) : s) : s.length < 3 ? [...s, slug] : [...s.slice(1), slug])
  const cols = sel.map(s => products.find(p => p.slug === s)).filter(Boolean)
  const keys = ORDER.filter(k => cols.some(c => TYPICAL[c.slug]?.some(([x]) => x === k)))
  const val = (c, k) => TYPICAL[c.slug]?.find(([x]) => x === k)?.[1] || '—'
  const Row = ({ label, children }) => <tr className="border-t border-white/10"><th scope="row" className="sticky left-0 bg-panel px-4 py-4 text-left text-sm font-normal text-white/50">{label}</th>{children}</tr>
  return (
    <>
      <Seo title="Compare displays" description="Compare KalpLabs LED and LCD display types side by side." />
      <PageHero eyebrow="Compare" title={<>Put them <span className="text-grad">side by side.</span></>} sub="Pick two or three display types to compare their typical ranges, environment and best uses." crumbs={[['/', 'Home']]} />
      <section className="wrap section pt-12">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose displays to compare">
          {products.map(p => { const on = sel.includes(p.slug); return <button key={p.slug} aria-pressed={on} onClick={() => toggle(p.slug)} className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${on ? 'border-saffron bg-saffron text-ink' : 'border-white/15 text-white/70 hover:border-white/40'}`}>{on && <Check size={14} />}{p.title}</button> })}
        </div>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-panel">
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr><th className="px-4 py-4" />{cols.map(c => <th key={c.slug} scope="col" className="px-4 py-4 text-left align-bottom"><Link to={`/products/${c.slug}`} className="font-display text-xl font-bold text-white hover:text-saffron">{c.title}</Link></th>)}</tr></thead>
            <tbody>
              <Row label="Environment">{cols.map(c => <td key={c.slug} className="px-4 py-4 text-white">{ENV[c.env]}</td>)}</Row>
              <Row label="Overview">{cols.map(c => <td key={c.slug} className="px-4 py-4 text-sm text-white/70">{c.blurb}</td>)}</Row>
              {keys.map(k => <Row key={k} label={k}>{cols.map(c => <td key={c.slug} className="px-4 py-4 font-mono text-sm text-white">{val(c, k)}</td>)}</Row>)}
              <Row label="Works best in">{cols.map(c => <td key={c.slug} className="px-4 py-4 text-sm text-white/70">{c.apps.join(' · ')}</td>)}</Row>
              <Row label="Next step">{cols.map(c => <td key={c.slug} className="px-4 py-4"><Link to={`/contact?interest=${encodeURIComponent(c.title)}`} className="btn btn-primary py-2 text-sm">Request a quote</Link></td>)}</Row>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-white/40">Ranges are general industry references for each category, not guarantees for a specific model. Ask us for the datasheet. Not sure which to pick? <Link to="/finder" className="text-saffron hover:underline">Try the display finder</Link>.</p>
      </section>
    </>
  )
}
