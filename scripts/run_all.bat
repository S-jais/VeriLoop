@echo off
echo ============================================================
echo Starting VeriLoop Autonomous Reliability Engineering System
echo ============================================================

start "VeriLoop Backend (FastAPI)" cmd /k "cd /d backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "VeriLoop Frontend (Next.js)" cmd /k "cd /d frontend && npm run dev"

echo.
echo VeriLoop services are starting:
echo - Backend API:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)
echo - Frontend UI:  http://localhost:3000
echo.
pause
