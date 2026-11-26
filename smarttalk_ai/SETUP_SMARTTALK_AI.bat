@echo off
cd /d "%~dp0"
echo ==========================================
echo SmartTalk AI - Setup
echo ==========================================
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
    if errorlevel 1 goto error
)
call ".venv\Scripts\activate.bat"
python -m pip install --upgrade pip
if errorlevel 1 goto error
python -m pip install -r requirements.txt
if errorlevel 1 goto error
echo.
echo Setup complete. Next run configure_smarttalk.py, then START_SMARTTALK_AI.bat.
pause
exit /b 0
:error
echo Setup failed. Read the error above and check Python installation.
pause
exit /b 1
