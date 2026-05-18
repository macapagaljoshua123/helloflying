import React, { useState, useEffect } from 'react';
import { Plane, Calendar, Search, MapPin, PlaneTakeoff, PlaneLanding, Settings, User, AlertCircle, BarChart, DollarSign, Cpu, ArrowRight, ArrowLeftRight, Repeat, LayoutGrid } from 'lucide-react';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';
import SavedSearchesModal from './SavedSearchesModal';
import './LandingPage.css';

const POPULAR_ROUTES = [
  { from: 'MNL', to: 'SIN', label: 'Manila → Singapore', price: '$52' },
  { from: 'MNL', to: 'HKG', label: 'Manila → Hong Kong', price: '$62' },
  { from: 'MNL', to: 'NRT', label: 'Manila → Tokyo', price: '$148' },
  { from: 'MNL', to: 'DXB', label: 'Manila → Dubai', price: '$261' },
  { from: 'MNL', to: 'LAX', label: 'Manila → Los Angeles', price: '$522' },
  { from: 'MNL', to: 'SYD', label: 'Manila → Sydney', price: '$320' },
];

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First Class'];

const AIRPORTS = [
  { code: 'MNL', city: 'Manila', country: 'Philippines', name: 'Ninoy Aquino Intl' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Changi Airport' },
  { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', name: 'Hong Kong Intl' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', name: 'Narita Intl' },
  { code: 'HND', city: 'Tokyo', country: 'Japan', name: 'Haneda Airport' },
  { code: 'DXB', city: 'Dubai', country: 'UAE', name: 'Dubai Intl' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA', name: 'Los Angeles Intl' },
  { code: 'SYD', city: 'Sydney', country: 'Australia', name: 'Sydney Airport' },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi Airport' },
  { code: 'ICN', city: 'Seoul', country: 'South Korea', name: 'Incheon Intl' },
  { code: 'JFK', city: 'New York', country: 'USA', name: 'John F. Kennedy Intl' },
  { code: 'LHR', city: 'London', country: 'UK', name: 'Heathrow Airport' },
  { code: 'CDG', city: 'Paris', country: 'France', name: 'Charles de Gaulle Airport' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', name: 'Frankfurt Airport' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', name: 'Kuala Lumpur Intl' },
  { code: 'TPE', city: 'Taipei', country: 'Taiwan', name: 'Taoyuan Intl' },
  { code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam', name: 'Tan Son Nhat Intl' },
  { code: 'CGK', city: 'Jakarta', country: 'Indonesia', name: 'Soekarno-Hatta Intl' },
  { code: 'BOS', city: 'Boston', country: 'USA', name: 'Logan Intl' },
  { code: 'SFO', city: 'San Francisco', country: 'USA', name: 'San Francisco Intl' },
  { code: 'DOH', city: 'Doha', country: 'Qatar', name: 'Hamad Intl' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', name: 'Schiphol Airport' },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function LandingPage({ onSearch, error }) {
  const [tripType, setTripType] = useState('roundtrip');
  const [form, setForm] = useState({
    origin: 'MNL',
    destination: '',
    date: '',
    returnDate: '',
    passengers: 1,
    cabinClass: 'Economy',
  });
  const [formError, setFormError] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [popularRoutes, setPopularRoutes] = useState(POPULAR_ROUTES);
  const [activeInsightRoute, setActiveInsightRoute] = useState(null);
  const [trackedRoutes, setTrackedRoutes] = useState(() => {
    try {
      const saved = localStorage.getItem('tracked_routes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/routes/popular')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch popular routes');
        return res.json();
      })
      .then(data => {
        if (data && data.routes) {
          setPopularRoutes(data.routes);
        }
      })
      .catch(err => {
        console.error('Error fetching popular routes:', err);
      });
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const filteredAirports = (query) => {
    if (!query) return AIRPORTS;
    const q = query.toLowerCase();
    return AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
    );
  };

  useEffect(() => {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const duration = 1500;
      const step = target / (duration / 16);
      let current = 0;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        counter.textContent = Math.floor(current).toLocaleString() + (counter.getAttribute('data-suffix') || '');
      }, 16);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.origin.trim()) return setFormError('Please enter origin airport.');
    if (!form.destination.trim()) return setFormError('Please enter destination airport.');
    if (!form.date) return setFormError('Please select a departure date.');
    if (tripType === 'roundtrip' && !form.returnDate) return setFormError('Please select a return date.');
    if (form.date < today) return setFormError('Departure date cannot be in the past.');

    onSearch({ ...form, returnDate: tripType === 'oneway' ? '' : form.returnDate });
  };

  const handleQuickRoute = (route) => {
    setForm(prev => ({
      ...prev,
      origin: route.from,
      destination: route.to,
      date: route.departure_date || today
    }));
    document.getElementById('date-input')?.focus();
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setUser(null);
      setIsLoggingOut(false);
    }, 2200);
  };

  const handleSelectSavedSearch = (search) => {
    setForm({
      ...form,
      origin: search.origin,
      destination: search.destination,
      date: search.departure_date,
      returnDate: search.return_date || '',
      passengers: search.passengers,
      cabinClass: search.cabin_class
    });
  };

  const generateSvgPath = (points) => {
    if (!points || points.length === 0) return '';
    const prices = points.map(p => p.price);
    const minP = Math.min(...prices) * 0.9;
    const maxP = Math.max(...prices) * 1.1;

    return points.map((pt, idx) => {
      const x = (idx / (points.length - 1)) * 500;
      const y = 120 - ((pt.price - minP) / (maxP - minP || 1)) * 90;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="landing">
      {/* Background */}
      <div className="bg-layer">
        <div className="stars" />
        <div className="aurora" />
        <div className="plane-trail" />
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <Plane className="logo-icon" />
          <span className="logo-text">Hello<strong>Flying</strong></span>
        </div>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#routes">Routes</a>
          <a href="#about">About</a>
        </div>
        {user ? (
          <UserMenu user={user} onLogout={handleLogout} onOpenSavedSearches={() => setShowSavedSearches(true)} />
        ) : (
          <button className="btn-signin" onClick={() => setShowAuthModal(true)}>Sign In</button>
        )}
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span className="pulse-dot" />
          Live prices from 50+ airlines
        </div>

        <h1 className="hero-title">
          Find Your<br />
          <span className="gradient-text">Cheapest Flight</span><br />
          Anywhere
        </h1>

        <p className="hero-subtitle">
          Real-time fare scraping across top booking platforms.<br />
          No ads. No markups. Just the best price.
        </p>

        {/* Search Form */}
        <div className="search-card">
          <div className="trip-type-tabs">
            {['roundtrip', 'oneway', 'multicity'].map(type => (
              <button
                key={type}
                className={`tab-btn ${tripType === type ? 'active' : ''}`}
                onClick={() => setTripType(type)}
              >
                {type === 'roundtrip' ? <><Repeat size={16} style={{ marginRight: 6 }} /> Round Trip</> : type === 'oneway' ? <><ArrowRight size={16} style={{ marginRight: 6 }} /> One Way</> : <><LayoutGrid size={16} style={{ marginRight: 6 }} /> Multi-City</>}
              </button>
            ))}
          </div>

          <form className="search-form" onSubmit={handleSubmit}>
            <div className="form-row main-inputs">
              <div className="form-field" style={{ position: 'relative' }}>
                <label>From</label>
                <div className="input-icon-wrap">
                  <PlaneTakeoff className="input-icon" size={18} />
                  <input
                    type="text"
                    name="origin"
                    value={form.origin}
                    onChange={(e) => { handleChange(e); setActiveDropdown('origin'); }}
                    onFocus={() => setActiveDropdown('origin')}
                    onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                    placeholder="Origin (e.g. MNL, Tokyo)"
                    maxLength={30}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                {activeDropdown === 'origin' && (
                  <div className="autocomplete-dropdown">
                    {filteredAirports(form.origin).map(a => (
                      <div
                        key={a.code}
                        className="autocomplete-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm(prev => ({ ...prev, origin: a.code }));
                          setActiveDropdown(null);
                        }}
                      >
                        <div className="ac-code">{a.code}</div>
                        <div className="ac-details">
                          <span className="ac-city">{a.city}, {a.country}</span>
                          <span className="ac-name">{a.name}</span>
                        </div>
                      </div>
                    ))}
                    {filteredAirports(form.origin).length === 0 && (
                      <div className="autocomplete-empty">No airports found</div>
                    )}
                  </div>
                )}
              </div>

              <button type="button" className="swap-btn" onClick={() =>
                setForm(prev => ({ ...prev, origin: prev.destination, destination: prev.origin }))
              }><ArrowLeftRight size={20} /></button>

              <div className="form-field" style={{ position: 'relative' }}>
                <label>To</label>
                <div className="input-icon-wrap">
                  <PlaneLanding className="input-icon" size={18} />
                  <input
                    type="text"
                    name="destination"
                    value={form.destination}
                    onChange={(e) => { handleChange(e); setActiveDropdown('destination'); }}
                    onFocus={() => setActiveDropdown('destination')}
                    onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                    placeholder="Destination (e.g. SIN, Dubai)"
                    maxLength={30}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                {activeDropdown === 'destination' && (
                  <div className="autocomplete-dropdown">
                    {filteredAirports(form.destination).map(a => (
                      <div
                        key={a.code}
                        className="autocomplete-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm(prev => ({ ...prev, destination: a.code }));
                          setActiveDropdown(null);
                        }}
                      >
                        <div className="ac-code">{a.code}</div>
                        <div className="ac-details">
                          <span className="ac-city">{a.city}, {a.country}</span>
                          <span className="ac-name">{a.name}</span>
                        </div>
                      </div>
                    ))}
                    {filteredAirports(form.destination).length === 0 && (
                      <div className="autocomplete-empty">No airports found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row date-row">
              <div className="form-field">
                <label>Departure</label>
                <div className="input-icon-wrap">
                  <Calendar className="input-icon" size={18} />
                  <input
                    id="date-input"
                    type="date"
                    name="date"
                    value={form.date}
                    min={today}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {tripType === 'roundtrip' && (
                <div className="form-field">
                  <label>Return</label>
                  <div className="input-icon-wrap">
                    <Calendar className="input-icon" size={18} />
                    <input
                      type="date"
                      name="returnDate"
                      value={form.returnDate}
                      min={form.date || today}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className="form-field form-field-sm">
                <label>Passengers</label>
                <select name="passengers" value={form.passengers} onChange={handleChange}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>
                  ))}
                </select>
              </div>

              <div className="form-field form-field-sm">
                <label>Class</label>
                <select name="cabinClass" value={form.cabinClass} onChange={handleChange}>
                  {CABIN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {(formError || error) && (
              <div className="form-error"><AlertCircle size={16} style={{ marginRight: 6 }} /> {formError || error}</div>
            )}

            <button type="submit" className="search-btn">
              <Search size={18} style={{ marginRight: 8 }} /> Search Flights
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat">
            <div className="stat-number" data-target="50" data-suffix="+">0+</div>
            <div className="stat-label">Airlines</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat-number" data-target="180" data-suffix="+">0+</div>
            <div className="stat-label">Destinations</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat-number" data-target="2400000" data-suffix="+">0+</div>
            <div className="stat-label">Tickets Found</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat-number" data-target="35" data-suffix="% avg">0%</div>
            <div className="stat-label">Savings</div>
          </div>
        </div>
      </section>

      {/* Quick Routes */}
      <section id="routes" className="popular-routes">
        <h2>Popular Routes</h2>
        <p className="section-sub">Click a route for Live Insights & Price Tracking</p>
        <div className="routes-grid">
          {popularRoutes.map((route, i) => (
            <button key={i} className="route-card" onClick={() => setActiveInsightRoute(route)}>
              <div className="route-label">{route.label}</div>
              <div className="route-price">
                from {route.price}
                {route.is_live && (
                  <span className="live-badge" title="Verified live price from Google Flights">
                    <span className="live-dot" /> Live
                  </span>
                )}
              </div>
              <div className="route-arrow"><ArrowRight size={20} /></div>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="how-section">
        <h2>How Hello Flying Works</h2>
        <div className="steps-grid">
          {[
            { icon: <Search size={24} />, step: '01', title: 'Enter Your Route', desc: 'Type your origin, destination, and travel dates.' },
            { icon: <Cpu size={24} />, step: '02', title: 'AI Scrapes Live Prices', desc: 'Our bots check Booking.com, Skyscanner & more in real-time.' },
            { icon: <BarChart size={24} />, step: '03', title: 'We Normalize All Data', desc: 'Prices are unified into one comparable format instantly.' },
            { icon: <DollarSign size={24} />, step: '04', title: 'You Pick & Save', desc: 'Choose the best deal and get redirected to book directly.' },
          ].map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-icon">{s.icon}</div>
              <div className="step-number">{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo"><Plane size={18} style={{ marginRight: 6 }} /> HelloFlying</div>
        <p>© 2025 HelloFlying Corp. All rights reserved.</p>
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#contact">Contact</a>
        </div>
      </footer>

      {/* Popular Route Insights & Price Tracking Modal */}
      {activeInsightRoute && (
        <div className="insight-modal-overlay" onClick={() => setActiveInsightRoute(null)}>
          <div className="insight-modal-content" onClick={e => e.stopPropagation()}>
            <button className="insight-modal-close" onClick={() => setActiveInsightRoute(null)}>
              &times;
            </button>

            <div className="insight-modal-header">
              <h3>{activeInsightRoute.label}</h3>
              <p className="insight-subtitle">Live Flight Insights & Price Tracking</p>
            </div>

            <div className="insight-modal-body">
              <div className="tracker-toggle-card">
                <div className="tracker-info">
                  <div className="tracker-title">Track prices</div>
                  <div className="tracker-desc">
                    {activeInsightRoute.departure_date
                      ? `For departure on ${new Date(activeInsightRoute.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : 'For upcoming flight dates'}
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!trackedRoutes[`${activeInsightRoute.from}-${activeInsightRoute.to}`]}
                    onChange={(e) => {
                      const key = `${activeInsightRoute.from}-${activeInsightRoute.to}`;
                      const updated = { ...trackedRoutes, [key]: e.target.checked };
                      setTrackedRoutes(updated);
                      localStorage.setItem('tracked_routes', JSON.stringify(updated));
                    }}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {trackedRoutes[`${activeInsightRoute.from}-${activeInsightRoute.to}`] && (
                <div className="tracker-alert">
                  <AlertCircle size={16} />
                  <span>Price tracking is now active! We'll alert you if prices drop below {activeInsightRoute.price}.</span>
                </div>
              )}

              <div className={`price-trend-banner ${activeInsightRoute.price_trend || 'typical'}`}>
                <div className="trend-icon-wrapper">
                  <DollarSign size={20} />
                </div>
                <div className="trend-details">
                  <div className="trend-status">
                    Prices are currently <strong>{(activeInsightRoute.price_trend || 'typical').toUpperCase()}</strong>
                  </div>
                  <p className="trend-desc">
                    {activeInsightRoute.price_trend === 'high'
                      ? `Fares are currently higher than usual for this route. We suggest tracking or waiting to book.`
                      : activeInsightRoute.price_trend === 'low'
                        ? `Fares are currently lower than usual! This is an excellent time to lock in your flight.`
                        : `Fares are typical for these dates. Prices are stable and ready for booking.`}
                  </p>
                </div>
              </div>

              {activeInsightRoute.price_history && activeInsightRoute.price_history.length > 0 && (
                <div className="price-history-section">
                  <h4>30-Day Price Trend</h4>
                  <div className="price-history-chart">
                    <svg viewBox="0 0 500 150" className="chart-svg">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" />
                      <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.05)" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.05)" />

                      <path
                        d={generateSvgPath(activeInsightRoute.price_history)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      <path
                        d={`${generateSvgPath(activeInsightRoute.price_history)} L 500 150 L 0 150 Z`}
                        fill="url(#chartGrad)"
                      />

                      {activeInsightRoute.price_history.map((pt, idx) => {
                        const x = (idx / (activeInsightRoute.price_history.length - 1)) * 500;
                        const prices = activeInsightRoute.price_history.map(p => p.price);
                        const minP = Math.min(...prices) * 0.9;
                        const maxP = Math.max(...prices) * 1.1;
                        const y = 120 - ((pt.price - minP) / (maxP - minP || 1)) * 90;
                        return (
                          <g key={idx} className="chart-dot-group">
                            <circle cx={x} cy={y} r="5" fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                            <text x={x} y={y - 12} className="chart-tooltip-text" textAnchor="middle">
                              ${pt.price}
                            </text>
                            <text x={x} y="145" className="chart-axis-text" textAnchor="middle">
                              {pt.date}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}

              <div className="airlines-comparison-section">
                <h4>Cheapest Airline Fares</h4>
                <div className="airlines-list">
                  {activeInsightRoute.airline_breakdown && activeInsightRoute.airline_breakdown.length > 0 ? (
                    activeInsightRoute.airline_breakdown.map((item, idx) => (
                      <div key={idx} className="airline-price-item">
                        <div className="airline-name-wrapper">
                          <Plane size={16} className="airline-icon" />
                          <span className="airline-name">{item.airline}</span>
                        </div>
                        <div className="airline-price-action">
                          <span className="airline-price-val">{item.price}</span>
                          <button
                            className="btn-select-airline"
                            onClick={() => {
                              handleQuickRoute(activeInsightRoute);
                              setActiveInsightRoute(null);
                            }}
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="airline-price-item">
                      <div className="airline-name-wrapper">
                        <Plane size={16} className="airline-icon" />
                        <span className="airline-name">Google Flights Cheapest Fare</span>
                      </div>
                      <div className="airline-price-action">
                        <span className="airline-price-val">{activeInsightRoute.price}</span>
                        <button
                          className="btn-select-airline"
                          onClick={() => {
                            handleQuickRoute(activeInsightRoute);
                            setActiveInsightRoute(null);
                          }}
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="insight-modal-footer">
              <button
                className="btn-search-route-full"
                onClick={() => {
                  handleQuickRoute(activeInsightRoute);
                  setActiveInsightRoute(null);
                }}
              >
                Search Flights for this Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Saved Searches Modal */}
      <SavedSearchesModal
        isOpen={showSavedSearches}
        onClose={() => setShowSavedSearches(false)}
        onSelectSearch={handleSelectSavedSearch}
      />

      {/* Fullscreen Sign Out Overlay */}
      {isLoggingOut && (
        <div className="signout-overlay">
          <div className="signout-stars">
            {[...Array(20)].map((_, i) => (
              <div key={i} className={`signout-star star-${i}`} />
            ))}
          </div>
          
          <div className="signout-container">
            <div className="signout-plane-glow-wrapper">
              <div className="signout-plane-track">
                <Plane className="signout-plane-icon" size={64} />
              </div>
            </div>
            
            <h2 className="signout-title">Signing Out</h2>
            <p className="signout-subtitle">Preparing your next adventure. See you soon!</p>
            
            <div className="signout-loader-bar">
              <div className="signout-loader-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}