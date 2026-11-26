

from pathlib import Path
import json
import re
import os
import shutil
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from backend.product_search import search_products
from backend.media import router as media_router
from backend import product_db
from backend.case_studies import answer_case_study
from backend.catalog_answers import answer_catalog_page
from backend import integrations
from backend.general_knowledge import answer_general_display_question, answer_general_product_type_question, catalog_answer_covers_product_type


# =====================================================
# APP CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
FRONTEND_DIR = BASE_DIR / "frontend"
IMAGE_DIR = BASE_DIR / "knowledge_base" / "images"
IMAGE_MAP_FILE = BASE_DIR / "knowledge_base" / "product_image_map.json"
PRODUCT_IMAGE_DIR = BASE_DIR / "knowledge_base" / "product_images"
CASE_STUDY_DIR = BASE_DIR / "knowledge_base" / "case_studies"

app = FastAPI(
    title="SmartTalk AI",
    description="Company Product Catalog Assistant"
)

app.include_router(media_router)

if FRONTEND_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if IMAGE_DIR.is_dir():
    app.mount(
        "/images",
        StaticFiles(directory=str(IMAGE_DIR)),
        name="product_images"
    )


# Clean per-series / per-model product pictures built from the catalog PDF
if PRODUCT_IMAGE_DIR.is_dir():
    app.mount(
        "/product-images",
        StaticFiles(directory=str(PRODUCT_IMAGE_DIR)),
        name="catalog_product_images"
    )

# Original catalog case-study pages (PDF pages 36-54), rendered as viewable images.
if CASE_STUDY_DIR.is_dir():
    app.mount(
        "/case-studies",
        StaticFiles(directory=str(CASE_STUDY_DIR)),
        name="catalog_case_studies"
    )


class ChatRequest(BaseModel):
    question: str


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=500)


# =====================================================
# PRODUCT IMAGE MAPPING
# =====================================================

