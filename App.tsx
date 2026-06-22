
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { authApi } from './apiClient/auth.api';
import { PortfolioProvider, usePortfolio } from './contexts/PortfolioContext';
import { WatchlistProvider, useWatchlist } from './contexts/WatchlistContext';
import { ErrorBoundary } from './components/ErrorBoundary';
// Eagerly loaded (needed at startup or on critical path)
import DashboardScreen from './screens/DashboardScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import TradeScreen from './screens/TradeScreen';
import OrdersScreen from './screens/OrdersScreen';
import PositionsScreen from './screens/PositionsScreen';
import FundsScreen from './screens/FundsScreen';
import WebAuthScreen from './screens/auth/WebAuthScreen';
// Lazily loaded (not needed at startup)
const LandingScreen         = lazy(() => import('./screens/LandingScreen'));
const CoursesScreen         = lazy(() => import('./screens/CoursesScreen'));
const FeaturesScreen        = lazy(() => import('./screens/FeaturesScreen'));
const HowItWorksScreen      = lazy(() => import('./screens/HowItWorksScreen'));
const BidsScreen            = lazy(() => import('./screens/BidsScreen'));
const LeaderboardScreen     = lazy(() => import('./screens/LeaderboardScreen'));
const AINewsScreen          = lazy(() => import('./screens/AINewsScreen'));
const SettingsScreen        = lazy(() => import('./screens/SettingsScreen'));
const SupportScreen         = lazy(() => import('./screens/SupportScreen'));
const SellingPressureScreen = lazy(() => import('./screens/SellingPressureScreen'));
const ProfileScreen         = lazy(() => import('./screens/ProfileScreen'));
const BrokerageScreen       = lazy(() => import('./screens/BrokerageScreen'));
const AdminScreen           = lazy(() => import('./screens/AdminScreen'));
const BillingScreen         = lazy(() => import('./screens/BillingScreen'));
import WebHeader from './components/layout/WebHeader';
import WatchlistPanel, { SidebarMode } from './components/trade/WatchlistPanel';
import WatchlistTabs from './components/trade/WatchlistTabs';
import ManageWatchlistsModal from './components/trade/ManageWatchlistsModal';
import { OrderWindow } from './components/trade/OrderWindow';
import IndicesPanel from './components/trade/IndicesPanel';
import { Stock, TransactionType, OrderType, InstrumentType } from './types';
import MarketDepthModal from './components/trade/MarketDepthModal';
import { GTTCreateModal, AlertCreateModal } from './components/trade/TradeModals';
import DisclaimerModal from './components/common/DisclaimerModal';
import TrialPlanModal from './components/common/TrialPlanModal';
import { getInstrumentKey } from './utils/formatters';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { BasketProvider } from './contexts/BasketContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import SubscriptionBanner from './components/billing/SubscriptionBanner';
import BasketPanel from './components/basket/BasketPanel';

const ScreenSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <i className="fas fa-spinner animate-spin text-primary text-2xl"></i>
  </div>
);

const findStockWithFallback = (symbol: string, marketData: Stock[]): Stock | null => {
    let stock = marketData.find(s => s.symbol === symbol);
    if (stock) return stock;
    
    stock = marketData.find(s => s.symbol.toLowerCase() === symbol.toLowerCase());
    if (stock) return stock;
    
    const cleanSymbol = symbol.replace(/\s+/g, '').toLowerCase();
    stock = marketData.find(s => s.symbol.replace(/\s+/g, '').toLowerCase() === cleanSymbol);
    
    return stock || null;
};

export type Screen = 'dashboard' | 'trade' | 'portfolio' | 'orders' | 'positions' | 'earn-tokens' | 'funds' | 'leaderboard' | 'ai-news' | 'indices' | 'selling-pressure' | 'profile' | 'brokerage' | 'settings' | 'support' | 'admin' | 'billing';
export type TradeViewMode = 'chart' | 'optionChain' | 'indices';

const SCREEN_TITLES: Record<Screen, string> = {
    dashboard:          'Dashboard',
    trade:              'Trade',
    portfolio:          'Portfolio',
    orders:             'Orders',
    positions:          'Positions',
    'earn-tokens':      'Earn Tokens',
    funds:              'Funds',
    leaderboard:        'Leaderboard',
    'ai-news':          'AI News',
    indices:            'Indices',
    'selling-pressure': 'Selling Pressure',
    profile:            'Profile',
    brokerage:          'Brokerage',
    settings:           'Settings',
    support:            'Support',
    admin:              'Admin Portal',
    billing:            'Plans & Billing',
};

