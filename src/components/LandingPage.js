import React, { useState, useEffect } from 'react';
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

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Animate stat counters
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
    setForm(prev => ({ ...prev, origin: route.from, destination: route.to }));
    document.getElementById('date-input')?.focus();
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
          <span className="logo-icon">✈</span>
          <span className="logo-text">Hello<strong>Flying</strong></span>
        </div>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#routes">Routes</a>
          <a href="#about">About</a>
        </div>
        <button className="btn-signin">Sign In</button>
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
                {type === 'roundtrip' ? '⇆ Round Trip' : type === 'oneway' ? '→ One Way' : '⊞ Multi-City'}
              </button>
            ))}
          </div>

          <form className="search-form" onSubmit={handleSubmit}>
            <div className="form-row main-inputs">
              <div className="form-field">
                <label>From</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">🛫</span>
                  <input
                    type="text"
                    name="origin"
                    value={form.origin}
                    onChange={handleChange}
                    placeholder="Origin (e.g. MNL)"
                    maxLength={4}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <button type="button" className="swap-btn" onClick={() =>
                setForm(prev => ({ ...prev, origin: prev.destination, destination: prev.origin }))
              }>⇆</button>

              <div className="form-field">
                <label>To</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">🛬</span>
                  <input
                    type="text"
                    name="destination"
                    value={form.destination}
                    onChange={handleChange}
                    placeholder="Destination (e.g. SIN)"
                    maxLength={4}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row date-row">
              <div className="form-field">
                <label>Departure</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">📅</span>
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
                    <span className="input-icon">📅</span>
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
                  {[1,2,3,4,5,6,7,8,9].map(n => (
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
              <div className="form-error">⚠ {formError || error}</div>
            )}

            <button type="submit" className="search-btn">
              <span>🔍</span> Search Flights
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
        <p className="section-sub">Click to pre-fill your search</p>
        <div className="routes-grid">
          {POPULAR_ROUTES.map((route, i) => (
            <button key={i} className="route-card" onClick={() => handleQuickRoute(route)}>
              <div className="route-label">{route.label}</div>
              <div className="route-price">from {route.price}</div>
              <div className="route-arrow">→</div>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="how-section">
        <h2>How Hello Flying Works</h2>
        <div className="steps-grid">
          {[
            { icon: '🔍', step: '01', title: 'Enter Your Route', desc: 'Type your origin, destination, and travel dates.' },
            { icon: '🤖', step: '02', title: 'AI Scrapes Live Prices', desc: 'Our bots check Booking.com, Skyscanner & more in real-time.' },
            { icon: '📊', step: '03', title: 'We Normalize All Data', desc: 'Prices are unified into one comparable format instantly.' },
            { icon: '💸', step: '04', title: 'You Pick & Save', desc: 'Choose the best deal and get redirected to book directly.' },
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
        <div className="footer-logo">✈ HelloFlying</div>
        <p>© 2025 HelloFlying Corp. All rights reserved.</p>
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}
