# -*- coding: utf-8 -*-
"""
Product database engine for SmartTalk AI.

Reads knowledge_base/products.json (built from the catalog PDF by tools/build_products_db.py)
and answers product-name questions with the exact specs printed in the catalog plus the product image.

* Nothing is generated or guessed: every line of an answer is a catalog value.
* Pure standard library (no extra pip packages).
* answer(question) -> dict | None   (None = "not a product-database question", caller may fall back)
"""
from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "knowledge_base" / "products.json"
SOURCE_LABEL = "Company Catalog"

_DB = {"mtime": None, "data": None}


# ----------------------------------------------------------------------------- loading / indexes
def _nk(text: str) -> str:
    """model key: upper-case, only A-Z 0-9 and '.'"""
    return re.sub(r"[^A-Z0-9.]", "", str(text).upper())


def _phrase(text: str) -> str:
    """normalised phrase: lower-case words separated by single spaces ('16:9' stays)"""
    t = re.sub(r"[^a-z0-9:.]+", " ", str(text).lower().replace("-", " "))
    t = re.sub(r"(?<![0-9])\.|\.(?![0-9])", " ", t)
    return " ".join(t.split())


class Index:
    def __init__(self, data: dict):
        self.data = data
        self.products = {p["uid"]: p for p in data["products"]}
        self.series = {s["id"]: s for s in data["series"]}
        self.key_index: dict[str, list[str]] = {}       # model key -> [uid]
        self.phrase_products: list[tuple[str, str]] = []  # (phrase, uid) for multi-word product aliases
        for p in data["products"]:
            for name in [p["id"]] + list(p.get("aliases", [])):
                if " " in name.strip():
                    self.phrase_products.append((_phrase(name), p["uid"]))
                else:
                    self.key_index.setdefault(_nk(name), [])
                    if p["uid"] not in self.key_index[_nk(name)]:
                        self.key_index[_nk(name)].append(p["uid"])
        self.series_phrases: list[tuple[str, str]] = []   # (phrase, series_id)
        for s in data["series"]:
            names = [s["name"]] + list(s["aliases"])
            for n in names:
                self.series_phrases.append((_phrase(n), s["id"]))
        self.group_phrases: list[tuple[str, str]] = []
        for g, phrases in data.get("group_aliases", {}).items():
            for ph in phrases:
                self.group_phrases.append((_phrase(ph), g))
        self.group_members: dict[str, list[str]] = {}
        for s in data["series"]:
            for g in s.get("groups", []):
                self.group_members.setdefault(g, []).append(s["id"])
        # single words usable for typo matching
        self.fuzzy_words = {}
        for ph, sid in self.series_phrases:
            if " " not in ph and len(ph) >= 5:
                self.fuzzy_words[ph] = sid


def get_index() -> Index | None:
    if not DB_FILE.is_file():
        return None
    mtime = DB_FILE.stat().st_mtime
    if _DB["mtime"] != mtime:
        _DB["data"] = Index(json.loads(DB_FILE.read_text(encoding="utf-8")))
        _DB["mtime"] = mtime
    return _DB["data"]


# ----------------------------------------------------------------------------- query understanding
TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:[.\-][A-Za-z0-9]+)*")


def _contains_phrase(qp: str, phrase: str) -> bool:
    return bool(phrase) and f" {phrase} " in f" {qp} "


def find_model_mentions(ix: Index, question: str):
    """-> list of (matched text, [uids]) ; longest n-gram wins, tokens are consumed once"""
    tokens = [(m.group(0), m.start()) for m in TOKEN_RE.finditer(question)]
    used = [False] * len(tokens)
    mentions = []
    for n in (3, 2, 1):
        for i in range(len(tokens) - n + 1):
            if any(used[i:i + n]):
                continue
            joined = "".join(t[0] for t in tokens[i:i + n])
            key = _nk(joined)
            if key in ix.key_index and (n == 1 or re.search(r"\d", key)):
                mentions.append((i, " ".join(t[0] for t in tokens[i:i + n]), list(ix.key_index[key])))
                for k in range(i, i + n):
                    used[k] = True
    qp = _phrase(question)
    for ph, uid in ix.phrase_products:
        if _contains_phrase(qp, ph):
            mentions.append((qp.find(ph), ph, [uid]))
    mentions.sort(key=lambda m: m[0])
    out, seen = [], set()
    for _, text, uids in mentions:
        k = tuple(uids)
        if k not in seen:
            seen.add(k)
            out.append((text, uids))
    return out