def load_product_image_map():
    if not IMAGE_MAP_FILE.is_file():
        return {}

    try:
        with open(IMAGE_MAP_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        return data if isinstance(data, dict) else {}

    except (OSError, json.JSONDecodeError) as error:
        print("Image map loading error:", error)
        return {}


PRODUCT_IMAGE_MAP = load_product_image_map()


# =====================================================
# PRODUCT DATABASE
# =====================================================

WART_SMART_MODELS = {
    "WA-S108": {
        "display_size": "108-inch",
        "area": "30–50 m²"
    },
    "WA-S135": {
        "display_size": "135-inch",
        "area": "50–80 m²"
    },
    "WA-S163": {
        "display_size": "162-inch",
        "area": "More than 80 m²"
    },
}

WART_FLOOR_MODELS = {
    "WA-F1.9": {"pixel_pitch": "1.953 mm"},
    "WA-F2.5": {"pixel_pitch": "2.5 mm"},
    "WA-F2.6": {"pixel_pitch": "2.604 mm"},
    "WA-F2.9": {"pixel_pitch": "2.976 mm"},
    "WA-F3.9": {"pixel_pitch": "3.91 mm"},
    "WA-F4.8": {"pixel_pitch": "4.81 mm"},
    "WA-F5.2": {"pixel_pitch": "5.2 mm"},
    "WA-F6.2": {"pixel_pitch": "6.25 mm"},
    "WA-F7.8": {"pixel_pitch": "7.8125 mm"},
}

WART_ROLL_MODELS = {
    "WA-R0.7": {
        "pixel_pitch": "0.78 mm",
        "density": "1,638,400 pixels/m²",
        "resolution": "640 x 80 pixels",
        "cabinet_resolution": "640 x 1280 pixels",
        "brightness": "400 nits",
        "scan": "1/80 scan",
    },
    "WA-R0.9": {
        "pixel_pitch": "0.976 mm",
        "density": "1,149,184 pixels/m²",
        "resolution": "512 x 64 pixels",
        "cabinet_resolution": "512 x 1024 pixels",
        "brightness": "400 nits",
        "scan": "1/64 scan",
    },
    "WA-R1.2": {
        "pixel_pitch": "1.25 mm",
        "density": "640,000 pixels/m²",
        "resolution": "400 x 50 pixels",
        "cabinet_resolution": "400 x 800 pixels",
        "brightness": "400 nits",
        "scan": "1/50 scan",
    },
    "WA-R1.5": {
        "pixel_pitch": "1.56 mm",
        "density": "409,600 pixels/m²",
        "resolution": "320 x 40 pixels",
        "cabinet_resolution": "320 x 640 pixels",
        "brightness": "600 nits",
        "scan": "1/40 scan",
    },
    "WA-R1.9": {
        "pixel_pitch": "1.95 mm",
        "density": "262,144 pixels/m²",
        "resolution": "256 x 32 pixels",
        "cabinet_resolution": "256 x 512 pixels",
        "brightness": "600 nits",
        "scan": "1/32 scan",
    },
    "WA-R2.6": {
        "pixel_pitch": "2.6 mm",
        "density": "147,456 pixels/m²",
        "resolution": "192 x 24 pixels",
        "cabinet_resolution": "192 x 384 pixels",
        "brightness": "600 nits",
        "scan": "1/24 scan",
    },
    "WA-R3.9": {
        "pixel_pitch": "3.91 mm",
        "density": "65,536 pixels/m²",
        "resolution": "128 x 16 pixels",
        "cabinet_resolution": "128 x 256 pixels",
        "brightness": "600 nits",
        "scan": "1/16 scan",
    },
}

WART_FLEX_INDOOR = {
    "WA-FI1.2": {
        "pixel_pitch": "1.25 mm",
        "configuration": "SMD 1010",
        "density": "640,000 pixels/m²",
        "resolution": "256 x 128 pixels",
        "scan": "1/64 scan",
    },
    "WA-FI1.5": {
        "pixel_pitch": "1.538 mm",
        "configuration": "SMD 1212",
        "density": "422,500 pixels/m²",
        "resolution": "208 x 104 pixels",
        "scan": "1/52 scan",
    },
    "WA-FI1.8": {
        "pixel_pitch": "1.86 mm",
        "configuration": "SMD 1515",
        "density": "288,906 pixels/m²",
        "resolution": "172 x 86 pixels",
        "scan": "1/43 scan",
    },
    "WA-FI2.0": {
        "pixel_pitch": "2 mm",
        "configuration": "SMD 1515",
        "density": "250,000 pixels/m²",
        "resolution": "160 x 80 pixels",
        "scan": "1/40 scan",
    },
    "WA-FI2.5": {
        "pixel_pitch": "2.5 mm",
        "configuration": "SMD 2020",
        "density": "160,000 pixels/m²",
        "resolution": "128 x 64 pixels",
        "scan": "1/32 scan",
    },
    "WA-FI3.0": {
        "pixel_pitch": "3.076 mm",
        "configuration": "SMD 2020",
        "density": "105,625 pixels/m²",
        "resolution": "104 x 52 pixels",
        "scan": "1/26 scan",
    },
    "WA-FI4": {
        "pixel_pitch": "4 mm",
        "configuration": "SMD 2020",
        "density": "62,500 pixels/m²",
        "resolution": "80 x 40 pixels",
        "scan": "1/20 scan",
    },
    "WA-FI5": {
        "pixel_pitch": "5 mm",
        "configuration": "SMD 2020",
        "density": "40,000 pixels/m²",
        "resolution": "64 x 32 pixels",
        "scan": "1/16 scan",
    },
}

WART_FLEX_OUTDOOR = {
    "WA-F02.5": {
        "pixel_pitch": "2.5 mm",
        "configuration": "SMD 1211",
        "density": "160,000 pixels/m²",
        "resolution": "128 x 64 pixels",
        "scan": "1/16 scan",
    },
    "WA-F03.0": {
        "pixel_pitch": "3.076 mm",
        "configuration": "SMD 1415",
        "density": "105,625 pixels/m²",
        "resolution": "104 x 52 pixels",
        "scan": "1/13 scan",
    },
    "WA-FIO4": {
        "pixel_pitch": "4 mm",
        "configuration": "SMD 1921",
        "density": "62,500 pixels/m²",
        "resolution": "80 x 40 pixels",
        "scan": "1/10 scan",
    },
    "WA-FO5": {
        "pixel_pitch": "5 mm",
        "configuration": "SMD 1921",
        "density": "40,000 pixels/m²",
        "resolution": "64 x 32 pixels",
        "scan": "1/8 scan",
    },
}

# WArt Trans models and specifications from company catalog pages 20–22.
WART_TRANS_MODELS = {
    "WA-T03.9-7.8": {
        "pixel_pitch": "3.91 mm (H) x 7.81 mm (V)",
        "pixel_density": "32,768 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "128 x 16 pixels",
        "brightness": "≥4500 nits",
        "transparency_rate": "50%",
        "viewing_distance": ">3 m",
        "ingress_protection": "IP65",
    },
    "WA-T05.2-10.4": {
        "pixel_pitch": "5.208 mm (H) x 10.416 mm (V)",
        "pixel_density": "18,432 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "96 x 12 pixels",
        "brightness": "≥4500 nits",
        "transparency_rate": "55%",
        "viewing_distance": ">5 m",
        "ingress_protection": "IP65",
    },
    "WA-T010": {
        "pixel_pitch": "10.416 mm (H) x 10.416 mm (V)",
        "pixel_density": "9,216 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "48 x 12 pixels",
        "brightness": "≥4500 nits",
        "transparency_rate": "60%",
        "viewing_distance": ">10 m",
        "ingress_protection": "IP65",
    },
    "WA-T015.6": {
        "pixel_pitch": "15.625 mm (H) x 15.625 mm (V)",
        "pixel_density": "4,096 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "32 x 8 pixels",
        "brightness": "≥4500 nits",
        "transparency_rate": "70%",
        "viewing_distance": ">15 m",
        "ingress_protection": "IP65",
    },
    "WA-TI2.6-5.2": {
        "pixel_pitch": "2.604 mm (H) x 5.208 mm (V)",
        "pixel_density": "73,728 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "192 x 24 pixels",
        "brightness": "500–3500 nits",
        "transparency_rate": "40%",
        "viewing_distance": ">2 m",
        "ingress_protection": "IP30",
    },
    "WA-TI2.8-5.6": {
        "pixel_pitch": "2.84 mm (H) x 5.68 mm (V)",
        "pixel_density": "61,952 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "176 x 22 pixels",
        "brightness": "500–4000 nits",
        "transparency_rate": "55%",
        "viewing_distance": ">3 m",
        "ingress_protection": "IP30",
    },
    "WA-TI3.9-7.8": {
        "pixel_pitch": "3.91 mm (H) x 7.81 mm (V)",
        "pixel_density": "32,768 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "128 x 16 pixels",
        "brightness": "500–4500 nits",
        "transparency_rate": "60%",
        "viewing_distance": ">5 m",
        "ingress_protection": "IP30",
    },
    "WA-TI5.2-10.4": {
        "pixel_pitch": "5.208 mm (H) x 10.416 mm (V)",
        "pixel_density": "18,432 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "96 x 12 pixels",
        "brightness": "500–4000 nits",
        "transparency_rate": "65%",
        "viewing_distance": ">6 m",
        "ingress_protection": "IP30",
    },
    "WA-TI7.8": {
        "pixel_pitch": "7.81 mm (H) x 7.81 mm (V)",
        "pixel_density": "16,384 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "64 x 16 pixels",
        "brightness": "500–4000 nits",
        "transparency_rate": "70%",
        "viewing_distance": ">7 m",
        "ingress_protection": "IP30",
    },
    "WA-TI10": {
        "pixel_pitch": "10.416 mm (H) x 10.416 mm (V)",
        "pixel_density": "9,216 pixels/m²",
        "module_dimension": "500 x 125 mm",
        "module_resolution": "48 x 12 pixels",
        "brightness": "500–3500 nits",
        "transparency_rate": "75%",
        "viewing_distance": ">10 m",
        "ingress_protection": "IP30",
    },
    "WA-TH2.5": {
        "pixel_pitch": "2.5 mm",
        "display_size": "125 x 1000 mm",
        "resolution": "50 x 400 pixels",
        "brightness": "1200 nits",
        "viewing_distance": ">2.5 m",
        "transmittance": "70%",
        "ingress_protection": "IP20",
    },
    "WA-TH3.9": {
        "pixel_pitch": "3.91 mm",
        "display_size": "250 x 1000 / 250 x 1171 mm",
        "resolution": "64 x 256 / 64 x 300 pixels",
        "brightness": "3000 nits",
        "viewing_distance": ">3.9 m",
        "transmittance": "80%",
        "ingress_protection": "IP20",
    },
    "WA-TH6.2": {
        "pixel_pitch": "6.25 mm",
        "display_size": "250 x 1175 / 250 x 1475 mm",
        "resolution": "40 x 192 / 40 x 236 pixels",
        "brightness": "5000 nits",
        "viewing_distance": ">6.2 m",
        "transmittance": "90%",
        "ingress_protection": "IP20",
    },
    "WA-TH10": {
        "pixel_pitch": "10 mm",
        "display_size": "250 x 1000 mm",
        "resolution": "25 x 120 pixels",
        "brightness": "4000 nits",
        "viewing_distance": ">10 m",
        "transmittance": "85%",
        "ingress_protection": "IP20",
    },
}

WVIVID_MODELS = {
    "WV-C4": {
        "pixel_pitch": "4 mm",
        "configuration": "SMD 1921",
        "density": "62,500 pixels/m²",
        "resolution": "80 x 40 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/10 scan",
        "brightness": "5000 nits",
    },
    "WV-C5": {
        "pixel_pitch": "5 mm",
        "configuration": "SMD 1921",
        "density": "40,000 pixels/m²",
        "resolution": "64 x 32 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/8 scan",
        "brightness": "5000 nits",
    },
    "WV-C6": {
        "pixel_pitch": "6 mm",
        "configuration": "SMD 2727",
        "density": "27,778 pixels/m²",
        "resolution": "32 x 32 pixels",
        "module_size": "192 x 192 mm",
        "scan": "1/8 scan",
        "brightness": "6000 nits",
    },
    "WV-C8": {
        "pixel_pitch": "8 mm",
        "configuration": "SMD 3535",
        "density": "15,625 pixels/m²",
        "resolution": "40 x 20 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/5 scan",
        "brightness": "7000 nits",
    },
    "WV-C10": {
        "pixel_pitch": "10 mm",
        "configuration": "SMD 3535",
        "density": "10,000 pixels/m²",
        "resolution": "32 x 16 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/2 scan",
        "brightness": "7500 nits",
    },
    "WV-D2.0": {
        "pixel_pitch": "2 mm",
        "configuration": "SMD 1212",
        "density": "250,000 pixels/m²",
        "resolution": "160 x 80 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/20 scan",
        "brightness": "5000 nits",
    },
    "WV-D2.5": {
        "pixel_pitch": "2.5 mm",
        "configuration": "SMD 1415",
        "density": "200,000 pixels/m²",
        "resolution": "128 x 64 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/16 scan",
        "brightness": "5000 nits",
    },
    "WV-D3.0": {
        "pixel_pitch": "3.076 mm",
        "configuration": "SMD 1415",
        "density": "105,625 pixels/m²",
        "resolution": "104 x 52 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/13 scan",
        "brightness": "5000 nits",
    },
    "WV-D4": {
        "pixel_pitch": "4 mm",
        "configuration": "SMD 1921",
        "density": "62,500 pixels/m²",
        "resolution": "80 x 40 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/10 scan",
        "brightness": "5000 nits",
    },
    "WV-D5": {
        "pixel_pitch": "5 mm",
        "configuration": "SMD 1921",
        "density": "40,000 pixels/m²",
        "resolution": "64 x 32 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/8 scan",
        "brightness": "5000 nits",
    },
    "WV-D6.6": {
        "pixel_pitch": "6.67 mm",
        "configuration": "SMD 2727",
        "density": "22,500 pixels/m²",
        "resolution": "48 x 24 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/6 scan",
        "brightness": "6000 nits",
    },
    "WV-D8": {
        "pixel_pitch": "8 mm",
        "configuration": "SMD 3535",
        "density": "15,625 pixels/m²",
        "resolution": "40 x 20 pixels",
        "module_size": "320 x 160 mm",
        "scan": "1/5 scan",
        "brightness": "7000 nits",
    },
}

WSHARP_MODELS = {
    "WS1.2": {
        "pixel_pitch": "1.25 mm",
        "led_type": "SMD1010",
        "density": "640,000 pixels/m²",
        "resolution": "256 x 128 pixels",
        "cabinet_resolution": "512 x 384 pixels",
        "brightness": "600 nits",
        "scan": "1/64 Scan",
    },
    "WS1.5": {
        "pixel_pitch": "1.538 mm",
        "led_type": "SMD1212",
        "density": "422,500 pixels/m²",
        "resolution": "208 x 104 pixels",
        "cabinet_resolution": "416 x 312 pixels",
        "brightness": "600 nits",
        "scan": "1/52 Scan",
    },
    "WS1.8": {
        "pixel_pitch": "1.86 mm",
        "led_type": "SMD1515",
        "density": "288,906 pixels/m²",
        "resolution": "172 x 86 pixels",
        "cabinet_resolution": "344 x 258 pixels",
        "brightness": "800 nits",
        "scan": "1/43 Scan",
    },
    "WS2.0": {
        "pixel_pitch": "2 mm",
        "led_type": "SMD1515",
        "density": "250,000 pixels/m²",
        "resolution": "160 x 80 pixels",
        "cabinet_resolution": "320 x 160 pixels",
        "brightness": "800 nits",
        "scan": "1/40 Scan",
    },
    "WS2.5": {
        "pixel_pitch": "2.5 mm",
        "led_type": "SMD1515/2020",
        "density": "160,000 pixels/m²",
        "resolution": "128 x 64 pixels",
        "cabinet_resolution": "256 x 192 pixels",
        "brightness": "500/800 nits",
        "scan": "1/32 Scan",
    },
}


# =====================================================
# SERIES REGISTRY
# =====================================================

SERIES = [
    (
        "WArt Flex Outdoor",
        WART_FLEX_OUTDOOR,
        ["WART FLEX OUTDOOR", "FLEX OUTDOOR"]
    ),
    (
        "WArt Flex Indoor",
        WART_FLEX_INDOOR,
        ["WART FLEX INDOOR", "FLEX INDOOR"]
    ),
    (
        "WArt Trans",
        WART_TRANS_MODELS,
        ["WART TRANS", "WART-TRANS"]
    ),
    ("WArt Floor", WART_FLOOR_MODELS, ["WART FLOOR"]),
    ("WArt Roll", WART_ROLL_MODELS, ["WART ROLL"]),
    ("WArt Smart", WART_SMART_MODELS, ["WART SMART"]),
    (
        "WVivid D-Series",
        {k: v for k, v in WVIVID_MODELS.items() if k.startswith("WV-D")},
        ["WVIVID D-SERIES", "D-SERIES"]
    ),
    (
        "WVivid C-Series",
        {k: v for k, v in WVIVID_MODELS.items() if k.startswith("WV-C")},
        ["WVIVID C-SERIES", "C-SERIES"]
    ),
    ("WVivid", WVIVID_MODELS, ["WVIVID"]),
    ("WSharp", WSHARP_MODELS, ["WSHARP"]),
]

ALL_PRODUCT_MODELS = {}

for series_name, model_dictionary, aliases in SERIES:
    ALL_PRODUCT_MODELS.update(model_dictionary)


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_matched_models(question, model_dictionary):
    question = question.upper()

    return [
        model
        for model in sorted(model_dictionary, key=len, reverse=True)
        if model.upper() in question
    ]


def get_all_matched_models(question):
    """
    Finds product models across every registered product series.
    Results are ordered according to their appearance in the question.
    """
    all_matches = []

    for series_name, dictionary, aliases in SERIES:
        for model in get_matched_models(question, dictionary):
            if model not in all_matches:
                all_matches.append(model)

    all_matches.sort(
        key=lambda model: question.upper().find(model.upper())
    )

    return all_matches


def get_product_images(question):
    matched_models = get_matched_models(
        question.upper(),
        ALL_PRODUCT_MODELS
    )

    images = []

    for model in matched_models:
        mapped_files = PRODUCT_IMAGE_MAP.get(model, [])

        if isinstance(mapped_files, str):
            mapped_files = [mapped_files]

        for filename in mapped_files:
            filename = Path(str(filename)).name
            image_path = IMAGE_DIR / filename

            if image_path.is_file():
                images.append({
                    "model": model,
                    "url": f"/images/{filename}"
                })

    if not images:
        try:
            for product in product_db.find_products(question):
                images.append({
                    "model": product["id"],
                    "name": product["image_caption"],
                    "url": product["image"],
                })
        except Exception as error:
            print("Product database image error:", error)

    return images


def detect_series(question):
    question = question.upper()

    # Exact model match gets priority.
    for name, dictionary, aliases in SERIES:
        matched = get_matched_models(question, dictionary)

        if matched:
            return name, dictionary

    # Then check series names and aliases.
    for name, dictionary, aliases in SERIES:
        if any(alias in question for alias in aliases):
            return name, dictionary

    return None, None


def get_number(value):
    if value is None:
        return None

    match = re.search(r"\d[\d,]*(?:\.\d+)?", str(value))

    if not match:
        return None

    try:
        return float(match.group(0).replace(",", ""))
    except ValueError:
        return None


def is_highest(question):
    terms = [
        "HIGHEST", "MAXIMUM", "MAX", "MOST",
        "GREATEST", "LARGEST", "BIGGEST"
    ]

    return any(
        re.search(r"\b" + re.escape(term) + r"\b", question)
        for term in terms
    )


def is_lowest(question):
    terms = [
        "LOWEST", "MINIMUM", "MIN", "LEAST",
        "SMALLEST", "SMALLER"
    ]

    return any(
        re.search(r"\b" + re.escape(term) + r"\b", question)
        for term in terms
    )


def is_model_list_question(question):
    question = question.upper()

    terms = [
        "AVAILABLE",
        "ALL MODELS",
        "MODEL LIST",
        "WHICH MODELS",
        "LIST MODELS",
        "SHOW MODELS",
        "PRODUCT MODELS",
        "PRODUCT LIST",
        "SHOW ME ALL",
        "ALL AVAILABLE",
    ]

    return any(term in question for term in terms)


def format_specs(series_name, model, specs):
    lines = [
        f"{series_name} - Product Details",
        "",
        f"Model: {model}"
    ]

    if not specs:
        lines.append(
            "Detailed specifications are not available in the "
            "registered product database."
        )
        return "\n".join(lines)

    for key, value in specs.items():
        label = key.replace("_", " ").title()
        lines.append(f"{label}: {value}")

    if series_name == "WArt Floor":
        lines.extend([
            "Module Size: 250 x 250 mm",
            "Cabinet Size: 500 x 500 mm / 500 x 1000 mm",
            "Refresh Rate: 3840 Hz",
            "Brightness Range: 450–1500 nits",
        ])

    elif series_name == "WArt Roll":
        lines.extend([
            "Module Size: 500 x 62.5 x 17 mm",
            "Cabinet Size: 500 x 1000 x 17 mm",
            "Cabinet Weight: 10 kg",
            "Cabinet Material: Aluminum Profile",
            "Gray Level: 16 bit",
            "Viewing Angle: 160°/160°",
            "Contrast Ratio: 10000:1",
            "Frame Frequency: 50/60 Hz",
            "Refresh Rate: 3840–7680 Hz",
            "Protection Grade: IP54/IP21",
        ])

    elif series_name == "WArt Flex Indoor":
        lines.extend([
            "Module Size: 320 x 160 mm",
            "Brightness Range: 600–800 nits",
            "Viewing Angle: 160°",
            "Gray Grade: 16 bit",
            "Refresh Frequency: 3840–7680 Hz",
            "Protection Grade: IP30",
        ])

    elif series_name == "WArt Flex Outdoor":
        lines.extend([
            "Module Size: 320 x 160 mm",
            "Brightness Range: 4500–5000 nits",
            "Viewing Angle: 140°",
            "Gray Grade: 16 bit",
            "Refresh Frequency: 3840–7680 Hz",
            "Protection Grade: IP65",
        ])

    elif series_name.startswith("WVivid"):
        lines.extend([
            "Cabinet Size: 960 x 960 mm",
            "Viewing Angle: 140°",
            "Gray Grade: 16 bit",
            "Refresh Frequency: 3840–7680 Hz",
            "Protection Grade: IP65",
            "Cabinet Material: Iron",
        ])

    elif series_name == "WSharp":
        lines.extend([
            "Module Size: 320 x 160 mm",
            "Cabinet Size: 640 x 480 mm",
            "Cabinet Weight: 7.8 kg",
            "Cabinet Material: Die-casting Aluminum",
            "Grey Level: 16 bit",
            "Viewing Angle: 160°/160°",
            "Contrast Ratio: 10000:1",
            "Refresh Rate: 3840–7680 Hz",
            "Protection Grade: IP40",
        ])

    elif series_name == "WArt Trans":
        lines.extend([
            "Cabinet Dimension: 1000 x 500 x 80 mm / 1000 x 1000 x 80 mm",
            "Cabinet Material: Aluminum Profile",
            "Contrast Ratio: 10000:1",
            "Gray Scale: 16 bit",
            "Refresh Rate: 3840 Hz",
            "Viewing Angle: 140°/140° (H/V)",
            "Video Frame Rate: 50/60 Hz",
            "Input Voltage: 100–240V ±10%",
            "Operating Temperature: -20 to +50°C",
        ])

    return "\n".join(lines)


def comparison_answer(series_name, models, dictionary):
    lines = [
        f"{series_name} - Model Comparison",
        ""
    ]

    for model in models:
        lines.append(f"Model: {model}")

        for key, value in dictionary[model].items():
            label = key.replace("_", " ").title()
            lines.append(f"{label}: {value}")

        lines.append("")

    return "\n".join(lines).strip()


def cross_series_comparison_answer(models):
    """
    Compares models even when they belong to different product series.
    Only registered product specifications are included.
    """
    comparison_lines = [
        "Product Model Comparison",
        ""
    ]

    for model in models:
        found_model = False

        for current_series, current_dictionary, aliases in SERIES:
            if model not in current_dictionary:
                continue

            found_model = True
            specs = current_dictionary[model]

            comparison_lines.append(
                f"{current_series} - {model}"
            )

            for key, value in specs.items():
                label = key.replace("_", " ").title()
                comparison_lines.append(f"{label}: {value}")

            # Add existing series-level specifications.
            if current_series == "WArt Flex Indoor":
                comparison_lines.extend([
                    "Module Size: 320 x 160 mm",
                    "Brightness Range: 600–800 nits",
                    "Viewing Angle: 160°",
                    "Gray Grade: 16 bit",
                    "Refresh Frequency: 3840–7680 Hz",
                    "Protection Grade: IP30",
                ])

            elif current_series == "WArt Flex Outdoor":
                comparison_lines.extend([
                    "Module Size: 320 x 160 mm",
                    "Brightness Range: 4500–5000 nits",
                    "Viewing Angle: 140°",
                    "Gray Grade: 16 bit",
                    "Refresh Frequency: 3840–7680 Hz",
                    "Protection Grade: IP65",
                ])

            comparison_lines.append("")
            break

        if not found_model:
            comparison_lines.append(
                f"{model}: Specifications not found."
            )

    return "\n".join(comparison_lines).strip()


def available_models_answer(series_name, dictionary):
    lines = [
        f"Available {series_name} Models:",
        ""
    ]

    lines.extend(f"• {model}" for model in dictionary)

    return "\n".join(lines)


def metric_answer(question, series_name, dictionary, metric, label):
    values = []

    for model, specs in dictionary.items():
        raw_value = specs.get(metric)

        # Ambiguous values such as 500/800 are not ranked.
        if raw_value and re.search(r"\d\s*/\s*\d", str(raw_value)):
            continue

        number = get_number(raw_value)

        if number is not None:
            values.append((model, raw_value, number))

    if not values:
        return None

    if is_highest(question):
        target = max(item[2] for item in values)
        direction = "Highest"

    elif is_lowest(question):
        target = min(item[2] for item in values)
        direction = "Lowest"

    else:
        return None

    winners = [
        item for item in values
        if item[2] == target
    ]

    lines = [
        f"{series_name} - {direction} {label}",
        ""
    ]

    for model, raw_value, number in winners:
        lines.append(f"Model: {model}")
        lines.append(f"{label}: {raw_value}")
        lines.append("")

    lines.append(
        f"These are the {direction.lower()} confirmed values "
        f"among the listed {series_name} models."
    )

    return "\n".join(lines)


def available_series_answer():
    return (
        "Available Product Series:\n\n"
        "• WArt Smart\n"
        "• WArt Floor\n"
        "• WArt Roll\n"
        "• WArt Flex Indoor\n"
        "• WArt Flex Outdoor\n"
        "• WArt Trans\n"
        "• WVivid C-Series\n"
        "• WVivid D-Series\n"
        "• WSharp"
    )


def check_feature_question(question, model, specs):
    question_upper = question.upper()

    intent_words = [
        "SUPPORT", "SUPPORTS", "SUPPORTED",
        "HAVE", "HAS", "INCLUDE", "INCLUDES",
        "COMPATIBLE", "CAN IT", "DOES IT"
    ]

    if not any(word in question_upper for word in intent_words):
        return None

    cleaned = question_upper.replace(model.upper(), " ")

    ignored_words = {
        "DOES", "DO", "IS", "ARE", "CAN", "IT",
        "ITS", "HAVE", "HAS", "SUPPORT", "SUPPORTS",
        "SUPPORTED", "INCLUDE", "INCLUDES", "INCLUDED",
        "COMPATIBLE", "WITH", "THE", "THIS", "THAT",
        "A", "AN", "I", "WE", "YOU", "OF", "FOR",
        "MODEL", "AVAILABLE", "THERE"
    }

    words = re.findall(r"[A-Z][A-Z0-9.+-]*", cleaned)

    feature_words = [
        word for word in words
        if word not in ignored_words
        and not word.replace(".", "").isdigit()
    ]

    if not feature_words:
        return None

    for key, value in specs.items():
        field_text = f"{key} {value}".upper().replace("_", " ")

        if any(word in field_text for word in feature_words):
            return (
                f"Catalog Information - {model}\n\n"
                f"{key.replace('_', ' ').title()}: {value}"
            )

    return (
        f"Sorry, the available company catalog does not mention "
        f"whether {model} supports this feature.\n\n"
        f"I cannot confirm this information without an official "
        f"product specification."
    )


# =====================================================
# MAIN PRODUCT ANSWER FUNCTION
# =====================================================

def answer_product_question(question):
    question = question.upper()

    # Handle all-series listing before detecting an individual series.
    if (
        "ALL PRODUCT SERIES" in question
        or "AVAILABLE PRODUCT SERIES" in question
        or "LIST PRODUCT SERIES" in question
        or "SHOW PRODUCT SERIES" in question
    ):
        return available_series_answer()

    # Find models across all series.
    all_matched_models = get_all_matched_models(question)

    # Generic WArt Flex: show Indoor and Outdoor models together.
    # Do not show the list when the user has specified actual models.
    if (
        "WART FLEX" in question
        and "INDOOR" not in question
        and "OUTDOOR" not in question
        and not all_matched_models
    ):
        return (
            "Available WArt Flex Models:\n\n"
            "Indoor Models:\n"
            + "\n".join(f"• {m}" for m in WART_FLEX_INDOOR)
            + "\n\nOutdoor Models:\n"
            + "\n".join(f"• {m}" for m in WART_FLEX_OUTDOOR)
        )

    series_name, dictionary = detect_series(question)

    if not dictionary:
        return None

    matched_models = get_matched_models(question, dictionary)

    # Model list.
    if is_model_list_question(question):
        return available_models_answer(series_name, dictionary)

    # WArt Smart special handling.
    if series_name == "WArt Smart":

        if "BRIGHTNESS" in question:
            return (
                "WArt Smart - Brightness Information\n\n"
                "The available company catalog information does not "
                "specify the brightness value for WArt Smart models.\n\n"
                "I cannot confirm a brightness value without an "
                "official specification."
            )

        if len(matched_models) >= 2:
            lines = [
                "WArt Smart Model Comparison",
                ""
            ]

            for model in matched_models:
                specs = dictionary[model]

                lines.extend([
                    f"Model: {model}",
                    f"Display Size: {specs['display_size']}",
                    f"Recommended Room Area: {specs['area']}",
                    ""
                ])

            lines.append(
                "Catalog-listed features include All-in-One Design, "
                "Android System, Optional OPS, Wireless Projection, "
                "Intelligent Writing and COB LED Technology."
            )

            return "\n".join(lines)

        if len(matched_models) == 1:
            model = matched_models[0]
            specs = dictionary[model]

            return (
                "WArt Smart - All-in-One LED Display\n\n"
                f"Model: {model}\n"
                f"Display Size: {specs['display_size']}\n"
                f"Recommended Room Area: {specs['area']}\n\n"
                "Key Features:\n"
                "• All-in-One Design\n"
                "• Built-in Android System\n"
                "• Optional OPS Computer\n"
                "• Wireless Screen Projection\n"
                "• Intelligent Writing\n"
                "• COB LED Technology"
            )

        return available_models_answer(series_name, dictionary)

    # Check feature support questions before returning full specifications.
    if len(matched_models) == 1:
        model = matched_models[0]

        feature_answer = check_feature_question(
            question,
            model,
            dictionary[model]
        )

        if feature_answer:
            return feature_answer

    # WArt Trans indoor, outdoor and holographic model group listing.
    if series_name == "WArt Trans" and not matched_models:
        if "INDOOR" in question:
            models = {
                k: v for k, v in dictionary.items()
                if k.startswith("WA-TI")
            }
            return available_models_answer(
                "WArt Trans Indoor", models
            )

        if "OUTDOOR" in question:
            models = {
                k: v for k, v in dictionary.items()
                if k.startswith("WA-T0")
            }
            return available_models_answer(
                "WArt Trans Outdoor", models
            )

        if "HOLOGRAPHIC" in question:
            models = {
                k: v for k, v in dictionary.items()
                if k.startswith("WA-TH")
            }
            return available_models_answer(
                "WArt Trans Holographic", models
            )

    # Brightness questions for series with catalog-listed ranges.
    if (
        "BRIGHTNESS" in question
        and not is_highest(question)
        and not is_lowest(question)
    ):
        ranges = {
            "WArt Floor": "450–1500 nits",
            "WArt Flex Indoor": "600–800 nits",
            "WArt Flex Outdoor": "4500–5000 nits",
        }

        if series_name in ranges:
            return (
                f"{series_name} brightness range: "
                f"{ranges[series_name]}."
            )

    # WSharp brightness ranking.
    if series_name == "WSharp" and "BRIGHTNESS" in question:
        if is_lowest(question):
            return (
                "WSharp lowest confirmed brightness:\n"
                "• WS1.2 - 600 nits\n"
                "• WS1.5 - 600 nits\n\n"
                "WS2.5 is listed as 500/800 nits, so its exact "
                "brightness is ambiguous and is not ranked."
            )

        if is_highest(question):
            return (
                "WSharp highest confirmed brightness:\n"
                "• WS1.8 - 800 nits\n"
                "• WS2.0 - 800 nits\n\n"
                "WS2.5 is listed as 500/800 nits, so its exact "
                "brightness is ambiguous and is not ranked."
            )

    # Highest / Lowest Transparency Rate.
    if "TRANSPARENCY" in question or "TRANSMITTANCE" in question:

        transparency_values = []

        for model, specs in dictionary.items():
            raw_value = (
                specs.get("transparency_rate")
                or specs.get("transmittance")
            )

            number = get_number(raw_value)

            if number is not None:
                transparency_values.append(
                    (model, raw_value, number)
                )

        if transparency_values and is_highest(question):
            highest = max(
                item[2] for item in transparency_values
            )

            winners = [
                item for item in transparency_values
                if item[2] == highest
            ]

            lines = [
                f"{series_name} - Highest Transparency Rate",
                ""
            ]

            for model, value, number in winners:
                lines.append(f"Model: {model}")
                lines.append(f"Transparency Rate: {value}")
                lines.append("")

            return "\n".join(lines)

        if transparency_values and is_lowest(question):
            lowest = min(
                item[2] for item in transparency_values
            )

            winners = [
                item for item in transparency_values
                if item[2] == lowest
            ]

            lines = [
                f"{series_name} - Lowest Transparency Rate",
                ""
            ]

            for model, value, number in winners:
                lines.append(f"Model: {model}")
                lines.append(f"Transparency Rate: {value}")
                lines.append("")

            return "\n".join(lines)

    # =================================================
    # METRIC DETECTION
    # =================================================

    metric = None
    label = None

    if "PIXEL PITCH" in question or " PITCH" in question:
        metric = "pixel_pitch"
        label = "Pixel Pitch"

    elif "DENSITY" in question:
        # WArt Trans uses pixel_density.
        # Other product series use density.
        if any(
            "pixel_density" in specs
            for specs in dictionary.values()
        ):
            metric = "pixel_density"
        else:
            metric = "density"

        label = "Pixel Density"

    elif "BRIGHTNESS" in question:
        metric = "brightness"
        label = "Brightness"

    if metric and (is_highest(question) or is_lowest(question)):
        result = metric_answer(
            question,
            series_name,
            dictionary,
            metric,
            label
        )

        if result:
            return result

    # =================================================
    # CROSS-SERIES MODEL COMPARISON
    # =================================================

    # Compare models belonging to different product series.
    # This must run before single-model details.
    if len(all_matched_models) >= 2:

        matched_series_names = []

        for model in all_matched_models:
            for current_series, current_dictionary, aliases in SERIES:
                if model in current_dictionary:
                    matched_series_names.append(current_series)
                    break

        distinct_series = set(matched_series_names)

        if len(distinct_series) >= 2:
            return cross_series_comparison_answer(
                all_matched_models
            )

    # =================================================
    # SAME-SERIES MODEL COMPARISON
    # =================================================

    if len(matched_models) >= 2:
        return comparison_answer(
            series_name,
            matched_models,
            dictionary
        )

    # Single model details.
    if len(matched_models) == 1:
        model = matched_models[0]

        return format_specs(
            series_name,
            model,
            dictionary[model]
        )

    # Series name only.
    return available_models_answer(series_name, dictionary)


# =====================================================
# PDF CATALOG FALLBACK
# =====================================================
def hide_image_page_numbers(images):
    cleaned_images = []

    for image in images or []:
        if isinstance(image, dict):
            cleaned_images.append({
                key: value
                for key, value in image.items()
                if key != "page"
            })
        else:
            cleaned_images.append(image)

    return cleaned_images

def search_catalog_fallback(question):
    try:
        results = search_products(question, limit=3)
    except Exception as error:
        print("Catalog search error:", error)
        return None

    if not results:
        return None

    answer_parts = []

    for result in results:
        content = str(result.get("content", "")).strip()

        if not content:
            continue

        if len(content) > 1800:
            content = content[:1800].rsplit(" ", 1)[0] + "..."

        answer_parts.append(content)

    if not answer_parts:
        return None

    return {
        "answer": "\n\n---\n\n".join(answer_parts),
        "sources": []
    }



# =====================================================
# API ROUTES
# =====================================================

@app.get("/", include_in_schema=False)
def home():
    index_file = FRONTEND_DIR / "index.html"
    if not index_file.is_file():
        raise HTTPException(status_code=503, detail="Frontend files are missing")
    return FileResponse(index_file)


@app.get("/health")
def health():
    catalog_file = BASE_DIR / "knowledge_base" / "catalog_text.json"
    try:
        pages = json.loads(catalog_file.read_text(encoding="utf-8")) if catalog_file.is_file() else []
    except (OSError, json.JSONDecodeError):
        pages = []
    return {
        "status": "ok",
        "application": "SmartTalk AI",
        "catalog_loaded": bool(pages),
        "catalog_pages": len(pages) if isinstance(pages, list) else 0,
        "product_database_loaded": bool(product_db.get_index()),
        "image_mapping_loaded": bool(PRODUCT_IMAGE_MAP) or (bool(product_db.get_index()) and PRODUCT_IMAGE_DIR.is_dir()),
        "product_images_loaded": PRODUCT_IMAGE_DIR.is_dir() and any(PRODUCT_IMAGE_DIR.iterdir()),
    }


@app.post("/chat")
def chat(request: ChatRequest):
    original_question = request.question.strip()

    if not original_question:
        return {
            "answer": "Please enter a product-related question."
        }

    question = original_question.upper()

    # Greeting handling.
    normalized = re.sub(r"[^A-Z ]", "", question)
    normalized = " ".join(normalized.split())

    greetings = {
        "HI",
        "HELLO",
        "HEY",
        "GOOD MORNING",
        "GOOD AFTERNOON",
        "GOOD EVENING",
        "GOOD NIGHT",
        "GOOD MORINING",
        "HOW ARE YOU",
        "THANK YOU",
        "THANKS"
    }

    if normalized in greetings:
        if normalized == "HOW ARE YOU":
            answer = (
                "I'm doing well, thank you! I'm SmartTalk AI, "
                "your company product assistant. How can I help "
                "you with our products?"
            )

        elif normalized in {"THANK YOU", "THANKS"}:
            answer = (
                "You're welcome! Feel free to ask me about our products."
            )

        else:
            answer = (
                "Hello! Welcome to SmartTalk AI. "
                "How can I help you with our products?"
            )

        return {
            "question": original_question,
            "answer": answer,
            "images": [],
            "sources": [],
            "response_type": "greeting"
        }

    # Case-study pages are image-based in the source PDF (pages 36-54).
    # Handle explicit case-study/project requests before product-series matching.
    case_result = answer_case_study(original_question)
    if case_result:
        return {
            "question": original_question,
            "answer": case_result["answer"],
            "images": case_result["images"],
            "sources": case_result["sources"],
            "response_type": case_result["response_type"]
        }

    # Route explicit PDF-page and company-profile questions to their exact page.
    page_result = answer_catalog_page(original_question)
    if page_result:
        return {
            "question": original_question,
            "answer": page_result["answer"],
            "images": page_result["images"],
            "sources": page_result["sources"],
            "response_type": page_result["response_type"]
        }

    # First: complete product database built from the catalog PDF
    # (every model + exact specs + product picture).
    try:
        db_result = product_db.answer(original_question)
    except Exception as error:
        print("Product database error:", error)
        db_result = None

    if db_result:
        return {
            "question": original_question,
            "answer": db_result["answer"],
            "images": db_result["images"],
            "sources": db_result["sources"],
            "response_type": db_result["response_type"]
        }

    # Second: older hand-written product dictionaries (kept as a fallback).
    answer = answer_product_question(question)

    if answer:
        images = get_product_images(question)

        return {
            "question": original_question,
            "answer": answer,
            "images": images,
            "sources": [],
            "response_type": "structured_product"
        }

    # Do not show raw PDF chunks for model-list questions.
    if is_model_list_question(question):
        return {
            "question": original_question,
            "answer": (
                "I could not identify this product series in the "
                "registered model list. Please check the series name."
            ),
            "images": [],
            "sources": [],
            "response_type": "not_found"
        }

    # General educational fallback for display technologies not covered by
    # the company PDF. Kept separate from verified product/catalog answers.
    general_result = answer_general_display_question(original_question)
    if general_result:
        return {
            "question": original_question,
            "answer": general_result,
            "images": [],
            "sources": [],
            "response_type": "general_knowledge"
        }

    # Second: company PDF catalog search.
    catalog_result = search_catalog_fallback(original_question)

    # If the PDF fallback found only unrelated text, prefer a clearly labelled
    # general description for the requested display type. Keep relevant PDF matches.
    general_product_result = answer_general_product_type_question(original_question)
    if general_product_result and (
        not catalog_result
        or not catalog_answer_covers_product_type(original_question, catalog_result.get("answer", ""))
    ):
        return {
            "question": original_question,
            "answer": general_product_result,
            "images": [],
            "sources": [],
            "response_type": "general_knowledge"
        }

    if catalog_result:
        return {
            "question": original_question,
            "answer": catalog_result["answer"],
            "images": [],
            "sources": [],
            "response_type": "catalog"
        }

    # No confirmed answer found.
    return {
        "question": original_question,
        "answer": (
            "Sorry, I could not find this information in the available "
            "company product catalog. Please check the model number or "
            "try asking about a product series, pixel pitch, pixel density "
            "or brightness."
        ),
        "images": [],
        "sources": [],
        "response_type": "not_found"
    }


# =====================================================
# OPTIONAL AI, SQL SERVER AND ADMIN INTEGRATIONS
# =====================================================


def _require_admin(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin login required")
    if not integrations.verify_admin_token(authorization[7:].strip()):
        raise HTTPException(status_code=401, detail="Admin session expired or invalid")


@app.middleware("http")
async def persist_chat_history(request, call_next):
    request_body = await request.body() if request.method == "POST" and request.url.path == "/chat" else b""
    response = await call_next(request)
    if request_body and response.status_code == 200:
        try:
            body = b"".join([chunk async for chunk in response.body_iterator])
            payload = json.loads(body.decode("utf-8"))
            original = json.loads(request_body.decode("utf-8"))
            integrations.save_chat(
                str(original.get("question", "")),
                str(payload.get("answer", "")),
                str(payload.get("response_type", "")),
            )
            headers = {k: v for k, v in response.headers.items() if k.lower() not in {"content-length", "content-encoding"}}
            return Response(content=body, status_code=response.status_code, headers=headers, media_type=response.media_type)
        except Exception as error:
            print(f"Chat history persistence skipped: {error}")
    return response


@app.get("/admin", include_in_schema=False)
def admin_page():
    page = FRONTEND_DIR / "admin.html"
    if not page.is_file():
        raise HTTPException(status_code=404, detail="Admin page not found")
    return FileResponse(page)


@app.get("/health/integrations")
def integrations_health():
    return {
        "ai_configured": integrations.ai_ready(),
        "sql_server_configured": bool(os.getenv("SQLSERVER_CONNECTION_STRING", "").strip()),
        "ffmpeg_available": shutil.which(os.getenv("FFMPEG_PATH", "ffmpeg")) is not None,
        "admin_configured": bool(os.getenv("ADMIN_PASSWORD", "").strip()),
    }


@app.post("/admin/login")
def admin_login(request: AdminLoginRequest):
    configured_user = os.getenv("ADMIN_USERNAME", "admin")
    if request.username != configured_user:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    try:
        token = integrations.create_admin_token(request.password)
    except PermissionError:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))
    return {"access_token": token, "token_type": "bearer", "expires_in": 28800}


