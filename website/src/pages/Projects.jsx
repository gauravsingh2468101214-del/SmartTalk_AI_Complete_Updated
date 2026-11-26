import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Images } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import SmartImage from '../components/SmartImage.jsx'
import { TRUST } from '../trust.js'

export default function Projects() {
  const projects = TRUST.projects || []
  const [industry,setIndustry] = useState('All')
  const [city,setCity] = useState('All')
  const industries = ['All', ...new Set(projects.map(p=>p.industry).filter(Boolean))]
  const cities = ['All', ...new Set(projects.map(p=>p.city).filter(Boolean))]
  const shown = useMemo(()=>projects.filter(p=>(industry==='All'||p.industry===industry)&&(city==='All'||p.city===city)),[projects,industry,city])
  return <>
    <Seo title="Project Portfolio" description="Explore verified LED and LCD display installations and project case studies." />
    <PageHero eyebrow="Selected work" title="Projects, backed by real work." sub="A portfolio of verified installations and case studies. Only owner-approved project information is displayed." crumbs={[[ '/', 'Home' ]]} />
    <section className="wrap section pt-12">
      {projects.length ? <><div className="mb-6 flex flex-wrap gap-3"><label className="text-sm text-white/60">Industry<select className="field mt-1 min-w-40" value={industry} onChange={e=>setIndustry(e.target.value)}>{industries.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm text-white/60">City<select className="field mt-1 min-w-40" value={city} onChange={e=>setCity(e.target.value)}>{cities.map(x=><option key={x}>{x}</option>)}</select></label></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{shown.map((p,i)=><article key={`${p.title}-${i}`} className="card overflow-hidden"><div className="relative aspect-[16/10] bg-white/5"><SmartImage src={p.photo} alt={p.photoAlt || p.title} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent"/></div><div className="p-6"><p className="eyebrow">{[p.industry,p.city].filter(Boolean).join(' · ') || 'Verified project'}</p><h2 className="mt-2 text-2xl font-bold">{p.title}</h2>{p.blurb && <p className="mt-3 text-white/60">{p.blurb}</p>}{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-saffron">View project <ArrowUpRight size={16}/></a>}</div></article>)}</div>{!shown.length && <p className="mt-6 text-center text-white/50">No projects match these filters.</p>}</> : <div className="mx-auto max-w-2xl card p-8 text-center"><Images className="mx-auto text-saffron" size={34}/><h2 className="mt-4 text-2xl font-bold">Project stories are being prepared</h2><p className="mt-3 text-white/60">Verified project photographs, client permissions and case-study details will appear here once supplied by the website owner. No sample clients or fabricated results are shown.</p><p className="mt-6"><Link className="btn btn-primary" to="/contact">Discuss your project</Link></p></div>}
    </section>
  </>
}
