import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Check, Plane } from 'lucide-react';
import './AuthModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const loadingTexts = [
    'Connecting to HelloFlying terminal...',
    'Authenticating identity passport...',
    'Clearing security checkpoints...',
    'Generating premium boarding pass...'
];

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        full_name: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [animatingState, setAnimatingState] = useState('form'); // 'form', 'loading', 'success'
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        let interval;
        if (animatingState === 'loading') {
            setLoadingTextIndex(0);
            interval = setInterval(() => {
                setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
            }, 600);
        }
        return () => clearInterval(interval);
    }, [animatingState]);

    // Reset animation state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setAnimatingState('form');
            setLoading(false);
            setError('');
            setSuccess('');
            setLoggedInUser(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAnimatingState('loading');
        setError('');
        setSuccess('');

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setAnimatingState('form');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                    full_name: formData.full_name
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Registration failed');
            }

            // Save token and user info
            localStorage.setItem('auth_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setLoggedInUser(data.user);
            setSuccess('Account created successfully!');
            setAnimatingState('success');

            setTimeout(() => {
                onAuthSuccess(data.user);
                onClose();
            }, 2200);
        } catch (err) {
            setError(err.message);
            setAnimatingState('form');
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAnimatingState('loading');
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            localStorage.setItem('auth_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setLoggedInUser(data.user);
            setSuccess('Login successful!');
            setAnimatingState('success');

            setTimeout(() => {
                onAuthSuccess(data.user);
                onClose();
            }, 2200);
        } catch (err) {
            setError(err.message);
            setAnimatingState('form');
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay" onClick={() => !loading && onClose()}>
            <div className={`auth-modal animating-${animatingState}`} onClick={(e) => e.stopPropagation()}>
                {!loading && (
                    <button className="auth-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                )}

                {animatingState === 'form' && (
                    <>
                        <div className="auth-modal-header">
                            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                            <p>{isLogin ? 'Sign in to save flights and track prices' : 'Start saving money on flights today'}</p>
                        </div>

                        <div className="auth-tabs">
                            <button
                                className={`auth-tab ${isLogin ? 'active' : ''}`}
                                onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                            >
                                Sign In
                            </button>
                            <button
                                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                                onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
                            >
                                Sign Up
                            </button>
                        </div>

                        <form className="auth-form" onSubmit={isLogin ? handleLogin : handleRegister}>
                            {!isLogin && (
                                <>
                                    <div className="auth-input-group">
                                        <label>Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="auth-input"
                                            required
                                        />
                                    </div>
                                    <div className="auth-input-group">
                                        <label>Full Name (Optional)</label>
                                        <input
                                            type="text"
                                            name="full_name"
                                            placeholder="Your full name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="auth-input"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="auth-input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="auth-input"
                                    required
                                />
                            </div>

                            <div className="auth-input-group">
                                <label>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="auth-input"
                                        style={{ paddingRight: '40px' }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="auth-error animate-shake">{error}</div>}
                            {success && <div className="auth-success">{success}</div>}

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </button>
                        </form>

                        <div className="auth-switch">
                            <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                            <button
                                className="auth-switch-link"
                                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); setFormData({ ...formData, password: '' }); }}
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </>
                )}

                {animatingState === 'loading' && (
                    <div className="auth-loading-container">
                        <div className="airport-radar">
                            <div className="radar-circle ring-1" />
                            <div className="radar-circle ring-2" />
                            <div className="radar-circle ring-3" />
                            <div className="radar-sweep" />
                            <div className="radar-plane-wrapper">
                                <Plane className="radar-plane" size={32} />
                            </div>
                        </div>
                        <div className="loading-status">
                            <div className="loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <p className="loading-status-text">
                                {loadingTexts[loadingTextIndex]}
                            </p>
                        </div>
                    </div>
                )}

                {animatingState === 'success' && (
                    <div className="auth-success-container">
                        <div className="confetti-effect">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className={`confetti-piece piece-${i}`} />
                            ))}
                        </div>
                        
                        <div className="success-stamp-wrapper">
                            <div className="success-checkmark-circle">
                                <Check size={36} className="checkmark-icon" />
                            </div>
                        </div>
                        
                        <div className="boarding-pass-ticket">
                            <div className="ticket-header">
                                <div className="ticket-logo">
                                    <Plane size={14} className="ticket-logo-icon" />
                                    <span>Hello<strong>Flying</strong></span>
                                </div>
                                <div className="ticket-pass-type">BOARDING PASS</div>
                            </div>
                            
                            <div className="ticket-body">
                                <div className="ticket-row">
                                    <div className="ticket-col">
                                        <span className="col-label">PASSENGER</span>
                                        <span className="col-value name-value">
                                            {loggedInUser?.full_name || loggedInUser?.username || formData.username || 'Hello Flyer'}
                                        </span>
                                    </div>
                                    <div className="ticket-col seat-col">
                                        <span className="col-label">SEAT</span>
                                        <span className="col-value seat-value">1A</span>
                                    </div>
                                </div>
                                
                                <div className="ticket-row">
                                    <div className="ticket-col">
                                        <span className="col-label">DESTINATION</span>
                                        <span className="col-value">GLOBAL / CHEAPEST FARES</span>
                                    </div>
                                    <div className="ticket-col">
                                        <span className="col-label">GATE</span>
                                        <span className="col-value">A28</span>
                                    </div>
                                </div>
                                
                                <div className="ticket-row">
                                    <div className="ticket-col">
                                        <span className="col-label">STATUS</span>
                                        <span className="col-value status-approved">APPROVED ✓</span>
                                    </div>
                                    <div className="ticket-col">
                                        <span className="col-label">FLIGHT</span>
                                        <span className="col-value">HF777</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="ticket-barcode-section">
                                <div className="ticket-barcode">
                                    {[...Array(24)].map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="barcode-line" 
                                            style={{ 
                                                width: `${[1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2][i % 16]}px`,
                                                marginLeft: `${[1, 2, 1, 3, 1, 2][i % 6]}px` 
                                            }} 
                                        />
                                    ))}
                                </div>
                                <span className="barcode-number">HF-MEMBERSHIP-2026</span>
                            </div>
                        </div>
                        
                        <h3 className="success-welcome-title">
                            {isLogin ? 'Welcome Back!' : 'Account Activated!'}
                        </h3>
                        <p className="success-welcome-sub">
                            {isLogin ? 'Preparing your personal dashboard...' : 'Your ticket to saving money is ready.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}