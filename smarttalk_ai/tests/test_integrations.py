from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_integrations_health_is_safe_without_secrets(monkeypatch):
    for key in ["OPENAI_API_KEY", "SQLSERVER_CONNECTION_STRING", "ADMIN_PASSWORD"]:
        monkeypatch.delenv(key, raising=False)
    response = client.get("/health/integrations")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ai_configured"] is False
    assert payload["sql_server_configured"] is False
    assert payload["admin_configured"] is False


def test_admin_page_is_served():
    response = client.get("/admin")
    assert response.status_code == 200
    assert "SmartTalk AI Admin" in response.text


def test_admin_history_requires_authentication():
    response = client.get("/admin/history")
    assert response.status_code == 401


def test_ai_endpoints_report_missing_configuration(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/ai/ask", json={"question": "What products are available?"})
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_admin_token_authentication(monkeypatch):
    from backend.integrations import create_admin_token, verify_admin_token
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password-at-least-12")
    monkeypatch.setenv("APP_SECRET_KEY", "x" * 48)
    token = create_admin_token("test-password-at-least-12")
    assert verify_admin_token(token) is True
    assert verify_admin_token(token + "bad") is False


def test_admin_login_requires_correct_credentials(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin-test")
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password-at-least-12")
    monkeypatch.setenv("APP_SECRET_KEY", "x" * 48)
    ok = client.post("/admin/login", json={"username": "admin-test", "password": "test-password-at-least-12"})
    assert ok.status_code == 200
    assert ok.json()["token_type"] == "bearer"
    bad = client.post("/admin/login", json={"username": "admin-test", "password": "wrong-password"})
    assert bad.status_code == 401


def test_image_audio_video_analysis_require_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    img = client.post("/ai/analyze-image", files={"file": ("test.png", b"fake", "image/png")})
    aud = client.post("/ai/transcribe-audio", files={"file": ("test.wav", b"fake", "audio/wav")})
    vid = client.post("/ai/analyze-video", files={"file": ("test.mp4", b"fake", "video/mp4")})
    assert img.status_code == aud.status_code == vid.status_code == 503
