import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Heart, Clock, Settings, ChevronDown } from 'lucide-react';
import './UserMenu.css';

export default function UserMenu({ user, onLogout, onOpenSavedSearches }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        onLogout();
        setIsOpen(false);
    };

    const getInitials = () => {
        if (user?.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        if (user?.username) {
            return user.username.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    return (
        <div className="user-menu-container" ref={menuRef}>
            <button className="user-avatar" onClick={() => setIsOpen(!isOpen)}>
                <span className="avatar-icon"><User size={16} /></span>
                <span>{getInitials()}</span>
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-user-info">
                        <strong>{user?.full_name || user?.username}</strong>
                        <div className="dropdown-email">{user?.email}</div>
                    </div>

                    <button className="dropdown-item" onClick={onOpenSavedSearches}>
                        <Heart size={16} /> Saved Flights
                    </button>

                    <div className="dropdown-divider" />

                    <button className="dropdown-item logout" onClick={handleLogout}>
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}