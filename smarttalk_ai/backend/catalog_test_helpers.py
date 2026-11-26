"""Formatting-tolerant assertions for values transcribed from catalog tables.

The PDF uses inconsistent spacing and separators (e.g. 4mm / 4 mm,
80*40 / 80 x 40, 62500 / 62,500). These helpers compare the same printed
value without treating typography as a product-data failure.
"""
import re


def _normalise(value: str) -> str:
    text = str(value or "").casefold()
    # The canonical database label includes this clarifying parenthetical.
    text = re.sub(r"\s*\(duty\)", "", text)
    # Treat multiplication separators in dimensions (x, *, ×) equivalently.
    text = re.sub(r"(?<=\d)\s*x\s*(?=\d)", " ", text)
    # Ignore visual separators and spacing only; retain all letters/digits.
    return re.sub(r"[^a-z0-9]", "", text)


def contains_catalog_value(answer: str, expected: str) -> bool:
    return _normalise(expected) in _normalise(answer)