def find_series_hits(ix: Index, question: str):
    """-> (series_hits {sid: score}, group_hits {group: score})"""
    qp = _phrase(question)
    s_hits, g_hits = {}, {}
    for ph, sid in ix.series_phrases:
        if _contains_phrase(qp, ph):
            s_hits[sid] = max(s_hits.get(sid, 0), len(ph))
    for ph, g in ix.group_phrases:
        if _contains_phrase(qp, ph):
            g_hits[g] = max(g_hits.get(g, 0), len(ph))
    return s_hits, g_hits


def _fuzzy_series(ix: Index, question: str):
    hits = {}
    for tok in re.findall(r"[a-z0-9]{5,}", question.lower()):
        if tok in ix.fuzzy_words:
            continue
        m = difflib.get_close_matches(tok, list(ix.fuzzy_words), n=1, cutoff=0.84)
        if m:
            hits[ix.fuzzy_words[m[0]]] = m[0]
    return hits


def _suggest_models(ix: Index, question: str):
    """typo help: model-like tokens that match nothing"""
    sugg = []
    keys = list(ix.key_index)
    for m in TOKEN_RE.finditer(question):
        tok = m.group(0)
        if not re.search(r"[A-Za-z]", tok) or not re.search(r"\d", tok) or len(tok) < 3:
            continue
        key = _nk(tok)
        if key in ix.key_index:
            continue
        for k in difflib.get_close_matches(key, keys, n=3, cutoff=0.8):
            for uid in ix.key_index[k]:
                if uid not in sugg:
                    sugg.append(uid)
    return sugg[:4]


FIELD_SYNONYMS = [
    ("Brightness", ["brightness"], r"brightness|\bnits?\b|bright"),
    ("Pixel Pitch", ["pixel_pitch"], r"pixel pitch|\bpitch\b"),
    ("Pixel Density", ["pixel_density"], r"density"),
    ("Weight", ["weight", "cabinet_weight", "panel_weight"], r"weight|\bkg\b"),
    ("Size / Dimensions", ["panel_size", "cabinet_size", "module_size", "display_size", "equipment_size",
                           "overall_size", "diameter", "recommended_space"], r"\bsize\b|dimension|\bsizes\b"),
    ("Resolution", ["resolution", "module_resolution", "cabinet_resolution", "fullscreen_pixels"], r"resolution"),
    ("Refresh Rate", ["refresh_rate"], r"refresh"),
    ("IP Rating / Protection", ["ip_rating"], r"\bip\b|\bip\d|ingress|protection|waterproof|water proof|dust ?proof"),
    ("Power", ["power_consumption", "max_power", "avg_power", "input_power", "power_supply"],
     r"power|watt|consumption|voltage"),
    ("Viewing Distance", ["viewing_distance"], r"viewing distance|view distance|\bdistance\b"),
    ("Viewing Angle", ["viewing_angle"], r"viewing angle|view angle|\bangle\b"),
    ("Lifetime", ["lifetime"], r"life ?time|life span"),
    ("Material", ["cabinet_material"], r"material"),
    ("Contrast Ratio", ["contrast_ratio"], r"contrast"),
    ("Gray Scale", ["gray_scale"], r"gr[ae]y|bit depth"),
    ("Transparency", ["transparency"], r"transparen|transmittance|permeab"),
    ("Temperature", ["operating_temperature", "humidity"], r"temperature|humidity"),
    ("LED Type", ["led_type"], r"led type|\bsmd\b|configuration"),
    ("Driving Mode", ["driving_mode"], r"\bscan\b|\bduty\b|driving|drive mode"),
    ("Receiving Card", ["receiving_card"], r"receiving card|receiver"),
]
PRICE_RE = re.compile(r"\b(price|prices|pricing|cost|how much|quotation|quote|inr|rupees?|rs)\b|₹", re.I)
COMPARE_RE = re.compile(r"\b(compare|comparison|difference|differences|versus|vs|between)\b", re.I)
FEATURE_RE = re.compile(r"\b(features?|benefits?|advantages?|highlights?)\b", re.I)
LIST_RE = re.compile(r"\b(all models|list|available|which models|what models|models|variants|options|sizes available|"
                     r"show me all|how many)\b", re.I)
