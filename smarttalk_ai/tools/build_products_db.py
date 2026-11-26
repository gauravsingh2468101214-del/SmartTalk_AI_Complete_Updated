# -*- coding: utf-8 -*-
"""
Build the structured product database from the company catalog PDF.

    python tools/build_products_db.py            # uses company_pdfs/*.pdf
    python tools/build_products_db.py my.pdf     # or a specific PDF

Outputs (inside knowledge_base/):
    products.json            every series + every model with all specs printed in the catalog
    product_images/*.jpg     one clean product picture per series (cropped from the catalog page)

Needs:  pip install pdfplumber pillow      (pdfplumber brings pypdfium2 for page rendering)
Spec values are NEVER typed by hand: they are read from the PDF tables.
"""
import json
import re
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber
from PIL import Image

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import catalog_config as C  # noqa: E402

KB_DIR = ROOT / "knowledge_base"
IMG_DIR = KB_DIR / "product_images"
OUT_JSON = KB_DIR / "products.json"
IMG_URL_PREFIX = "/product-images/"
DISPLAY_W = 1331.0           # width of the page when the crop boxes in catalog_config were measured
RENDER_DPI = 144             # 2x


# ------------------------------------------------------------------ text cleaning
def _fix_spaces(v: str) -> str:
    v = " ".join(str(v).split())
    # kerning artefacts of the PDF text layer: "4064 06" -> "406406", "1/4 5scan" -> "1/45scan"
    v = re.sub(r"(?<=\d) (?=\d)", "", v)
    v = re.sub(r"(?<=\d/) (?=\d)", "", v)           # "1/ 32 Scan"
    v = re.sub(r"(\bSMD) (?=\d)", r"\1", v) if re.fullmatch(r"SMD \d+( \d+)*", v) else v
    for bad, good in C.VALUE_FIXES.items():
        v = v.replace(bad, good)
    return v


def clean_value(v: str, unit: str) -> str:
    v = " ".join(str(v).split())
    if re.fullmatch(r"\d+\*\d+( \d+\*\d+)+", v):          # two sizes in one cell: "256*256 256*512"
        v = " / ".join(v.split())
    v = _fix_spaces(v)
    # several values in one cell -> separate with " / "
    v = re.sub(r"(Scan|scan)\s+(?=\d)", r"\1 / ", v)
    v = re.sub(r"(pixels)\s+(?=\d)", r"\1 / ", v)
    v = re.sub(r"(SMD\s?\d+)\s+(?=SMD)", r"\1 / ", v)
    v = re.sub(r"\(H\)\s+(?=\d)", "(H) x ", v)
    if re.fullmatch(r"\d+\*\d+( \d+\*\d+)+", v):
        v = " / ".join(v.split())
    if unit and re.fullmatch(r"[\d.,≥>≤<~/\-\s*]+", v):
        v = f"{v} {unit}"
    return v


def clean_label(raw: str):
    base = re.sub(r"\s*#\d+$", "", raw)
    key = re.sub(r"[^a-z]", "", base.lower())
    if key in C.LABELS:
        return C.LABELS[key]
    raise KeyError(f"Unknown table label {raw!r} (key {key!r}) - add it to catalog_config.LABELS")


# ------------------------------------------------------------------ table extraction
def _cell_text(page, c):
    return " ".join((page.crop((c[0] + .5, c[1] + .5, c[2] - .5, c[3] - .5)).extract_text() or "").split())


def _bands(table):
    bands = {}
    for c in table.cells:
        bands.setdefault(round(c[1]), []).append(c)
    return [sorted(bands[k], key=lambda c: c[0]) for k in sorted(bands)]


