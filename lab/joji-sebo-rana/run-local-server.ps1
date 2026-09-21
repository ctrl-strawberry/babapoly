Set-Location (Join-Path $PSScriptRoot "..\..")
Start-Process cmd.exe -ArgumentList '/k', 'C:\Python311\python.exe -m http.server 5173'
Start-Sleep -Seconds 2
Start-Process 'http://127.0.0.1:5173/lab/joji-sebo-rana/'
