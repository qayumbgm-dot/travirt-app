
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../App';
import Logo from '../auth/Logo';
import ProfileDropdown from './ProfileDropdown';
import { NotificationsPanel } from './NotificationsPanel';
import { useIndexData } from '../../hooks/useIndexData';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useBasket } from '../../contexts/BasketContext';
import Tooltip from '../common/Tooltip';
import PlanBadge from '../billing/PlanBadge';

interface WebHeaderProps {
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
    username: string;
    userRole?: string;
    onLogout: () => void;
    onTickerSelect: (symbol: string) => void;
    onOpenIndices: () => void;
}

// Enhanced symbol mapping with both display and trading symbols
const symbolMapping: { [displayName: string]: { api: string, trading: string } } = {
    'NIFTY 50': { api: '^NSEI', trading: 'NIFTY 50' },
    'SENSEX': { api: '^BSESN', trading: 'SENSEX' },
    'NIFTY BANK': { api: 'NIFTY BANK', trading: 'NIFTY BANK' },
};

const WebHeader: React.FC<WebHeaderProps> = ({
    activeScreen,
    setActiveScreen,
    username,
    userRole = 'user',
    onLogout,
    onTickerSelect,
    onOpenIndices,
}) => {
    const { t } = useTranslation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const bellWrapperRef = useRef<HTMLDivElement>(null);

    const { pinnedItems } = useWatchlist();
    const { marketData, loading: marketLoading, marketStatus, portfolio } = usePortfolio();
    const { basketItems, toggleBasket } = useBasket();

    // Unread count: new orders + new rewards + unclaimed daily bonus
    const rewardTxCount = portfolio.transactionHistory.filter(t => t.type === 'REWARD_NXO').length;
    const lastSeenOrderCount = useRef(portfolio.orderHistory.length);
    const lastSeenRewardCount = useRef(rewardTxCount);

    const unreadCount =
        Math.max(0, portfolio.orderHistory.length - lastSeenOrderCount.current) +
        Math.max(0, rewardTxCount - lastSeenRewardCount.current) +
        (!portfolio.dailyBonusClaimed ? 1 : 0);

    const handleBellToggle = () => {
        setIsNotifOpen(prev => {
            if (!prev) {
                // Mark as read when opening
                lastSeenOrderCount.current = portfolio.orderHistory.length;
                lastSeenRewardCount.current = rewardTxCount;
            }
            return !prev;
        });
    };

    const pinnedIndexSymbols = pinnedItems
        .map(item => symbolMapping[item]?.api)
        .filter(Boolean);

    const { data: indexData, loading: indexLoading } = useIndexData(pinnedIndexSymbols);
    
    const getInitials = (id: string) => {
        const matches = id.match(/[a-zA-Z]/g) || [];
        if (matches.length >= 2) {
            return (matches[0] + matches[matches.length - 1]).toUpperCase();
        }
        return id.substring(0, 2).toUpperCase();
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }

        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toScreenKey = (item: string) => item.toLowerCase().replace(' ', '-') as Screen;

    const handleTickerClick = (displayName: string) => {
        const mapping = symbolMapping[displayName];
        if (mapping) {
            // Prefer the trading symbol if it exists in market data
            const tradingSymbol = mapping.trading;
            const exists = marketData.some(s => s.symbol === tradingSymbol);
            onTickerSelect(exists ? tradingSymbol : displayName);
        } else {
            onTickerSelect(displayName);
        }
    };

    // Enhanced logo click handler with smooth transition
    const handleLogoClick = () => {
        if (activeScreen === 'dashboard') {
            // Already on dashboard - do full page refresh
            window.location.reload();
        } else {
            // Navigate to dashboard with smooth transition
            setActiveScreen('dashboard');
            
            // Optional: Scroll to top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Enhanced navigation handler with smooth transitions
    const handleNavClick = (screenKey: Screen) => {
        // Add a subtle loading state if needed
        setActiveScreen(screenKey);
        
        // Optional: Scroll to top when navigating
        if (screenKey !== activeScreen) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const StatusBadge = () => {
        let color = 'bg-gray-500';
        let text = 'Connecting...';
        let pulseClass = 'animate-pulse';
        
        if (marketStatus === 'LIVE') {
            color = 'bg-success';
            text = 'LIVE';
            pulseClass = 'animate-pulse';
        } else if (marketStatus === 'SIMULATION') {
            color = 'bg-orange-500';
            text = 'SIM';
            pulseClass = '';
        }

        return (
            <div className="flex items-center gap-2 border border-overlay rounded-full px-3 py-1 bg-surface">
                <span className={`w-2 h-2 rounded-full ${color} ${pulseClass}`}></span>
                <span className="text-[10px] font-bold tracking-wider text-text-secondary">{text}</span>
            </div>
        );
    };

    const renderNavItem = (item: string, label?: string) => {
        const screenKey = toScreenKey(item);
        const isDashboard = screenKey === 'dashboard';
        const isActive = activeScreen === screenKey;

        return (
            <button
                key={item}
                onClick={() => handleNavClick(screenKey)}
                aria-current={isActive ? 'page' : undefined}
                className={`font-medium h-full flex items-start justify-center text-center pt-5 max-w-24 border-b-2 transition-all duration-200 relative group ${
                    isActive
                        ? (isDashboard ? 'text-orange-500 border-orange-500' : 'text-text-primary border-primary')
                        : 'text-muted hover:text-text-primary border-transparent'
                }`}
            >
                {label ?? item}
                {/* Animated underline for inactive items */}
                {!isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
                )}
            </button>
        );
    };

    return (
        <header className="bg-surface border-b border-overlay h-16 flex items-center justify-between text-sm text-text-primary sticky top-0 z-50 shadow-md">
            {/* Left Section: Pinned Items & Indices Button */}
            <div className="flex items-center gap-4 text-xs pl-4 h-full relative z-50">
               {/* Render max 2 pinned items */}
               {pinnedItems.slice(0, 2).map((item, index) => {
                   if (!item) {
                       return <div key={index} className="w-48 h-8 bg-overlay/50 rounded animate-pulse" />;
                   }

                   const stock = !marketLoading ? marketData.find(s => s.symbol === item) : null;
                   const mapping = symbolMapping[item];
                   const apiSymbol = mapping?.api;
                   const indexQuote = !indexLoading && apiSymbol ? indexData[apiSymbol] : null;

                   let content;
                   if (marketLoading || indexLoading) {
                        content = (
                           <>
                               <span className="font-semibold text-muted">{item}</span>
                               <span className="font-mono text-muted">--</span>
                           </>
                       );
                   } else if (stock) {
                       const isUp = stock.change >= 0;
                       const colorClass = isUp ? 'text-success' : 'text-danger';
                       content = (
                           <>
                               <span className="font-semibold text-text-secondary">{stock.symbol}</span>
                               <span className={`font-mono font-semibold ${colorClass}`}>{stock.ltp.toFixed(2)}</span>
                               <span className={`font-mono text-xs ${colorClass}`}>{isUp ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)</span>
                           </>
                       );
                   } else if (indexQuote && indexQuote.d !== null && indexQuote.dp !== null) {
                       const isUp = indexQuote.d >= 0;
                       const colorClass = isUp ? 'text-success' : 'text-danger';
                       content = (
                           <>
                               <span className="font-semibold text-text-secondary">{item}</span>
                               <span className={`font-mono font-semibold ${colorClass}`}>{indexQuote.c.toFixed(2)}</span>
                               <span className={`font-mono text-xs ${colorClass}`}>{isUp ? '+' : ''}{indexQuote.d.toFixed(2)} ({indexQuote.dp.toFixed(2)}%)</span>
                           </>
                       );
                   } else {
                        content = (
                           <>
                                <span className="font-semibold text-muted">{item}</span>
                                <span className="font-mono text-muted">--</span>
                            </>
                       );
                   }
                   
                   return (
                       <div 
                           key={item} 
                           onClick={() => handleTickerClick(item)}
                           className="flex items-baseline gap-2 cursor-pointer hover:bg-overlay/50 p-2 rounded transition-colors select-none pointer-events-auto"
                       >
                           {content}
                       </div>
                   );
               })}

               {/* Global and Indian Indices Button */}
                <Tooltip title="Global and Indian indices">
                    <button
                        onClick={onOpenIndices}
                        aria-label="Open global and Indian indices panel"
                        className="flex items-center gap-1 p-2 rounded hover:bg-overlay/50 transition-colors group"
                    >
                        <i className="fas fa-globe text-lg text-primary group-hover:text-primary-focus" aria-hidden="true"></i>
                        <i className="fas fa-arrow-right text-xs text-muted group-hover:text-text-primary" aria-hidden="true"></i>
                    </button>
                </Tooltip>
            </div>

            {/* Right Section */}
            <div className="flex items-center h-full">
                {/* Logo - Smart Navigation */}
                <Tooltip title={activeScreen === 'dashboard' ? "Refresh page" : "Go to Dashboard"}>
                    <div 
                        className="border-l border-overlay h-full flex items-center px-4 cursor-pointer hover:bg-overlay/30 transition-all duration-200 group"
                        onClick={handleLogoClick}
                    >
                        <div className="transform group-hover:scale-105 transition-transform duration-200">
                            <Logo />
                        </div>
                    </div>
                </Tooltip>
                
                {/* Navigation Items */}
                <nav aria-label="Main navigation" className="flex items-center gap-6 h-full">
                    {/* Standard Items */}
                    {([
                        ['Dashboard',   t('nav.dashboard')],
                        ['Portfolio',   t('nav.portfolio')],
                        ['Leaderboard', t('nav.leaderboard')],
                        ['Orders',      t('nav.orders')],
                        ['Positions',   t('nav.positions')],
                        ['Funds',       t('nav.funds')],
                        ['Earn Tokens', t('nav.earnTokens')],
                        ['Brokerage',   t('nav.brokerage')],
                    ] as [string, string][]).map(([item, label]) => renderNavItem(item, label))}
                    {renderNavItem('AI News', t('nav.aiNews'))}
                    {/* Admin portal — visible to admin and super_admin only */}
                    {['admin', 'super_admin'].includes(userRole) && renderNavItem('Admin', t('nav.admin'))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-4 pl-6 pr-4">
                    <div className="w-px bg-overlay h-6"></div>
                    
                    {/* Status Badge */}
                    <StatusBadge />
                    
                    <div className="w-px bg-overlay h-6"></div>
                    
                    {/* Basket Icon */}
                    <Tooltip title="Orders basket">
                        <button onClick={toggleBasket} aria-label="Orders basket" className="text-muted hover:text-text-primary text-xl transition-colors relative group">
                            <i className="fas fa-shopping-basket transform group-hover:scale-110 transition-transform duration-200" aria-hidden="true"></i>
                            {basketItems.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                    {basketItems.length > 9 ? '9+' : basketItems.length}
                                </span>
                            )}
                        </button>
                    </Tooltip>
                    
                    {/* Notifications Icon */}
                    <div ref={bellWrapperRef}>
                        <Tooltip title="Notifications">
                            <button onClick={handleBellToggle} aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`} className="text-muted hover:text-text-primary text-xl transition-colors relative group">
                                <i className="fas fa-bell transform group-hover:scale-110 transition-transform duration-200" aria-hidden="true"></i>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </Tooltip>
                    </div>
                    <NotificationsPanel
                        isOpen={isNotifOpen}
                        onClose={() => setIsNotifOpen(false)}
                        anchorEl={bellWrapperRef.current}
                        portfolio={portfolio}
                    />

                    {/* User Profile Dropdown */}
                    <div ref={dropdownRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="true"
                            aria-label={`User menu for ${username}`}
                            className="flex items-center gap-2 cursor-pointer group bg-transparent border-0 p-0"
                        >
                            <div className="w-8 h-8 bg-overlay text-primary rounded-full flex items-center justify-center font-bold text-xs transform group-hover:scale-105 transition-transform duration-200">
                                {getInitials(username)}
                            </div>
                            <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                                {username}
                            </span>
                            <PlanBadge />
                            <i className={`fas fa-chevron-down text-[8px] text-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {isDropdownOpen && <ProfileDropdown username={username} onLogout={onLogout} onNavigate={(screen) => { setActiveScreen(screen); setIsDropdownOpen(false); }} />}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default WebHeader;
