import { Link, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { COMPANY } from '../config.js'

const N = COMPANY.name, E = COMPANY.email
const DOCS = {
  privacy: ['Privacy Policy', [
    ['What we collect', `When you send an enquiry we receive the details you type: name, company, mobile number, email, city, the product you are interested in and your project requirements.`],
    ['How we use it', `We use these details only to reply to your enquiry, prepare quotations and support your project. We do not sell your personal information.`],
    ['How it reaches us', `The enquiry form opens WhatsApp or your email app with your details filled in, and may also post them to a form service configured by ${N}. Messages you send through WhatsApp or email are also handled by those providers under their own policies.`],
    ['Retention and your choices', `We keep enquiry records only as long as needed for the purpose above. You can ask us to correct or delete your details by writing to ${E}.`],
    ['Third-party links and maps', `Pages may embed Google Maps or link to other sites. Those services have their own privacy practices.`],
    ['Contact', `Questions about this policy: ${E}.`]
  ]],
  terms: ['Terms of Use', [
    ['Information on this website', `Content on this site is for general information. Product images, animations and typical ranges are illustrative; exact specifications depend on the model and are confirmed in the written quotation or datasheet.`],
    ['Quotations and orders', `A price or recommendation becomes binding only when confirmed in writing by ${N}. Delivery, installation and payment terms are set out in the quotation or contract for each project.`],
    ['Calculator and tools', `The screen calculator and other tools give estimates for planning. Final sizes, resolutions and cabinet counts are confirmed after a site survey.`],
    ['Intellectual property', `Text, graphics, animations and the ${N} name and logo belong to ${N} or its licensors. Do not copy them without permission.`],
    ['Liability', `To the extent permitted by law, ${N} is not liable for losses arising from the use of this website or reliance on its general information.`],
    ['Governing law', `[Owner to confirm governing law and jurisdiction with legal counsel.]`]
  ]],
  warranty: ['Warranty & Returns', [
    ['Where warranty terms live', `Warranty duration and coverage differ by product and project. They are stated in your written quotation, invoice or contract, which takes priority over this page.`],
    ['What is usually covered', `[Owner to define: manufacturing defects, covered components, response process.]`],
    ['What is usually not covered', `[Owner to define: damage from misuse, unauthorised repair, power surges, water ingress outside rated protection, etc.]`],
    ['Making a claim', `Contact us on ${COMPANY.mobile} or ${E} with your invoice, a description of the issue and photos or video of the display.`],
    ['Returns', `[Owner to define the return and replacement process.]`]
  ]],
  cookies: ['Cookie Policy', [
    ['Our approach', `This website keeps cookies and browser storage to a minimum. We store small preferences on your device, such as whether you enabled optional sound, and whether you have already seen the intro.`],
    ['Analytics and advertising', `No analytics or advertising cookies are set by default. If ${N} adds them later, this page and a consent notice will be updated first.`],
    ['Third parties', `Embedded Google Maps and Google Fonts may set their own cookies or receive your IP address under Google’s policies.`],
    ['Your control', `You can clear site data or block cookies in your browser settings at any time.`]
  ]]
}

export default function Legal() {
  const { doc } = useParams()
  const d = DOCS[doc]
  if (!d) return <PageHero title="Page not found"><Link to="/" className="btn btn-primary mt-6">Back to home</Link></PageHero>
  return (
    <>
      <Seo title={d[0]} description={`${d[0]} for ${N}.`} />
      <PageHero eyebrow="Legal" title={d[0]} crumbs={[['/', 'Home']]} />
      <article className="wrap max-w-3xl py-14">
        <p className="flex gap-3 rounded-xl border border-saffron/30 bg-saffron/10 p-4 text-sm text-white/80"><AlertTriangle className="mt-0.5 shrink-0 text-saffron" size={18} />Draft template. Have it reviewed by a qualified lawyer and complete the items in [brackets] before relying on it.</p>
        {d[1].map(([h, t]) => <section key={h} className="mt-10"><h2 className="text-2xl font-bold">{h}</h2><p className="mt-3 text-white/65">{t}</p></section>)}
      </article>
    </>
  )
}
