from backend.app import chat, ChatRequest

models = [
    "WA-F1.9", "WA-F2.5", "WA-F2.6",
    "WA-F2.9", "WA-F3.9", "WA-F4.8",
    "WA-F5.2", "WA-F6.2", "WA-F7.8"
]

passed = 0
failed = 0

print("\n===== WART FLOOR TESTING =====")

for model in models:
    result = chat(ChatRequest(question=f"{model} product details"))
    answer = result["answer"]

    if model in answer and "Pixel Pitch:" in answer:
        print(f"PASS: {model}")
        passed += 1
    else:
        print(f"FAIL: {model}")
        failed += 1

print("\n===== FINAL REPORT =====")
print("Total Passed:", passed)
print("Total Failed:", failed)
print("===== TEST COMPLETED =====")