const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
}).then(async browser => {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    console.log("Navigating to HelloFlying Frontend...");
    await page.goto('http://localhost:3000', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 2000));

    // Clear origin input and type MNL
    console.log("Typing origin: MNL");
    const originInput = await page.$('input[placeholder*="From" i], input[id*="origin" i]');
    if (originInput) {
        await originInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.sendCharacter('MNL');
    }
    await new Promise(r => setTimeout(r, 500));

    // Clear destination input and type SIN
    console.log("Typing destination: SIN");
    const destInput = await page.$('input[placeholder*="To" i], input[id*="destination" i]');
    if (destInput) {
        await destInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.sendCharacter('SIN');
    }
    await new Promise(r => setTimeout(r, 500));

    // Set dates
    console.log("Setting dates");
    const dateInputs = await page.$$('input[type="date"]');
    if (dateInputs.length > 0) {
        await dateInputs[0].click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.sendCharacter('2026-06-01');
    }
    if (dateInputs.length > 1) {
        await dateInputs[1].click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.sendCharacter('2026-06-05');
    }
    await new Promise(r => setTimeout(r, 500));

    // Click Search Flights button
    console.log("Clicking Search...");
    const searchBtn = await page.$('button[type="submit"], button[class*="search" i]');
    if (searchBtn) {
        await searchBtn.click();
    } else {
        await page.click('button');
    }

    console.log("Waiting for search loading...");
    await new Promise(r => setTimeout(r, 20000)); // wait 20 seconds for search to scrape and display results

    console.log("Taking initial results screenshot...");
    await page.screenshot({path: 'search_results_usd.png', fullPage: true});

    // Select currency dropdown and change to PHP
    console.log("Changing currency to PHP...");
    const currencySelect = await page.$('select[class*="currency" i]');
    if (currencySelect) {
        await currencySelect.select('PHP');
        await new Promise(r => setTimeout(r, 1500));
    }

    // Click the first flight card to expand
    console.log("Expanding first flight card...");
    const flightCard = await page.$('.flight-main');
    if (flightCard) {
        await flightCard.click();
        await new Promise(r => setTimeout(r, 1500));
    }

    // Click View Data Pipeline
    console.log("Clicking View Data Pipeline...");
    const pipelineBtn = await page.$('.pipeline-toggle-btn');
    if (pipelineBtn) {
        await pipelineBtn.click();
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("Taking final PHP results screenshot...");
    await page.screenshot({path: 'search_results_php.png', fullPage: true});

    console.log("Done.");
    await browser.close();
}).catch(err => {
    console.error("Test flow failed:", err);
});
