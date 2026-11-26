import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
// Scroll progress bar + back-to-top button.
export default function Chrome() {
  const [p, setP] = useState(0), [show, setShow] = useState(false)
  useEffect(() => {
    const f = () => { const h = document.documentElement.scrollHeight - innerHeight; setP(h > 0 ? scrollY / h : 0); setShow(scrollY > 700) }
    f(); addEventListener('scroll', f, { passive: true }); addEventListener('resize', f)
    return () => { removeEventListener('scroll', f); removeEventListener('resize', f) }
  }, [])
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-saffron via-white to-india" style={{ transform: `scaleX(${p})` }} />
      <button aria-label="Back to top" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-24 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-panel/90 text-white backdrop-blur transition hover:border-saffron hover:text-saffron ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <ArrowUp size={18} />
      </button>
    </>
  )
}
