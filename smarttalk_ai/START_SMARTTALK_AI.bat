@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Virtual environment not found. Run SETUP_SMARTTALK_AI.bat first.
    pause
    exit /b 1
)
call ".venv\Scripts\activate.bat"
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
pause
