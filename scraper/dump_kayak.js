const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
}).then(async browser => {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    console.log("Navigating...");
    await page.goto('https://www.kayak.com/flights/MNL-SIN/2026-06-01/economy/1adults?sort=price_a', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 5000));
    console.log("Extracting...");
    const html = await page.evaluate(() => document.body.innerHTML);
    require('fs').writeFileSync('kayak.html', html);
    console.log("Done.");
    await browser.close();
});
