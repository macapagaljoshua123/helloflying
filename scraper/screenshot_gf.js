const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
}).then(async browser => {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    console.log("Navigating to Google Flights...");
    await page.goto('https://www.google.com/travel/flights?q=Flights%20to%20SIN%20from%20MNL%20on%202026-06-01', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 8000));
    console.log("Taking screenshot...");
    await page.screenshot({path: 'google_flights.png', fullPage: true});
    console.log("Done.");
    await browser.close();
});
