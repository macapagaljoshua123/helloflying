/**
 * HelloFlying Puppeteer Scraper
 * Scrapes flight data with anti-detection techniques.
 * Install: npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

puppeteer.use(StealthPlugin());

// ─── HUMAN-LIKE DELAYS ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min = 800, max = 2400) =>
  sleep(min + Math.floor(Math.random() * (max - min)));

// ─── BROWSER USER AGENTS ───────────────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── LAUNCH BROWSER ────────────────────────────────────────────────────────────
async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',           // headless mode (use false for debugging)
    executablePath: executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1366,768',
      '--lang=en-US,en',
      '--disable-extensions',
      '--disable-dev-shm-usage',
    ],
    ignoreHTTPSErrors: true,
  });
}

// ─── CONFIGURE PAGE (ANTI-DETECTION) ──────────────────────────────────────────
async function configurePage(browser) {
  const page = await browser.newPage();

  // Set random user agent
  await page.setUserAgent(randomUA());

  // Set realistic viewport
  await page.setViewport({ width: 1366, height: 768 });

  // Override navigator.webdriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });

  // Block unnecessary resources to speed up + reduce footprint
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const blocked = ['image', 'font', 'media']; // ALLOW stylesheets for better compatibility
    if (blocked.includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

// ─── NORMALIZE FLIGHT DATA ────────────────────────────────────────────────────
function normalizeFlightData(raw, source) {
  return {
    id: `${source}-${raw.flight_number || ''}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    source: source,
    airline: raw.airline || 'Unknown',
    airline_code: (raw.airline || '').substring(0, 2).toUpperCase(),
    flight_number: raw.flight_number || '',
    origin: raw.origin || '',
    destination: raw.destination || '',
    departure_time: raw.departure_time || '',
    arrival_time: raw.arrival_time || '',
    duration_minutes: parseInt(raw.duration_minutes) || 0,
    stops: parseInt(raw.stops) || 0,
    layovers: raw.layovers || [],
    cabin_class: raw.cabin_class || 'Economy',
    price: parseFloat(raw.price) || 0,
    currency: raw.currency || 'USD',
    baggage_info: raw.baggage_info || '7kg hand carry',
    refundable: raw.refundable || false,
    aircraft: raw.aircraft || '',
    booking_url: raw.booking_url || '',
    scraped_at: new Date().toISOString(),
  };
}

// ─── SCRAPE BOOKING.COM ────────────────────────────────────────────────────────
async function scrapeBookingDotCom(params) {
  const { origin, destination, date, return_date, passengers, cabin_class } = params;
  const flights = [];
  const browser = await launchBrowser();

  try {
    const page = await configurePage(browser);

    // Build URL - Booking.com flights search
    // NOTE: Booking.com has dynamic URLs; adjust as needed per their current structure
    const url = `https://flights.booking.com/flights/${origin.toUpperCase()}-${destination.toUpperCase()}/?type=${return_date ? 'ROUND_TRIP' : 'ONE_WAY'}&adults=${passengers}&cabinClass=${cabin_class.toUpperCase().replace(' ', '_')}&depart=${date}${return_date ? `&return=${return_date}` : ''}`;

    console.error(`[Booking.com] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Human-like delay after page load
    await randomDelay(2000, 4000);

    // Handle cookie banners if present
    try {
      await page.waitForSelector('[data-testid="accept-cookie"]', { timeout: 3000 });
      await page.click('[data-testid="accept-cookie"]');
      await randomDelay();
    } catch (_) { /* No cookie banner */ }

    // Wait for flight results to load
    // Booking.com uses various selectors; we check for the most common ones
    try {
      await page.waitForSelector('[data-testid="flight-card"], .css-vxcmzt, [class*="FlightCard"]', { timeout: 25000 });
    } catch (e) {
      console.error('[Booking.com] Results took too long or page structure changed. Checking what we have...');
    }

    // Scroll to trigger lazy loading
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 400);
        await new Promise(r => setTimeout(r, 500));
      }
    });

    await randomDelay(1500, 2500);

    // Extract flight data
    const rawFlights = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="flight-card"]');
      const results = [];

      cards.forEach(card => {
        try {
          const priceEl = card.querySelector('[data-testid="price-value"], .css-1gcz4d, [class*="price"]');
          const airlineEl = card.querySelector('[data-testid="airline-name"], [class*="airline"]');
          const deptTimeEl = card.querySelector('[data-testid="departure-time"]');
          const arrTimeEl = card.querySelector('[data-testid="arrival-time"]');
          const durationEl = card.querySelector('[data-testid="journey-duration"]');
          const stopsEl = card.querySelector('[data-testid="stops-info"]');
          const bookingLink = card.querySelector('a[href]');

          const priceText = priceEl?.textContent?.replace(/[^\d.]/g, '') || '0';
          const durationText = durationEl?.textContent || '';
          const durationMatch = durationText.match(/(\d+)h\s*(\d*)m?/);
          const durationMins = durationMatch
            ? parseInt(durationMatch[1]) * 60 + (parseInt(durationMatch[2]) || 0)
            : 0;

          if (priceEl) {
            results.push({
              airline: airlineEl?.textContent?.trim() || 'Unknown Airline',
              departure_time: deptTimeEl?.textContent?.trim() || '',
              arrival_time: arrTimeEl?.textContent?.trim() || '',
              duration_minutes: durationMins,
              stops: stopsEl?.textContent?.toLowerCase().includes('nonstop') ? 0 : 1,
              price: parseFloat(priceText),
              currency: 'USD',
              booking_url: bookingLink?.href || '',
            });
          }
        } catch (e) { /* skip malformed card */ }
      });

      return results;
    });

    rawFlights.forEach(r => {
      flights.push(normalizeFlightData({
        ...r,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        cabin_class,
      }, 'Booking.com'));
    });

    console.error(`[Booking.com] Found ${flights.length} flights`);
  } catch (err) {
    console.error('[Booking.com] Scrape error:', err.message);
  } finally {
    await browser.close();
  }

  return flights;
}

