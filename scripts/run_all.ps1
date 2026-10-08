Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting VeriLoop Autonomous Reliability Engineering System" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\backend'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "VeriLoop services are starting:" -ForegroundColor Green
Write-Host "- Backend API:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)" -ForegroundColor White
Write-Host "- Frontend UI:  http://localhost:3000" -ForegroundColor White
Write-Host ""