@app.get("/admin/database-status")
def admin_database_status(authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    try:
        return integrations.init_sql()
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"SQL Server connection failed: {error}")


@app.get("/admin/history")
def admin_chat_history(limit: int = 100, authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    try:
        return {"items": integrations.admin_history(limit)}
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Chat history unavailable: {error}")


@app.post("/ai/ask")
def ai_ask(request: ChatRequest):
    if not integrations.ai_ready():
        raise HTTPException(status_code=503, detail="AI API is not configured. Add OPENAI_API_KEY to .env")
    results = search_products(request.question, limit=8)
    context = "\n\n".join(
        f"Source: {item.get('source')} | Page: {item.get('page')}\n{item.get('content', '')}"
        for item in results
    )
    if not context:
        return {"answer": "I could not find supporting information for this question in the supplied Whaley catalog.", "sources": [], "grounded": True}
    try:
        answer = integrations.ask_ai(request.question, context)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"AI provider request failed: {error}")
    return {"answer": answer, "sources": [{"source": x.get("source"), "page": x.get("page")} for x in results], "grounded": True}


def _save_temp_upload(upload: UploadFile, allowed: set[str], max_bytes: int) -> Path:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {suffix or 'unknown'}")
    fd, name = tempfile.mkstemp(prefix="smarttalk_upload_", suffix=suffix)
    total = 0
    try:
        with os.fdopen(fd, "wb") as target:
            while True:
                chunk = upload.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(status_code=413, detail=f"File exceeds {max_bytes // (1024 * 1024)} MB")
                target.write(chunk)
    except Exception:
        Path(name).unlink(missing_ok=True)
        raise
    finally:
        upload.file.close()
    return Path(name)


