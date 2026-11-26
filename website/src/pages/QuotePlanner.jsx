import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, MessageCircle, ClipboardList } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { waLink } from '../config.js'

const initial = { environment:'Indoor', width:'', height:'', distance:'', content:'Branding / advertising', city:'', timeline:'Within 1–3 months', notes:'' }
const steps = [
  { title:'Where will the display be installed?', key:'environment', options:['Indoor','Outdoor','Special / transparent'] },
  { title:'What size are you considering?', key:'size' },
  { title:'How far will viewers stand?', key:'distance' },
  { title:'What will the screen show?', key:'content', options:['Branding / advertising','Presentations / information','Live video / events','Menus / wayfinding','Not decided yet'] },
  { title:'Where and when is the project?', key:'location' }
]
export default function QuotePlanner() {
  const [v,setV]=useState(initial); const [step,setStep]=useState(0)
  const update=(k,val)=>setV(old=>({...old,[k]:val}))
  const ready=!!(v.city.trim() && v.width && v.height)
  const message=useMemo(()=>`Display project brief\nEnvironment: ${v.environment}\nApprox. size: ${v.width} m × ${v.height} m\nViewing distance: ${v.distance || 'Not specified'}\nContent: ${v.content}\nCity: ${v.city}\nTimeline: ${v.timeline}\nAdditional notes: ${v.notes || 'None'}\n\nPlease help me review the requirements and recommend suitable options.`,[v])
  return <>
    <Seo title="Smart Display Quote Planner" description="Build a structured LED or LCD display project brief before contacting the KalpLabs team."/>
    <PageHero eyebrow="Project planner" title="A clearer brief. A better recommendation." sub="Answer a few practical questions to prepare a project summary. This is an enquiry aid, not an automated quotation or technical specification." crumbs={[[ '/', 'Home' ], ['/contact','Contact']]}/>
    <section className="wrap section pt-12"><div className="mx-auto max-w-3xl card p-6 sm:p-9">
      <div className="flex items-center justify-between gap-4"><p className="eyebrow">Step {step+1} of {steps.length}</p><p className="text-xs text-white/40">{Math.round(((step+1)/steps.length)*100)}% complete</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-saffron transition-all" style={{width:`${((step+1)/steps.length)*100}%`}}/></div>
      <h2 className="mt-8 text-2xl font-bold sm:text-3xl">{steps[step].title}</h2>
      {step===0 && <div className="mt-6 grid gap-3 sm:grid-cols-3">{steps[0].options.map(x=><button key={x} type="button" onClick={()=>update('environment',x)} className={`rounded-xl border p-4 text-left transition ${v.environment===x?'border-saffron bg-saffron/10 text-white':'border-white/10 bg-white/[.03] text-white/65 hover:border-white/30'}`}>{x}</button>)}</div>}
      {step===1 && <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/65">Width (metres)<input className="field mt-2" type="number" min="0.1" step="0.1" value={v.width} onChange={e=>update('width',e.target.value)} placeholder="e.g. 6"/></label><label className="text-sm text-white/65">Height (metres)<input className="field mt-2" type="number" min="0.1" step="0.1" value={v.height} onChange={e=>update('height',e.target.value)} placeholder="e.g. 3"/></label><p className="sm:col-span-2 text-xs text-white/40">Approximate dimensions are enough. Final measurements require a site survey.</p></div>}
      {step===2 && <div className="mt-6"><label className="text-sm text-white/65">Typical viewing distance (metres)<input className="field mt-2" type="number" min="0" step="0.5" value={v.distance} onChange={e=>update('distance',e.target.value)} placeholder="e.g. 5"/></label><p className="mt-2 text-xs text-white/40">Leave blank if you are unsure.</p></div>}
      {step===3 && <div className="mt-6 grid gap-3 sm:grid-cols-2">{steps[3].options.map(x=><button key={x} type="button" onClick={()=>update('content',x)} className={`rounded-xl border p-4 text-left ${v.content===x?'border-saffron bg-saffron/10':'border-white/10 bg-white/[.03]'}`}>{x}</button>)}</div>}
      {step===4 && <div className="mt-6 grid gap-4"><label className="text-sm text-white/65">Project city / location<input className="field mt-2" value={v.city} onChange={e=>update('city',e.target.value)} placeholder="City or site location"/></label><label className="text-sm text-white/65">Expected timeline<select className="field mt-2" value={v.timeline} onChange={e=>update('timeline',e.target.value)}><option>Immediately</option><option>Within 1–3 months</option><option>Within 3–6 months</option><option>Researching / not decided</option></select></label><label className="text-sm text-white/65">Additional notes<textarea className="field mt-2" rows="3" value={v.notes} onChange={e=>update('notes',e.target.value)} placeholder="Site type, mounting, special requirements…"/></label></div>}
      <div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" disabled={step===0} onClick={()=>setStep(s=>s-1)} className="btn btn-ghost disabled:opacity-30"><ArrowLeft size={16}/>Back</button>{step<steps.length-1?<button type="button" onClick={()=>setStep(s=>s+1)} className="btn btn-primary">Continue<ArrowRight size={16}/></button>:<a className={`btn btn-primary ${!ready?'pointer-events-none opacity-40':''}`} href={waLink(message)} target="_blank" rel="noreferrer"><MessageCircle size={17}/>Send project brief</a>}</div>
      {step===steps.length-1 && !ready && <p className="mt-3 text-xs text-saffron">Please add approximate width, height and project city before sending.</p>}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList size={16} className="text-saffron"/>Your brief preview</div><p className="mt-2 text-sm text-white/55">{v.environment} · {v.width||'—'} × {v.height||'—'} m · {v.content} · {v.city||'City not added'}</p></div>
    </div></section>
  </>
}
