// Website-side helper (SmartTalk backend is NOT modified).
// SmartTalk answers case-study / project questions only when the wording contains its exact category words
// (e.g. "xr/vp", "stage design") or "all projects". This turns natural customer wording into those words.
const MODEL = /\b(?:wa|wv|ws|wm)[a-z0-9.-]*\d[a-z0-9.-]*\b/i
const PAGE = /\bpage\s*\d+/i
const CASE_INTENT = /\b(case\s*stud(?:y|ies)|cases?|projects?|portfolio|clients?|installations?|work\s+done|references?|examples?)\b/i
const CATEGORIES = [
  [/\bxr\b|\bvp\b|virtual\s*production|\bxr\s*vp\b/i, 'xr/vp'],
  [/e-?\s?sports?|gaming/i, 'e-sports'],
  [/culture|tourism|museum/i, 'culture and tourism'],
  [/stage|concert|event/i, 'stage design'],
  [/outdoor|billboard|advertis/i, 'outdoor advertising'],
  [/fine\s*-?pitch/i, 'finepitch'],
  [/indoor|commercial|mall|retail/i, 'indoor commercial'],
  [/creative/i, 'creative led']
]
export function toSmartTalkQuery(raw) {
  const q = String(raw || '').trim()
  if (!q || MODEL.test(q) || PAGE.test(q) || !CASE_INTENT.test(q)) return q
  for (const [re, term] of CATEGORIES) if (re.test(q)) return `${q} ${term} case studies`
  return 'all case studies'
}
