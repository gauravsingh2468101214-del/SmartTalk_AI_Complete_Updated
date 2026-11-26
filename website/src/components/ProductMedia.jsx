import { useState } from 'react'
import { PlayCircle, Images } from 'lucide-react'
import ScreenVisual from './ScreenVisual.jsx'
import SmartImage from './SmartImage.jsx'
import { MEDIA } from '../media.js'

export default function ProductMedia({ item }) {
  const media = MEDIA.products?.[item.slug] || {}
  const photos = Array.isArray(media.gallery) ? media.gallery : (media.photo ? [media.photo] : [])
  const [active,setActive]=useState(0)
  const selected=photos[active]
  return <section className="mt-12" aria-label={`${item.title} media gallery`}>
    <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Product media</p><h2 className="mt-2 text-2xl font-bold">See the display in context</h2></div><span className="text-xs text-white/40">Owner-supplied media appears here</span></div>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_.8fr]">
      <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-white/10 bg-panel">
        {selected ? <SmartImage key={selected} src={selected} alt={`${item.title} product view ${active+1}`} className="h-full min-h-[240px] w-full object-cover" priority/> : <ScreenVisual scene={item.scene} slug={item.slug} kind="products" label={item.title} className="h-full min-h-[240px]"/>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {photos.length>1 && <div className="flex gap-2 overflow-x-auto lg:flex-wrap">{photos.map((src,i)=><button key={src} onClick={()=>setActive(i)} aria-label={`Show image ${i+1}`} aria-pressed={active===i} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border ${active===i?'border-saffron':'border-white/10'}`}><SmartImage src={src} alt="" className="h-full w-full object-cover"/></button>)}</div>}
        {media.video && <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><PlayCircle size={18} className="text-saffron"/>Product demonstration</div><video controls preload="metadata" poster={media.videoPoster || undefined} className="w-full rounded-lg" aria-label={`${item.title} demonstration video`}><source src={media.video} type="video/mp4"/>{media.captions && <track kind="captions" src={media.captions} srcLang="en" label="English captions" default/>}Your browser does not support embedded video.</video></div>}
        {!photos.length && !media.video && <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-white/55"><Images className="shrink-0 text-saffron"/>Add verified product photographs or a demonstration video using the media manifest. The existing animated visual remains as a fallback.</div>}
        {media.audio && <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="mb-2 text-sm font-semibold">Optional product audio</p><audio controls preload="none" className="w-full"><source src={media.audio}/></audio></div>}
      </div>
    </div>
  </section>
}
