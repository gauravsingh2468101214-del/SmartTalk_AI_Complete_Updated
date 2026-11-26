
from backend.app import chat, ChatRequest
from backend.catalog_test_helpers import contains_catalog_value

test_data = {
    "WV-C4": [
        "Pixel Pitch: 4 mm",
        "Pixel Density: 62,500 pixels/m²",
        "Module Resolution: 80 x 40 pixels",
        "Brightness: 5000 nits",
        "Driving Mode: 1/10 scan"
    ],
    "WV-C5": [
        "Pixel Pitch: 5 mm",
        "Pixel Density: 40,000 pixels/m²",
        "Module Resolution: 64 x 32 pixels",
        "Brightness: 5000 nits",
        "Driving Mode: 1/8 scan"
    ],
    "WV-C6": [
        "Pixel Pitch: 6 mm",
        "Pixel Density: 27,778 pixels/m²",
        "Module Resolution: 32 x 32 pixels",
        "Brightness: 6000 nits",
        "Driving Mode: 1/8 scan"
    ],
    "WV-C8": [
        "Pixel Pitch: 8 mm",
        "Pixel Density: 15,625 pixels/m²",
        "Module Resolution: 40 x 20 pixels",
        "Brightness: 7000 nits",
        "Driving Mode: 1/5 scan"
    ],
    "WV-C10": [
        "Pixel Pitch: 10 mm",
        "Pixel Density: 10,000 pixels/m²",
        "Module Resolution: 32 x 16 pixels",
        "Brightness: 7500 nits",
        "Driving Mode: 1/2 scan"
    ]
}

print("\n===== SMARTTALK AI SPECIFICATION TEST =====\n")

total_pass = 0
total_fail = 0

for model, expected_specs in test_data.items():

    result = chat(ChatRequest(question=f"{model} product details"))
    answer = result.get("answer", "")

    print(f"\nTesting Model: {model}")

    for spec in expected_specs:
        if contains_catalog_value(answer, spec):
            print(f"PASS: {spec}")
            total_pass += 1
        else:
            print(f"FAIL: {spec}")
            total_fail += 1

print("\n===== FINAL TEST REPORT =====")
print(f"Specifications Passed: {total_pass}")
print(f"Specifications Failed: {total_fail}")
print("===== TEST COMPLETED =====")