def parse_table(page, ti, model_regex):
    """-> (ordered model ids, rows[(label, {model: text}, orphan_texts)])"""
    table = page.find_tables()[ti]
    bands = _bands(table)
    head = bands[0]
    label_x1 = head[0][2]
    top = min(c[1] for c in head)
    bottom = max(c[3] for c in head)
    chars = [ch for ch in page.crop((label_x1, top, table.bbox[2], bottom)).chars if ch["text"].strip()]
    chars.sort(key=lambda ch: ch["x0"])
    text = "".join(ch["text"] for ch in chars)
    models = []
    for m in re.finditer(model_regex, text):
        a, b = m.span()
        models.append((m.group(0), (chars[a]["x0"] + chars[b - 1]["x1"]) / 2))
    order = [m[0] for m in models]
    rows = []
    for band in bands[1:]:
        label = _cell_text(page, band[0])
        vals = {mid: "" for mid in order}
        orphan = []
        all_cells = []
        for c in band[1:]:
            txt = _cell_text(page, c)
            hit = [mid for mid, cx in models if c[0] - 1 <= cx <= c[2] + 1]
            all_cells.append(txt)
            if not hit:
                if txt:
                    orphan.append(txt)
                continue
            for mid in hit:
                vals[mid] = txt
        rows.append((label, vals, orphan, all_cells))
    return order, rows


def parse_spherical(page):
    table = page.find_tables()[0]
    bands = _bands(table)
    diam_band = next(b for b in bands if re.search(r"diameter", _cell_text(page, b[0]), re.I))
    cols = [(c[0], c[2], _cell_text(page, c)) for c in diam_band[1:]]
    groups = {"P1.86": cols[:4], "P2.5": cols[4:]}
    rows = {g: [] for g in groups}
    for band in bands:
        label = _cell_text(page, band[0])
        if re.fullmatch(r"(Model|Diameter.*)", label, re.I):
            continue
        per_col = [""] * len(cols)
        for c in band[1:]:
            txt = _cell_text(page, c)
            for i, (x0, x1, _) in enumerate(cols):
                if c[0] - 1 <= (x0 + x1) / 2 <= c[2] + 1:
                    per_col[i] = txt
        for g, gcols in groups.items():
            idx = [cols.index(x) for x in gcols]
            vals = [per_col[i] for i in idx]
            if len(set(vals)) == 1:
                v = vals[0]
            else:
                v = "; ".join(f"Ø{d}mm: {x}" for (_, _, d), x in zip(gcols, vals))
            rows[g].append((label, v))
    return rows


# ------------------------------------------------------------------ images
def render_page(pdf, pn):
    return pdf.pages[pn - 1].to_image(resolution=RENDER_DPI).original.convert("RGB")


def save_crop(img, box, out_path, max_w=1100):
    k = img.width / DISPLAY_W
    x0, y0, x1, y1 = [int(v * k) for v in box]
    c = img.crop((x0, y0, min(x1, img.width), min(y1, img.height)))
    if c.width > max_w:
        c = c.resize((max_w, int(c.height * max_w / c.width)), Image.LANCZOS)
    c.save(out_path, "JPEG", quality=86, optimize=True)


