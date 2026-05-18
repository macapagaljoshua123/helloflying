import React, { useState, useContext, createContext } from 'react';
import { Settings, Bug, Sparkles, RefreshCw, XCircle, BarChart2, CheckCircle, ClipboardList, Wrench, Code, Globe, Plane, AlertCircle, Search, Award, Heart, ChevronUp, ChevronDown, Check, X, ExternalLink } from 'lucide-react';
import './SearchResults.css';

const SORT_OPTIONS = ['Best', 'Cheapest', 'Fastest', 'Earliest'];

const CurrencyContext = createContext();

const EXCHANGE_RATES = { USD: 1, PHP: 57.5, JPY: 155, EUR: 0.92, GBP: 0.79 };
const CURRENCY_SYMBOLS = { USD: '$', PHP: '₱', JPY: '¥', EUR: '€', GBP: '£' };

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`;
}

/* ─── DATA PIPELINE PANEL ─────────────────────────────────────────────────── */
function DataPipelinePanel({ results }) {
  const [activeTab, setActiveTab] = useState('schema');
  const [expandedJson, setExpandedJson] = useState(null);
  const { formatPrice } = useContext(CurrencyContext);

  if (!results || !results.flights) return null;

  const UNIFORM_SCHEMA = [
    { field: 'id', type: 'string', desc: 'Unique ID: source-flightNo-timestamp-hash', example: results.flights[0]?.id },
    { field: 'source', type: 'string', desc: 'Origin booking platform', example: results.flights[0]?.source },
    { field: 'airline', type: 'string', desc: 'Full airline name (normalized)', example: results.flights[0]?.airline },
    { field: 'airline_code', type: 'string', desc: 'IATA 2-letter code', example: results.flights[0]?.airline_code },
    { field: 'flight_number', type: 'string', desc: 'Flight number', example: results.flights[0]?.flight_number },
    { field: 'origin', type: 'string', desc: 'Origin IATA (uppercased)', example: results.flights[0]?.origin },
    { field: 'destination', type: 'string', desc: 'Destination IATA (uppercased)', example: results.flights[0]?.destination },
    { field: 'departure_time', type: 'string', desc: 'HH:MM 24-hr format', example: results.flights[0]?.departure_time },
    { field: 'arrival_time', type: 'string', desc: 'HH:MM 24-hr format', example: results.flights[0]?.arrival_time },
    { field: 'duration_minutes', type: 'int', desc: 'Total duration (preprocessed to int)', example: results.flights[0]?.duration_minutes },
    { field: 'stops', type: 'int', desc: 'Coerced to integer (0 = nonstop)', example: results.flights[0]?.stops },
    { field: 'layovers', type: 'array', desc: 'Normalized [{airport, duration}]', example: JSON.stringify(results.flights[0]?.layovers) },
    { field: 'cabin_class', type: 'string', desc: 'Economy | Premium Economy | Business | First Class', example: results.flights[0]?.cabin_class },
    { field: 'price', type: 'float', desc: 'Coerced to float, cleaned of symbols', example: results.flights[0]?.price },
    { field: 'currency', type: 'string', desc: 'Unified currency code', example: results.flights[0]?.currency },
    { field: 'baggage_info', type: 'string', desc: 'Standardized baggage description', example: results.flights[0]?.baggage_info },
    { field: 'refundable', type: 'boolean', desc: 'Coerced to bool', example: String(results.flights[0]?.refundable) },
    { field: 'aircraft', type: 'string', desc: 'Aircraft model if available', example: results.flights[0]?.aircraft },
    { field: 'booking_url', type: 'string', desc: 'Direct link to source booking page', example: 'https://...' },
    { field: 'scraped_at', type: 'string', desc: 'ISO 8601 timestamp of data capture', example: results.flights[0]?.scraped_at },
  ];

  const PREPROCESSING_STEPS = [
    { icon: <Bug size={20} />, step: 'Crawl', title: 'Multi-Source Scraping', desc: `Puppeteer stealth browser navigated ${results.sources_checked || 0} booking platforms (Booking.com, Skyscanner, Expedia, etc.) with anti-detection: random User-Agents, human-like delays, cookie banner handling.` },
    { icon: <Sparkles size={20} />, step: 'Clean', title: 'Data Cleaning', desc: 'Raw HTML elements parsed → price symbols stripped (₱, $, commas) → coerced to float. Duration strings ("3h 25m") parsed to integer minutes. Stop counts normalized to 0/1/2+.' },
    { icon: <RefreshCw size={20} />, step: 'Normalize', title: 'Schema Normalization', desc: `All ${results.total || 0} flight entries mapped to a uniform 20-field JSON schema. Every field has a defined type. Airport codes uppercased. Layovers standardized to [{airport, duration}].` },
    { icon: <XCircle size={20} />, step: 'Dedup', title: 'Deduplication', desc: 'Duplicate flights removed by composite key: airline + departure_time + price. Ensures no repeated entries across sources.' },
    { icon: <BarChart2 size={20} />, step: 'Sort', title: 'Price-Sort & Index', desc: 'Results sorted by price ascending. Each flight assigned a unique ID: source-flightCode-timestamp-hash for frontend tracking.' },
    { icon: <CheckCircle size={20} />, step: 'Validate', title: 'Backend Validation', desc: 'FastAPI Pydantic models enforce type constraints: price must be float, stops must be int, layovers must be array. Invalid entries rejected.' },
  ];

  const sources = [...new Set(results.flights.map(f => f.source))];

  return (
    <div className="pipeline-panel">
      <div className="pipeline-header">
        <div className="pipeline-title-row">
          <Settings className="pipeline-icon" size={24} />
          <h3>Data Pipeline & Preprocessing</h3>
        </div>
        <div className="pipeline-meta">
          <span className="pipeline-chip">{results.total} flights normalized</span>
          <span className="pipeline-chip">{results.sources_checked} sources</span>
          <span className="pipeline-chip">{results.scrape_duration_ms}ms total</span>
        </div>
      </div>

      <div className="pipeline-tabs">
        {[
          { key: 'schema', label: <><ClipboardList size={16} /> Uniform Schema</> },
          { key: 'preprocessing', label: <><Wrench size={16} /> Preprocessing</> },
          { key: 'raw', label: <><Code size={16} /> Raw JSON</> },
          { key: 'sources', label: <><Globe size={16} /> Sources</> },
        ].map(t => (
          <button
            key={t.key}
            className={`pipeline-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pipeline-content">
        {activeTab === 'schema' && (
          <div className="schema-tab">
            <p className="tab-desc">Every flight from every source is normalized into this <strong>20-field uniform schema</strong> before reaching the frontend:</p>
            <div className="schema-table-wrap">
              <table className="schema-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Sample Value</th>
                  </tr>
                </thead>
                <tbody>
                  {UNIFORM_SCHEMA.map((s, i) => (
                    <tr key={i}>
                      <td className="field-name">{s.field}</td>
                      <td><span className={`type-badge type-${s.type}`}>{s.type}</span></td>
                      <td className="field-desc">{s.desc}</td>
                      <td className="field-sample">{String(s.example ?? '—').substring(0, 40)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'preprocessing' && (
          <div className="preprocessing-tab">
            <p className="tab-desc">Data goes through <strong>6 preprocessing stages</strong> before it reaches your screen:</p>
            <div className="preprocess-steps">
              {PREPROCESSING_STEPS.map((s, i) => (
                <div key={i} className="preprocess-step">
                  <div className="step-connector">
                    <div className="step-dot">{s.icon}</div>
                    {i < PREPROCESSING_STEPS.length - 1 && <div className="step-line" />}
                  </div>
                  <div className="step-content">
                    <div className="step-header">
                      <span className="step-badge">Step {i + 1}</span>
                      <h4>{s.title}</h4>
                    </div>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="raw-tab">
            <p className="tab-desc">
              Raw API response — <strong>{results.total} uniform flight entries</strong>.
              Click any flight to expand its full JSON:
            </p>
            <div className="raw-summary">
              <pre className="json-block">{JSON.stringify({
                total: results.total,
                scraped_at: results.scraped_at,
                scrape_duration_ms: results.scrape_duration_ms,
                sources_checked: results.sources_checked,
                params: results.params,
                flights: `[...${results.total} entries]`,
              }, null, 2)}</pre>
            </div>
            <div className="raw-flights-list">
              {results.flights.map((f, i) => (
                <div key={f.id || i} className="raw-flight-entry">
                  <button
                    className={`raw-flight-toggle ${expandedJson === i ? 'open' : ''}`}
                    onClick={() => setExpandedJson(expandedJson === i ? null : i)}
                  >
                    <span className="raw-idx">#{i + 1}</span>
                    <span className="raw-airline">{f.airline}</span>
                    <span className="raw-route">{f.origin} → {f.destination}</span>
                    <span className="raw-price">{f.price}</span>
                    <span className="raw-source">{f.source}</span>
                    <span className="raw-arrow">{expandedJson === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                  </button>
                  {expandedJson === i && (
                    <pre className="json-block json-full">{JSON.stringify(f, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="sources-tab">
            <p className="tab-desc">Flights gathered from <strong>{sources.length} data sources</strong>, each contributing to the unified dataset:</p>
            <div className="sources-grid">
              {sources.map(src => {
                const srcFlights = results.flights.filter(f => f.source === src);
                const avgPrice = srcFlights.reduce((sum, f) => sum + f.price, 0) / srcFlights.length;
                const cheapest = Math.min(...srcFlights.map(f => f.price));
                return (
                  <div key={src} className="source-card">
                    <div className="source-card-header">
                      <Globe className="source-card-icon" size={20} />
                      <h4>{src}</h4>
                    </div>
                    <div className="source-stats">
                      <div className="source-stat">
                        <span className="source-stat-label">Flights</span>
                        <span className="source-stat-value">{srcFlights.length}</span>
                      </div>
                      <div className="source-stat">
                        <span className="source-stat-label">Cheapest</span>
                        <span className="source-stat-value gold">{formatPrice(cheapest)}</span>
                      </div>
                      <div className="source-stat">
                        <span className="source-stat-label">Avg Price</span>
                        <span className="source-stat-value">{formatPrice(avgPrice)}</span>
                      </div>
                    </div>
                    <div className="source-flights-mini">
                      {srcFlights.map((f, j) => (
                        <div key={j} className="mini-flight">
                          <span>{f.airline_code} {f.flight_number}</span>
                          <span>{f.departure_time} → {f.arrival_time}</span>
                          <span className="gold">{formatPrice(f.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FLIGHT CARD ─────────────────────────────────────────────────────────── */
function FlightCard({ flight, index, onSaveFlight, searchParams }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { formatPrice } = useContext(CurrencyContext);

  const handleSaveFlight = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Please sign in to save flights');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/save-flight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          flight: flight,
          search_params: searchParams
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
      alert(err.message || 'Failed to save flight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flight-card ${index === 0 ? 'best-deal' : ''} ${expanded ? 'expanded' : ''}`}>
      {index === 0 && <div className="best-badge"><Award size={16} style={{ marginRight: 4 }} /> Best Deal</div>}

      <div className="flight-main" onClick={() => setExpanded(!expanded)}>
        <div className="airline-info">
          <div className="airline-logo"><Plane size={24} /></div>
          <div className="airline-name-wrap">
            <div className="airline-name">{flight.airline}</div>
            <div className="flight-number">{flight.flight_number}</div>
          </div>
        </div>

        <div className="flight-route">
          <div className="time-block">
            <div className="time">{flight.departure_time}</div>
            <div className="airport">{flight.origin}</div>
          </div>
          <div className="route-line">
            <div className="stops-label">
              {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            </div>
            <div className="line-bar">
              <div className="line" />
              <Plane size={16} className="plane-icon" style={{ fill: 'currentColor' }} />
            </div>
            <div className="duration">{formatDuration(flight.duration_minutes)}</div>
          </div>
          <div className="time-block">
            <div className="time">{flight.arrival_time}</div>
            <div className="airport">{flight.destination}</div>
          </div>
        </div>

        <div className="flight-price-col">
          <div className="price">{formatPrice(flight.price)}</div>
          <div className="price-note">per person</div>
          <div className="source-badge">{flight.source}</div>
        </div>

        <div className="expand-btn">{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
      </div>

      {expanded && (
        <div className="flight-details">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Cabin Class</span>
              <span className="detail-value">{flight.cabin_class}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Baggage</span>
              <span className="detail-value">{flight.baggage_info || '7kg hand carry'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Aircraft</span>
              <span className="detail-value">{flight.aircraft || 'Boeing 737'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Refundable</span>
              <span className={`detail-value ${flight.refundable ? 'green' : 'red'}`}>
                {flight.refundable ? <><Check size={16} style={{ marginRight: 4 }} /> Yes</> : <><X size={16} style={{ marginRight: 4 }} /> No</>}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Scraped At</span>
              <span className="detail-value">{new Date(flight.scraped_at).toLocaleTimeString()}</span>
            </div>
          </div>

          {flight.stops > 0 && flight.layovers && (
            <div className="layovers">
              <div className="layover-title">Layover Info</div>
              {flight.layovers.map((l, i) => (
                <div key={i} className="layover-item">
                  <span>{l.airport}</span>
                  <span>{l.duration}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card-actions">
            <button className="btn-book" onClick={() => window.open(flight.booking_url, '_blank')}>
              Book on {flight.source} <ExternalLink size={16} style={{ marginLeft: 6 }} />
            </button>
            <button
              className={`btn-save ${saved ? 'saved' : ''}`}
              onClick={handleSaveFlight}
              disabled={saving}
            >
              <Heart size={16} style={{ marginRight: 6 }} />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN SEARCH RESULTS ─────────────────────────────────────────────────── */
export default function SearchResults({ results, params, loading, error, onReset }) {
  const [sort, setSort] = useState('Best');
  const [filterStops, setFilterStops] = useState('All');
  const [filterAirline, setFilterAirline] = useState('All');
  const [showPipeline, setShowPipeline] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const formatPrice = (priceInUSD) => {
    const converted = priceInUSD * EXCHANGE_RATES[currency];
    return `${CURRENCY_SYMBOLS[currency]}${Number(converted.toFixed(0)).toLocaleString()}`;
  };

  const saveCurrentSearch = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setSaveMessage('Please sign in to save this search');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(`${API_URL}/api/save-search-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          search_params: {
            origin: params?.origin,
            destination: params?.destination,
            date: params?.date,
            return_date: params?.returnDate || '',
            passengers: params?.passengers,
            cabin_class: params?.cabinClass
          },
          results: {
            flights: results?.flights,
            total: results?.total,
            scraped_at: results?.scraped_at
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to save');
      }

      setSaveMessage('Search saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveMessage(err.message || 'Failed to save search');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="results-loading">
        <div className="orbit-animation-container">
          <Globe size={64} className="orbit-globe" />
          <div className="orbit-path">
            <Plane size={28} className="orbit-plane" />
          </div>
        </div>
        <h2>Searching exact live prices...</h2>
        <p>We're connecting to real-time airline databases. This takes a few seconds.</p>
        <div className="loading-bar"><div className="loading-bar-fill" /></div>
        <div className="loading-sources">
          {['Google Flights'].map(s => (
            <span key={s} className="source-tag">{s}</span>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-error">
        <AlertCircle size={48} className="error-icon" />
        <h2>Search failed</h2>
        <p>{error}</p>
        <button className="btn-back" onClick={onReset}>← Try Again</button>
      </div>
    );
  }

  if (!results || !results.flights || results.flights.length === 0) {
    return (
      <div className="results-error">
        <Search size={48} className="error-icon" />
        <h2>No flights found</h2>
        <p>Try adjusting your search parameters or dates.</p>
        <button className="btn-back" onClick={onReset}>← New Search</button>
      </div>
    );
  }

  const airlines = ['All', ...new Set(results.flights.map(f => f.airline))];
  const stopsOptions = ['All', 'Nonstop', '1 Stop', '2+ Stops'];

  let flights = [...results.flights];

  if (filterAirline !== 'All') flights = flights.filter(f => f.airline === filterAirline);
  if (filterStops === 'Nonstop') flights = flights.filter(f => f.stops === 0);
  else if (filterStops === '1 Stop') flights = flights.filter(f => f.stops === 1);
  else if (filterStops === '2+ Stops') flights = flights.filter(f => f.stops >= 2);

  if (sort === 'Cheapest') flights.sort((a, b) => a.price - b.price);
  else if (sort === 'Fastest') flights.sort((a, b) => a.duration_minutes - b.duration_minutes);
  else if (sort === 'Earliest') flights.sort((a, b) => a.departure_time.localeCompare(b.departure_time));

  const cheapest = Math.min(...flights.map(f => f.price));

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      <div className="results-page">
        {/* Header */}
        <div className="results-header">
          <button className="btn-back" onClick={onReset}>← Back</button>
          <div className="search-summary">
            <h2>{params?.origin} → {params?.destination}</h2>
            <span>{params?.date}{params?.returnDate ? ` → ${params?.returnDate}` : ''} · {params?.passengers} pax · {params?.cabinClass}</span>
          </div>
          <div className="results-meta">
            <select className="currency-selector" value={currency} onChange={e => setCurrency(e.target.value)} style={{ marginRight: '12px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)' }}>
              {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c} style={{ color: '#333' }}>{c}</option>)}
            </select>
            {flights.length} results · Updated {new Date(results.scraped_at || Date.now()).toLocaleTimeString()}
          </div>
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-pill">
            <span className="stat-pl">Cheapest</span>
            <span className="stat-pv gold">{formatPrice(cheapest)}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pl">Sources</span>
            <span className="stat-pv">{results.sources_checked || 3} sites</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pl">Scan time</span>
            <span className="stat-pv">{results.scrape_duration_ms || '—'}ms</span>
          </div>
          <button
            className="save-search-btn"
            onClick={saveCurrentSearch}
            disabled={saving}
          >
            <Heart size={16} style={{ marginRight: 6 }} /> {saving ? 'Saving...' : 'Save This Search'}
          </button>
          <button
            className={`pipeline-toggle-btn ${showPipeline ? 'active' : ''}`}
            onClick={() => setShowPipeline(!showPipeline)}
          >
            <Settings size={16} style={{ marginRight: 8 }} /> {showPipeline ? 'Hide' : 'View'} Data Pipeline
          </button>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
            {saveMessage}
          </div>
        )}

        {/* Data Pipeline Panel */}
        {showPipeline && <DataPipelinePanel results={results} />}

        <div className="results-layout">
          {/* Sidebar Filters */}
          <aside className="filters-sidebar">
            <h3>Filters</h3>

            <div className="filter-group">
              <div className="filter-label">Stops</div>
              {stopsOptions.map(s => (
                <label key={s} className="filter-option">
                  <input
                    type="radio"
                    name="stops"
                    checked={filterStops === s}
                    onChange={() => setFilterStops(s)}
                  />
                  {s}
                </label>
              ))}
            </div>

            <div className="filter-group">
              <div className="filter-label">Airlines</div>
              {airlines.map(a => (
                <label key={a} className="filter-option">
                  <input
                    type="radio"
                    name="airline"
                    checked={filterAirline === a}
                    onChange={() => setFilterAirline(a)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </aside>

          {/* Results List */}
          <div className="results-list">
            <div className="sort-bar">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s}
                  className={`sort-btn ${sort === s ? 'active' : ''}`}
                  onClick={() => setSort(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {flights.map((flight, i) => (
              <FlightCard 
                key={flight.id || i} 
                flight={flight} 
                index={i} 
                onSaveFlight={saveCurrentSearch} 
                searchParams={params}
              />
            ))}
          </div>
        </div>
      </div>
    </CurrencyContext.Provider>
  );
}