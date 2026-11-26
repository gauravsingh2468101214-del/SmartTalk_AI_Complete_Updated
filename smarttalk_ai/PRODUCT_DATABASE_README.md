# SmartTalk AI - Product Database + Images (naya)

## Kya naya hai
- `knowledge_base/products.json` : catalog PDF ke **saare 119 models / 25 series** ka structured database (har spec PDF table se automatically nikala hua, haath se type nahi).
- `knowledge_base/product_images/` : har series ki saaf product photo (catalog page se crop), WArt Smart ke 3 models ki alag photo.
- `backend/product_db.py` : search engine (sirf Python standard library, koi naya pip package nahi).
  - Model name se search: `WB2.9`, `wa-s108`, `wv d4`, `WA F02.5` ...
  - Series name se: `wsharp`, `poster screen`, `led film screen`, `wart flex` ...
  - Sawal ke hisaab se jawab: `brightness of WS1.8`, `weight of WA-R2.6`, `compare WS1.5 and WS1.8`, `highest brightness in wvivid d series`
  - Ek naam kai products me ho (jaise `P2.5`, `WB2.9`) to chatbot poochta hai "kaunsa?" - guess nahi karta.
  - Typo par "Did you mean ...", price ka sawal aaye to "catalog me price nahi hai, sales team se baat karein".
- `backend/app.py` : `/chat` ab pehle naya database use karta hai, phir purana code fallback. `/product-images/...` URL se images serve hoti hain.
- Frontend: image par click = full size, source me "Page N" dikhta hai.

## Tests (har product + har image)
    python -m backend.test_catalog_products      # 119 products + 25 series, TEST_REPORT.md banata hai
    python tools/verify_db_against_pdf.py        # DB ki har value PDF page se match karta hai

## Catalog naya ho to
    pip install pdfplumber pillow
    python tools/build_products_db.py            # company_pdfs/ ki PDF se database + images dobara banata hai
(naye label/series aaye to `tools/catalog_config.py` me add karein.)

## Catalog ki apni galtiyan (jaisa PDF me chhapa hai waisa hi rakha, jawab me Note ke saath)
Dekhiye `CATALOG_DATA_ISSUES.md`.
