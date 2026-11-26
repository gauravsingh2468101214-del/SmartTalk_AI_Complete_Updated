
from backend.app import chat, ChatRequest
from backend.catalog_test_helpers import contains_catalog_value

test_data = {
    "WA-R0.7": ["0.78 mm", "1,638,400 pixels/m²", "400 nits", "1/80 scan"],
    "WA-R0.9": ["0.976 mm", "1,149,184 pixels/m²", "400 nits", "1/64 scan"],
    "WA-R1.2": ["1.25 mm", "640,000 pixels/m²", "400 nits", "1/50 scan"],
    "WA-R1.5": ["1.56 mm", "409,600 pixels/m²", "600 nits", "1/40 scan"],
    "WA-R1.9": ["1.95 mm", "262,144 pixels/m²", "600 nits", "1/32 scan"],
    "WA-R2.6": ["2.6 mm", "147,456 pixels/m²", "600 nits", "1/24 scan"],
    "WA-R3.9": ["3.91 mm", "65,536 pixels/m²", "600 nits", "1/16 scan"]
}

passed = 0
failed = 0

print("\n===== WART ROLL TESTING =====")

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
