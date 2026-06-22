
import React from 'react';
import { Screen } from '../../App';

interface ProfileDropdownProps {
    username: string;
    onLogout: () => void;
    onNavigate?: (screen: Screen) => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ username, onLogout, onNavigate }) => {

    const menuItems = [
        { icon: 'fa-user-circle', label: 'My Profile', action: () => onNavigate && onNavigate('profile') },
        { icon: 'fa-credit-card', label: 'Plans & Billing', action: () => onNavigate && onNavigate('billing') },
        { icon: 'fa-cog', label: 'Settings', action: () => onNavigate && onNavigate('settings') },
        { icon: 'fa-life-ring', label: 'Support', action: () => onNavigate && onNavigate('support') },
    ];

    return (
        <div className="absolute top-full right-0 mt-3 w-60 bg-surface rounded-md shadow-2xl border border-overlay z-50 animate-fade-in origin-top-right">
            <div className="p-4 border-b border-overlay">
                <p className="font-semibold text-text-primary">{username}</p>
                <p className="text-xs text-muted">Trader ID: {username}</p>
            </div>
            <div className="py-2">
                {menuItems.map(item => (
                    <a 
                        href="#" 
                        key={item.label} 
                        onClick={(e) => { e.preventDefault(); item.action(); }}
                        className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-overlay"
                    >
                        <i className={`fas ${item.icon} w-6 text-center text-muted mr-2`}></i>
                        <span>{item.label}</span>
                    </a>
                ))}
            </div>
             <div className="p-2 border-t border-overlay">
                 <button onClick={onLogout} className="flex items-center w-full px-4 py-2 text-sm text-text-secondary hover:bg-overlay rounded-md">
                    <i className="fas fa-sign-out-alt w-6 text-center text-muted mr-2"></i>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default ProfileDropdown;