@app.post("/ai/analyze-image")
def ai_analyze_image(file: UploadFile = File(...), question: str = Form(default="Describe this image.")):
    if not integrations.ai_ready():
        raise HTTPException(status_code=503, detail="AI API is not configured. Add OPENAI_API_KEY to .env")
    path = _save_temp_upload(file, {".png", ".jpg", ".jpeg", ".webp"}, 20 * 1024 * 1024)
    try:
        return {"answer": integrations.analyze_image(path, question), "analysis": "image"}
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Image analysis failed: {error}")
    finally:
        path.unlink(missing_ok=True)


@app.post("/ai/transcribe-audio")
def ai_transcribe_audio(file: UploadFile = File(...)):
    if not integrations.ai_ready():
        raise HTTPException(status_code=503, detail="AI API is not configured. Add OPENAI_API_KEY to .env")
    path = _save_temp_upload(file, {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm", ".mp4"}, 50 * 1024 * 1024)
    try:
        return {"text": integrations.transcribe_audio(path), "analysis": "audio_transcription"}
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Audio transcription failed: {error}")
    finally:
        path.unlink(missing_ok=True)


@app.post("/ai/analyze-video")
def ai_analyze_video(file: UploadFile = File(...), question: str = Form(default="Summarize this video.")):
    if not integrations.ai_ready():
        raise HTTPException(status_code=503, detail="AI API is not configured. Add OPENAI_API_KEY to .env")
    path = _save_temp_upload(file, {".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"}, 200 * 1024 * 1024)
    try:
        return {
            "answer": integrations.analyze_video(path, question),
            "analysis": "sampled_video_frames",
            "note": "Video understanding is based on up to eight sampled visual frames; audio is not analyzed by this endpoint.",
        }
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Video analysis failed: {error}")
    finally:
        path.unlink(missing_ok=True)
