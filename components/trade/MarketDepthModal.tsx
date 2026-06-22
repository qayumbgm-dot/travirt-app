import React, { useState, useId, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Stock, TransactionType, OrderType, DepthLevel } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// Tooltip Component (copied for self-containment)
const Tooltip: React.FC<{ children: React.ReactNode; title: string; }> = ({ children, title }) => {
    const tooltipId = useId();
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);
    const showTooltip = () => setVisible(true);
    const hideTooltip = () => setVisible(false);

    useLayoutEffect(() => {
        if (visible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const top = triggerRect.top - 8;
            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${triggerRect.left + triggerRect.width / 2}px`,
                transform: 'translateX(-50%) translateY(-100%)',
                zIndex: 10000,
            });
        } else {
            setStyle({ opacity: 0, pointerEvents: 'none' });
        }
    }, [visible]);

    return (
        <>
            <div ref={triggerRef} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip} aria-describedby={tooltipId}>
                {children}
            </div>
            {mounted && createPortal(
                <div ref={tooltipRef} id={tooltipId} role="tooltip" className="fixed px-2 py-1 bg-overlay text-text-primary text-xs rounded-md shadow-lg" style={{ ...style, opacity: visible ? 1 : 0 }}>
                    {title}
                </div>,
                document.body
            )}
        </>
    );
};


// PriceRangeIndicator Component (copied for self-containment)
const PriceRangeIndicator: React.FC<{ low: number; high: number; open: number; ltp: number; }> = ({ low, high, open, ltp }) => {
    const range = high > low ? high - low : 1;
    const ltpPercent = Math.max(0, Math.min(100, ((ltp - low) / range) * 100));
    const openPercent = Math.max(0, Math.min(100, ((open - low) / range) * 100));

    return (
        <div className="relative h-8 my-2 pt-4">
            <div className="relative h-1 bg-overlay rounded-full">
                <Tooltip title={`Open: ${formatCurrency(open)}`}>
                    <div className="absolute top-1/2 w-2 h-2 bg-muted rounded-full -translate-y-1/2" style={{ left: `${openPercent}%` }}></div>
                </Tooltip>
                <Tooltip title={`LTP: ${formatCurrency(ltp)}`}>
                    <div className="absolute top-1/2 w-3 h-3 bg-primary border-2 border-surface rounded-full shadow-glow-blue z-10 -translate-y-1/2" style={{ left: `${ltpPercent}%` }}></div>
                </Tooltip>
            </div>
            <Tooltip title={`Low: ${formatCurrency(low)}`}>
                <div className="absolute left-0 top-1/2 text-xs text-muted">{formatCurrency(low)}</div>
            </Tooltip>
            <Tooltip title={`High: ${formatCurrency(high)}`}>
                <div className="absolute right-0 top-1/2 text-xs text-muted">{formatCurrency(high)}</div>
            </Tooltip>
        </div>
    );
};

interface MarketDepthModalProps {
    stock: Stock;
    marketData: Stock[];
    onClose: () => void;
    onOrderAction: (action: { stock: Stock, type: TransactionType, price?: number, orderType?: OrderType }) => void;
    onCreateGTT: (stock: Stock) => void;
}

const MarketDepthModal: React.FC<MarketDepthModalProps> = ({ stock: initialStock, marketData, onClose, onOrderAction, onCreateGTT }) => {
    const [currentStock, setCurrentStock] = useState(initialStock);
    const [showFullDepth, setShowFullDepth] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const updatedStock = marketData.find(s => s.symbol === currentStock.symbol);
        if (updatedStock) {
            setCurrentStock(updatedStock);
        }
    }, [marketData, currentStock.symbol]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        return marketData.filter(s =>
            s.symbol.toLowerCase().includes(lowerCaseQuery) ||
            s.name.toLowerCase().includes(lowerCaseQuery)
        ).slice(0, 7);
    }, [searchQuery, marketData]);

    const handleStockSelect = (stock: Stock) => {
        setCurrentStock(stock);
        setSearchQuery('');
    };

    const depth = showFullDepth ? 20 : 5;
    const bids = currentStock.marketDepth?.bids.slice(0, depth) || [];
    const asks = currentStock.marketDepth?.asks.slice(0, depth) || [];

    const totalBidQty = currentStock.marketDepth?.bids.reduce((sum, b) => sum + b.quantity, 0) || 0;
    const totalAskQty = currentStock.marketDepth?.asks.reduce((sum, a) => sum + a.quantity, 0) || 0;
    const maxQty = Math.max(...(currentStock.marketDepth?.bids || []).map(d => d.quantity), ...(currentStock.marketDepth?.asks || []).map(d => d.quantity));

    const DepthRow: React.FC<{ level: DepthLevel; side: 'bid' | 'ask' }> = ({ level, side }) => {
        const percentage = maxQty > 0 ? (level.quantity / maxQty) * 100 : 0;
        const priceClass = side === 'bid' ? 'text-success' : 'text-danger';
        const barBgClass = side === 'bid' ? 'bg-success/20' : 'bg-danger/20';

        const handleRowClick = () => {
            const type = side === 'bid' ? TransactionType.SELL : TransactionType.BUY;
            onOrderAction({ stock: currentStock, type, price: level.price, orderType: OrderType.LIMIT });
        };

        return (
            <tr className="text-xs hover:bg-overlay/50 cursor-pointer text-text-secondary" onClick={handleRowClick}>
                {side === 'bid' && <>
                    <td className="p-1 text-center">{level.orders}</td>
                    <td className="p-1 text-right relative"><div className={`absolute top-0 right-0 h-full ${barBgClass}`} style={{ width: `${percentage}%` }}></div><span className="relative">{level.quantity.toLocaleString('en-IN')}</span></td>
                    <td className={`p-1 text-right font-semibold ${priceClass}`}>{level.price.toFixed(2)}</td>
                </>}
                {side === 'ask' && <>
                    <td className={`p-1 text-left font-semibold ${priceClass}`}>{level.price.toFixed(2)}</td>
                    <td className="p-1 text-right relative"><div className={`absolute top-0 left-0 h-full ${barBgClass}`} style={{ width: `${percentage}%` }}></div><span className="relative">{level.quantity.toLocaleString('en-IN')}</span></td>
                    <td className="p-1 text-center">{level.orders}</td>
                </>}
            </tr>
        );
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Market depth" className="bg-surface rounded-lg shadow-2xl w-full max-w-lg border border-overlay flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header & Search */}
                <div className="p-4 border-b border-overlay">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10"></i>
                        <input
                            type="text"
                            placeholder="Search eg: infy bse, nifty fut, etc"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-base border border-gray-600 rounded-md py-2 pl-10 pr-4 text-text-primary focus:ring-1 focus:ring-primary"
                        />
                        {searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-base border border-overlay rounded-md shadow-lg z-20">
                                {searchResults.length > 0 ? (
                                    searchResults.map(stock => (
                                        <div key={stock.symbol} onClick={() => handleStockSelect(stock)} className="p-2 hover:bg-overlay cursor-pointer">
                                            <p className="font-semibold text-sm">{stock.symbol}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="p-3 text-sm text-center text-muted">No results found.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-baseline mt-3">
                        <h3 className="font-bold text-lg text-text-primary">{currentStock.symbol} <span className="text-sm text-muted font-normal">{currentStock.exchange}</span></h3>
                        <p className={`font-semibold ${currentStock.change >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(currentStock.ltp)} <span className="text-xs">({currentStock.change.toFixed(2)})</span>
                        </p>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Depth Table */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Bids */}
                        <table className="w-full">
                            <thead><tr className="font-semibold text-muted text-[11px]"><th className="text-center pb-1">Orders</th><th className="text-right pb-1">Qty.</th><th className="text-right pb-1">Bid</th></tr></thead>
                            <tbody>{bids.map(bid => <DepthRow key={`bid-${bid.price}`} level={bid} side="bid" />)}</tbody>
                        </table>
                        {/* Asks */}
                        <table className="w-full">
                            <thead><tr className="font-semibold text-muted text-[11px]"><th className="text-left pb-1">Offer</th><th className="text-right pb-1">Qty.</th><th className="text-center pb-1">Orders</th></tr></thead>
                            <tbody>{asks.map(ask => <DepthRow key={`ask-${ask.price}`} level={ask} side="ask" />)}</tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-text-primary border-t border-overlay pt-1">
                        <div className="flex justify-between p-1"><span className="font-bold">Total</span><span>{totalBidQty.toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between p-1"><span className="font-bold">Total</span><span>{totalAskQty.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div className="text-center">
                        <button onClick={() => setShowFullDepth(!showFullDepth)} className="text-muted hover:text-primary text-lg"><i className={`fas fa-chevron-down transition-transform ${showFullDepth ? 'rotate-180' : ''}`}></i></button>
                    </div>
                    
                    {/* Price Range & Stats */}
                    <div className="bg-overlay/50 rounded-md p-3">
                        <PriceRangeIndicator low={currentStock.low} high={currentStock.high} open={currentStock.open} ltp={currentStock.ltp} />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                            <div className="flex justify-between"><span className="text-muted">Volume</span><span className="font-semibold text-text-primary">{(currentStock.volume || 0).toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Avg. Price</span><span className="font-semibold text-text-primary">{formatCurrency(currentStock.avgTradePrice || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Lower Circuit</span><span className="font-semibold text-text-primary">{formatCurrency(currentStock.lowerCircuit || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Upper Circuit</span><span className="font-semibold text-text-primary">{formatCurrency(currentStock.upperCircuit || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted">LTQ</span><span className="font-semibold text-text-primary">{currentStock.lastTradedQuantity || 'N/A'}</span></div>
                            <div className="flex justify-between"><span className="text-muted">LTT</span><span className="font-semibold text-text-primary">{currentStock.lastTradedAt || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
                
                {/* Footer Actions */}
                <div className="p-4 border-t border-overlay flex justify-between items-center">
                    <button onClick={() => onCreateGTT(currentStock)} className="px-4 py-2 rounded-md bg-overlay hover:bg-base text-text-primary font-semibold transition text-sm">Create GTT</button>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onOrderAction({ stock: currentStock, type: TransactionType.BUY })} className="px-6 py-2 rounded-md bg-success text-white font-semibold transition text-sm">Buy</button>
                        <button onClick={() => onOrderAction({ stock: currentStock, type: TransactionType.SELL })} className="px-6 py-2 rounded-md bg-danger text-white font-semibold transition text-sm">Sell</button>
                        <button onClick={onClose} className="px-4 py-2 rounded-md bg-overlay hover:bg-base text-text-primary font-semibold transition text-sm">Close</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MarketDepthModal;