# -*- coding: utf-8 -*-
"""
Tests EVERY product and EVERY product image of the catalog database.

Run from the project root:
    python -m backend.test_catalog_products            # prints one line per product, writes TEST_REPORT.md
    python -m pytest backend/test_catalog_products.py  # (optional) also works with pytest

What is checked for each of the products:
  1. searching the printed model name (several spellings) returns that exact product
  2. the answer contains EVERY spec value stored for that product
  3. the answer carries the product picture, the file exists, opens, and is not blank
  4. page number / source is returned
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageStat

from backend import product_db as P

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "knowledge_base" / "product_images"
REPORT = ROOT / "TEST_REPORT.md"


def _ix():
    ix = P.get_index()
    assert ix is not None, "knowledge_base/products.json not found - run tools/build_products_db.py"
    return ix


def _image_ok(url: str):
    """-> (ok, message)"""
    name = url.rsplit("/", 1)[-1]
    path = IMG_DIR / name
    if not path.is_file():
        return False, f"image file missing: {name}"
    try:
        with Image.open(path) as im:
            im = im.convert("RGB")
            w, h = im.size
            if w < 250 or h < 120:
                return False, f"image too small {w}x{h}"
            stat = ImageStat.Stat(im.resize((64, 64)))
            if max(stat.stddev) < 6:
                return False, "image looks blank"
    except Exception as exc:  # pragma: no cover
        return False, f"image cannot be opened: {exc}"
    return True, f"{w}x{h}"


def _spelling_variants(pid: str):
    v = [pid, pid.lower(), f"show me {pid} details", f"{pid} specifications", f"tell me about {pid}"]
    if "-" in pid:
        v += [pid.replace("-", ""), pid.replace("-", " ")]
    return v


def _series_words(series):
    return series["aliases"][0]


def check_product(ix, p):
    """returns list of problems (empty = PASS)"""
    problems = []
    series = ix.series[p["series_id"]]
    same_id = ix.key_index.get(P._nk(p["id"]), [])
    ambiguous = len(same_id) > 1

    for q in _spelling_variants(p["id"]):
        if ambiguous:
            q = f"{q} {_series_words(series)}"
        res = P.answer(q)
        if not res:
            problems.append(f"no answer for {q!r}")
            continue
        if res["response_type"] != "product" or res["matched"] != [p["uid"]]:
            problems.append(f"{q!r} -> {res['response_type']} {res['matched']}")
            continue
        text = res["answer"]
        for label, value, _ in p["specs"]:
            if f"{label}: {value}" not in text:
                problems.append(f"{q!r}: spec missing '{label}: {value}'")
        if not res["images"] or res["images"][0]["url"] != p["image"]:
            problems.append(f"{q!r}: wrong/missing image {res['images']}")
        if not res["sources"] or res["sources"][0]["page"] != p["page"]:
            problems.append(f"{q!r}: wrong page in sources")
        if f"Catalog page {p['page']}" not in text:
            problems.append(f"{q!r}: page not in answer")
    if ambiguous:                                    # the bare name must ask which one
        res = P.answer(p["id"])
        if res["response_type"] != "product_choice" or p["uid"] not in res["matched"]:
            problems.append("ambiguous model name did not ask which product")
    ok, msg = _image_ok(p["image"])
    if not ok:
        problems.append(msg)
    return problems


# --------------------------------------------------------------------------- pytest-style tests
def test_counts():
    ix = _ix()
    assert len(ix.data["products"]) >= 119
    assert len(ix.data["series"]) >= 25


def test_every_product_and_image():
    ix = _ix()
    failures = {p["uid"]: check_product(ix, p) for p in ix.data["products"]}
    failures = {k: v for k, v in failures.items() if v}
    assert not failures, failures


def test_every_series():
    ix = _ix()
    for s in ix.data["series"]:
        res = P.answer(s["aliases"][0])
        assert res is not None, s["id"]
        assert res["images"], s["id"]
        ok, msg = _image_ok(res["images"][0]["url"])
        assert ok, (s["id"], msg)
        shown = [x for x in res["matched"]] or []
        # the models of every matched series must all be listed in the answer
        for sid in (res["matched"] or [s["id"]]):
            if sid in ix.series:
                for uid in ix.series[sid]["models"]:
                    assert ix.products[uid]["id"] in res["answer"], (s["id"], uid)


def test_field_questions():
    r = P.answer("what is the brightness of WS1.8")
    assert r["response_type"] == "product_field" and "800" in r["answer"] and "nits" in r["answer"]
    r = P.answer("weight of WA-R2.6")
    assert "10 kg" in r["answer"]
    r = P.answer("refresh rate of wv-d4")
    assert "3840-7680" in r["answer"]


def test_compare_and_price_and_unknown():
    r = P.answer("compare WS1.5 and WS1.8")
    assert r["response_type"] == "product_compare" and "WS1.5" in r["answer"] and "WS1.8" in r["answer"]
    r = P.answer("price of WS1.5")
    assert "Pricing is not listed" in r["answer"]
    assert P.answer("what is your phone number") is None
    assert P.answer("hello") is None
    r = P.answer("WS1.55")
    assert r["response_type"] == "product_suggest"


def test_ambiguous_names():
    r = P.answer("P2.5")
    assert r["response_type"] == "product_choice" and len(r["matched"]) >= 3
    r = P.answer("WB2.9")
    assert r["response_type"] == "product_choice" and len(r["matched"]) == 2


# --------------------------------------------------------------------------- report runner
def main():
    ix = _ix()
    rows, bad = [], 0
    print(f"Testing {len(ix.data['products'])} products / {len(ix.data['series'])} series ...\n")
    for p in ix.data["products"]:
        problems = check_product(ix, p)
        ok, msg = _image_ok(p["image"])
        status = "PASS" if not problems else "FAIL"
        bad += bool(problems)
        print(f"[{status}] {p['uid']:38} page {p['page']:>2}  specs={len(p['specs']):>2}  image={p['image'].rsplit('/',1)[-1]} ({msg})")
        for pr in problems:
            print("        -", pr)
        rows.append((p, status, msg))
    series_bad = 0
    for s in ix.data["series"]:
        res = P.answer(s["aliases"][0])
        ok = bool(res and res["images"] and _image_ok(res["images"][0]["url"])[0])
        series_bad += (not ok)
        print(f"[{'PASS' if ok else 'FAIL'}] series  {s['id']}")
    lines = ["# Product & image test report", "",
             f"Products tested: {len(rows)}  |  failed: {bad}", f"Series tested: {len(ix.data['series'])}  |  failed: {series_bad}", "",
             "| # | Model | Series | Catalog page | Specs | Image file | Image size | Result |", "|---|---|---|---|---|---|---|---|"]
    for i, (p, st, msg) in enumerate(rows, 1):
        lines.append(f"| {i} | {p['id']} | {p['series_name']} | {p['page']} | {len(p['specs'])} | "
                     f"{p['image'].rsplit('/',1)[-1]} | {msg} | {st} |")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nTOTAL: {len(rows) - bad}/{len(rows)} products passed, {len(ix.data['series']) - series_bad}/{len(ix.data['series'])} series passed")
    print(f"Report written to {REPORT}")
    return 1 if (bad or series_bad) else 0


if __name__ == "__main__":
    sys.exit(main())
