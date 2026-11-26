import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ANALYTICS } from '../config.js'
// Loads Google Analytics 4 only after the visitor accepts, and only if ANALYTICS.ga4 is set in config.js.
export default function Consent() {
  const id = ANALYTICS.ga4
  const [c, setC] = useState(() => { try { return localStorage.getItem('kl-consent') } catch { return null } })
  useEffect(() => {
    if (!id || c !== 'yes' || document.getElementById('ga4')) return
    const s = document.createElement('script'); s.id = 'ga4'; s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments) }; window.gtag('js', new Date()); window.gtag('config', id, { anonymize_ip: true })
  }, [c, id])
  if (!id || c) return null
  const set = v => { try { localStorage.setItem('kl-consent', v) } catch {} setC(v) }
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed bottom-24 left-4 z-[70] max-w-sm rounded-2xl border border-white/10 bg-panel/95 p-5 shadow-2xl backdrop-blur-xl lg:bottom-5">
      <p className="text-sm text-white/75">We would like to use analytics cookies to understand how the site is used. Nothing is set unless you accept. <Link to="/legal/cookies" className="text-saffron hover:underline">Cookie policy</Link></p>
      <div className="mt-4 flex gap-2"><button className="btn btn-primary px-4 py-2 text-sm" onClick={() => set('yes')}>Accept</button><button className="btn btn-ghost px-4 py-2 text-sm" onClick={() => set('no')}>Decline</button></div>
    </div>
  )
}
