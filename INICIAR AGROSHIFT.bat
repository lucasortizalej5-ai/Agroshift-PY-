@echo off
setlocal
chcp 65001 >nul
title AgroShift PY - Inicio automatico
cd /d "%~dp0"
echo ==========================================
echo           AGROSHIFT PY
 echo ==========================================
if not exist "backend\app\main.py" goto missing
if not exist "frontend\package.json" goto missing
if not exist "backend\.venv\Scripts\python.exe" (
 echo Preparando Python por primera vez...
 py -3 -m venv "backend\.venv" 2>nul
 if not exist "backend\.venv\Scripts\python.exe" python -m venv "backend\.venv"
)
if not exist "backend\.venv\Scripts\python.exe" goto pythonerror
if not exist "backend\.venv\.agro_installed" (
 echo Instalando dependencias de Python. Esto solo ocurre la primera vez...
 "backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
 if errorlevel 1 goto installerror
 type nul > "backend\.venv\.agro_installed"
)
if not exist "frontend\node_modules\vite\package.json" (
 echo Instalando dependencias de la pagina. Esto solo ocurre la primera vez...
 pushd frontend
 call npm ci
 if errorlevel 1 (popd & goto installerror)
 popd
)
if not exist ".env" copy /y ".env.example" ".env" >nul
set "AGROSHIFT_API_PORT=8000"
set "AGROSHIFT_WEB_PORT=5173"
for /f %%P in ('backend\.venv\Scripts\python.exe -c "from dotenv import dotenv_values; from urllib.parse import urlparse; c=dotenv_values('.env'); print(urlparse(c.get('API_BASE_URL') or 'http://127.0.0.1:8000').port or 8000)"') do set "AGROSHIFT_API_PORT=%%P"
for /f %%P in ('backend\.venv\Scripts\python.exe -c "from dotenv import dotenv_values; print(int(dotenv_values('.env').get('PORT') or '5173'))"') do set "AGROSHIFT_WEB_PORT=%%P"
echo Iniciando los servicios...
start "AgroShift - Backend" /D "%CD%" cmd /k "backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port %AGROSHIFT_API_PORT%"
start "AgroShift - Pagina" /D "%CD%\frontend" cmd /k "npm run dev"
echo Esperando que la pagina responda...
set /a tries=0
:waitloop
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%AGROSHIFT_WEB_PORT%/ -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {} ; exit 1" >nul 2>&1
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% GEQ 30 goto slow
 timeout /t 2 /nobreak >nul
goto waitloop
:ready
start "" "http://127.0.0.1:%AGROSHIFT_WEB_PORT%/"
echo AgroShift abierto en el navegador.
echo Deja abiertas las dos ventanas de servicio mientras lo uses.
pause
exit /b 0
:slow
echo El inicio esta tardando mas de lo esperado.
echo Revisa las ventanas Backend y Pagina para ver el error.
pause
exit /b 1
:missing
echo ERROR: Coloca este archivo en la carpeta que contiene backend y frontend.
pause
exit /b 1
:pythonerror
echo ERROR: No se pudo preparar Python. Comprueba que Python este instalado.
pause
exit /b 1
:installerror
echo ERROR: Fallo una instalacion. Lee el mensaje anterior.
pause
exit /b 1
