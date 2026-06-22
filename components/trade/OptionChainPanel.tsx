
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Stock, InstrumentType, TransactionType, OrderType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import Tooltip from '../common/Tooltip';

interface OptionChainPanelProps {
    underlyingSymbol: string;
    underlyingLtp: number;
    exchange?: string;
    onOrderAction: (action: { stock: Stock, type: TransactionType, price?: number, orderType?: OrderType }) => void;
    onAddToWatchlist: (stock: Stock) => void;
    onChartSelect: (stock: Stock) => void;
    onCreateGTT: (symbol: string) => void;
    onCreateAlert: (symbol: string) => void;
    onShowDepth: (symbol: string) => void;
}

interface GreekStock extends Stock {
    oi: number;
    oiChange: number;
    iv: number;
    delta: number;
    theta: number;
    gamma: number;
    vega: number;
}

// STABLE strike generation - only recalculates when explicitly requested
const generateStrikeList = (centerStrike: number, underlying: string): number[] => {
    const step = underlying.includes('BANK') ? 100 : 50;
    const numStrikes = 12;
    
    const strikeList = [];
    for (let i = -numStrikes; i <= numStrikes; i++) {
        strikeList.push(centerStrike + (i * step));
    }
    return strikeList;
};

// Helper to generate mock option data
const createOptionStock = (
    underlying: string, 
    strike: number, 
    type: 'CE' | 'PE', 
    underlyingLtp: number,
    seed: number // Add seed for consistent randomization per strike
): GreekStock => {
    const isCE = type === 'CE';
    const distance = isCE ? underlyingLtp - strike : strike - underlyingLtp;
    const timeValue = underlyingLtp * 0.005;
    const intrinsicValue = Math.max(0, distance);
    
    // Use seed-based randomization for stability
    const random = (seed + strike * (isCE ? 1 : 2)) % 1000 / 1000;
    const premium = intrinsicValue + timeValue + (random * 5);

    const symbol = `${underlying.replace(/ /g, '')}${isCE ? 'CE' : 'PE'}${strike}`;
    
    const moneyness = distance / underlyingLtp;
    const delta = isCE ? 0.5 + moneyness * 2 : -0.5 + moneyness * 2;
    const boundedDelta = Math.max(-1, Math.min(1, delta));
    
    return {
        symbol,
        name: `${underlying} ${strike} ${type}`,
        exchange: 'NFO',
        instrumentType: InstrumentType.OPTION,
        underlying,
        expiryDate: '31 OCT',
        strikePrice: strike,
        optionType: type,
        ltp: premium,
        change: (random - 0.5) * 10,
        changePercent: (random - 0.5) * 5,
        open: premium * 0.95,
        high: premium * 1.1,
        low: premium * 0.9,
        prevClose: premium * 0.98,
        marketDepth: { bids: [], asks: [] },
        oi: 10 + random * 40,
        oiChange: (random - 0.5) * 20,
        iv: 15 + random * 10,
        delta: Number(boundedDelta.toFixed(2)),
        theta: Number((-0.5 - random).toFixed(2)),
        gamma: Number((0.001 + random * 0.002).toFixed(4)),
        vega: Number((2 + random * 5).toFixed(2)),
    };
};

// Sub-component for Row Actions
const OptionRowActions: React.FC<{
    stock: Stock;
    side: 'left' | 'right'; // Left for Calls, Right for Puts
    onBuy: () => void;
    onSell: () => void;
    onChart: () => void;
    onDepth: () => void;
    onMore: (e: React.MouseEvent) => void;
}> = ({ stock, side, onBuy, onSell, onChart, onDepth, onMore }) => {
    return (
        <div className={`absolute top-0 bottom-0 flex items-center gap-1 px-1 bg-surface shadow-lg z-20 transition-all ${side === 'left' ? 'left-0 flex-row-reverse' : 'right-0 flex-row'}`}>
            <Tooltip title="More">
                <button onClick={onMore} className="w-6 h-6 rounded border border-gray-600 hover:bg-overlay text-muted text-xs flex items-center justify-center transition-colors bg-base">
                    <i className="fas fa-ellipsis-h"></i>
                </button>
            </Tooltip>
            <Tooltip title="Chart">
                <button onClick={onChart} className="w-6 h-6 rounded border border-gray-600 hover:bg-overlay text-muted text-xs flex items-center justify-center transition-colors bg-base">
                    <i className="fas fa-chart-line"></i>
                </button>
            </Tooltip>
            <Tooltip title="Market depth">
                <button onClick={onDepth} className="w-6 h-6 rounded border border-gray-600 hover:bg-overlay text-muted text-xs flex items-center justify-center transition-colors bg-base">
                    <i className="fas fa-bars"></i>
                </button>
            </Tooltip>
            <Tooltip title="Sell">
                <button onClick={onSell} className="w-6 h-6 rounded bg-danger text-white font-bold text-xs hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm">S</button>
            </Tooltip>
            <Tooltip title="Buy">
                <button onClick={onBuy} className="w-6 h-6 rounded bg-primary text-white font-bold text-xs hover:bg-primary-focus flex items-center justify-center transition-colors shadow-sm">B</button>
            </Tooltip>
        </div>
    );
};

