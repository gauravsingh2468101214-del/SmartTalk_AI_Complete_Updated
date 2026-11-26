// Usage: set SITE.url in src/config.js, then run `npm run sitemap`. Writes public/sitemap.xml
import { writeFileSync } from 'node:fs'
import { products, industries, posts } from '../src/data.js'
import { SITE } from '../src/config.js'
if (!SITE.url) { console.error('Set SITE.url in src/config.js first (e.g. https://www.yourdomain.in).'); process.exit(1) }
const base = SITE.url.replace(/\/$/, '')
const paths = ['/', '/products', '/services', '/calculator', '/visualizer', '/finder', '/compare', '/support', '/blog', '/about', '/contact', '/glossary', '/projects', '/quote-planner', '/styleguide',
  ...products.map(p => `/products/${p.slug}`), ...industries.map(i => `/services/${i.slug}`), ...posts.map(p => `/blog/${p.slug}`),
  '/legal/privacy', '/legal/terms', '/legal/warranty', '/legal/cookies']
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml)
console.log(`sitemap.xml written with ${paths.length} URLs`)
