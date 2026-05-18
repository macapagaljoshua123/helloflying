const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  await page.goto('https://www.google.com/travel/flights?q=Flights%20to%20SIN%20from%20MNL%20on%202026-05-20', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 6000));
  
  const flights = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div[role="listitem"]'));
    return items.map(i => i.innerText.replace(/\n/g, ' | '));
  });
  
  console.log(JSON.stringify(flights.slice(0, 5), null, 2));
  await browser.close();
}

run();
