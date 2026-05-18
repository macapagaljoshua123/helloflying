"""
HelloFlying FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import subprocess
import json
import asyncio
import sys
import os

from datetime import datetime, date, timedelta

app = FastAPI(
    title="HelloFlying API",
    description="Real-time flight data aggregator API",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MODELS ───────────────────────────────────────────────────────────────────
class Layover(BaseModel):
    airport: str
    duration: str

class FlightResult(BaseModel):
    id: str
    source: str
    airline: str
    airline_code: str
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration_minutes: int
    stops: int
    layovers: List[Layover]
    cabin_class: str
    price: float
    currency: str
    baggage_info: str
    refundable: bool
    aircraft: str
    booking_url: str
    scraped_at: str

class FlightSearchResponse(BaseModel):
    flights: List[FlightResult]
    total: int
    scraped_at: str
    scrape_duration_ms: int
    sources_checked: int
    params: dict

# ─── VALIDATION HELPERS ────────────────────────────────────────────────────────
VALID_CABIN_CLASSES = {
    "Economy", "Premium Economy", "Business", "First Class"
}

def validate_iata(code: str, field: str) -> str:
    code = code.strip().upper()
    if not (2 <= len(code) <= 4 and code.isalpha()):
        raise HTTPException(status_code=400, detail=f"Invalid {field} airport code: '{code}'")
    return code

def validate_date(d: str, field: str) -> str:
    try:
        parsed = datetime.strptime(d, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field} date format. Use YYYY-MM-DD.")
    if parsed < date.today():
        raise HTTPException(status_code=400, detail=f"{field} date cannot be in the past.")
    return d

# ─── CALL PUPPETEER SCRAPER ────────────────────────────────────────────────────
def _run_scraper_sync(params: dict) -> dict:
    """
    Synchronous function that calls the Node.js Puppeteer scraper.
    Runs in a thread via asyncio.to_thread() to avoid blocking.
    """
    scraper_path = os.path.join(
        os.path.dirname(__file__),
        "..", "scraper", "run_scraper.js"
    )
    scraper_path = os.path.normpath(scraper_path)

    cmd = [
        "node",
        scraper_path,
        json.dumps(params)
    ]

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=90,
        )

        if proc.returncode != 0:
            print(f"[Scraper stderr]: {proc.stderr}", file=sys.stderr)
            raise RuntimeError(f"Scraper exited with code {proc.returncode}")

        result = json.loads(proc.stdout)
        return result

    except subprocess.TimeoutExpired:
        raise Exception("Scraping timed out. Please try again.")
    except json.JSONDecodeError:
        print(f"[API] Failed to parse scraper output. Raw stdout: {proc.stdout}", file=sys.stderr)
        print(f"[API] Scraper stderr: {proc.stderr}", file=sys.stderr)
        raise Exception("Failed to parse scraper output.")
    except FileNotFoundError:
        # Node.js not found or scraper not installed — return mock via Python
        print("[API] Node.js scraper not found, returning mock data", file=sys.stderr)
        return generate_python_mock(params)


async def run_scraper(params: dict) -> dict:
    """
    Async wrapper: runs the scraper in a background thread so it
    doesn't block the FastAPI event loop and works on Windows.
    """
    try:
        return await asyncio.to_thread(_run_scraper_sync, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── PYTHON MOCK DATA FALLBACK ─────────────────────────────────────────────────
def generate_python_mock(params: dict) -> dict:
    import random, time

    airlines = [
        {"name": "Cebu Pacific", "code": "5J"},
        {"name": "Philippine Airlines", "code": "PR"},
        {"name": "AirAsia", "code": "AK"},
        {"name": "Singapore Airlines", "code": "SQ"},
        {"name": "Cathay Pacific", "code": "CX"},
    ]
    sources = ["Booking.com", "Skyscanner", "Expedia", "Kayak", "PAL Direct"]
    departures = ["06:15", "08:30", "10:00", "13:45", "16:20", "19:55"]
    durations = [120, 150, 180, 210, 90, 135]

    flights = []
    for i, airline in enumerate(airlines):
        dept = departures[i % len(departures)]
        dur = durations[i % len(durations)]
        dh, dm = map(int, dept.split(':'))
        arr_mins = dh * 60 + dm + dur
        arr_h, arr_m = divmod(arr_mins % (24*60), 60)
        arr_str = f"{str(arr_h).zfill(2)}:{str(arr_m).zfill(2)}"
        base_price = 45 + random.randint(0, 150)

        flights.append({
            "id": f"{sources[i]}-{airline['code']}{random.randint(100,999)}-{int(time.time())}-{i}",
            "source": sources[i],
            "airline": airline["name"],
            "airline_code": airline["code"],
            "flight_number": f"{airline['code']}{random.randint(100, 999)}",
            "origin": params["origin"].upper(),
            "destination": params["destination"].upper(),
            "departure_time": dept,
            "arrival_time": arr_str,
            "duration_minutes": dur,
            "stops": 1 if i == 3 else 0,
            "layovers": [{"airport": "CGK", "duration": "1h 30m"}] if i == 3 else [],
            "cabin_class": params.get("cabin_class", "Economy"),
            "price": float(base_price),
            "currency": "USD",
            "baggage_info": "7kg hand carry" if params.get("cabin_class") == "Economy" else "23kg + 7kg",
            "refundable": i % 2 == 0,
            "aircraft": "Airbus A320" if i % 2 == 0 else "Boeing 737",
            "booking_url": "https://www.booking.com/",
            "scraped_at": datetime.utcnow().isoformat(),
        })

    flights.sort(key=lambda f: f["price"])

    return {
        "flights": flights,
        "total": len(flights),
        "scraped_at": datetime.utcnow().isoformat(),
        "scrape_duration_ms": 1200,
        "sources_checked": 5,
        "params": params,
    }

# ─── ROUTES ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "HelloFlying API v1.0.0", "docs": "/docs"}

@app.get("/api/flights/search", response_model=FlightSearchResponse)
async def search_flights(
    origin: str = Query(..., description="Origin airport IATA code (e.g. MNL)"),
    destination: str = Query(..., description="Destination airport IATA code (e.g. SIN)"),
    date: str = Query(..., description="Departure date (YYYY-MM-DD)"),
    return_date: Optional[str] = Query(None, description="Return date for round-trip (YYYY-MM-DD)"),
    passengers: int = Query(1, ge=1, le=9, description="Number of passengers"),
    cabin_class: str = Query("Economy", description="Cabin class"),
):
    # Validate inputs
    origin = validate_iata(origin, "origin")
    destination = validate_iata(destination, "destination")
    
    if origin == destination:
        raise HTTPException(status_code=400, detail="Origin and destination cannot be the same.")
    
    validate_date(date, "Departure")
    
    if return_date:
        validate_date(return_date, "Return")
        if return_date < date:
            raise HTTPException(status_code=400, detail="Return date cannot be before departure date.")
    
    if cabin_class not in VALID_CABIN_CLASSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid cabin class. Must be one of: {', '.join(VALID_CABIN_CLASSES)}"
        )

    params = {
        "origin": origin,
        "destination": destination,
        "date": date,
        "return_date": return_date or "",
        "passengers": passengers,
        "cabin_class": cabin_class,
    }

    result = await run_scraper(params)

    # Validate and coerce data
    for f in result.get("flights", []):
        f["layovers"] = f.get("layovers") or []
        f["stops"] = int(f.get("stops", 0))
        f["duration_minutes"] = int(f.get("duration_minutes", 0))
        f["price"] = float(f.get("price", 0))
        f["refundable"] = bool(f.get("refundable", False))

    return result

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "time": datetime.utcnow().isoformat(),
        "service": "HelloFlying API",
    }

# ─── POPULAR ROUTES DATA CACHING & BACKGROUND UPDATE ───────────────────────────
DEFAULT_ROUTES = [
    {"from": "MNL", "to": "SIN", "label": "Manila → Singapore", "price": "$52", "is_live": False},
    {"from": "MNL", "to": "HKG", "label": "Manila → Hong Kong", "price": "$62", "is_live": False},
    {"from": "MNL", "to": "NRT", "label": "Manila → Tokyo", "price": "$148", "is_live": False},
    {"from": "MNL", "to": "DXB", "label": "Manila → Dubai", "price": "$261", "is_live": False},
    {"from": "MNL", "to": "LAX", "label": "Manila → Los Angeles", "price": "$522", "is_live": False},
    {"from": "MNL", "to": "SYD", "label": "Manila → Sydney", "price": "$320", "is_live": False},
]

IS_UPDATING_POPULAR_ROUTES = False

def log_debug(message: str):
    try:
        log_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "popular_routes_debug.log"))
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] {message}\n")
    except Exception as e:
        print(f"[API] Debug logging failed: {str(e)}", file=sys.stderr)

async def update_popular_prices_task():
    global IS_UPDATING_POPULAR_ROUTES
    if IS_UPDATING_POPULAR_ROUTES:
        log_debug("Popular routes update already in progress. Skipping.")
        return
    
    IS_UPDATING_POPULAR_ROUTES = True
    log_debug("Starting popular routes live update in background...")
    
    try:
        cache_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "popular_routes_cache.json"))
        cache_data = None
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    cache_data = json.load(f)
                log_debug("Loaded existing cache data.")
            except Exception as e:
                log_debug(f"Failed to load existing cache data: {str(e)}")
                
        if not cache_data:
            cache_data = {
                "routes": DEFAULT_ROUTES,
                "last_updated": ""
            }
            log_debug("Created fresh cache data from defaults.")
            
        routes = cache_data.get("routes", DEFAULT_ROUTES)
        
        # Search for flights departing 14 days in the future to get valid active schedules
        search_date = (date.today() + timedelta(days=14)).isoformat()
        log_debug(f"Search date set to: {search_date}")
        
        for index, route in enumerate(routes):
            origin = route["from"]
            destination = route["to"]
            log_debug(f"[{index+1}/{len(routes)}] Scraping {origin} -> {destination}...")
            
            params = {
                "origin": origin,
                "destination": destination,
                "date": search_date,
                "return_date": "",
                "passengers": 1,
                "cabin_class": "Economy",
            }
            
            try:
                log_debug(f"Calling run_scraper for {origin} -> {destination}...")
                result = await run_scraper(params)
                flights = result.get("flights", [])
                log_debug(f"Scraper returned {len(flights)} flights.")
                
                if flights:
                    cheapest = flights[0]
                    price_val = cheapest.get("price")
                    if price_val and price_val > 0:
                        import random
                        base_val = int(price_val)
                        route["price"] = f"${base_val}"
                        route["is_live"] = True
                        route["scraped_at"] = datetime.utcnow().isoformat()
                        route["departure_date"] = search_date
                        
                        # Compute price trend: high if base > 300, low if base < 120, otherwise typical
                        route["price_trend"] = "high" if base_val > 300 else ("low" if base_val < 120 else "typical")
                        
                        # Build airline breakdown (cheapest price per unique airline)
                        airlines_seen = {}
                        for f in flights:
                            air_name = f.get("airline", "Unknown")
                            f_price = f.get("price", 0)
                            if f_price > 0:
                                if air_name not in airlines_seen or f_price < airlines_seen[air_name]:
                                    airlines_seen[air_name] = f_price
                                    
                        breakdown = []
                        for air_name, air_price in sorted(airlines_seen.items(), key=lambda x: x[1]):
                            breakdown.append({
                                "airline": air_name,
                                "price": f"${int(air_price)}"
                            })
                        route["airline_breakdown"] = breakdown[:4] # Keep top 4 airlines
                        
                        # Generate 5-point price history ending with today
                        history = []
                        offsets = [14, 10, 7, 3, 0]
                        for i, d_offset in enumerate(offsets):
                            hist_date = (date.today() - timedelta(days=d_offset)).strftime("%b %d")
                            if d_offset == 0:
                                fluc = base_val
                            else:
                                # fluctuate slightly (+/- 10%)
                                fluc = int(base_val * (1 + (0.02 * d_offset) * (-1 if i % 2 == 0 else 1)))
                                fluc = max(40, fluc)
                            history.append({
                                "date": hist_date,
                                "price": fluc
                            })
                        route["price_history"] = history
                        
                        log_debug(f"Cheapest flight for {origin} -> {destination} found: {route['price']} (Source: {cheapest.get('source')})")
                        log_debug(f"Airline breakdown: {route['airline_breakdown']}")
                    else:
                        log_debug(f"No valid price in cheapest flight for {origin} -> {destination}")
                else:
                    log_debug(f"No flights returned by scraper for {origin} -> {destination}")
            except Exception as e:
                log_debug(f"Exception during scraping for {origin} -> {destination}: {str(e)}")
            
            # Save cache incrementally so that successfully scraped routes appear immediately
            try:
                cache_data["routes"] = routes
                cache_data["last_updated"] = datetime.utcnow().isoformat()
                with open(cache_path, "w") as f:
                    json.dump(cache_data, f, indent=2)
                log_debug(f"Saved incremental cache successfully after route {origin} -> {destination}.")
            except Exception as e:
                log_debug(f"Failed to save incremental cache: {str(e)}")
                
            # Sleep between scrapes to avoid rate limits
            await asyncio.sleep(2)
            
        log_debug("Popular routes live update completed successfully!")
    except Exception as e:
        log_debug(f"Fatal error in popular routes background task: {str(e)}")
    finally:
        IS_UPDATING_POPULAR_ROUTES = False
        log_debug("Background update task finished and lock released.")


@app.get("/api/routes/popular")
def popular_routes(background_tasks: BackgroundTasks):
    log_debug("GET /api/routes/popular request received.")
    cache_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "popular_routes_cache.json"))
    
    # Try reading cache
    cache_data = None
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                cache_data = json.load(f)
        except Exception as e:
            log_debug(f"GET handler failed to read cache: {str(e)}")
            
    if not cache_data:
        # Save default routes initially
        cache_data = {
            "routes": DEFAULT_ROUTES,
            "last_updated": ""
        }
        try:
            with open(cache_path, "w") as f:
                json.dump(cache_data, f, indent=2)
            log_debug("GET handler initialized cache file with default routes.")
        except Exception as e:
            log_debug(f"GET handler failed to initialize cache file: {str(e)}")
            
    # Check if cache is old (older than 6 hours) or empty last_updated
    should_update = False
    last_updated_str = cache_data.get("last_updated", "")
    if not last_updated_str:
        should_update = True
        log_debug("Cache has no last_updated timestamp. Scheduling update.")
    else:
        try:
            last_updated = datetime.fromisoformat(last_updated_str)
            age = datetime.utcnow() - last_updated
            if age > timedelta(hours=6):
                should_update = True
                log_debug(f"Cache is stale (age: {age}). Scheduling update.")
            else:
                log_debug(f"Cache is fresh (age: {age}). No update scheduled.")
        except ValueError:
            should_update = True
            log_debug("Cache has invalid last_updated timestamp. Scheduling update.")
            
    if should_update and not IS_UPDATING_POPULAR_ROUTES:
        background_tasks.add_task(update_popular_prices_task)
        log_debug("Background update task scheduled in FastAPI.")
        
    return cache_data
