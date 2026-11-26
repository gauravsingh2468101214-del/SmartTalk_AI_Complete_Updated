import { Link } from 'react-router-dom'
import { LEGAL } from '../config.js'
export const LEGAL_DOCS = [['privacy', 'Privacy Policy'], ['terms', 'Terms of Use'], ['warranty', 'Warranty & Returns'], ['cookies', 'Cookie Policy']]
export default function LegalBar() {
  const id = [LEGAL.legalName, LEGAL.gstin && `GSTIN ${LEGAL.gstin}`, LEGAL.cin && `CIN ${LEGAL.cin}`, LEGAL.registeredAddress, LEGAL.hours && `Hours: ${LEGAL.hours}`].filter(Boolean)
  return (
    <div className="mt-12 border-t border-white/10 pt-6 text-sm">
      <ul className="flex flex-wrap gap-x-6 gap-y-2">{LEGAL_DOCS.map(([k, l]) => <li key={k}><Link className="hover:text-saffron" to={`/legal/${k}`}>{l}</Link></li>)}<li><Link className="hover:text-saffron" to="/support">Installation & support</Link></li><li><Link className="hover:text-saffron" to="/visualizer">Wall visualizer</Link></li><li><Link className="hover:text-saffron" to="/finder">Display finder</Link></li><li><Link className="hover:text-saffron" to="/compare">Compare</Link></li></ul>
      {id.length > 0 && <p className="mt-3 text-xs text-white/35">{id.join(' · ')}</p>}
    </div>
  )
}
