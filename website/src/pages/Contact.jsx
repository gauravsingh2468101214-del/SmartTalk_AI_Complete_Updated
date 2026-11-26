import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Mail, Phone, MessageCircle } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import QuoteForm from '../components/QuoteForm.jsx'
import SiteVisitRequest from '../components/SiteVisitRequest.jsx'
import { COMPANY, OFFICES, waLink, mapEmbed } from '../config.js'

export default function Contact() {
  const [sp] = useSearchParams()
  const [o, setO] = useState(0)
  const interest = sp.get('interest') || ''
  const category = sp.get('category') || ''
  const source = sp.get('source') || ''
  const reference = sp.get('reference') || ''
  const quick = [
    [Phone, 'Call', COMPANY.mobile, `tel:${COMPANY.mobileHref}`],
    [MessageCircle, 'WhatsApp', 'Chat with our team', waLink()],
    [Mail, 'Email', COMPANY.email, `mailto:${COMPANY.email}`]
  ]
  return (
    <>
      <Seo title="Contact Us" description="Contact KalpLabs for a quote on LED and LCD displays." />
      <PageHero eyebrow="Contact" title="Start your project." sub="Tell us about the site and what you want to show. We’ll come back with options and a quote." crumbs={[['/', 'Home']]}>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {quick.map(([I, t, v, href]) => (
            <a key={t} href={href} target={t === 'WhatsApp' ? '_blank' : undefined} rel="noopener noreferrer" className="card group flex items-center gap-4 p-5 transition hover:border-saffron/60">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-saffron/15 text-saffron transition group-hover:bg-saffron group-hover:text-ink"><I size={22} /></span>
              <span><span className="block text-sm text-white/50">{t}</span><span className="block break-all font-semibold text-white">{v}</span></span>
            </a>
          ))}
        </div>
      </PageHero>
      <section className="wrap section grid gap-12 pt-14 lg:grid-cols-5">
        <div className="card p-6 sm:p-8 lg:col-span-3">
          <h2 className="mb-6 text-2xl font-bold">Send an enquiry</h2>
          {interest && <div className="mb-5 rounded-xl border border-saffron/30 bg-saffron/5 p-4" aria-live="polite">
            <p className="text-xs uppercase tracking-[.15em] text-saffron">Enquiry reference{source ? ` · ${source}` : ''}</p>
            <p className="mt-1 font-semibold text-white">{interest}</p>
            {category && <p className="mt-1 text-sm text-white/65">Category: {category}</p>}
            {reference && <p className="mt-1 text-xs text-white/45">Chatbot search: {reference}</p>}
          </div>}
          <QuoteForm defaultInterest={interest} defaultCategory={category} />
        </div>
        <aside className="lg:col-span-2">
          <h2 className="text-2xl font-bold">Our offices</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {OFFICES.map((x, i) => (
              <button key={x.city} onClick={() => setO(i)} className={`rounded-full border px-4 py-1.5 text-sm transition ${o === i ? 'border-saffron bg-saffron text-ink' : 'border-white/15 text-white/70 hover:border-white/40'}`}>{x.city}</button>
            ))}
          </div>
          <p className="mt-5 flex gap-3 text-white/70"><MapPin className="mt-0.5 shrink-0 text-saffron" size={20} />{OFFICES[o].address}</p>
          <iframe key={o} title={`${OFFICES[o].city} office location`} src={mapEmbed(OFFICES[o].address)} loading="lazy"
            className="mt-5 h-80 w-full rounded-2xl border border-white/10 [filter:invert(.9)_hue-rotate(180deg)_saturate(.7)]" />
        </aside>
      </section>
      <section className="wrap pb-20"><SiteVisitRequest /></section>
    </>
  )
}
