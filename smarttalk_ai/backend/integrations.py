"""Optional production integrations for SmartTalk AI.

All external services are disabled safely until configured in .env.
"""
from __future__ import annotations
import base64, hashlib, hmac, json, os, secrets, subprocess, tempfile, time
from pathlib import Path
from typing import Any
import httpx

BASE_DIR = Path(__file__).resolve().parent.parent


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def ai_ready() -> bool:
    return bool(_env("OPENAI_API_KEY"))


def _openai_headers() -> dict[str, str]:
    key = _env("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("AI service is not configured. Add OPENAI_API_KEY to .env.")
    return {"Authorization": f"Bearer {key}"}


def ask_ai(question: str, context: str = "") -> str:
    """Grounded general assistant response; caller supplies company context."""
    payload = {
        "model": _env("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": "You are SmartTalk AI, a helpful company product assistant. Treat supplied catalog context as authoritative. Never invent product specifications, prices, availability, certifications, or model compatibility. If context does not contain the answer, say so clearly. Answer concisely."},
            {"role": "user", "content": f"CATALOG CONTEXT:\n{context[:24000]}\n\nUSER QUESTION:\n{question}"},
        ],
        "temperature": 0.1,
    }
    with httpx.Client(timeout=90) as client:
        response = client.post("https://api.openai.com/v1/chat/completions", headers=_openai_headers(), json=payload)
        response.raise_for_status()
        data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def transcribe_audio(path: Path) -> str:
    with path.open("rb") as f, httpx.Client(timeout=180) as client:
        response = client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers=_openai_headers(),
            data={"model": _env("OPENAI_TRANSCRIBE_MODEL", "whisper-1")},
            files={"file": (path.name, f, "application/octet-stream")},
        )
        response.raise_for_status()
    return response.json().get("text", "").strip()


def analyze_image(path: Path, question: str) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    mime = {".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp"}.get(path.suffix.lower())
    if not mime:
        raise ValueError("Supported image formats: PNG, JPG, JPEG, WEBP")
    payload = {"model": _env("OPENAI_VISION_MODEL", "gpt-4o-mini"), "messages":[
        {"role":"system","content":"You are SmartTalk AI. Describe only what is visible. Do not infer product model/specifications unless clearly readable in the image."},
        {"role":"user","content":[{"type":"text","text":question or "Describe this image."},{"type":"image_url","image_url":{"url":f"data:{mime};base64,{encoded}"}}]},
    ],"max_tokens":700}
    with httpx.Client(timeout=120) as client:
        response=client.post("https://api.openai.com/v1/chat/completions",headers=_openai_headers(),json=payload)
        response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def analyze_video(path: Path, question: str) -> str:
    """Extract representative frames using ffmpeg and ask vision model about them."""
    ffmpeg = _env("FFMPEG_PATH", "ffmpeg")
    with tempfile.TemporaryDirectory(prefix="smarttalk_frames_") as temp:
        pattern = str(Path(temp) / "frame_%02d.jpg")
        command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(path), "-vf", "fps=1/10,scale=768:-1", "-frames:v", "8", pattern]
        run = subprocess.run(command, capture_output=True, text=True, timeout=120)
        frames = sorted(Path(temp).glob("frame_*.jpg"))
        if run.returncode != 0 or not frames:
            raise RuntimeError("Could not extract video frames. Check FFmpeg and video format.")
        content: list[dict[str, Any]] = [{"type":"text","text": f"Analyze these sampled frames from a video. User question: {question or 'Summarize the visible content.'}. Mention that only sampled frames were analyzed; do not claim to hear audio."}]
        for frame in frames:
            b64=base64.b64encode(frame.read_bytes()).decode("ascii")
            content.append({"type":"image_url","image_url":{"url":f"data:image/jpeg;base64,{b64}"}})
        payload={"model":_env("OPENAI_VISION_MODEL","gpt-4o-mini"),"messages":[{"role":"system","content":"You are SmartTalk AI video assistant. Describe visible events based only on supplied sampled frames. Do not infer unseen events or audio."},{"role":"user","content":content}],"max_tokens":900}
        with httpx.Client(timeout=180) as client:
            response=client.post("https://api.openai.com/v1/chat/completions",headers=_openai_headers(),json=payload)
            response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


def _secret() -> bytes:
    value = _env("APP_SECRET_KEY")
    if len(value) < 32:
        raise RuntimeError("Set APP_SECRET_KEY to a random value of at least 32 characters in .env")
    return value.encode()


def create_admin_token(password: str) -> str:
    configured = _env("ADMIN_PASSWORD")
    if not configured or not hmac.compare_digest(password, configured):
        raise PermissionError("Invalid admin credentials")
    expiry = int(time.time()) + 8 * 60 * 60
    body = base64.urlsafe_b64encode(json.dumps({"role":"admin","exp":expiry}).encode()).decode().rstrip("=")
    sig = hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def verify_admin_token(token: str) -> bool:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected): return False
        payload=json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        return payload.get("role") == "admin" and int(payload.get("exp",0)) > int(time.time())
    except Exception:
        return False


def sql_connection():
    """Return a pyodbc SQL Server connection, or None when not configured."""
    connection_string = _env("SQLSERVER_CONNECTION_STRING")
    if not connection_string:
        return None
    try:
        import pyodbc  # optional native dependency, installed on Windows host
    except ImportError as exc:
        raise RuntimeError("SQL Server is configured but pyodbc is missing. Install requirements-sqlserver.txt") from exc
    return pyodbc.connect(connection_string, timeout=5)


def init_sql() -> dict[str, Any]:
    conn=sql_connection()
    if conn is None: return {"configured":False,"connected":False,"message":"SQL Server connection string not configured"}
    try:
        cur=conn.cursor()
        cur.execute("""IF OBJECT_ID('dbo.SmartTalkChatHistory','U') IS NULL
        CREATE TABLE dbo.SmartTalkChatHistory (
          Id BIGINT IDENTITY(1,1) PRIMARY KEY,
          SessionId NVARCHAR(100) NULL,
          UserQuestion NVARCHAR(2000) NOT NULL,
          AssistantAnswer NVARCHAR(MAX) NOT NULL,
          ResponseType NVARCHAR(50) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        )""")
        conn.commit()
        return {"configured":True,"connected":True,"message":"SQL Server connected; chat history table ready"}
    finally: conn.close()


def save_chat(question: str, answer: str, response_type: str = "", session_id: str = "") -> bool:
    conn=sql_connection()
    if conn is None: return False
    try:
        cur=conn.cursor()
        cur.execute("INSERT INTO dbo.SmartTalkChatHistory(SessionId,UserQuestion,AssistantAnswer,ResponseType) VALUES(?,?,?,?)", session_id, question, answer, response_type)
        conn.commit(); return True
    finally: conn.close()


def admin_history(limit: int = 100) -> list[dict[str, Any]]:
    conn=sql_connection()
    if conn is None: raise RuntimeError("SQL Server is not configured")
    try:
        cur=conn.cursor()
        cur.execute("SELECT TOP (?) Id,SessionId,UserQuestion,AssistantAnswer,ResponseType,CreatedAt FROM dbo.SmartTalkChatHistory ORDER BY Id DESC", max(1,min(limit,500)))
        cols=[c[0] for c in cur.description]
        return [dict(zip(cols,row)) for row in cur.fetchall()]
    finally: conn.close()
