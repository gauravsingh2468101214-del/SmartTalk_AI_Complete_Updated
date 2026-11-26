from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_home_and_frontend_assets_are_served():
    home = client.get("/")
    assert home.status_code == 200 and "SmartTalk AI" in home.text
    assert client.get("/static/style.css").status_code == 200
    assert client.get("/static/script.js").status_code == 200


def test_health_reports_all_54_catalog_pages():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["catalog_loaded"] is True
    assert payload["catalog_pages"] == 54
    assert payload["product_database_loaded"] is True
    assert payload["image_mapping_loaded"] is True
    assert payload["product_images_loaded"] is True


def test_catalog_product_answer_has_specs_image_and_page_source():
    response = client.post("/chat", json={"question": "WA-FI2.5 product details"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["response_type"] == "product"
    assert "Pixel Pitch: 2.5 mm" in payload["answer"]
    assert payload["sources"][0]["page"] == 29
    assert payload["images"][0]["url"].endswith("flex.jpg")


def test_series_listing_includes_all_wart_flex_models():
    response = client.post("/chat", json={"question": "Show all WArt Flex models"})
    assert response.status_code == 200
    answer = response.json()["answer"]
    for model in ["WA-FI1.2", "WA-FI1.5", "WA-FI1.8", "WA-FI2.0", "WA-FI2.5", "WA-FI3.0", "WA-FI4", "WA-FI5", "WA-F02.5", "WA-F03.0", "WA-FIO4", "WA-FO5"]:
        assert model in answer


def test_same_and_cross_series_comparison():
    for question in ["Compare WA-FI1.2 and WA-FI2.5", "Compare WA-FI1.2 and WA-F02.5"]:
        response = client.post("/chat", json={"question": question})
        assert response.status_code == 200
        answer = response.json()["answer"]
        assert "WA-FI1.2" in answer and ("WA-FI2.5" in answer or "WA-F02.5" in answer)


def test_greeting_and_unknown_product():
    greeting = client.post("/chat", json={"question": "Hello"})
    assert greeting.status_code == 200
    assert greeting.json()["response_type"] == "greeting"
    unknown = client.post("/chat", json={"question": "Give specifications for UNKNOWN-XYZ"})
    assert unknown.status_code == 200
    assert unknown.json()["response_type"] == "not_found"


def test_case_study_category_pages_and_images():
    cases = {
        "Show classic creative LED case studies": [36, 37, 38, 39],
        "Show fine pitch LED projects": [40, 41],
        "Show indoor commercial LED projects": [42, 43],
        "Show outdoor advertising LED projects": [44, 45],
        "Show XR/VP projects": [46, 47, 48, 49],
        "Show culture and tourism projects": [50, 51],
        "Show stage design projects": [52, 53],
        "Show e-sports projects": [54],
    }
    for question, pages in cases.items():
        payload = client.post("/chat", json={"question": question}).json()
        assert payload["response_type"] == "case_study", question
        assert [image["page"] for image in payload["images"]] == pages
        assert [source["page"] for source in payload["sources"]] == pages
        for image in payload["images"]:
            assert client.get(image["url"]).status_code == 200


def test_all_case_study_pages_are_available():
    payload = client.post("/chat", json={"question": "Show all case studies"}).json()
    assert payload["response_type"] == "case_study"
    assert [x["page"] for x in payload["images"]] == list(range(36, 55))


def test_ambiguous_model_name_shows_all_matching_options():
    payload = client.post("/chat", json={"question": "P2.5 product details"}).json()
    assert payload["response_type"] == "product_choice"
    assert "Double-sided Ultra-thin Series" in payload["answer"]
    assert "Indoor SMD Small Pitch Series" in payload["answer"]
    assert len(payload["images"]) >= 3


def test_media_upload_list_fetch_and_delete():
    uploaded = client.post(
        "/media/upload?kind=audio",
        files={"file": ("smoke-test.mp3", b"ID3-test-audio", "audio/mpeg")},
    )
    assert uploaded.status_code == 200
    item = uploaded.json()["item"]
    try:
        listed = client.get("/media/list?kind=audio")
        assert any(entry["id"] == item["id"] for entry in listed.json()["items"])
        fetched = client.get(item["url"])
        assert fetched.status_code == 200 and fetched.content == b"ID3-test-audio"
    finally:
        assert client.delete(f"/media/{item['id']}").status_code == 200


def test_company_profile_and_explicit_pdf_page_citations():
    checks = {
        "Tell me about the company": 2,
        "What are the company milestones?": 3,
        "What is the company website?": 1,
        "Show me the company clients information": 9,
        "Tell me about PDF page 10": 10,
    }
    for question, page in checks.items():
        payload = client.post("/chat", json={"question": question}).json()
        assert payload["response_type"] == "catalog_page", (question, payload.get("response_type"))
        assert payload["sources"][0]["page"] == page
        assert "Whaley Catalog" in payload["sources"][0]["source"]
        assert f"Page: {page}" in payload["answer"]


def test_all_119_catalog_models_through_chat_api():
    import json
    from pathlib import Path
    from backend import product_db as product_database

    root = Path(__file__).resolve().parents[1]
    data = json.loads((root / "knowledge_base" / "products.json").read_text(encoding="utf-8"))
    index = product_database.get_index()
    for product in data["products"]:
        ambiguous = len(index.key_index.get(product_database._nk(product["id"]), [])) > 1
        query = f"{product['id']} {product['series_name']} product details" if ambiguous else f"{product['id']} product details"
        payload = client.post("/chat", json={"question": query}).json()
        assert payload["response_type"] == "product", (product["uid"], payload.get("response_type"))
        assert payload["sources"][0]["page"] == product["page"], product["uid"]
        assert payload["images"][0]["url"].endswith(product["image"].rsplit("/", 1)[-1]), product["uid"]
        for label, value, _ in product["specs"]:
            assert f"{label}: {value}" in payload["answer"], (product["uid"], label, value)


def test_video_library_upload_list_fetch_and_delete():
    uploaded = client.post(
        "/media/upload?kind=video",
        files={"file": ("smoke-test.mp4", b"fake-video-content", "video/mp4")},
    )
    assert uploaded.status_code == 200
    item = uploaded.json()["item"]
    try:
        listed = client.get("/media/list?kind=video")
        assert any(entry["id"] == item["id"] for entry in listed.json()["items"])
        fetched = client.get(item["url"])
        assert fetched.status_code == 200 and fetched.content == b"fake-video-content"
    finally:
        assert client.delete(f"/media/{item['id']}").status_code == 200


def test_warranty_answer_does_not_invent_duration():
    payload = client.post("/chat", json={"question": "What is the warranty period?"}).json()
    assert payload["sources"][0]["page"] == 8
    assert "does not state a fixed warranty duration" in payload["answer"]
