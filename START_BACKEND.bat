@echo off
echo ========================================
echo  HelloFlying - Starting Backend (FastAPI)
echo ========================================

cd /d "%~dp0backend"

echo [1/2] Installing Python dependencies...
pip install -r requirements.txt --upgrade

echo.
echo [2/2] Starting FastAPI server on port 8000...
echo Open: http://localhost:8000/docs
echo.
python -m uvicorn main:app --reload --port 8000
