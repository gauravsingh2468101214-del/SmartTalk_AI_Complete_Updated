import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { waLink } from '../config.js'
import { Reveal } from './fx.jsx'
// Full-width closing call-to-action shown above the footer on inner pages.
export default function CtaBand() {
  return (
    <section className="art-cta relative overflow-hidden py-20 md:py-28">
      <div className="led-grid absolute inset-0 opacity-[.07]" aria-hidden />
      <Reveal className="wrap relative text-center">
        <p className="eyebrow !text-white/80">Ready when you are</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-6xl">Let’s light up your space.</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">Tell us about your site. We will recommend the right display and send you a quote.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/contact" className="btn bg-white text-ink hover:bg-ink hover:text-white">Get a quote <ArrowRight size={18} /></Link>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn border border-white/50 text-white hover:bg-white/15"><MessageCircle size={18} />WhatsApp us</a>
        </div>
      </Reveal>
    </section>
  )
}
