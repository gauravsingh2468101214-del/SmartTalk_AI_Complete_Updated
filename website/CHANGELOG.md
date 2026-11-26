# Upgrade changelog
All original pages, routes, components, texts, colours and animations are kept. Existing files received only small additive insertions (new props, imports, extra sections).

## Added
- Media system: `src/media.js`, `SmartImage`, `public/media/*` (photos auto-replace animated visuals when set; fallback if missing)
- Hero video layer (optional), "See it in action" showreel (generated LED showreel or your real video)
- Opt-in audio: generated UI sounds, success chime, ambient LED hum (nothing autoplays)
- Branded intro (once per session, skippable), scroll progress bar, back-to-top, route fade, error boundary
- Pages: `/support`, `/legal/privacy|terms|warranty|cookies` (draft templates), footer legal bar
- Blog: five full articles + reading time + CTA
- Product pages: "Typical for this category" industry reference ranges
- Trust sections (testimonials, clients, certifications, projects) that stay hidden until filled
- Enquiry form: optional automatic delivery via `FORM_ENDPOINT`
- SEO: Open Graph/Twitter tags, canonical, Organization JSON-LD, favicon, robots.txt, sitemap script
- Hosting: `public/_redirects`, `vercel.json`
## Added in round 2 (tools and design)
- Tools: `/visualizer` (upload wall photo, drag/resize virtual LED screen, pitch/brightness/shape, download PNG, send to WhatsApp), `/finder` (4-question display recommender), `/compare` (side-by-side), Ctrl/Cmd+K site search, Tools mega-menu, Tools strip on Home
- Design: generated background art in `public/media/bg/` (hero, section, night-city, CTA, footer), textured panel sections, richer cards, balanced headings, custom scrollbar, print styles, closing CTA band on inner pages
- Brand assets: social preview image `public/og-image.jpg`, app icons, web manifest
- Optional Google Analytics 4 behind a cookie-consent banner (`ANALYTICS.ga4` in `src/config.js`, off by default)

## Not changed
- `dist/` and `node_modules/` are not included: run `npm install` then `npm run build`.

## Added in round 3 (professional workflow and media extensions)
- Added route-level React lazy loading with a branded Suspense fallback for page-level code splitting.
- Added a searchable LED/LCD technology glossary at `/glossary`.
- Added a data-driven `/projects` portfolio that displays only owner-supplied verified entries from `src/trust.js`; empty project content stays clearly unpopulated.
- Added a guided `/quote-planner` that builds a structured project brief and hands it to WhatsApp. It does not invent pricing or claim to create a confirmed quote.
- Added optional product photo galleries, product demonstration video with optional captions, and optional audio via `src/media.js`. Existing animated product visuals remain the fallback.
- Added share actions on product detail pages and shareable display-finder result URLs.
- Added a preferred-date/time site-visit request on the Contact page. It is a request only; availability must be confirmed by the team.
- Added deployment/security guidance and baseline static response headers in `public/_headers`.
- Added new navigation/footer links while keeping all existing routes and features.

## Validation note
- JavaScript/JSX syntax parsing passed for all 55 source JS/JSX files; local relative imports resolved; newly used Lucide icons were verified in the installed package.
- A production Vite build could not be completed in this environment because the supplied dependency archive contains the Windows Rollup native binary but not the Linux Rollup binary, and package installation did not complete. Run `npm ci` and `npm run build` on the target Windows development machine before deployment.
- Real product photographs, videos, audio, datasheets, project stories, verified specifications, KalpLabs-owned contact details, and a form endpoint were not supplied. No fabricated media, customer claims, specifications, prices or legal identity details have been added.