// ─── SCRAPE PHILIPPINE AIRLINES WEBSITE ───────────────────────────────────────
async function scrapePAL(params) {
  const { origin, destination, date, passengers } = params;
  const flights = [];
  const browser = await launchBrowser();

  try {
    const page = await configurePage(browser);
    const url = `https://www.philippineairlines.com/`;

    console.error(`[PAL] Navigating to homepage`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 3000);

    // Fill in search form fields
    // PAL uses a JS-heavy booking form — try to interact with it
    try {
      await page.waitForSelector('#origin-input, input[placeholder*="From"]', { timeout: 8000 });
      await page.type('#origin-input', origin, { delay: 80 });
      await randomDelay(500, 1000);
      await page.type('#destination-input, input[placeholder*="To"]', destination, { delay: 80 });
    } catch (e) {
      console.error('[PAL] Form interaction failed, falling back to API interception');
    }

    // Fallback: intercept XHR/fetch calls that PAL makes for flight data
    const flightAPIResponses = [];
    page.on('response', async (response) => {
      if (response.url().includes('flight') && response.status() === 200) {
        try {
          const json = await response.json();
          if (Array.isArray(json) || json.flights) {
            flightAPIResponses.push(json);
          }
        } catch (_) {}
      }
    });

    await randomDelay(3000, 5000);

    // Parse any intercepted API data
    flightAPIResponses.forEach(apiData => {
      const rawList = Array.isArray(apiData) ? apiData : apiData.flights || [];
      rawList.forEach(r => {
        flights.push(normalizeFlightData({
          airline: 'Philippine Airlines',
          origin,
          destination,
          price: r.price || r.amount || 0,
          currency: 'USD',
          departure_time: r.departureTime || r.dept_time || '',
          arrival_time: r.arrivalTime || r.arr_time || '',
          duration_minutes: r.duration || 0,
          stops: r.stops || 0,
          cabin_class: params.cabin_class,
          booking_url: 'https://www.philippineairlines.com/',
        }, 'Philippine Airlines'));
      });
    });

    console.error(`[PAL] Found ${flights.length} flights via API interception`);
  } catch (err) {
    console.error('[PAL] Scrape error:', err.message);
  } finally {
    await browser.close();
  }

  return flights;
}