HIGH_RE = re.compile(r"\b(highest|maximum|max|most|greatest|largest|biggest|brightest|heaviest)\b", re.I)
LOW_RE = re.compile(r"\b(lowest|minimum|min|least|smallest|lightest|finest)\b", re.I)
SERIES_LIST_RE = re.compile(r"\b(all|available|list|show|which|what)\b.*\b(product series|series|categories|"
                            r"products|product range|product list)\b", re.I)


def _detect_fields(question: str, ix=None):
    q = question.lower()
    if ix is not None:               # words that are part of a series name ("small pitch") are not a field request
        qp = " " + _phrase(question) + " "
        for ph in sorted({p for p, _ in ix.series_phrases} | {p for p, _ in ix.group_phrases}, key=len, reverse=True):
            if f" {ph} " in qp:
                qp = qp.replace(f" {ph} ", " ")
        q = qp
    found = []
    for label, keys, rx in FIELD_SYNONYMS:
        if re.search(rx, q):
            found.append((label, keys))
    # "refresh rate" must not trigger nothing else; "viewing distance" should not also be "size" etc. (fine)
    return found


# ----------------------------------------------------------------------------- rendering
def _img(p: dict):
    return {"model": p["id"], "name": p["image_caption"], "url": p["image"], "page": p["page"]}


def _dedupe_images(items):
    seen, out = set(), []
    for it in items:
        if it["url"] not in seen:
            seen.add(it["url"])
            out.append(it)
    return out


def _src(page):
    return [{"source": SOURCE_LABEL, "page": page}]


def _model_quick(ix, uid):
    p = ix.products[uid]
    pitch = p["spec_map"].get("pixel_pitch")
    return f"{p['id']} ({pitch})" if pitch else p["id"]


def _series_features(s, limit=8):
    lines = [f"• {f}" for f in s["features"][:limit]]
    return lines


def render_product(ix, p, with_features=True):
    s = ix.series[p["series_id"]]
    lines = [f"{p['display']}", f"Catalog page {p['page']}", ""]
    for label, value, _ in p["specs"]:
        lines.append(f"{label}: {value}")
    if with_features and s["features"]:
        lines += ["", "Series highlights:"] + _series_features(s)
    for extra in s.get("extra_info", []):
        lines.append(f"• {extra}")
    if p["notes"]:
        lines += [""] + [f"Note: {n}" for n in p["notes"]]
    return "\n".join(lines)


def render_series(ix, s):
    models = [_model_quick(ix, u) for u in s["models"]]
    lines = [f"{s['name']}", f"Catalog page {s['page']} | Category: {s['category']}", ""]
    lines.append(f"Models ({len(models)}): " + ", ".join(models))
    if s["features"]:
        lines += ["", "Highlights:"] + _series_features(s, 10)
    for extra in s.get("extra_info", []):
        lines.append(f"• {extra}")
    if s["notes"]:
        lines += [""] + [f"Note: {n}" for n in s["notes"]]
    lines += ["", f"Ask for any model, e.g. \"{ix.products[s['models'][0]]['id']} details\", for its full specification."]
    return "\n".join(lines)


