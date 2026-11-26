import sys, os, json, re
sys.path.insert(0,'.')
import backend.app as a
KB='knowledge_base'
MAP={'/product-images/':'product_images','/images/':'images','/case-studies/':'case_studies'}
def disk(u):
    for pre,dn in MAP.items():
        if u.startswith(pre): return os.path.join(KB,dn,u[len(pre):])
# Python port of website/src/smarttalkQuery.js: the website widget rewrites natural wording
# into SmartTalk's category words BEFORE sending, so the test must send the same text.
_MODEL=re.compile(r"\b(?:wa|wv|ws|wm)[a-z0-9.-]*\d[a-z0-9.-]*\b",re.I)
_PAGE=re.compile(r"\bpage\s*\d+",re.I)
_CASE=re.compile(r"\b(case\s*stud(?:y|ies)|cases?|projects?|portfolio|clients?|installations?|work\s+done|references?|examples?)\b",re.I)
_CATS=[(r"\bxr\b|\bvp\b|virtual\s*production|\bxr\s*vp\b","xr/vp"),(r"e-?\s?sports?|gaming","e-sports"),
 (r"culture|tourism|museum","culture and tourism"),(r"stage|concert|event","stage design"),
 (r"outdoor|billboard|advertis","outdoor advertising"),(r"fine\s*-?pitch","finepitch"),
 (r"indoor|commercial|mall|retail","indoor commercial"),(r"creative","creative led")]
def to_query(raw):
    q=str(raw or "").strip()
    if not q or _MODEL.search(q) or _PAGE.search(q) or not _CASE.search(q): return q
    for pat,term in _CATS:
        if re.search(pat,q,re.I): return f"{q} {term} case studies"
    return "all case studies"
def ask(q): return a.chat(a.ChatRequest(question=to_query(q)))
def imgs_ok(r):
    miss=[i['url'] for i in r.get('images',[]) if not (disk(i['url']) and os.path.isfile(disk(i['url'])))]
    return miss
d=json.load(open(KB+'/products.json'))
from collections import Counter
cnt=Counter(p['id'] for p in d['products'])
fails=[]; total=0
def check(name, cond, info=""):
    global total; total+=1
    if not cond: fails.append((name,info))

# 1. every model, exact spec values present in answer
for p in d['products']:
    q = f"Show {p['id']} product details" if cnt[p['id']]==1 else f"Show {p['id']} {p['series_name']} details"
    r=ask(q); ans=r['answer']
    check(f"model {p['id']} type", r['response_type']=='product', r['response_type'])
    check(f"model {p['id']} name", p['id'] in ans)
    check(f"model {p['id']} image exists", bool(r.get('images')) and not imgs_ok(r), str(imgs_ok(r)))
    # every spec value must appear (normalised)
    norm=lambda s: re.sub(r'\s+','',str(s)).lower()
    na=norm(ans)
    missing=[k for k,v in p['spec_map'].items() if norm(v) not in na]
    check(f"model {p['id']} specs", not missing, f"{p['series_name']} missing {missing[:3]}")
# 2. each series
for s in d['series']:
    r=ask(f"Show {s['name']} models")
    check(f"series {s['name']}", r['response_type']!='not_found' and bool(r['answer']), r['response_type'])
    check(f"series img {s['name']}", not imgs_ok(r) and bool(r.get('images')), str(imgs_ok(r)))
# 3. compare, case-study, page, project names, unknown, greeting
for q,exp in [("Compare WA-S108 and WA-S135",None),("Show me case studies","case_study"),("XR project examples","case_study"),
              ("stage design projects","case_study"),("e-sports case study","case_study"),("outdoor advertising projects","case_study"),
              ("show page 40","case_study"),("company profile","catalog_page"),("which projects have you done?",None),
              ("hello","greeting"),("tell me about WZZ-999","not_found"),("what is pixel pitch","")]:
    r=ask(q)
    print(f"[{r.get('response_type')}] {q!r} -> {r['answer'][:110]!r} imgs={len(r.get('images',[]))}")
    check(f"extra {q}", bool(r['answer']) and not imgs_ok(r))
    if exp: check(f"extra type {q}", r['response_type']==exp or (exp=='catalog_page' and r['response_type'].startswith('catalog')), r['response_type'])
print("\nTOTAL CHECKS:",total,"FAILED:",len(fails))
for f in fails[:40]: print(" FAIL",f)
