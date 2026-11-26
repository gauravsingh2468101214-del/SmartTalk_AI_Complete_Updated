# KalpLabs Display Website (React + Vite + Tailwind)

## Run locally
    npm install
    npm run dev      # http://localhost:5173
    npm run build    # production build in /dist

## What's interactive
- **Hero LED wall** (`components/LedWall.jsx`): live canvas of LED dots. Cursor lights pixels, click sends a ripple, buttons change pixel pitch.
- **Tech lens** (`components/TechLens.jsx`): SMD / COB / GOB macro views.
- **Brightness simulator** (`components/BrightnessSim.jsx`): indoor vs outdoor screen readability as ambient light rises.
- **Screen calculator** (`components/PitchCalculator.jsx`, page `/calculator`): resolution, cabinets, viewing distance; sends results to WhatsApp.
- **India LED map** (`components/IndiaMap.jsx`): offices with addresses and directions.
- **Animated product screens** (`components/ScreenVisual.jsx`): CSS "screens" in place of stock photos. Pass `photo="/images/x.jpg"` to use a real photo.

## Customise
- `src/config.js`: phone, WhatsApp, email, offices, social links.
- `src/data.js`: products (incl. `specs` – fill from the catalogue PDF), industries, posts, FAQs.
- Enquiry form opens WhatsApp or email with the details filled in. To receive submissions automatically, connect Formspree/EmailJS/your API in `src/components/QuoteForm.jsx`.
- For hosting, route all paths to `index.html` (SPA fallback).

## Upgrade notes (media, sound, trust, SEO)
- **Real photos/video:** drop files in `public/media/` (see its README) and register them in `src/media.js`. Missing files fall back to the animated visuals automatically.
- **Showreel:** a generated LED showreel plays on Home until you set `MEDIA.showreel.src`.
- **Sound:** visitors can opt in via the speaker icon in the header (UI sounds and ambient hum are generated in the browser, nothing autoplays).
- **Trust sections:** testimonials, client logos, certifications and projects appear only when you fill `src/trust.js` with verified details.
- **Legal identity:** fill `LEGAL` in `src/config.js` (legal name, GSTIN, CIN). Legal pages at `/legal/privacy|terms|warranty|cookies` are drafts for a lawyer to review.
- **Enquiries:** set `FORM_ENDPOINT` in `src/config.js` (Formspree etc.) to also receive form submissions automatically.
- **SEO:** set `SITE.url`, then run `npm run sitemap`.
- **Hosting:** `public/_redirects` (Netlify) and `vercel.json` handle the single-page-app fallback.
- **Tools:** `/visualizer`, `/finder`, `/compare`, `/calculator`; press Ctrl/Cmd+K to search.
- **Backgrounds:** `public/media/bg/*.webp` (replaceable with your own photography).
- **Analytics:** set `ANALYTICS.ga4` in `src/config.js`; loads only after consent.

## Additional professional tools
- `/quote-planner`: guided project brief for WhatsApp handoff (not an automatic quote).
- `/glossary`: searchable display-technology glossary.
- `/projects`: owner-data-driven portfolio; real project entries are managed in `src/trust.js` and are not fabricated.
- Product media: add optional `gallery`, `video`, `videoPoster`, `captions`, and `audio` values to a product entry in `src/media.js`.
- Contact: preferred date/time site-visit request, subject to confirmation by the team.
- Review `OWNER_CHECKLIST.md` and `SECURITY_AND_DEPLOYMENT.md` before launch.
