@echo off
echo ========================================
echo  HelloFlying - Installing Puppeteer Scraper
echo ========================================

cd /d "%~dp0scraper"

echo Installing Node.js scraper dependencies...
echo (This downloads Chromium browser - may take a few minutes)
echo.
npm install

echo.
echo Testing scraper with mock data...
npm test

echo.
echo Done! Scraper is ready.
pause
