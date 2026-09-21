@echo off
cd /d C:\Users\Sebo\Desktop\carajo
start "Joji Server" powershell.exe -NoExit -Command "Set-Location 'C:\Users\Sebo\Desktop\carajo'; C:\Python311\python.exe -m http.server 5173"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:5173/lab/joji-sebo-rana/
