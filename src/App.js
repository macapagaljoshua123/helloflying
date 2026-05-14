import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import SearchResults from './components/SearchResults';
import './App.css';

function App() {
  const [searchParams, setSearchParams] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (params) => {
    setSearchParams(params);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const query = new URLSearchParams({
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        return_date: params.returnDate || '',
        passengers: params.passengers,
        cabin_class: params.cabinClass,
      });

      const response = await fetch(`/api/flights/search?${query}`);
      if (!response.ok) {
        let errorMsg = 'Search failed';
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setSearchParams(null);
    setError(null);
  };

  return (
    <div className="app">
      {!results && !loading ? (
        <LandingPage onSearch={handleSearch} error={error} />
      ) : (
        <SearchResults
          results={results}
          params={searchParams}
          loading={loading}
          error={error}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

export default App;
