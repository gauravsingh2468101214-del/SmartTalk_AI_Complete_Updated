// ---- EDIT THESE: contact details live here (taken from smartchiptree.com) ----
export const COMPANY = {
  name: 'KalpLabs',
  whatsapp: '919560966088',      // digits with country code
  mobile: '+91 95609 66088',
  mobileHref: '+919560966088',
  email: 'support@smartchiptree.com',
  linkedin: 'https://www.linkedin.com/in/smart-chip-tree-llp-instant-identity-issuance-solutions-665782a/',
  indiamart: 'https://www.indiamart.com/smartchip-tree/'
}

// Offices. lat/lon are only used to place the dots on the India LED map.
export const OFFICES = [
  { city: 'Delhi', tag: 'Head office', lat: 28.63, lon: 77.24, address: '403, Pratap Bhawan, ITO Bahadur Shah Zafar Marg, Delhi 110002' },
  { city: 'Noida', tag: 'NCR office', lat: 28.62, lon: 77.38, address: 'SH-007, Ground Floor, Sector 63, Noida 201309' },
  { city: 'Pune', tag: 'West', lat: 18.52, lon: 73.86, address: '4/495, Shaniwar Peth, Bajirao Road, Mantri Heights, Near Hotel Basera, Pune' },
  { city: 'Bengaluru', tag: 'South', lat: 12.85, lon: 77.66, address: '405, 4th Floor, 170 & 171, Green House Layout, Doddathogur Main Road, Electronic City, Bengaluru 560100, Karnataka' }
]
export const HQ = OFFICES[0]

export const mapEmbed = address => `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`

export const waLink = (text = 'Hello KalpLabs, I would like to enquire about LED/LCD displays.') =>
  `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(text)}`

// ======================= UPGRADE ADDITIONS (original values above are untouched) =======================
// TODO (owner): the email, LinkedIn and IndiaMART links above belong to "Smart Chip Tree LLP".
// Replace them with KalpLabs' own business email and profiles so the brand is consistent.

// Your live website address, e.g. 'https://www.kalplabs.in'. Needed for canonical links, social previews and the sitemap.
export const SITE = { url: '' }

// Paste a Formspree / EmailJS-compatible endpoint (e.g. 'https://formspree.io/f/xxxx') to ALSO receive enquiries automatically.
// WhatsApp and email buttons keep working either way.
export const FORM_ENDPOINT = ''

// Legal identity shown in the footer and legal pages. Leave a value '' to hide it. Fill ONLY verified details.
export const LEGAL = { legalName: '', gstin: '', cin: '', registeredAddress: '', hours: '' }

// Optional Google Analytics 4 measurement ID (e.g. 'G-XXXXXXXXXX'). Loads only after the visitor accepts the cookie banner. '' = off.
export const ANALYTICS = { ga4: '' }

// ======================= SMARTTALK AI CHATBOT =======================
// Address of the running SmartTalk AI backend (the unchanged SmartTalk_AI_Project folder).
// Set VITE_SMARTTALK_API_URL in Vercel/.env (e.g. https://chat.kalplabs.in). Must be https:// on a live https website.
export const SMARTTALK = {
  apiUrl: (import.meta.env.VITE_SMARTTALK_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
  name: 'SmartTalk AI',
  quickQuestions: [
    'Show me available product models',
    'Show all case studies',
    'Show WA-S108 product details',
    'Compare WA-S108 and WA-S135'
  ]
}