# ------------------------------------------------------------------ main build
def build(pdf_path: Path):
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    pdf = pdfplumber.open(str(pdf_path))
    page_cache = {}

    def page_img(pn):
        if pn not in page_cache:
            page_cache[pn] = render_page(pdf, pn)
        return page_cache[pn]

    series_out, products = [], []

    for s in C.SERIES:
        sid = s["id"]
        # ---- image for the series
        if s.get("crop"):
            pn, box = s["crop"]
            save_crop(page_img(pn), box, IMG_DIR / f"{s['image']}.jpg")
        image_url = f"{IMG_URL_PREFIX}{s['image']}.jpg"

        rows_by_model = {}
        order = []
        raw_notes = {}

        if s["table"] is None:                                   # WArt Smart (no table in PDF)
            for m in C.SMART_MODELS:
                order.append(m["name"])
                rows_by_model[m["name"]] = [
                    ("Display Size", m["size"], "display_size"),
                    ("Recommended Space", m["area"].replace("For space ", "").replace("between ", "").strip()
                     if False else m["area"], "recommended_space"),
                ]
                pn, box = m["crop"]
                save_crop(page_img(pn), box, IMG_DIR / f"{m['name']}.jpg", max_w=800)
        elif s["table"] == "custom_spherical":
            sph = parse_spherical(pdf.pages[s["page"] - 1])
            for model, rows in sph.items():
                order.append(model)
                lst = []
                for label, val in rows:
                    disp, canon, unit = clean_label(label)
                    lst.append((disp, clean_value(val, unit), canon))
                rows_by_model[model] = lst
        else:
            pn, ti, rx = s["table"]
            order, rows = parse_table(pdf.pages[pn - 1], ti, rx)
            for mid in order:
                rows_by_model[mid] = []
            for label, vals, orphan, all_cells in rows:
                disp, canon, unit = clean_label(label)
                if orphan:   # a row whose values do not line up with the model columns -> keep it exactly as printed
                    joined = " / ".join(clean_value(t, unit) for t in all_cells if t)
                    for mid in order:
                        rows_by_model[mid].append((disp, joined, canon))
                    raw_notes[disp] = (f"The catalog prints {len([t for t in all_cells if t])} values for {len(order)} "
                                       f"models in the '{disp}' row; shown exactly as printed.")
                    continue
                for mid in order:
                    val = clean_value(vals[mid], unit)
                    d2, c2 = disp, canon
                    if canon == "gray_scale" and re.search(r"[Aa]lumin", val):   # catalog typo: material row labelled 'Grey Level'
                        d2, c2 = "Cabinet Material", "cabinet_material"
                    rows_by_model[mid].append((d2, val, c2))

        series_note_list = []
        if (sid, None) in C.NOTES:
            series_note_list.append(C.NOTES[(sid, None)])
        series_note_list += list(raw_notes.values())

        uids = []
        for mid in order:
            uid = f"{sid}:{mid}"
            uids.append(uid)
            specs = [[d, v, k] for d, v, k in rows_by_model[mid] if v != ""]
            spec_map = {}
            for d, v, k in specs:
                spec_map.setdefault(k, v)
            img = image_url
            captions = f"{mid} - {s['name']}"
            if sid == "smart":
                img = f"{IMG_URL_PREFIX}{mid}.jpg"
            notes = []
            if (sid, mid) in C.NOTES:
                notes.append(C.NOTES[(sid, mid)])
            notes += series_note_list
            aliases = list(C.MODEL_ALIASES.get((sid, mid), []))
            products.append({
                "uid": uid,
                "id": mid,
                "series_id": sid,
                "series_name": s["name"],
                "category": s["category"],
                "page": s["page"],
                "display": f"{mid} ({s['name']})",
                "aliases": aliases,
                "specs": specs,
                "spec_map": spec_map,
                "image": img,
                "image_caption": captions,
                "notes": notes,
            })

        series_out.append({
            "id": sid,
            "name": s["name"],
            "category": s["category"],
            "family": s.get("family", ""),
            "page": s["page"],
            "aliases": s["aliases"],
            "groups": s.get("groups", []),
            "features": s["features"],
            "extra_info": s.get("extra_info", []),
            "image": image_url,
            "models": uids,
            "notes": series_note_list,
        })

    data = {
        "meta": {
            "source_pdf": pdf_path.name,
            "pdf_pages": len(pdf.pages),
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "series_count": len(series_out),
            "product_count": len(products),
        },
        "group_aliases": C.GROUP_ALIASES,
        "series": series_out,
        "products": products,
    }
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK  {len(series_out)} series, {len(products)} products -> {OUT_JSON}")
    print(f"    images in {IMG_DIR} ({len(list(IMG_DIR.glob('*.jpg')))} files)")
    return data


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file = Path(sys.argv[1])
    else:
        found = sorted((ROOT / "company_pdfs").glob("*.pdf"))
        if not found:
            sys.exit("No PDF found in company_pdfs/")
        pdf_file = found[0]
    build(pdf_file)
