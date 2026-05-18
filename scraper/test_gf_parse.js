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
    
    console.log("Extracting items...");
    const items = await page.evaluate(() => {
        // Let's find elements that look like flight rows
        // Google Flights rows usually have role="listitem" or are <li> inside the results
        const liList = Array.from(document.querySelectorAll('li'));
        return liList.map((li, index) => {
            return {
                index,
                text: li.innerText.trim(),
                html: li.innerHTML.substring(0, 200)
            };
        }).filter(item => {
            // Filter elements that have a time like "6:55 AM" and "10:30 AM" and some duration/price
            return item.text.length > 50 && /\d+:\d+/.test(item.text);
        });
    });

    console.log("Found items:", items.length);
    console.log(JSON.stringify(items.slice(0, 3), null, 2));
    await browser.close();
});
