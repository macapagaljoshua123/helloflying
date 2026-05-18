import React, { useState, useEffect } from 'react';
import { X, Plane, Trash2, Bell, Clock, AlertCircle, Calendar } from 'lucide-react';
import './SavedSearchesModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function SavedSearchesModal({ isOpen, onClose, onSelectSearch }) {
    const [savedSearches, setSavedSearches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchSavedSearches();
        }
    }, [isOpen]);

    const fetchSavedSearches = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/saved-searches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch saved searches');

            const data = await response.json();
            console.log('Saved searches data:', data); // For debugging
            setSavedSearches(data);
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (searchId) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/api/auth/saved-searches/${searchId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete');

            setSavedSearches(savedSearches.filter(s => s.id !== searchId));
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.message);
        }
    };

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="saved-modal-overlay" onClick={onClose}>
            <div className="saved-modal" onClick={(e) => e.stopPropagation()}>
                <button className="saved-modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                <div className="saved-modal-header">
                    <h2>Saved Flights</h2>
                    <p>Your saved searches and price alerts</p>
                </div>

                <div className="saved-modal-body">
                    {loading ? (
                        <div className="saved-loading">
                            <div className="loading-spinner"></div>
                            Loading saved searches...
                        </div>
                    ) : error ? (
                        <div className="saved-error">
                            <AlertCircle size={24} />
                            <p>{error}</p>
                        </div>
                    ) : savedSearches.length === 0 ? (
                        <div className="saved-empty">
                            <Plane size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No saved flights yet</p>
                            <p className="saved-empty-sub">Search for flights and click "Save" to track them</p>
                        </div>
                    ) : (
                        <div className="saved-searches-list">
                            {savedSearches.map((search) => (
                                <div key={search.id} className="saved-search-card">
                                    <div className="saved-search-info">
                                        {/* Route */}
                                        <div className="saved-route">
                                            <span className="saved-origin">{search.origin || '???'}</span>
                                            <span className="saved-arrow">→</span>
                                            <span className="saved-destination">{search.destination || '???'}</span>
                                        </div>

                                        {/* Flight details */}
                                        <div className="saved-details">
                                            <Calendar size={12} />
                                            <span>{search.departure_date ? formatDate(search.departure_date) : 'Date not set'}</span>
                                            {search.return_date && (
                                                <>
                                                    <span>→</span>
                                                    <span>{formatDate(search.return_date)}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Passenger and class info */}
                                        <div className="saved-meta">
                                            <span className="saved-passengers">
                                                {search.passengers || 1} {search.passengers === 1 ? 'pax' : 'pax'}
                                            </span>
                                            <span className="saved-class">{search.cabin_class || 'Economy'}</span>
                                        </div>

                                        {/* Price info */}
                                        {search.saved_price !== null && search.saved_price !== undefined && (
                                            <div className="saved-price-info">
                                                <span className="saved-price-label">Last seen price:</span>
                                                <span className="saved-price-value">${search.saved_price}</span>
                                            </div>
                                        )}

                                        {/* Alert threshold if set */}
                                        {search.price_alert_threshold && (
                                            <div className="saved-alert">
                                                <Bell size={12} />
                                                <span>Alert me below ${search.price_alert_threshold}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="saved-search-actions">
                                        <button
                                            className="saved-btn-search"
                                            onClick={() => {
                                                onSelectSearch(search);
                                                onClose();
                                            }}
                                        >
                                            Search Again
                                        </button>
                                        <button
                                            className="saved-btn-delete"
                                            onClick={() => handleDelete(search.id)}
                                            title="Delete saved search"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}