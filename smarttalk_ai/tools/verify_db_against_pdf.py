# -*- coding: utf-8 -*-
"""Independent check: every value stored in products.json must be present on its catalog page.
(value tokens are compared with the page text after removing all whitespace)"""
import json, re, sys, warnings
from pathlib import Path
import pdfplumber
warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parent.parent
pdf_path = sorted((ROOT / "company_pdfs").glob("*.pdf"))[0]
db = json.loads((ROOT / "knowledge_base" / "products.json").read_text(encoding="utf-8"))
pdf = pdfplumber.open(str(pdf_path))
page_text = {}
def norm(t): return re.sub(r"\s+", "", t).lower().replace("＊", "*")
APPENDED = {"mm","nits","pixels","hz","kg","bit","m","hours","scan","w/m²","pixels/m²","w/set","kg/set","kg/m²","cd/m²"}
bad = 0; checked = 0
for p in db["products"]:
    pn = p["page"]
    if pn not in page_text:
        page_text[pn] = norm(pdf.pages[pn-1].extract_text() or "")
    txt = page_text[pn]
    if norm(p["id"]) not in txt and not any(norm(a) in txt for a in p["aliases"]):
        print("MODEL NOT ON PAGE", p["uid"]); bad += 1
    for label, value, _ in p["specs"]:
        for tok in re.split(r"\s*(?:/|;|,)\s*|\s+", value):
            t = norm(tok)
            if not t or t in APPENDED or t in ("ø","x"): continue
            t = re.sub(r"^ø\d+mm:", "", t)
            if t.startswith("ø"): continue
            checked += 1
            if t not in txt:
                # tolerate units appended by the builder
                t2 = re.sub(r"(pixels/m²|pixels|kg/set|kg/m²|w/set|w/m²|cd/m²|hours|nits|scan|bit|hz|mm|kg|m)$", "", t)
                if t2 and t2 in txt: continue
                print(f"VALUE NOT FOUND on page {pn}: {p['uid']} | {label}: {value!r} (token {tok!r})"); bad += 1
print(f"checked {checked} value tokens of {len(db['products'])} products -> {bad} problems")
