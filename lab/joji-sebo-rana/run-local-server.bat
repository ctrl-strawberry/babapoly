@echo off
setlocal
cd /d "%~dp0\..\.."
start "Joji Split Rank Server" cmd /k "C:\Python311\python.exe -m http.server 5173"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:5173/lab/joji-sebo-rana/
