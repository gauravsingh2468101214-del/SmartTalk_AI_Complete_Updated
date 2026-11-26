@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo  KalpLabs Website + SmartTalk AI  (one click)
echo ==========================================

where python >nul 2>nul || (echo [ERROR] Python install nahi hai. https://www.python.org/downloads/ se install karo ^(Add to PATH tick karna^). & pause & exit /b 1)
where node >nul 2>nul || (echo [ERROR] Node.js install nahi hai. https://nodejs.org se LTS install karo. & pause & exit /b 1)

if not exist "smarttalk_ai\.venv\Scripts\python.exe" (
  echo [1/3] SmartTalk AI pehli baar setup ho raha hai ^(thoda time lagega^)...
  pushd smarttalk_ai
  python -m venv .venv || goto err
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip || goto err
  python -m pip install -r requirements.txt || goto err
  popd
)

if not exist "website\node_modules" (
  echo [2/3] Website pehli baar setup ho rahi hai...
  pushd website
  call npm install || goto err
  popd
)

echo [3/3] Start ho raha hai...
start "SmartTalk AI Backend (port 8000)" cmd /k "cd /d %~dp0smarttalk_ai && call .venv\Scripts\activate.bat && python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000"
start "KalpLabs Website (port 5173)" cmd /k "cd /d %~dp0website && npm run dev -- --host 127.0.0.1 --port 5173"
timeout /t 10 >nul
start http://127.0.0.1:5173
echo.
echo Website: http://127.0.0.1:5173   ^|   Chatbot API: http://127.0.0.1:8000/health
echo Band karne ke liye dono black windows band kar do.
pause
exit /b 0
:err
echo [ERROR] Setup fail hua. Upar ka error padho.
pause
exit /b 1
