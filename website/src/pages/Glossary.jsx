import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'

const TERMS = [
  ['AMC','Annual Maintenance Contract','A service agreement that defines planned maintenance and support for equipment. Availability and coverage must be confirmed with the provider.'],
  ['Brightness / nits','Screen luminance','A measure of how bright a display appears. The right level depends on ambient light, viewing distance and installation conditions.'],
  ['Cabinet','LED display cabinet','A modular enclosure that holds LED modules and supporting electronics. Cabinet dimensions vary by product.'],
  ['COB','Chip-on-Board','An LED packaging approach in which LED chips are mounted directly onto a substrate and protected by a coating.'],
  ['GOB','Glue-on-Board','A protective coating applied over LED modules to improve surface protection in suitable applications.'],
  ['IP rating','Ingress Protection rating','A classification describing protection against solid particles and water under specified test conditions. Check the exact model datasheet.'],
  ['LED','Light-Emitting Diode','A semiconductor device that emits light when electrical current passes through it.'],
  ['LCD','Liquid Crystal Display','A display technology that controls light through liquid-crystal cells, typically with a backlight.'],
  ['Pixel pitch','Distance between pixel centres','The centre-to-centre distance between adjacent pixels, usually measured in millimetres. Smaller pitch generally supports closer viewing.'],
  ['Refresh rate','Image refresh frequency','How often a display updates its image, commonly expressed in hertz (Hz). Confirm the value for the exact model.'],
  ['SMD','Surface-Mounted Device','An LED package mounted onto a circuit board. RGB LED chips are commonly packaged together for display modules.'],
  ['Viewing distance','Viewer-to-screen distance','The distance from the display surface to the viewer. It helps guide pixel-pitch selection and content legibility.']
]
export default function Glossary() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => TERMS.filter(([a,b,c]) => `${a} ${b} ${c}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <>
    <Seo title="LED Display Glossary" description="Understand common LED and LCD display terms, including pixel pitch, brightness, refresh rate, SMD, COB and GOB." />
    <PageHero eyebrow="Knowledge centre" title="Display technology, made clear." sub="A practical glossary of common LED and LCD display terms. Product-specific values should always be checked against the relevant datasheet." crumbs={[[ '/', 'Home' ], ['/blog', 'Insights']]} />
    <section className="wrap section pt-12">
      <div className="mx-auto max-w-3xl">
        <label className="relative block"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"/><input className="field pl-11" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a term, e.g. pixel pitch" aria-label="Search glossary"/></label>
        <p className="mt-4 text-sm text-white/40">{filtered.length} terms</p>
        <div className="mt-6 space-y-3">{filtered.map(([term,full,desc])=><article key={term} className="card p-6"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xl font-bold">{term}</h2><span className="text-sm text-saffron">{full}</span></div><p className="mt-3 leading-relaxed text-white/65">{desc}</p></article>)}</div>
        {!filtered.length && <div className="card p-8 text-center"><BookOpen className="mx-auto text-saffron"/><p className="mt-3 font-semibold">No matching term found</p><p className="mt-1 text-sm text-white/50">Try another keyword or browse the <Link className="text-saffron underline" to="/blog">insights</Link>.</p></div>}
      </div>
    </section>
  </>
}
