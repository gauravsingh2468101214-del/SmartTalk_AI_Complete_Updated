
from backend.app import chat, ChatRequest
from backend.catalog_test_helpers import contains_catalog_value

test_data = {
    "WA-FI1.2": ["1.25 mm", "SMD 1010", "640,000 pixels/m²", "1/64 scan", "IP30"],
    "WA-FI1.5": ["1.538 mm", "SMD 1212", "422,500 pixels/m²", "1/52 scan", "IP30"],
    "WA-FI1.8": ["1.86 mm", "SMD 1515", "288,906 pixels/m²", "1/43 scan", "IP30"],
    "WA-FI2.0": ["2 mm", "SMD 1515", "250,000 pixels/m²", "1/40 scan", "IP30"],
    "WA-FI2.5": ["2.5 mm", "SMD 2020", "160,000 pixels/m²", "1/32 scan", "IP30"],
    "WA-FI3.0": ["3.076 mm", "SMD 2020", "105,625 pixels/m²", "1/26 scan", "IP30"],
    "WA-FI4": ["4 mm", "SMD 2020", "62,500 pixels/m²", "1/20 scan", "IP30"],
    "WA-FI5": ["5 mm", "SMD 2020", "40,000 pixels/m²", "1/16 scan", "IP30"],
    "WA-F02.5": ["2.5 mm", "SMD 1211", "160,000 pixels/m²", "1/16 scan", "IP65"],
    "WA-F03.0": ["3.076 mm", "SMD 1415", "105,625 pixels/m²", "1/13 scan", "IP65"],
    "WA-FIO4": ["4 mm", "SMD 1921", "62,500 pixels/m²", "1/10 scan", "IP65"],
    "WA-FO5": ["5 mm", "SMD 1921", "40,000 pixels/m²", "1/8 scan", "IP65"]
}

passed = 0
failed = 0

print("\n===== WART FLEX TESTING =====")

for model, expected_specs in test_data.items():
    result = chat(ChatRequest(question=f"{model} product details"))
    answer = result["answer"]

    print(f"\nTesting: {model}")

    for spec in expected_specs:
        if contains_catalog_value(answer, spec):
            print(f"PASS: {spec}")
            passed += 1
        else:
            print(f"FAIL: {spec}")
            failed += 1

print("\n===== FINAL REPORT =====")
print(f"Total Passed: {passed}")
print(f"Total Failed: {failed}")
print("===== TEST COMPLETED =====")
