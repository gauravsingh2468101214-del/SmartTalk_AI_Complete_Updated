
import fitz
import json
from pathlib import Path

# Project folders ka path
BASE_DIR = Path(__file__).resolve().parent.parent
PDF_FOLDER = BASE_DIR / "company_pdfs"
OUTPUT_FOLDER = BASE_DIR / "knowledge_base"

def extract_catalog():
    OUTPUT_FOLDER.mkdir(exist_ok=True)

    pdf_files = list(PDF_FOLDER.glob("*.pdf"))

    if not pdf_files:
        raise FileNotFoundError(
            "company_pdfs folder mein koi PDF nahi mili."
        )

    all_pages = []

    for pdf_file in pdf_files:
        print(f"Reading: {pdf_file.name}")

        document = fitz.open(pdf_file)

        for page_number, page in enumerate(document, start=1):
            text = page.get_text("text")

            if text.strip():
                all_pages.append({
                    "source": pdf_file.name,
                    "page": page_number,
                    "content": text
                })

        document.close()

    output_file = OUTPUT_FOLDER / "catalog_text.json"

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(all_pages, file, ensure_ascii=False, indent=4)

    print(f"Total pages extracted: {len(all_pages)}")
    print(f"Saved to: {output_file}")

    return all_pages
