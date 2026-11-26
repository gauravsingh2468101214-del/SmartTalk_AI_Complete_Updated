
import json
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
JSON_FILE = BASE_DIR / "knowledge_base" / "catalog_text.json"


STOP_WORDS = {
    "what", "is", "the", "for", "and", "are", "a", "an",
    "product", "details", "about", "tell", "me", "please",
    "show", "give", "information", "of", "to", "in", "on",
    "which", "has", "have", "with", "from", "compare",
    "available", "model", "models", "can", "you", "does",
    "do", "this", "that", "its", "it", "list", "all",
    "complete", "specifications", "specification"
}


MODEL_PATTERN = re.compile(
    r"\b(?:WA|WV|WS|WM)[A-Z0-9.-]*\d[A-Z0-9.-]*\b",
    re.IGNORECASE
)

CATALOG_MODEL_PATTERN = re.compile(
    r"\b[A-Z]{2,}[A-Z0-9]*-[A-Z0-9]+(?:[.-][A-Z0-9]+)*\b",
    re.IGNORECASE
)


SERIES_TERMS = [
    "WART SMART",
    "WART FLOOR",
    "WART ROLL",
    "WART FLEX",
    "WVIVID",
    "WSHARP",
    "WM SERIES",
    "COB FINE PITCH"
]


def extract_model_codes(text):
    codes = set(MODEL_PATTERN.findall(str(text)))
    codes.update(CATALOG_MODEL_PATTERN.findall(str(text)))
    return {code.upper() for code in codes}


def tokenize(text):
    words = re.findall(r"[a-zA-Z0-9.]+", str(text))

    return [
        word.lower()
        for word in words
        if len(word) > 1 and word.lower() not in STOP_WORDS
    ]


def load_pages():

    if not JSON_FILE.exists():
        print(f"Catalog file not found: {JSON_FILE}")
        return []

    try:
        with open(JSON_FILE, "r", encoding="utf-8") as file:
            pages = json.load(file)

        if not isinstance(pages, list):
            print("Invalid catalog format. Expected a list.")
            return []

        return pages

    except (json.JSONDecodeError, OSError) as error:
        print("Catalog loading error:", error)
        return []


def search_products(question: str, limit=5):

    if not isinstance(question, str) or not question.strip():
        return []

    pages = load_pages()

    if not pages:
        return []

    question_upper = question.upper()
    question_tokens = set(tokenize(question))
    model_codes = extract_model_codes(question)

    list_keywords = [
        "AVAILABLE",
        "ALL MODELS",
        "PRODUCT MODELS",
        "MODEL LIST",
        "LIST MODELS",
        "SHOW MODELS",
        "PRODUCT LIST"
    ]

    is_model_list_request = any(
        keyword in question_upper
        for keyword in list_keywords
    )

    ranked_results = []

    for page in pages:

        if not isinstance(page, dict):
            continue

        content = str(page.get("content", "")).strip()

        if not content:
            continue

        content_lower = content.lower()
        content_upper = content.upper()
        page_models = extract_model_codes(content)

        # Exact model matching is compulsory when a model code is asked.
        if model_codes:

            matched_codes = model_codes.intersection(page_models)

            if not matched_codes:
                continue

            score = 100 + (30 * len(matched_codes))

        else:
            score = 0

            if is_model_list_request:
                if not page_models:
                    continue

                score += len(page_models) * 5

            matched_words = {
                word
                for word in question_tokens
                if word in content_lower
            }

            score += len(matched_words)

            for series in SERIES_TERMS:
                if (
                    series in question_upper
                    and series in content_upper
                ):
                    score += 8

        if score > 0:
            ranked_results.append({
                "content": content,
                "source": page.get(
                    "source",
                    "Company Catalog"
                ),
                "page": page.get("page", "Unknown"),
                "score": score
            })

    ranked_results.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    final_results = []
    seen_content = set()

    if is_model_list_request:
        limit = max(limit, 20)

    for item in ranked_results:

        content_key = item["content"].casefold()

        if content_key in seen_content:
            continue

        seen_content.add(content_key)

        final_results.append({
            "content": item["content"],
            "source": item["source"],
            "page": item["page"]
        })

        if len(final_results) >= limit:
            break

    return final_results
