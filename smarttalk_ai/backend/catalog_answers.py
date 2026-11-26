"""Small, deterministic routes for non-product text sections in the Whaley PDF."""
from __future__ import annotations

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CATALOG_FILE = BASE_DIR / "knowledge_base" / "catalog_text.json"

TOPIC_PAGES = [
    (("website", "phone", "telephone", "email", "headquarters", "address", "contact details"), 1),
    (("company introduction", "whaley brand", "showho", "two brands", "brand portfolio", "company overview"), 2),
    (("milestone", "company history", "founded", "established", "timeline", "history of company"), 3),
    (("competitive advantage", "manufacturing base", "production capacity", "factory", "r&d capacity", "research and development"), 4),
    (("certification", "certifications", "iso9001", "iso14001", "rohs", "product portfolio", "product recognition"), 5),
    (("applications", "application areas", "industries served", "industry applications"), 6),
    (("global layout", "global network", "sales experts", "fae service", "global service network"), 7),
    (("full-chain service", "full chain service", "warranty", "installation service", "maintenance service", "customer service", "service support"), 8),
    (("our clients", "company clients", "client information", "customer brands", "top 500"), 9),
]


def _pages():
    try:
        data = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
        return {int(item.get("page")): item for item in data if isinstance(item, dict) and str(item.get("page", "")).isdigit()}
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return {}


def answer_catalog_page(question: str):
    q = re.sub(r"\s+", " ", str(question or "").casefold()).strip()
    if not q:
        return None

    # Model/series-specific questions belong to the structured product database.
    if re.search(r"\b(?:wa|wv|ws|wm)[a-z0-9.-]*\d[a-z0-9.-]*\b", q, re.I):
        return None

    page_match = re.search(r"\b(?:pdf\s+)?page\s*(\d{1,2})\b", q)
    page_number = int(page_match.group(1)) if page_match else None
    if page_number is None:
        for terms, page in TOPIC_PAGES:
            if any(term in q for term in terms):
                page_number = page
                break
        if page_number is None and q in {"tell me about the company", "company details", "about the company"}:
            page_number = 2

    if page_number is None or page_number > 35 or page_number < 1:
        return None

    page = _pages().get(page_number)
    if not page:
        return None
    content = str(page.get("content", "")).strip()
    if not content:
        return None
    # Keep raw catalog facts, but don't flood the chat with page-layout whitespace.
    lines = [re.sub(r"\s+", " ", line).strip() for line in content.splitlines()]
    clean = "\n".join(line for line in lines if line)
    if len(clean) > 3200:
        clean = clean[:3200].rsplit(" ", 1)[0] + "…"
    source = page.get("source", "Whaley Company Catalog")
    if page_number == 8 and any(term in q for term in ("warranty period", "how long is the warranty", "warranty duration")):
        clean = (
            "The Whaley catalog does not state a fixed warranty duration. "
            "It says free return-to-factory maintenance is provided during the "
            "contract warranty period. Please check the sales contract for the exact duration."
        )
    return {
        "answer": f"{clean}\n\nSource: {source} | Page: {page_number}",
        "sources": [{"source": source, "page": page_number}],
        "images": [],
        "response_type": "catalog_page",
    }
