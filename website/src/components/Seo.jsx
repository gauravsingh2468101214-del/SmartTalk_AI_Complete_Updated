import { useEffect } from 'react'
import { COMPANY, SITE } from '../config.js'

const setMeta = (attr, key, content) => {
  let m = document.querySelector(`meta[${attr}="${key}"]`)
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m) }
  m.content = content
}
export default function Seo({ title, description }) {
  useEffect(() => {
    document.title = `${title} | KalpLabs`
    let m = document.querySelector('meta[name="description"]')
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m) }
    m.content = description
  }, [title, description])
  // Social previews, canonical link and organisation data
  useEffect(() => {
    const t = `${title} | KalpLabs`
    setMeta('property', 'og:title', t); setMeta('property', 'og:description', description); setMeta('property', 'og:type', 'website'); setMeta('property', 'og:site_name', COMPANY.name)
    setMeta('name', 'twitter:card', SITE.url ? 'summary_large_image' : 'summary'); setMeta('name', 'twitter:title', t); setMeta('name', 'twitter:description', description)
    let c = document.querySelector('link[rel="canonical"]')
    if (SITE.url) {
      if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c) }
      c.href = SITE.url.replace(/\/$/, '') + location.pathname; setMeta('property', 'og:url', c.href)
      setMeta('property', 'og:image', SITE.url.replace(/\/$/, '') + '/og-image.jpg'); setMeta('name', 'twitter:image', SITE.url.replace(/\/$/, '') + '/og-image.jpg')
    }
    let s = document.getElementById('ld-org')
    if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld-org'; document.head.appendChild(s) }
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: COMPANY.name, telephone: COMPANY.mobile, email: COMPANY.email, ...(SITE.url && { url: SITE.url }) })
  }, [title, description])
  return null
}
