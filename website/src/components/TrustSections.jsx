import { Quote, ShieldCheck } from 'lucide-react'
import { TRUST } from '../trust.js'
import { Reveal, SectionHead } from './fx.jsx'
import ScreenVisual from './ScreenVisual.jsx'
import SmartImage from './SmartImage.jsx'

// Renders only what is filled in src/trust.js, so no placeholder or invented claim is ever shown.
export default function TrustSections() {
  const { certifications: c, clients: cl, testimonials: t, projects: p } = TRUST
  if (![c, cl, t, p].some(a => a?.length)) return null
  return (
    <section className="section">
      <div className="wrap space-y-20">
        {p?.length > 0 && (<div>
          <SectionHead eyebrow="Projects" title="Recent installations." />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {p.map((x, i) => (
              <Reveal key={x.title} delay={(i % 3) * 80} className="card overflow-hidden">
                <div className="relative"><ScreenVisual scene="aurora" bezel={false} /><SmartImage src={x.photo} alt={x.title} className="absolute inset-0 h-full w-full object-cover" /></div>
                <div className="p-5"><p className="font-mono text-xs text-saffron">{[x.industry, x.city].filter(Boolean).join(' · ')}</p><h3 className="mt-1 text-lg font-bold">{x.title}</h3>{x.blurb && <p className="mt-2 text-sm text-white/55">{x.blurb}</p>}</div>
              </Reveal>
            ))}
          </div>
        </div>)}
        {t?.length > 0 && (<div>
          <SectionHead eyebrow="Testimonials" title="In our clients’ words." />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {t.map((x, i) => (
              <Reveal key={x.name + i} delay={(i % 3) * 80} className="card p-6">
                <Quote className="text-saffron" size={24} /><p className="mt-4 text-white/80">{x.quote}</p>
                <p className="mt-5 font-semibold text-white">{x.name}</p><p className="text-sm text-white/45">{[x.role, x.company].filter(Boolean).join(', ')}</p>
              </Reveal>
            ))}
          </div>
        </div>)}
        {cl?.length > 0 && (<div>
          <p className="eyebrow text-center">Trusted by</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {cl.map(x => x.logo ? <img key={x.name} src={x.logo} alt={x.name} loading="lazy" className="h-10 w-auto opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0" /> : <span key={x.name} className="font-display text-xl font-bold text-white/40">{x.name}</span>)}
          </div>
        </div>)}
        {c?.length > 0 && (<div>
          <p className="eyebrow text-center">Certifications</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {c.map(x => <div key={x.name} className="card flex items-center gap-3 px-5 py-3"><ShieldCheck className="text-india" size={22} /><span><span className="block font-semibold text-white">{x.name}</span>{x.note && <span className="text-xs text-white/45">{x.note}</span>}</span></div>)}
          </div>
        </div>)}
      </div>
    </section>
  )
}