def render_series_compare(ix, series_list):
    lines = ["Series Comparison", ""]

    for s in series_list:
        models = [_model_quick(ix, uid) for uid in s["models"]]

        lines += [
            f"{s['name']}",
            f"Catalog page: {s['page']} | Category: {s['category']}",
            f"Total models: {len(models)}",
            "Models: " + ", ".join(models),
        ]

        if s.get("features"):
            lines += ["", "Highlights:"]
            lines += _series_features(s, 10)

        if s.get("extra_info"):
            lines += ["", "Additional Information:"]
            lines += [f"• {item}" for item in s["extra_info"]]

        if s.get("notes"):
            lines += ["", "Notes:"]
            lines += [f"• {note}" for note in s["notes"]]

        lines.append("")

    lines.append(
        "This comparison is based on the available company catalog. "
        "It does not rank one series as better."
    )

    return "\n".join(lines).strip()


def render_field(ix, products, field_label, keys):
    lines, found_any = [], False
    for p in products:
        rows = [(l, v) for l, v, k in p["specs"] if k in keys]
        lines.append(p["display"])
        if rows:
            found_any = True
            lines += [f"  {l}: {v}" for l, v in rows]
        else:
            lines.append(f"  {field_label} is not listed in the catalog for this model.")
        lines.append("")
    lines.append(f"Source: catalog page {products[0]['page']}" if len({p['page'] for p in products}) == 1
                 else "Source: catalog pages " + ", ".join(str(x) for x in sorted({p['page'] for p in products})))
    return "\n".join(lines).strip(), found_any


COMPARE_ORDER = ["pixel_pitch", "led_type", "pixel_density", "module_size", "panel_size", "cabinet_size",
                 "display_size", "resolution", "module_resolution", "cabinet_resolution", "cabinet_weight",
                 "panel_weight", "weight", "brightness", "transparency", "refresh_rate", "driving_mode",
                 "gray_scale", "contrast_ratio", "viewing_distance", "viewing_angle", "ip_rating",
                 "power_consumption", "max_power", "avg_power", "lifetime"]


def render_compare(ix, products, only_keys=None):
    lines = ["Comparison: " + " vs ".join(p["id"] for p in products), ""]
    keys = only_keys or COMPARE_ORDER
    shown = False
    for k in keys:
        vals = [(p, p["spec_map"].get(k)) for p in products]
        if not any(v for _, v in vals):
            continue
        label = next((l for p in products for l, _, kk in p["specs"] if kk == k), k)
        shown = True
        lines.append(label)
        for p, v in vals:
            lines.append(f"  • {p['id']}: {v if v else 'not listed'}")
    lines.append("")
    lines.append("Series: " + "; ".join(f"{p['id']} = {p['series_name']} (page {p['page']})" for p in products))
    return "\n".join(lines), shown


def _numbers(value: str):
    return re.findall(r"\d+(?:\.\d+)?", value.replace(",", ""))


def _single_number(value: str):
    v = value.strip()
    nums = _numbers(v)
    if len(nums) != 1:
        return None
    return float(nums[0])


def render_superlative(ix, products, metric_label, keys, high):
    rows, skipped = [], []
    for p in products:
        val = next((v for l, v, k in p["specs"] if k in keys), None)
        if val is None:
            continue
        n = _single_number(val)
        if n is None:
            skipped.append((p, val))
        else:
            rows.append((n, p, val))
    if not rows:
        return None
    target = max(r[0] for r in rows) if high else min(r[0] for r in rows)
    winners = [r for r in rows if r[0] == target]
    word = "Highest" if high else "Lowest"
    lines = [f"{word} {metric_label} among {len(rows)} models with a single catalog value:", ""]
    for _, p, val in winners:
        lines.append(f"• {p['id']} - {val}   ({p['series_name']}, page {p['page']})")
    if skipped:
        lines += ["", f"Not ranked (catalog lists a range or several values): "
                  + ", ".join(f"{p['id']} ({v})" for p, v in skipped[:12])
                  + (" ..." if len(skipped) > 12 else "")]
    return "\n".join(lines)