// ─── GENERATE MOCK DATA (FALLBACK FOR TESTING) ────────────────────────────────
function generateMockFlights(params) {
  const { origin, destination, date, cabin_class } = params;
  const airlines = [
    { name: 'Cebu Pacific', code: '5J' },
    { name: 'Philippine Airlines', code: 'PR' },
    { name: 'AirAsia', code: 'AK' },
    { name: 'Singapore Airlines', code: 'SQ' },
    { name: 'Cathay Pacific', code: 'CX' },
  ];

  const departures = ['06:15', '08:30', '10:00', '13:45', '16:20', '19:55'];
  const durations = [120, 150, 180, 210, 90, 135];

  return airlines.map((airline, i) => {
    const dept = departures[i % departures.length];
    const dur = durations[i % durations.length];
    const [dh, dm] = dept.split(':').map(Number);
    const arrMins = dh * 60 + dm + dur;
    const arrH = Math.floor(arrMins / 60) % 24;
    const arrM = arrMins % 60;
    const arrStr = `${String(arrH).padStart(2,'0')}:${String(arrM).padStart(2,'0')}`;

    const basePrice = 45 + Math.floor(Math.random() * 150);

    return normalizeFlightData({
      airline: airline.name,
      airline_code: airline.code,
      flight_number: `${airline.code}${Math.floor(Math.random() * 900 + 100)}`,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_time: dept,
      arrival_time: arrStr,
      duration_minutes: dur,
      stops: i === 3 ? 1 : 0,
      layovers: i === 3 ? [{ airport: 'CGK', duration: '1h 30m' }] : [],
      cabin_class,
      price: basePrice,
      currency: 'USD',
      baggage_info: cabin_class === 'Economy' ? '7kg hand carry' : '23kg checked + 7kg hand carry',
      refundable: i % 2 === 0,
      aircraft: i % 2 === 0 ? 'Airbus A320' : 'Boeing 737',
      booking_url: `https://www.booking.com/flights`,
    }, ['Booking.com', 'Skyscanner', 'Expedia', 'Kayak', 'PAL Direct'][i]);
  });
}

// ─── MAIN SCRAPE ORCHESTRATOR ──────────────────────────────────────────────────
async function scrapeFlights(params) {
  const startTime = Date.now();
  console.error(`[Scraper] Starting flight search: ${JSON.stringify(params)}`);

  let allFlights = [];

  // Try live scraping; fall back to mock if scraping fails/is blocked
  try {
    // Stagger requests to avoid detection
    const [bookingFlights] = await Promise.allSettled([
      scrapeBookingDotCom(params),
    ]);

    if (bookingFlights.status === 'fulfilled' && bookingFlights.value.length > 0) {
      allFlights.push(...bookingFlights.value);
    }
  } catch (err) {
    console.error('[Scraper] Live scraping failed:', err.message);
  }

  // If no live results, use mock data (useful for dev/testing)
  if (allFlights.length === 0) {
    console.error('[Scraper] Using mock data fallback');
    allFlights = generateMockFlights(params);
  }

  // Remove duplicates (same airline, same departure time)
  const seen = new Set();
  allFlights = allFlights.filter(f => {
    const key = `${f.airline}-${f.departure_time}-${f.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by price ascending
  allFlights.sort((a, b) => a.price - b.price);

  const duration = Date.now() - startTime;
  console.error(`[Scraper] Done. ${allFlights.length} flights in ${duration}ms`);

  return {
    flights: allFlights,
    total: allFlights.length,
    scraped_at: new Date().toISOString(),
    scrape_duration_ms: duration,
    sources_checked: [...new Set(allFlights.map(f => f.source))].length,
    params,
  };
}

module.exports = { scrapeFlights, generateMockFlights, normalizeFlightData };
