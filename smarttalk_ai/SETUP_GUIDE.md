# SmartTalk AI — Windows Setup & Test Guide

## 1. What is included

- Whaley 54-page catalog as the primary product source.
- Structured database for 119 models across 25 product series.
- Exact product answers with catalog page references and registered product images.
- Product comparison, series/model listing, ambiguous-model clarification, and unknown-product refusal.
- Searchable company profile pages (PDF pages 1–9) and explicit page lookup (pages 1–35).
- Case-study categories and original rendered page images for PDF pages 36–54.
- Chat UI, browser microphone input, speech playback controls, audio/video library, and optional AI media-analysis controls.
- Optional authenticated admin page and SQL Server chat-history persistence.

## 2. Install on Windows 11

Open PowerShell in the extracted project folder (the folder containing `backend`, `frontend`, and `requirements.txt`). Run:

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Or double-click `SETUP_SMARTTALK_AI.bat` to create the environment and install the standard dependencies.

## 3. Configure private integrations

Run:

```powershell
python configure_smarttalk.py
```

- Set an OpenAI API key if image analysis, audio transcription, video analysis, or optional LLM answers are needed.
- Set a strong admin password (at least 12 characters) and keep `.env` private.
- Set a SQL Server connection string only if SQL Server chat-history storage is needed.
- The core PDF-grounded product chatbot works without an OpenAI API key.

For SQL Server, first install Microsoft ODBC Driver 18 for SQL Server, then run:

```powershell
python -m pip install -r requirements-sqlserver.txt
```

See `database/README.txt` for the SQL Server table and connection requirements. The target database must already exist. The app does not create a database or change SQL Server security settings.

## 4. Start the chatbot

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Or double-click `START_SMARTTALK_AI.bat` after setup.

- Chatbot: http://127.0.0.1:8000/
- Admin: http://127.0.0.1:8000/admin
- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health
- Integration status: http://127.0.0.1:8000/health/integrations

## 5. Run the tests

From the project root, with `.venv` active:

```powershell
python -m pytest -q
python tools/verify_db_against_pdf.py
python -m backend.test_products
python -m backend.test_flex
python -m backend.test_roll
python -m backend.test_floor
node --check frontend/script.js
```

Do not run `backend/test_*.py` by file path. Run the module commands shown above from the project root so Python can resolve the `backend` package.

## 6. Important limitations / external checks

- OpenAI-backed endpoints remain disabled until a valid `OPENAI_API_KEY` is configured. A live API call must be tested on the user's machine.
- SQL Server persistence remains disabled until the SQL Server instance, database, ODBC driver, and connection string are configured and reachable.
- Video analysis requires FFmpeg and analyzes up to eight sampled visual frames; it does not transcribe video audio.
- Browser microphone input depends on browser support and microphone permission. Test it in Chrome or Edge on the target computer.
- PDF pages 36–54 are photographic case-study collages. The chatbot displays the relevant page images and headings, but will not guess individual client names or hidden technical details.
- The catalog contains apparent printed inconsistencies listed in `CATALOG_DATA_ISSUES.md`. They are preserved as printed and should be confirmed by the manufacturer before correction.
- This is a local demo/deployment package. Do not expose it publicly without HTTPS, rate limiting, access controls, secure media storage, backups, and production monitoring.