METRICS = [("Brightness", ["brightness"], r"brightness|brightest|\bnits\b"),
           ("Pixel Pitch", ["pixel_pitch"], r"pixel pitch|pitch|finest"),
           ("Pixel Density", ["pixel_density"], r"density"),
           ("Weight", ["cabinet_weight", "panel_weight", "weight"], r"weight|heaviest|lightest"),
           ("Transparency", ["transparency"], r"transparen|transmittance")]


# ----------------------------------------------------------------------------- main entry
def _result(answer, images, sources, rtype, matched=None):
    return {"answer": answer, "images": _dedupe_images(images), "sources": sources,
            "response_type": rtype, "matched": matched or []}


def _ask_which(ix, text, uids):
    prods = [ix.products[u] for u in uids]
    lines = [f"\"{text}\" is used by more than one product in the catalog:", ""]
    for p in prods:
        lines.append(f"• {p['id']} - {p['series_name']} (page {p['page']})")
    lines += ["", "Please tell me which one you mean, for example by adding the series name "
              f"(e.g. \"{prods[0]['id']} {prods[0]['series_name'].split(' - ')[0].split(' (')[0]}\")."]
    return _result("\n".join(lines), [_img(p) for p in prods], _src(prods[0]["page"]), "product_choice",
                   [p["uid"] for p in prods])


def resolve(question: str):
    """-> dict(kind=..., products=[...], series=[...], ambiguous=[(text, uids)])"""
    ix = get_index()
    if ix is None:
        return None
    mentions = find_model_mentions(ix, question)
    s_hits, g_hits = find_series_hits(ix, question)
    resolved, ambiguous = [], []
    for text, uids in mentions:
        if len(uids) > 1 and s_hits:
            # Prefer the most specific matched series phrase. A broad phrase
            # such as "small pitch" can also occur inside a more specific
            # series name such as "Indoor SMD 16:9 Small Pitch Series".
            best_score = max(s_hits.values())
            best_series = {sid for sid, score in s_hits.items() if score == best_score}
            candidate_series = best_series if len(best_series) == 1 else set(s_hits)
            narrowed = [u for u in uids if ix.products[u]["series_id"] in candidate_series]
            if narrowed:
                uids = narrowed
        if len(uids) == 1:
            if uids[0] not in resolved:
                resolved.append(uids[0])
        else:
            ambiguous.append((text, uids))
    return {"ix": ix, "resolved": resolved, "ambiguous": ambiguous, "s_hits": s_hits, "g_hits": g_hits}


def find_products(question: str):
    """products unambiguously named in the question (used to attach images to other answers)"""
    r = resolve(question)
    if not r:
        return []
    return [r["ix"].products[u] for u in r["resolved"]]


