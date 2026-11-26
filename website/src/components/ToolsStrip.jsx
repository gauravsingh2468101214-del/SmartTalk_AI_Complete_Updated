import { Link } from 'react-router-dom'
import { Calculator, ImagePlus, Compass, Columns3, ArrowUpRight } from 'lucide-react'
import { Reveal, SectionHead } from './fx.jsx'
const TOOLS = [
  [ImagePlus, '/visualizer', 'See it on your wall', 'Upload a photo of your space and place a virtual LED screen on it. Download the mockup.'],
  [Compass, '/finder', 'Find my display', 'Four quick questions, then a recommended display type and starting pixel pitch.'],
  [Columns3, '/compare', 'Compare displays', 'Put two or three display types side by side: pitch, brightness, environment and uses.'],
  [Calculator, '/calculator', 'Screen calculator', 'Resolution, cabinets and best viewing distance for any size and pitch.']
]
export default function ToolsStrip() {
  return (
    <section className="section">
      <div className="wrap">
        <SectionHead eyebrow="Free tools" title="Plan it before you call." sub="Four tools that run right in your browser. Use them to shape your brief, then send it straight to our team." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(([I, to, t, d], i) => (
            <Reveal key={to} delay={i * 80} className="h-full">
              <Link to={to} className="card group relative flex h-full flex-col overflow-hidden p-6 transition hover:border-saffron/60">
                <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-saffron/15 blur-2xl transition group-hover:bg-saffron/30" aria-hidden />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-saffron/15 text-saffron transition group-hover:bg-saffron group-hover:text-ink"><I size={24} /></span>
                <h3 className="relative mt-5 flex items-center justify-between text-xl font-bold">{t}<ArrowUpRight size={18} className="text-white/30 transition group-hover:text-saffron" /></h3>
                <p className="relative mt-2 text-sm text-white/55">{d}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