const OptionChainPanel: React.FC<OptionChainPanelProps> = ({ 
    underlyingSymbol, 
    underlyingLtp, 
    exchange = 'NSE',
    onOrderAction, 
    onAddToWatchlist,
    onChartSelect,
    onCreateGTT,
    onCreateAlert,
    onShowDepth
}) => {
    const [activeExpiry, setActiveExpiry] = useState('25 Nov (Today)');
    const [viewMode, setViewMode] = useState<'OI' | 'Greeks'>('OI');
    const [basketMode, setBasketMode] = useState(false);
    
    // CRITICAL: Stable center strike that only changes on user action
    const [centerStrike, setCenterStrike] = useState<number | null>(null);
    const [strikeList, setStrikeList] = useState<number[]>([]);
    const hasAutocenteredRef = useRef(false);
    const seedRef = useRef(Math.floor(Math.random() * 10000));

    // State for More Menu
    const [activeMoreMenu, setActiveMoreMenu] = useState<{ stock: Stock; x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const expiries = ['25 Nov (Today)', '30 Dec (1 month)', '27 Jan (2 months)', '24 Feb (3 months)'];

    const effectiveExchange = useMemo(() => {
        if (exchange === 'INDEX') {
            if (underlyingSymbol.toUpperCase().includes('SENSEX') || underlyingSymbol.toUpperCase().includes('BANKEX')) return 'BSE';
            return 'NSE';
        }
        return exchange || 'NSE';
    }, [exchange, underlyingSymbol]);

    const exchangeLabel = effectiveExchange === 'BSE' ? 'View on BSE' : 'View on NSE';
    const exchangeUrl = useMemo(() => {
        if (effectiveExchange === 'BSE') {
             if (underlyingSymbol.toUpperCase().includes('SENSEX')) {
                 return 'https://www.bseindia.com/sensex/option-chain';
             }
             return `https://www.bseindia.com/stock-share-price/${underlyingSymbol.toLowerCase()}`;
        }
        
        // NSE Logic
        let symbol = underlyingSymbol.toUpperCase();
        if (symbol === 'NIFTY 50') symbol = 'NIFTY';
        else if (symbol === 'NIFTY BANK') symbol = 'BANKNIFTY';
        else if (symbol === 'NIFTY FIN SERVICE') symbol = 'FINNIFTY';
        else if (symbol === 'NIFTY MIDCAP SELECT') symbol = 'MIDCPNIFTY';
        
        return `https://www.nseindia.com/option-chain?symbol=${encodeURIComponent(symbol)}`;
    }, [effectiveExchange, underlyingSymbol]);

    useEffect(() => {
        if (underlyingLtp > 0 && !hasAutocenteredRef.current) {
            const step = underlyingSymbol.includes('BANK') ? 100 : 50;
            const calculatedCenter = Math.round(underlyingLtp / step) * step;
            setCenterStrike(calculatedCenter);
            setStrikeList(generateStrikeList(calculatedCenter, underlyingSymbol));
            hasAutocenteredRef.current = true;
        }
    }, [underlyingLtp, underlyingSymbol]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMoreMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRecenter = () => {
        if (underlyingLtp > 0) {
            const step = underlyingSymbol.includes('BANK') ? 100 : 50;
            const newCenter = Math.round(underlyingLtp / step) * step;
            setCenterStrike(newCenter);
            setStrikeList(generateStrikeList(newCenter, underlyingSymbol));
        }
    };

    const chainRows = useMemo(() => {
        if (strikeList.length === 0) return [];
        return strikeList.map(strike => ({
            strike,
            ce: createOptionStock(underlyingSymbol, strike, 'CE', underlyingLtp, seedRef.current),
            pe: createOptionStock(underlyingSymbol, strike, 'PE', underlyingLtp, seedRef.current),
        }));
    }, [strikeList, underlyingSymbol, underlyingLtp]);

    const maxOI = useMemo(() => {
        if (chainRows.length === 0) return 1;
        let max = 0;
        chainRows.forEach(row => {
            max = Math.max(max, row.ce.oi, row.pe.oi);
        });
        return max || 1;
    }, [chainRows]);

    const handleMoreClick = (e: React.MouseEvent, stock: Stock) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setActiveMoreMenu({ stock, x: rect.left, y: rect.bottom });
    };

    // Loading state
    if (chainRows.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-white dark:bg-base">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading Option Chain...</p>
                </div>
            </div>
        );
    }

    const renderHeader = () => (
        <div className="flex flex-col bg-surface border-b border-overlay shrink-0">
            <div className="flex justify-between items-center px-4 py-3 border-b border-overlay/30">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-lg font-bold text-text-primary uppercase">
                        {underlyingSymbol.replace(/ /g, '')}
                    </h2>
                    <span className="text-sm font-semibold text-success">
                        {formatCurrency(underlyingLtp)} 
                        <span className="text-xs font-normal text-muted ml-1">(-0.83%)</span>
                    </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <a href={exchangeUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-semibold flex items-center gap-1 hover:underline">
                        <i className="fas fa-external-link-alt"></i> {exchangeLabel}
                    </a>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 gap-4 overflow-x-auto">
                <div className="flex gap-2">
                    {expiries.map(exp => (
                        <button
                            key={exp}
                            onClick={() => setActiveExpiry(exp)}
                            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                                activeExpiry === exp ? 'bg-primary/10 text-primary font-bold border border-primary/30' : 'text-muted hover:bg-overlay hover:text-text-primary'
                            }`}
                        >
                            {exp}
                        </button>
                    ))}
                </div>

                <div className="flex bg-base rounded-full p-1 border border-overlay shrink-0">
                    <button onClick={() => setViewMode('OI')} className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${viewMode === 'OI' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-text-primary'}`}>OI</button>
                    <button onClick={() => setViewMode('Greeks')} className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all relative ${viewMode === 'Greeks' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-text-primary'}`}>
                        Greeks
                        {viewMode !== 'Greeks' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"></span>}
                    </button>
                </div>

                <div className="flex items-center gap-4 text-muted text-sm shrink-0">
                    <button onClick={handleRecenter} className="hover:text-primary flex items-center gap-1 transition-colors" title="Recenter strikes around current price">
                        <i className="fas fa-crosshairs"></i> Recenter
                    </button>
                    <button className="hover:text-primary transition-colors">
                        <i className="fas fa-sliders-h"></i> Settings
                    </button>
                    <div className="flex items-center gap-2 pl-2 border-l border-overlay">
                        <span className="text-xs">Basket</span>
                        <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${basketMode ? 'bg-primary' : 'bg-gray-600'}`} onClick={() => setBasketMode(!basketMode)}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${basketMode ? 'left-4.5' : 'left-0.5'}`}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-base text-text-primary animate-fade-in font-sans relative">
            {renderHeader()}

            <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-base">
                <table className="w-full text-xs border-collapse relative">
                    <thead className="bg-gray-5 dark:bg-surface text-muted sticky top-0 z-10 shadow-sm text-[10px] uppercase font-semibold tracking-wide">
                        <tr className="border-b border-overlay">
                            {viewMode === 'Greeks' ? (
                                <>
                                    <th className="py-2 px-1 w-12 text-right font-normal">Gamma</th>
                                    <th className="py-2 px-1 w-12 text-right font-normal">Vega</th>
                                    <th className="py-2 px-1 w-12 text-right font-normal">Theta</th>
                                    <th className="py-2 px-1 w-12 text-right font-normal">Delta</th>
                                    <th className="py-2 px-1 w-12 text-right font-normal">IV</th>
                                    <th className="py-2 px-2 w-24 text-right font-normal border-r border-overlay">Call LTP</th>
                                </>
                            ) : (
                                <>
                                    <th className="py-2 px-2 w-20 text-right font-normal">OI (lakhs)</th>
                                    <th className="py-2 px-2 w-16 text-right font-normal">Chg%</th>
                                    <th className="py-2 px-2 w-24 text-right font-normal border-r border-overlay">Call LTP</th>
                                </>
                            )}
                            <th className="py-2 px-4 w-24 text-center bg-gray-100 dark:bg-overlay text-text-primary font-bold">Strike</th>
                            {viewMode === 'Greeks' ? (
                                <>
                                    <th className="py-2 px-2 w-24 text-left font-normal border-l border-overlay">Put LTP</th>
                                    <th className="py-2 px-1 w-12 text-left font-normal">IV</th>
                                    <th className="py-2 px-1 w-12 text-left font-normal">Delta</th>
                                    <th className="py-2 px-1 w-12 text-left font-normal">Theta</th>
                                    <th className="py-2 px-1 w-12 text-left font-normal">Vega</th>
                                    <th className="py-2 px-1 w-12 text-left font-normal">Gamma</th>
                                </>
                            ) : (
                                <>
                                    <th className="py-2 px-2 w-24 text-left font-normal border-l border-overlay">Put LTP</th>
                                    <th className="py-2 px-2 w-16 text-left font-normal">Chg%</th>
                                    <th className="py-2 px-2 w-20 text-left font-normal">OI (lakhs)</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="text-text-secondary">
                        {chainRows.map((row) => {
                            const isATM = Math.abs(row.strike - underlyingLtp) < (underlyingSymbol.includes('BANK') ? 50 : 25);
                            const rowBg = isATM ? 'bg-yellow-50 dark:bg-yellow-500/10' : 'hover:bg-gray-50 dark:hover:bg-overlay';
                            const ceOiWidth = (row.ce.oi / maxOI) * 100;
                            const peOiWidth = (row.pe.oi / maxOI) * 100;

                            return (
                                <tr key={row.strike} className={`border-b border-gray-100 dark:border-overlay/30 transition-colors group ${rowBg}`}>
                                    {/* CALL SIDE */}
                                    {viewMode === 'Greeks' && (
                                        <>
                                            <td className="py-1.5 px-1 text-right text-muted">{row.ce.gamma}</td>
                                            <td className="py-1.5 px-1 text-right text-muted">{row.ce.vega}</td>
                                            <td className="py-1.5 px-1 text-right text-muted">{row.ce.theta}</td>
                                            <td className="py-1.5 px-1 text-right text-text-primary">{row.ce.delta}</td>
                                            <td className="py-1.5 px-1 text-right text-text-primary">{row.ce.iv.toFixed(2)}</td>
                                        </>
                                    )}
                                    {viewMode === 'OI' && (
                                        <>
                                            <td className="py-1.5 px-2 text-right relative">
                                                <div className="absolute top-2 bottom-2 right-0 bg-red-500/10 dark:bg-red-500/20 rounded-l-sm transition-all" style={{ width: `${ceOiWidth}%` }}></div>
                                                <div className="relative z-10 flex justify-end items-baseline gap-2">
                                                    <span>{row.ce.oi.toFixed(2)}</span>
                                                    <span className={`text-[9px] ${row.ce.oiChange >= 0 ? 'text-success' : 'text-danger'}`}>{row.ce.oiChange.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className={`py-1.5 px-2 text-right ${row.ce.change >= 0 ? 'text-success' : 'text-danger'}`}>{row.ce.changePercent.toFixed(1)}%</td>
                                        </>
                                    )}
                                    
                                    {/* Call LTP & Actions */}
                                    <td className="py-1.5 px-2 text-right border-r border-overlay font-medium relative group/cell w-24">
                                        <span className={row.ce.change >= 0 ? 'text-success' : 'text-danger'}>{row.ce.ltp.toFixed(2)}</span>
                                        <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity absolute right-0 top-0 bottom-0 w-full flex justify-end items-center pr-2">
                                            <OptionRowActions 
                                                stock={row.ce} side="left" 
                                                onBuy={() => onOrderAction({ stock: row.ce, type: TransactionType.BUY, orderType: OrderType.LIMIT })}
                                                onSell={() => onOrderAction({ stock: row.ce, type: TransactionType.SELL, orderType: OrderType.LIMIT })}
                                                onDepth={() => onShowDepth(row.ce.symbol)}
                                                onChart={() => onChartSelect(row.ce)}
                                                onMore={(e) => handleMoreClick(e, row.ce)}
                                            />
                                        </div>
                                    </td>

                                    {/* STRIKE */}
                                    <td className="py-1.5 px-4 text-center font-bold text-text-primary bg-gray-5 dark:bg-overlay/30 relative">
                                        {row.strike}
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                                            <Tooltip title="Chart">
                                                <button onClick={() => onChartSelect(row.ce)} className="text-muted hover:text-primary text-xs"><i className="fas fa-chart-line"></i></button>
                                            </Tooltip>
                                        </div>
                                    </td>

                                    {/* Put LTP & Actions */}
                                    <td className="py-1.5 px-2 text-left border-l border-overlay font-medium relative group/cell w-24">
                                        <span className={row.pe.change >= 0 ? 'text-success' : 'text-danger'}>{row.pe.ltp.toFixed(2)}</span>
                                        <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity absolute left-0 top-0 bottom-0 w-full flex justify-start items-center pl-2">
                                            <OptionRowActions 
                                                stock={row.pe} side="right" 
                                                onBuy={() => onOrderAction({ stock: row.pe, type: TransactionType.BUY, orderType: OrderType.LIMIT })}
                                                onSell={() => onOrderAction({ stock: row.pe, type: TransactionType.SELL, orderType: OrderType.LIMIT })}
                                                onDepth={() => onShowDepth(row.pe.symbol)}
                                                onChart={() => onChartSelect(row.pe)}
                                                onMore={(e) => handleMoreClick(e, row.pe)}
                                            />
                                        </div>
                                    </td>

                                    {viewMode === 'Greeks' && (
                                        <>
                                            <td className="py-1.5 px-1 text-left text-text-primary">{row.pe.iv.toFixed(2)}</td>
                                            <td className="py-1.5 px-1 text-left text-text-primary">{row.pe.delta}</td>
                                            <td className="py-1.5 px-1 text-left text-muted">{row.pe.theta}</td>
                                            <td className="py-1.5 px-1 text-left text-muted">{row.pe.vega}</td>
                                            <td className="py-1.5 px-1 text-left text-muted">{row.pe.gamma}</td>
                                        </>
                                    )}
                                    {viewMode === 'OI' && (
                                        <>
                                            <td className={`py-1.5 px-2 text-left ${row.pe.change >= 0 ? 'text-success' : 'text-danger'}`}>{row.pe.changePercent.toFixed(1)}%</td>
                                            <td className="py-1.5 px-2 text-left relative">
                                                <div className="absolute top-2 bottom-2 left-0 bg-green-500/10 dark:bg-green-500/20 rounded-r-sm transition-all" style={{ width: `${peOiWidth}%` }}></div>
                                                <div className="relative z-10 flex justify-start items-baseline gap-2">
                                                    <span>{row.pe.oi.toFixed(2)}</span>
                                                    <span className={`text-[9px] ${row.pe.oiChange >= 0 ? 'text-success' : 'text-danger'}`}>{row.pe.oiChange.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Floating Menu for "More" actions */}
            {activeMoreMenu && (
                <div 
                    ref={menuRef}
                    className="fixed bg-surface border border-overlay shadow-xl rounded-md z-50 w-48 text-sm animate-fade-in"
                    style={{ left: activeMoreMenu.x, top: activeMoreMenu.y }}
                >
                    <ul className="py-1">
                        <li>
                            <button onClick={() => { onChartSelect(activeMoreMenu.stock); setActiveMoreMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-overlay flex items-center gap-2">
                                <i className="fas fa-chart-line w-4 text-center text-muted"></i> Chart
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onCreateGTT(activeMoreMenu.stock.symbol); setActiveMoreMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-overlay flex items-center gap-2">
                                <i className="fas fa-directions w-4 text-center text-muted"></i> Create GTT
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onCreateAlert(activeMoreMenu.stock.symbol); setActiveMoreMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-overlay flex items-center gap-2">
                                <i className="fas fa-bell w-4 text-center text-muted"></i> Create Alert
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onShowDepth(activeMoreMenu.stock.symbol); setActiveMoreMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-overlay flex items-center gap-2">
                                <i className="fas fa-bars w-4 text-center text-muted"></i> Market Depth
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onAddToWatchlist(activeMoreMenu.stock); setActiveMoreMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-overlay flex items-center gap-2 text-text-primary">
                                <i className="fas fa-plus-circle w-4 text-center text-muted"></i> Add to Market Watch
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default OptionChainPanel;
