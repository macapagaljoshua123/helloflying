/**
 * run_scraper.js
 * Called by FastAPI backend as a subprocess.
 * Usage: node run_scraper.js '{"origin":"MNL","destination":"SIN","date":"2025-08-01",...}'
 * Outputs: JSON to stdout
 */

const { scrapeFlights } = require('./scraper');

async function main() {
  let params;

  try {
    params = JSON.parse(process.argv[2] || '{}');
  } catch (e) {
    console.error('Invalid JSON params:', e.message);
    process.exit(1);
  }

  if (!params.origin || !params.destination || !params.date) {
    console.error('Missing required params: origin, destination, date');
    process.exit(1);
  }

  try {
    const result = await scrapeFlights(params);
    // Output ONLY JSON to stdout (FastAPI reads this)
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (err) {
    console.error('[run_scraper] Fatal error:', err.message);
    process.exit(1);
  }
}

main();
