"""Catalog case-study page routing for the image-based Whaley PDF pages 36-54.

These pages are photographic collages. This module returns the original page
render and the printed category/page reference; it deliberately does not guess
client names, locations, or technical specifications from the photographs.
"""
from __future__ import annotations

import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CASE_STUDY_DIR = BASE_DIR / "knowledge_base" / "case_studies"

CASE_STUDIES = [
    {"id": "creative_led", "title": "Classic Cases - Creative LED", "pages": list(range(36, 40)),
     "terms": ("creative led", "creative display")},
    {"id": "finepitch_led", "title": "Classic Cases - FinePitch LED", "pages": [40, 41],
     "terms": ("finepitch", "fine pitch", "fine-pitch")},
    {"id": "indoor_commercial", "title": "Classic Cases - Indoor Commercial LED", "pages": [42, 43],
     "terms": ("indoor commercial", "commercial led")},
    {"id": "outdoor_advertising", "title": "Classic Cases - Outdoor Advertising LED", "pages": [44, 45],
     "terms": ("outdoor advertising", "outdoor ad")},
    {"id": "xr_vp", "title": "Classic Cases - XR/VP", "pages": [46, 47, 48, 49],
     "terms": ("xr/vp", "xr vp", "xrvp", "virtual production")},
    {"id": "culture_tourism", "title": "Classic Cases - Culture and Tourism", "pages": [50, 51],
     "terms": ("culture and tourism", "culture tourism")},
    {"id": "stage_design", "title": "Classic Cases - Stage Design", "pages": [52, 53],
     "terms": ("stage design", "stage")},
    {"id": "esports", "title": "Classic Cases - E-sports", "pages": [54],
     "terms": ("e-sports", "esports", "e sports")},
]

CASE_QUERY_WORDS = ("case", "cases", "case study", "case studies", "project", "projects", "portfolio", "examples")


def answer_case_study(question: str):
    """Return a grounded case-study result, or None when the query is not one."""
    q = re.sub(r"\s+", " ", str(question or "").casefold()).strip()
    if not q:
        return None

    # A model-specific question must continue through the product database.
    if re.search(r"\b(?:wa|wv|ws|wm)[a-z0-9.-]*\d[a-z0-9.-]*\b", q, re.I):
        return None

    page_match = re.search(r"\b(?:pdf\s+)?page\s*(3[6-9]|4[0-9]|5[0-4])\b", q)
    wants_all = any(term in q for term in ("all case", "all projects", "all examples", "complete portfolio"))
    has_case_intent = any(term in q for term in CASE_QUERY_WORDS)
    if not (page_match or wants_all or has_case_intent):
        return None

    selected = []
    if page_match:
        page = int(page_match.group(1))
        selected = [{"id": "page", "title": f"Catalog case-study page {page}", "pages": [page]}]
    elif wants_all:
        selected = CASE_STUDIES
    else:
        for group in CASE_STUDIES:
            if any(term in q for term in group["terms"]):
                selected.append(group)
        # Do not silently choose unrelated categories when the requested label
        # is not one of the printed case-study headings.
        if not selected:
            return None

    images = []
    sources = []
    answer_lines = ["Whaley catalog case studies (photographic examples):"]
    for group in selected:
        pages = group["pages"]
        answer_lines.append(f"\n{group['title']} — PDF pages {pages[0]}" + (f"–{pages[-1]}" if len(pages) > 1 else ""))
        for page in pages:
            image_name = f"page_{page}.jpg"
            if (CASE_STUDY_DIR / image_name).is_file():
                images.append({
                    "model": group["id"],
                    "name": f"{group['title']} — Page {page}",
                    "url": f"/case-studies/{image_name}",
                    "page": page,
                })
                sources.append({"source": "Whaley Company Catalog", "page": page})

    answer_lines.append(
        "\nThese catalog pages show project photographs and category headings. "
        "Individual client names, project locations, and product model/specification "
        "details are not reliably readable from the page text, so SmartTalk AI will "
        "not guess them."
    )
    if not images:
        return None
    return {
        "answer": "\n".join(answer_lines),
        "images": images,
        "sources": sources,
        "response_type": "case_study",
    }
