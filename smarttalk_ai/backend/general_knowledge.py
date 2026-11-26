"""General display-technology explanations, kept separate from the company catalogue.

These answers are educational only. They must never be presented as verified
company model specifications, prices, availability, or product claims.
"""
import re

_QUESTION_INTENT = re.compile(
    r"what is|explain|describe|about|how does|definition|meaning|kya hai|samjha|tell me",
    re.I,
)


def answer_general_display_question(question: str):
    """Existing LCD explainer. Kept before catalogue fallback for compatibility."""
    q = (question or "").strip()
    if not _QUESTION_INTENT.search(q) or not re.search(r"\blcd\b|liquid crystal display", q, re.I):
        return None
    return (
        "LCD (Liquid Crystal Display) – General Explanation\n\n"
        "An LCD is a flat-panel display technology that uses a layer of liquid "
        "crystals to control how much light passes through each pixel. The liquid "
        "crystals do not produce light themselves; a backlight (commonly LED-based "
        "in modern screens) illuminates the panel. Colour filters create the red, "
        "green and blue components used to form the image.\n\n"
        "Common uses: televisions, computer monitors, laptops, information displays "
        "and commercial signage.\n\n"
        "Common LCD panel families include IPS, VA and TN, which differ in viewing "
        "angles, contrast and response characteristics.\n\n"
        "Important: This is general technology information, not a specification "
        "for a particular company product. Please refer to the official product "
        "datasheet for confirmed model-specific features, dimensions, brightness, "
        "resolution or pricing."
    )


def answer_general_product_type_question(question: str):
    """Describe a display product type only after the company catalogue has no answer."""
    q = (question or "").strip()
    if not _QUESTION_INTENT.search(q):
        return None

    # Deliberately do not match unknown model codes (e.g. WZZ-999).
    targets = [
        (r"transparent\s+led", "Transparent LED Display", "A transparent LED display uses LED elements arranged to allow light and some visibility through the screen. It is commonly considered for glass facades, shopfronts, showrooms and exhibition spaces where a conventional solid display would block the view."),
        (r"micro\s*led", "MicroLED Display", "MicroLED is a display technology that uses very small self-emissive LED elements to form pixels. It is associated with high contrast and modular large-format display concepts, although actual performance and suitability depend on the specific product design."),
        (r"\boled\b|organic\s+light.?emitting", "OLED Display", "An OLED display uses organic light-emitting pixels, so each pixel can produce its own light. This enables deep blacks and thin display designs. Product performance varies by panel, use case and manufacturer."),
        (r"digital\s+signage", "Digital Signage Display", "Digital signage is a screen-based communication system used to show menus, promotions, wayfinding, announcements and other changing content. A solution may use commercial LCD panels or LED displays depending on screen size, viewing distance, environment and installation needs."),
        (r"video\s+wall", "Video Wall", "A video wall is a large display surface made from multiple display panels or LED cabinets arranged together. It is used in control rooms, retail spaces, studios, events and public venues. The display technology, resolution and panel alignment depend on the chosen system."),
        (r"outdoor\s+led|outdoor\s+display", "Outdoor LED Display", "An outdoor LED display is designed for viewing in open-air environments such as roadside locations, building facades and stadiums. Selection usually considers ambient sunlight, viewing distance, weather exposure, installation structure and service access. Exact brightness, protection rating and other specifications must be confirmed from the relevant product datasheet."),
        (r"indoor\s+led|indoor\s+display|fine.?pitch", "Indoor LED Display", "An indoor LED display is used in environments such as lobbies, showrooms, meeting spaces, studios and control rooms. The suitable pixel pitch depends mainly on viewing distance and the required image detail. Exact pitch, brightness, cabinet size and resolution are model-specific and should be checked in the product datasheet."),
        (r"\bled\s+(?:display|screen)s?\b|\bled\b", "LED Display", "An LED display forms images using light-emitting diodes arranged as pixels. LED displays are used for advertising, information, events, retail, corporate spaces and large video walls. The right design depends on indoor or outdoor use, viewing distance, screen size, pixel pitch, brightness and installation conditions."),
    ]
    for pattern, title, description in targets:
        if re.search(pattern, q, re.I):
            return (
                f"{title} – General Description\n\n{description}\n\n"
                "Important: This is general industry information, not confirmation that a "
                "specific model is available in the company catalogue. Model-specific "
                "features, dimensions, brightness, resolution, protection rating and price "
                "must be confirmed by the company team or an official datasheet."
            )
    return None


def catalog_answer_covers_product_type(question: str, answer: str) -> bool:
    """Return True only when a catalogue fallback actually discusses the asked type."""
    general = answer_general_product_type_question(question)
    if not general:
        return False
    title = general.split(" – General Description", 1)[0].strip().lower()
    patterns = {
        "indoor led display": r"(?=.*\bindoor\b)(?=.*\bled\b)",
        "outdoor led display": r"(?=.*\boutdoor\b)(?=.*\bled\b)",
        "transparent led display": r"(?=.*\btransparent\b)(?=.*\bled\b)",
        "microled display": r"micro\s*led",
        "oled display": r"\boled\b",
        "digital signage display": r"digital\s+signage",
        "video wall": r"video\s+wall",
        "led display": r"(?=.*\bled\b)(?=.*\bdisplay\b)",
    }
    text = answer or ""
    pattern = patterns.get(title)
    discusses_type = bool(pattern and re.search(pattern, text, re.I | re.S))
    has_product_evidence = bool(
        re.search(r"\b(?:WA|WB|WC|WM|WV|WS)[A-Z0-9.-]*\d[A-Z0-9.-]*\b", text, re.I)
        or re.search(r"\b(?:Models:|Pixel Pitch:|Brightness:|Module Size:|LED Type:|Pixel Density:)\b", text, re.I)
    )
    return discusses_type and has_product_evidence
