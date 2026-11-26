import { ClipboardCheck, Wrench, GraduationCap, Boxes, MessageCircle, Phone } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { Reveal, SectionHead } from '../components/fx.jsx'
import { Faq } from '../components/Cards.jsx'
import { process, faqs } from '../data.js'
import { COMPANY, waLink } from '../config.js'

const CARDS = [
  [ClipboardCheck, 'Site survey & design', 'We measure the wall, viewing distance, power and structure, then draw up size, resolution, mounting and controller for your approval.'],
  [Wrench, 'Installation & calibration', 'Trained crews build the structure, mount the cabinets and calibrate colour so the wall looks even from day one.'],
  [GraduationCap, 'Training', 'Your team learns how to run content and look after the display.'],
  [Boxes, 'Spare modules & service', 'Spare modules and service help once the display is live. Ask us about maintenance plans for your site.']
]
export default function Support() {
  return (
    <>
      <Seo title="Installation & Support" description="Site survey, installation, calibration, training and service support for LED and LCD displays from KalpLabs." />
      <PageHero eyebrow="Installation & support" title="From first call to long-term care." sub="One team from site survey to service, so your display keeps performing after the launch." crumbs={[['/', 'Home']]}>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn btn-primary" href={waLink('Hello KalpLabs, I need service or support for my display.')} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />Request support on WhatsApp</a>
          <a className="btn btn-ghost" href={`tel:${COMPANY.mobileHref}`}><Phone size={18} />{COMPANY.mobile}</a>
        </div>
      </PageHero>
      <section className="wrap section grid gap-5 sm:grid-cols-2">
        {CARDS.map(([I, t, d], i) => <Reveal key={t} delay={(i % 2) * 80} className="card p-7"><I className="text-saffron" size={28} /><h2 className="mt-5 text-2xl font-bold">{t}</h2><p className="mt-2 text-white/60">{d}</p></Reveal>)}
      </section>
      <section className="section bg-panel/40">
        <div className="wrap">
          <SectionHead eyebrow="How we work" title="Five steps, one team." />
          <ol className="mt-12 grid gap-5 md:grid-cols-5">
            {process.map(([t, d], i) => <Reveal as="li" key={t} delay={i * 100} className="card p-5"><span className="font-mono text-sm text-saffron">{String(i + 1).padStart(2, '0')}</span><h3 className="mt-2 text-lg font-bold">{t}</h3><p className="mt-2 text-sm text-white/55">{d}</p></Reveal>)}
          </ol>
        </div>
      </section>
      <section className="wrap section"><SectionHead eyebrow="Common questions" title="Good to know." /><div className="mt-8 max-w-3xl">{faqs.map(([q, a]) => <Faq key={q} q={q} a={a} />)}</div></section>
    </>
  )
}