const AppContent: React.FC<{
    currentUser: string;
    currentRole: string;
    onLogout: () => void;
}> = ({ currentUser, currentRole, onLogout }) => {
    const { marketData, getStock } = usePortfolio();
    const { showToast } = useToast();
    const { activeView, watchlists, activeGroupIds, addStockToGroup } = useWatchlist(); 

    // Ensure default screen is always 'dashboard' on mount
    const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

    // Update document title when screen changes
    useEffect(() => {
        document.title = `${SCREEN_TITLES[activeScreen]} — TraVirt`;
    }, [activeScreen]);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [tradeViewMode, setTradeViewMode] = useState<TradeViewMode>('chart');
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('watchlist');
    const [showRefillPrompt, setShowRefillPrompt] = useState(false);

    // Modal States
    const [orderAction, setOrderAction] = useState<{stock: Stock, type: TransactionType, price?: number, orderType?: OrderType} | null>(null);
    const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [gttModalStock, setGttModalStock] = useState<Stock | null>(null);
    const [alertModalStock, setAlertModalStock] = useState<Stock | null>(null);
    const [marketDepthModalStock, setMarketDepthModalStock] = useState<Stock | null>(null);

    // Initial Stock Default & Updates
    useEffect(() => {
        if (!selectedStock && marketData.length > 0) {
            const defaultStock = marketData.find(s => s.symbol === 'TATASTEEL') || marketData[0];
            setSelectedStock(defaultStock);
        }
        // Update selected stock object when market data updates
        if (selectedStock && selectedStock.instrumentType !== InstrumentType.OPTION) {
            // Find by symbol AND exchange to ensure tracking correct variant
            const updated = marketData.find(s => s.symbol === selectedStock.symbol && s.exchange === selectedStock.exchange);
            if (updated) setSelectedStock(updated);
        }
    }, [marketData, selectedStock]);

    const handleStockSelect = (stock: Stock) => {
        setSelectedStock(stock);
        setActiveScreen('trade');
        setTradeViewMode('chart');
    };

    const handleOrderAction = (action: { stock: Stock, type: TransactionType, price?: number, orderType?: OrderType }) => {
        setOrderAction(action);
        setIsOrderPanelOpen(true);
    };

    const handleCreateGTT = (symbol: string) => {
        const stock = getStock(symbol);
        if (stock) setGttModalStock(stock);
    };
    
    const handleCreateGTTFromModal = (stock: Stock) => {
        setMarketDepthModalStock(null);
        setGttModalStock(stock);
    };

    const handleCreateAlert = (symbol: string) => {
        const stock = getStock(symbol);
        if (stock) setAlertModalStock(stock);
    };
    
    const handleShowMarketDepthModal = (symbol: string) => {
        const stock = getStock(symbol);
        if (stock) setMarketDepthModalStock(stock);
    };

    const handleAddToWatchlist = (stock: Stock) => {
        let targetWatchlistId: number;
        let targetGroupId: string | undefined;

        if (activeView.type === 'watchlist') {
            targetWatchlistId = activeView.id;
        } else {
            targetWatchlistId = 1; 
        }

        const activeGroup = activeGroupIds[targetWatchlistId];
        if (activeGroup) {
            targetGroupId = activeGroup;
        } else {
            const watchlist = watchlists.find(w => w.id === targetWatchlistId);
            if (watchlist && watchlist.groups.length > 0) {
                targetGroupId = watchlist.groups[0].id;
            }
        }

        if (targetGroupId) {
            addStockToGroup(targetWatchlistId, targetGroupId, getInstrumentKey(stock));
            setSidebarMode('watchlist');
            showToast(`${stock.symbol} added to watchlist.`, 'success');
        } else {
            showToast('No valid watchlist group found.', 'error');
        }
    };

    const activeWatchlistContent = React.useMemo(() => {
        if (activeView.type === 'watchlist') {
            const wl = watchlists.find(w => w.id === activeView.id);
            if (!wl) return null;
            return { list: wl, isDiscover: false };
        } else {
            const discoverListAsWatchlist = {
                id: -1,
                name: activeView.list.name,
                groups: [{ id: 'discover-default', name: 'Default', symbols: activeView.list.symbols, isCollapsed: false, isMaximized: false }],
                settings: { 
                    changeType: 'close' as const,
                    showOptions: { priceChange: true, priceChangePercent: true, priceDirection: true, holdings: false, notes: false, groupColors: false },
                    sortBy: 'LTP' as const,
                }
            };
            return { list: discoverListAsWatchlist, isDiscover: true };
        }
    }, [activeView, watchlists]);

    const renderScreenContent = () => {
        switch (activeScreen) {
            case 'trade':
                return <TradeScreen
                    selectedStock={selectedStock}
                    viewMode={tradeViewMode}
                    setViewMode={setTradeViewMode}
                    onOrderAction={handleOrderAction}
                    onChartSelect={handleStockSelect}
                    onAddToWatchlist={handleAddToWatchlist}
                    onCreateGTT={handleCreateGTT}
                    onCreateAlert={handleCreateAlert}
                    onShowMarketDepthModal={handleShowMarketDepthModal}
                />;
            case 'indices': return <IndicesPanel />;
            case 'selling-pressure': return <SellingPressureScreen onUpgrade={() => setActiveScreen('billing')} />;
            case 'profile': return <ProfileScreen />;
            case 'brokerage': return <BrokerageScreen />;
            case 'portfolio': return <PortfolioScreen />;
            case 'orders': return <OrdersScreen />;
            case 'positions': return <PositionsScreen />;
            case 'earn-tokens': return <BidsScreen />;
            case 'funds': return <FundsScreen />;
            case 'leaderboard': return <LeaderboardScreen />;
            case 'ai-news': return <AINewsScreen onUpgrade={() => setActiveScreen('billing')} />;
            case 'settings': return <SettingsScreen />;
            case 'support': return <SupportScreen />;
            case 'admin':   return <AdminScreen />;
            case 'billing': return <BillingScreen />;
            case 'dashboard':
            default:
                return <DashboardScreen setActiveScreen={setActiveScreen} />;
        }
    };

    const renderScreen = () => (
        <ErrorBoundary>
            <Suspense fallback={<ScreenSpinner />}>
                {renderScreenContent()}
            </Suspense>
        </ErrorBoundary>
    );

    const RefillPrompt = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center animate-fade-in">
            <div role="dialog" aria-modal="true" aria-label="Insufficient balance" className="bg-surface rounded-lg shadow-2xl p-8 w-full max-w-md text-center border border-overlay">
                <i className="fas fa-wallet text-4xl text-primary mb-4"></i>
                <h3 className="text-2xl font-bold mb-2 text-text-primary">Insufficient Balance</h3>
                <p className="text-muted mb-6">You don't have enough virtual balance. Please add funds to continue.</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => setShowRefillPrompt(false)} className="px-6 py-2 rounded-md bg-overlay hover:bg-base text-text-primary font-semibold transition">Cancel</button>
                    <button onClick={() => { setShowRefillPrompt(false); setActiveScreen('funds'); }} className="px-6 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition">Go to Funds</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-base text-text-primary font-sans overflow-hidden">
            {/* Skip-to-content — visible on keyboard focus only */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
            >
                Skip to main content
            </a>
            <SubscriptionBanner onManagePlan={() => setActiveScreen('billing')} />
            <WebHeader
                activeScreen={activeScreen}
                setActiveScreen={setActiveScreen}
                username={currentUser}
                userRole={currentRole}
                onLogout={onLogout}
                onTickerSelect={(ticker) => {
                    const stock = findStockWithFallback(ticker, marketData);
                    if (stock) handleStockSelect(stock);
                }}
                onOpenIndices={() => {
                    setActiveScreen('indices');
                }}
            />
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-4 gap-4 p-4 min-h-0">
                <div className="lg:col-span-1 xl:col-span-1 shadow-lg flex flex-col h-full overflow-hidden bg-surface rounded-lg border border-overlay/50">
                    <div className="flex border-b border-overlay bg-surface shrink-0">
                        {[{ label: 'Watchlist', mode: 'watchlist' }, { label: 'Predefined', mode: 'predefined' }, { label: 'Option Chain', mode: 'optionChain' }].map((tab) => {
                            const isActive = sidebarMode === tab.mode;
                            return (
                                <button key={tab.label} onClick={() => setSidebarMode(tab.mode as SidebarMode)} className={`flex-1 py-3 text-xs font-bold text-center transition-colors relative ${isActive ? 'text-primary' : 'text-muted hover:text-text-primary'}`}>
                                    {tab.label}
                                    {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        {activeWatchlistContent ? (
                            <WatchlistPanel mode={sidebarMode} activeList={activeWatchlistContent.list} isDiscover={activeWatchlistContent.isDiscover} selectedStock={selectedStock} onStockSelect={handleStockSelect} onOrderAction={handleOrderAction} onCreateGTT={handleCreateGTT} onCreateAlert={handleCreateAlert} onShowMarketDepthModal={handleShowMarketDepthModal} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted h-full">Loading...</div>
                        )}
                    </div>
                    {sidebarMode === 'watchlist' && (
                        <div className="shrink-0"><WatchlistTabs onManageClick={() => setIsManageModalOpen(true)} /></div>
                    )}
                </div>
                <div
                    id="main-content"
                    className={`lg:col-span-4 xl:col-span-3 bg-surface rounded-lg shadow-lg flex flex-col min-w-0 relative border border-overlay/50 ${['trade', 'indices', 'selling-pressure', 'profile', 'brokerage'].includes(activeScreen) ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}
                >
                    {renderScreen()}
                </div>
            </main>
            {showRefillPrompt && <RefillPrompt />}
            {isOrderPanelOpen && orderAction && (
                <OrderWindow key={`${orderAction.stock.symbol}-${orderAction.type}`} stock={orderAction.stock} initialTransactionType={orderAction.type} initialOrderType={orderAction.orderType} onClose={() => setIsOrderPanelOpen(false)} />
            )}
            {gttModalStock && <GTTCreateModal stock={gttModalStock} onClose={() => setGttModalStock(null)} />}
            {alertModalStock && <AlertCreateModal stock={alertModalStock} onClose={() => setAlertModalStock(null)} />}
            {marketDepthModalStock && (
                <MarketDepthModal stock={marketDepthModalStock} marketData={marketData} onClose={() => setMarketDepthModalStock(null)} onOrderAction={(action) => { setMarketDepthModalStock(null); handleOrderAction(action); }} onCreateGTT={handleCreateGTTFromModal} />
            )}
            {isManageModalOpen && <ManageWatchlistsModal onClose={() => setIsManageModalOpen(false)} />}
        </div>
    );
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [currentRole, setCurrentRole] = useState<string>('user');
    const [authView, setAuthView] = useState<'landing' | 'login' | 'signup' | 'courses' | 'features' | 'how-it-works'>('landing');
    const [onboardingStep, setOnboardingStep] = useState<'none' | 'disclaimer' | 'trial'>('none');
    const [sessionRestoring, setSessionRestoring] = useState(true);

    // Attempt to restore session silently from httpOnly refresh-token cookie
    useEffect(() => {
        authApi.tryRestoreSession().then((user) => {
            if (user) {
                setCurrentUser(user.userId);
                setCurrentRole(user.role);
            }
        }).finally(() => setSessionRestoring(false));
    }, []);

    // When the axios interceptor can't refresh (cookie expired), force back to login
    useEffect(() => {
        const handler = () => { setCurrentUser(null); setCurrentRole('user'); setAuthView('login'); };
        window.addEventListener('auth:expired', handler);
        return () => window.removeEventListener('auth:expired', handler);
    }, []);

    const handleLoginSuccess = (userId: string) => {
        setCurrentUser(userId);
        setOnboardingStep('disclaimer');
        // Fetch role without blocking login — admin nav appears after one tick
        authApi.me().then((u) => setCurrentRole(u.role)).catch(() => {});
    };

    const handleLogout = useCallback(async () => {
        await authApi.logout();
        setCurrentUser(null);
        setCurrentRole('user');
        setAuthView('landing');
    }, []);

    // While restoring session from cookie, show nothing (avoids flash of login screen)
    if (sessionRestoring) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-base">
                <i className="fas fa-spinner animate-spin text-primary text-2xl"></i>
            </div>
        );
    }

    const authContent = !currentUser ? (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-base"><i className="fas fa-spinner animate-spin text-primary text-2xl"></i></div>}>
            {authView === 'landing'     ? <LandingScreen onGetStarted={() => setAuthView('login')} onSignUp={() => setAuthView('signup')} onNavigate={(view) => setAuthView(view)} /> :
             authView === 'courses'     ? <CoursesScreen onBack={() => setAuthView('landing')} /> :
             authView === 'features'    ? <FeaturesScreen onBack={() => setAuthView('landing')} /> :
             authView === 'how-it-works'? <HowItWorksScreen onBack={() => setAuthView('landing')} /> :
             <WebAuthScreen onLoginSuccess={handleLoginSuccess} initialView={authView === 'signup' ? 'signup' : 'login'} onBack={() => setAuthView('landing')} />}
        </Suspense>
    ) : null;

    return (
        <ToastProvider>
            {authContent ?? (
                <BasketProvider>
                    <PortfolioProvider setShowRefillPrompt={() => {}}>
                        <WatchlistProvider>
                            <SubscriptionProvider>
                            <AppContent currentUser={currentUser!} currentRole={currentRole} onLogout={handleLogout} />
                            <BasketPanel />
                            {onboardingStep === 'disclaimer' && (
                                <DisclaimerModal onClose={() => setOnboardingStep('trial')} />
                            )}
                            {onboardingStep === 'trial' && (
                                <TrialPlanModal onClose={() => setOnboardingStep('none')} />
                            )}
                            </SubscriptionProvider>
                        </WatchlistProvider>
                    </PortfolioProvider>
                </BasketProvider>
            )}
        </ToastProvider>
    );
};

export default App;
