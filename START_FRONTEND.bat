@echo off
echo ========================================
echo  HelloFlying - Starting Frontend (React)
echo ========================================

cd /d "%~dp0"

echo [1/2] Installing React dependencies...
npm install

echo.
echo [2/2] Starting React app on port 3000...
echo Open: http://localhost:3000
echo.
npm start