def answer(question: str):
    r = resolve(question)
    if r is None:
        return None
    ix, resolved, ambiguous = r["ix"], r["resolved"], r["ambiguous"]
    s_hits, g_hits = r["s_hits"], r["g_hits"]
    q = question
    fields = _detect_fields(q, ix)
    wants_price = bool(PRICE_RE.search(q))
    price_note = ("\n\nPricing is not listed in the product catalog. I can connect you with our sales team for a "
                  "quotation.") if wants_price else ""

    # ---- Validate requested pitch models against the named series
    pitch_mentions = {
        _nk(m.group(0))
        for m in re.finditer(
            r"(?<![A-Za-z0-9-])P\d+(?:\.\d+)?(?![A-Za-z0-9.])",
            q,
            re.I,
        )
    }

    if pitch_mentions and s_hits:
        best_series_score = max(s_hits.values())
        best_series_ids = [
            sid for sid, score in s_hits.items()
            if score == best_series_score
        ]

        if len(best_series_ids) == 1:
            target_series = ix.series[best_series_ids[0]]

            available_models = {
                _nk(ix.products[uid]["id"])
                for uid in target_series["models"]
            }

            missing_models = sorted(pitch_mentions - available_models)

            if missing_models:
                requested_text = ", ".join(sorted(pitch_mentions))
                missing_text = ", ".join(missing_models)
                available_text = ", ".join(
                    ix.products[uid]["id"]
                    for uid in target_series["models"]
                )

                lines = [
                    f"Requested models: {requested_text}.",
                    f"{missing_text} is not listed in {target_series['name']} in the company catalog.",
                ]

                if COMPARE_RE.search(q):
                    lines.append(
                        "A reliable comparison cannot be provided because "
                        "all requested models are not available in this series."
                    )
                else:
                    lines.append(
                        "I cannot provide specifications for a model "
                        "that is not listed in this series."
                    )

                lines.append(
                    f"Models listed in this series: {available_text}."
                )

                return _result(
                    "\n".join(lines),
                    [],
                    _src(target_series["page"]),
                    "product_not_found_in_series",
                    [target_series["id"]],
                )

    # ---- 1. listing of the whole range
    if not resolved and not ambiguous and not s_hits and not g_hits and SERIES_LIST_RE.search(q):
        by_cat = {}
        for s in ix.data["series"]:
            by_cat.setdefault(s["category"], []).append(s)
        lines = ["Product series in the catalog:", ""]
        for cat, lst in by_cat.items():
            lines.append(f"{cat}")
            for s in lst:
                lines.append(f"  • {s['name']} - {len(s['models'])} models (page {s['page']})")
            lines.append("")
        lines.append("Name any series or model (for example WB2.9, WS1.5 or WV-D4) and I will show its specifications and picture.")
        return _result("\n".join(lines).strip(), [], _src(5), "series_list")

    # ---- 2. several models -> compare (or targeted field for each)
    if len(resolved) >= 2 and not ambiguous:
        prods = [ix.products[u] for u in resolved][:4]
        imgs = [_img(p) for p in prods]
        if COMPARE_RE.search(q) or not fields:
            only = None
            if fields:
                only = [k for _, ks in fields for k in ks]
            text, shown = render_compare(ix, prods, only)
            if shown:
                return _result(text + price_note, imgs, _src(prods[0]["page"]), "product_compare", resolved)
        text, _ = render_field(ix, prods, fields[0][0], [k for _, ks in fields for k in ks])
        return _result(text + price_note, imgs, _src(prods[0]["page"]), "product_field", resolved)

    # ---- 3. one model
    if len(resolved) == 1 and not ambiguous:
        p = ix.products[resolved[0]]
        imgs = [_img(p)]
        wants_images = bool(re.search(r"\b(images?|pictures?|photos?)\b", q, re.I))

        asks_details = bool(
            re.search(r"\b(specifications?|specs?|details|features?|highlights?)\b", q, re.I)
        ) or bool(fields) or bool(COMPARE_RE.search(q))

        if wants_images and not asks_details and not wants_price:
            return _result(p["display"], imgs, _src(p["page"]), "product_images", resolved)

        if FEATURE_RE.search(q) and not fields:
            s = ix.series[p["series_id"]]
            lines = [f"{p['display']} - features (catalog page {p['page']})", ""] + [f"• {f}" for f in s["features"]]
            lines += [f"• {e}" for e in s.get("extra_info", [])]
            return _result("\n".join(lines) + price_note, imgs, _src(p["page"]), "product_features", resolved)
        if fields:
            keys = [k for _, ks in fields for k in ks]
            label = " / ".join(l for l, _ in fields)
            text, found = render_field(ix, [p], label, keys)
            if found:
                return _result(text + price_note, imgs, _src(p["page"]), "product_field", resolved)
            return _result(text + "\n\nHere are all the details that are listed:\n\n" + render_product(ix, p) + price_note,
                           imgs, _src(p["page"]), "product", resolved)
        return _result(render_product(ix, p) + price_note, imgs, _src(p["page"]), "product", resolved)

    # ---- 4. ambiguous model name
    if ambiguous:
        text, uids = ambiguous[0]
        return _ask_which(ix, text, uids)

    # ---- 5. series / group
    series_ids = []
    if s_hits:
        if COMPARE_RE.search(q) and len(s_hits) >= 2:
            # Keep all explicitly matched series for comparison
            series_ids = list(s_hits.keys())
        else:
            best = max(s_hits.values())
            series_ids = [sid for sid, sc in s_hits.items() if sc >= best - 2 or sc >= 8]
            # a longer, more specific alias beats a short generic one
            longest = max(s_hits.values())
            series_ids = [sid for sid, sc in s_hits.items() if sc == longest] or series_ids
    elif g_hits:
        g = max(g_hits, key=g_hits.get)
        series_ids = list(ix.group_members.get(g, []))
    else:
        fz = _fuzzy_series(ix, q)
        if fz:
            series_ids = list(dict.fromkeys(fz))
    if series_ids:
        sers = [ix.series[sid] for sid in series_ids]
        # superlatives inside the series / group
        high, low = bool(HIGH_RE.search(q)), bool(LOW_RE.search(q))
        if high != low:
            for label, keys, rx in METRICS:
                if re.search(rx, q.lower()):
                    prods = [ix.products[u] for s in sers for u in s["models"]]
                    text = render_superlative(ix, prods, label, keys, high)
                    if text:
                        title = " + ".join(s["name"] for s in sers)
                        return _result(f"{title}\n\n{text}", [{"model": s["id"], "name": s["name"], "url": s["image"],
                                                                "page": s["page"]} for s in sers],
                                       _src(sers[0]["page"]), "product_superlative")
        imgs = [{"model": s["id"], "name": s["name"], "url": s["image"], "page": s["page"]} for s in sers]

        if len(sers) >= 2 and COMPARE_RE.search(q):
            comparison_text = render_series_compare(ix, sers)

            comparison_sources = []
            seen_pages = set()

            for s in sers:
                if s["page"] not in seen_pages:
                    comparison_sources.append({
                        "source": SOURCE_LABEL,
                        "page": s["page"]
                    })
                    seen_pages.add(s["page"])

            return _result(
                comparison_text + price_note,
                imgs,
                comparison_sources,
                "series_compare",
                [s["id"] for s in sers]
            )

        if len(sers) == 1:
            s = sers[0]
            if fields and not LIST_RE.search(q):
                prods = [ix.products[u] for u in s["models"]]
                text, found = render_field(ix, prods, fields[0][0], [k for _, ks in fields for k in ks])
                if found:
                    return _result(f"{s['name']}\n\n{text}" + price_note, imgs, _src(s["page"]), "series_field")
            return _result(render_series(ix, s) + price_note, imgs, _src(s["page"]), "series", [s["id"]])
        lines = ["These catalog series match your question:", ""]
        for s in sers:
            lines.append(f"{s['name']} (page {s['page']})")
            lines.append("  Models: " + ", ".join(ix.products[u]["id"] for u in s["models"]))
            lines.append("")
        lines.append("Tell me a model name (for example "
                     f"\"{ix.products[sers[0]['models'][0]]['id']}\") to see its full specification and picture.")
        return _result("\n".join(lines) + price_note, imgs, _src(sers[0]["page"]), "series_group", [s["id"] for s in sers])

    # ---- 6. superlatives across the whole catalog
    high, low = bool(HIGH_RE.search(q)), bool(LOW_RE.search(q))
    if high != low:
        for label, keys, rx in METRICS:
            if re.search(rx, q.lower()):
                text = render_superlative(ix, list(ix.products.values()), label, keys, high)
                if text:
                    return _result("Across the whole catalog:\n\n" + text, [], _src(5), "product_superlative")

    # ---- 7. typo help
    sugg = _suggest_models(ix, q)
    if sugg:
        lines = ["I could not find that exact model in the catalog. Did you mean:", ""]
        for u in sugg:
            p = ix.products[u]
            lines.append(f"• {p['id']} - {p['series_name']} (page {p['page']})")
        return _result("\n".join(lines), [], [], "product_suggest", sugg)

    return None
