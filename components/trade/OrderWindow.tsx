
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Stock, TransactionType, OrderType, OrderVariety, DepthLevel } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useToast } from '../../contexts/ToastContext';
import Tooltip from '../common/Tooltip';

interface OrderWindowProps {
    stock: Stock;
    initialTransactionType: TransactionType;
    initialOrderType?: OrderType;
    onClose: () => void;
}

type TabType = 'Quick' | 'Regular' | 'MTF' | 'Iceberg' | 'Cover';

const STORAGE_KEY = 'travirt_order_settings';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// --- Market Depth Component ---
interface MarketDepthContentProps {
    depthData: { bids: DepthLevel[], asks: DepthLevel[] };
    showFullDepth: boolean;
    onToggleDepth: () => void;
    onPricePick: (price: number) => void;
    maxDepthQty: number;
    themeText: string;
    depthSide: 'left' | 'right';
    className?: string;
}

const MarketDepthContent: React.FC<MarketDepthContentProps> = ({ 
    depthData, 
    showFullDepth, 
    onToggleDepth, 
    onPricePick, 
    maxDepthQty, 
    themeText, 
    depthSide,
    className 
}) => {
    // Apply rounding only to the outer corners
    const radiusClass = depthSide === 'right' ? 'rounded-br-lg rounded-tr-lg border-l' : 'rounded-bl-lg rounded-tl-lg border-r';
    
    // Generate enough rows to fill space dynamically
    const rowCount = 30; 

    return (
        <div className={`bg-surface border-overlay flex flex-col ${radiusClass} ${className} h-full`}>
            {/* Header - Aligned with Tabs */}
            <div className="h-[36px] bg-base border-b border-overlay flex justify-between items-center px-3 shrink-0 rounded-t-lg">
                <span className="font-semibold text-xs text-text-primary">Market Depth</span>
                <button 
                    onClick={onToggleDepth} 
                    className={`text-[10px] font-bold ${themeText} hover:underline flex items-center gap-1 transition-all uppercase tracking-wide`}
                >
                    {showFullDepth ? 'Scroll' : 'Auto-Fit'} 
                    <i className={`fas fa-chevron-${showFullDepth ? 'up' : 'down'}`}></i>
                </button>
            </div>
            
            {/* Depth Table Container */}
            <div className={`relative bg-base p-0 flex-1 ${showFullDepth ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'} rounded-b-lg`}>
                <table className="w-full text-[10px] border-collapse table-fixed">
                    <thead className="text-muted sticky top-0 bg-base z-10 shadow-sm">
                        <tr className="border-b border-overlay">
                            <th className="py-1 font-normal text-center w-[15%]">Ord</th>
                            <th className="py-1 font-normal text-right w-[20%]">Qty</th>
                            <th className="py-1 font-normal text-right pr-2 w-[15%]">Bid</th>
                            <th className="py-1 font-normal text-left pl-2 w-[15%]">Offer</th>
                            <th className="py-1 font-normal text-right w-[20%]">Qty</th>
                            <th className="py-1 font-normal text-center w-[15%]">Ord</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({length: rowCount}).map((_, i) => {
                            const bid = depthData.bids[i] || { price: 0, quantity: 0, orders: 0 };
                            const ask = depthData.asks[i] || { price: 0, quantity: 0, orders: 0 };
                            const bidPct = maxDepthQty > 0 ? (bid.quantity / maxDepthQty) * 100 : 0;
                            const askPct = maxDepthQty > 0 ? (ask.quantity / maxDepthQty) * 100 : 0;

                            if (bid.quantity === 0 && ask.quantity === 0) return null;

                            return (
                                <tr key={i} className="hover:bg-overlay cursor-pointer group border-b border-overlay/20 h-5 text-[10px]">
                                    <td className="text-center text-text-secondary">{bid.orders || '-'}</td>
                                    <td className="text-right text-text-secondary relative pr-1">
                                        {bid.quantity > 0 && <div className="absolute top-1 bottom-1 right-0 bg-blue-500/20" style={{width: `${bidPct}%`}}></div>}
                                        <span className="relative z-10">{bid.quantity || '-'}</span>
                                    </td>
                                    <td className="text-right font-semibold text-success pr-2" onClick={() => onPricePick(bid.price)}>
                                        {bid.price > 0 ? bid.price.toFixed(2) : '-'}
                                    </td>

                                    <td className="text-left font-semibold text-danger pl-2" onClick={() => onPricePick(ask.price)}>
                                        {ask.price > 0 ? ask.price.toFixed(2) : '-'}
                                    </td>
                                    <td className="text-right text-text-secondary relative pr-1">
                                        {ask.quantity > 0 && <div className="absolute top-1 bottom-1 left-0 bg-red-500/20" style={{width: `${askPct}%`}}></div>}
                                        <span className="relative z-10">{ask.quantity || '-'}</span>
                                    </td>
                                    <td className="text-center text-text-secondary">{ask.orders || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
             {/* Totals Footer */}
            <div className="grid grid-cols-2 gap-4 px-2 py-1 text-[10px] text-muted font-semibold border-t border-overlay bg-surface shrink-0">
                <div className="flex justify-between"><span>Total</span><span className="text-text-primary">{depthData.bids.reduce((a,b)=>a+b.quantity,0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-text-primary">{depthData.asks.reduce((a,b)=>a+b.quantity,0).toLocaleString()}</span><span>Total</span></div>
            </div>
        </div>
    );
};


export const OrderWindow: React.FC<OrderWindowProps> = ({ stock, initialTransactionType, initialOrderType, onClose }) => {
    const { executeTrade, portfolio, riskEngine } = usePortfolio();
    const { showToast } = useToast();
    
    // --- State ---
    const getInitialTab = (): TabType => {
        if (typeof window === 'undefined') return 'Quick';
        try {
            const item = localStorage.getItem(STORAGE_KEY);
            if (item) {
                const parsed = JSON.parse(item);
                const now = Date.now();
                if (now - parsed.timestamp < SEVEN_DAYS_MS) {
                     if(['Quick', 'Regular', 'MTF', 'Iceberg', 'Cover'].includes(parsed.tab)) {
                         return parsed.tab as TabType;
                     }
                }
            }
        } catch { /* ignore */ }
        return 'Quick';
    };

    const [transactionType, setTransactionType] = useState<TransactionType>(initialTransactionType);
    const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
    const [exchange, setExchange] = useState<'NSE' | 'BSE'>(stock.exchange === 'BSE' ? 'BSE' : 'NSE');
    
    // Window Position State
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 210, y: window.innerHeight / 2 - 250 });
    const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);
    const orderFormRef = useRef<HTMLDivElement>(null);

    // Order Details
    const [qty, setQty] = useState<number>(1);
    const [price, setPrice] = useState<number>(stock.ltp);
    const [triggerPrice, setTriggerPrice] = useState<number>(0);
    const [orderType, setOrderType] = useState<OrderType>(initialOrderType || OrderType.LIMIT);
    const [product, setProduct] = useState<'MIS' | 'CNC'>('CNC');
    
    // Advanced / Other Types
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [validity, setValidity] = useState<'Day' | 'Immediate' | 'Minutes'>('Day');
    const [disclosedQty, setDisclosedQty] = useState<number>(0);
    const [icebergLegs, setIcebergLegs] = useState<number>(2);
    
    // Market Depth Panel
    const [showMarketDepth, setShowMarketDepth] = useState(false);
    const [showFullDepth, setShowFullDepth] = useState(false);
    
    // MTF
    const [mtfAgreed, setMtfAgreed] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (price === 0) setPrice(stock.ltp);
    }, [stock.ltp]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ tab: activeTab, timestamp: Date.now() }));
    }, [activeTab]);

    // --- Derived Values ---
    const isBuy = transactionType === TransactionType.BUY;
    
    const themeColor = isBuy ? 'bg-success' : 'bg-danger';
    const themeText = isBuy ? 'text-success' : 'text-danger';
    const themeBorder = isBuy ? 'border-success' : 'border-danger';
    const themeHoverBg = isBuy ? 'hover:bg-green-600' : 'hover:bg-red-600';

    const marginRequired = useMemo(() => {
        let p = orderType === OrderType.MARKET ? stock.ltp : price;
        return qty * p;
    }, [qty, price, orderType, stock.ltp]);

    // --- Mock Depth Data ---
    const depthData = useMemo(() => {
        const currentDepth = stock.marketDepth || { bids: [], asks: [] };
        const fillDepth = (arr: DepthLevel[], type: 'bid' | 'ask') => {
            const filled = [...arr];
            while(filled.length < 50) { 
                const basePrice = filled.length > 0 ? filled[filled.length-1].price : stock.ltp;
                const newPrice = type === 'bid' ? basePrice - 0.05 : basePrice + 0.05;
                filled.push({
                    price: newPrice > 0 ? newPrice : 0.05,
                    quantity: Math.floor(Math.random() * 1000),
                    orders: Math.floor(Math.random() * 20)
                });
            }
            return filled;
        };
        return {
            bids: fillDepth(currentDepth.bids, 'bid'),
            asks: fillDepth(currentDepth.asks, 'ask')
        };
    }, [stock]);

    const maxDepthQty = Math.max(
        ...depthData.bids.slice(0, 50).map(d => d.quantity), 
        ...depthData.asks.slice(0, 50).map(d => d.quantity)
    );

    // --- Drag Logic ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.no-drag')) return;
        
        e.preventDefault();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y
        };
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = moveEvent.clientX - dragRef.current.startX;
            const dy = moveEvent.clientY - dragRef.current.startY;
            
            const rawX = dragRef.current.initialX + dx;
            const rawY = dragRef.current.initialY + dy;

            const windowHeight = orderFormRef.current ? orderFormRef.current.offsetHeight : 500;
            const ORDER_WIDTH = 420;

            const minX = 0;
            const maxX = window.innerWidth - ORDER_WIDTH;
            const clampedX = Math.min(Math.max(minX, rawX), maxX);

            const minY = 0;
            const maxY = window.innerHeight - windowHeight;
            const clampedY = Math.min(Math.max(minY, rawY), maxY);
            
            setPosition({
                x: clampedX,
                y: clampedY
            });
        };

        const handleMouseUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // --- Smart Positioning Logic ---
    const ORDER_WIDTH = 420;
    const DEPTH_WIDTH = 320;
    
    const depthSide = useMemo(() => {
        const rightEdge = position.x + ORDER_WIDTH + DEPTH_WIDTH;
        const screenWidth = window.innerWidth;
        if (rightEdge <= screenWidth) return 'right';
        if (position.x - DEPTH_WIDTH >= 0) return 'left';
        return 'right';
    }, [position.x]);

    const orderFormRadiusClass = !showMarketDepth ? 'rounded-lg' : (depthSide === 'right' ? 'rounded-l-lg' : 'rounded-r-lg');

    // --- Handlers ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'MTF' && !mtfAgreed) {
            showToast('Please agree to the MTF terms.', 'warning');
            return;
        }

        const variety = activeTab === 'Regular' ? OrderVariety.REGULAR : 
                        activeTab === 'Iceberg' ? OrderVariety.ICEBERG :
                        activeTab === 'Cover' ? OrderVariety.COVER : OrderVariety.REGULAR;

        const orderPayload = {
            symbol: stock.symbol,
            quantity: qty,
            price: orderType === OrderType.MARKET ? undefined : price,
            orderType: orderType,
            transactionType: transactionType,
            variety: variety,
            triggerPrice: (orderType === OrderType.STOP_LOSS_MARKET || activeTab === 'Cover') ? triggerPrice : undefined,
            disclosedQuantity: activeTab === 'Iceberg' ? Math.floor(qty / icebergLegs) : disclosedQty > 0 ? disclosedQty : undefined,
            validity: validity === 'Day' ? 'DAY' : validity === 'Immediate' ? 'IOC' : 'MINUTES',
        };

        const success = executeTrade(orderPayload as any);
        if (success) onClose();
    };

    const handlePricePick = (p: number) => {
        setPrice(p);
        setOrderType(OrderType.LIMIT);
    };

    // --- Render Components ---
    const ToggleSwitch = () => (
        <div 
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors no-drag ${isBuy ? 'bg-green-400' : 'bg-red-400'}`}
            onClick={() => setTransactionType(isBuy ? TransactionType.SELL : TransactionType.BUY)}
        >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isBuy ? 'left-4' : 'left-0.5'}`}></div>
        </div>
    );

    const visibleTabs: TabType[] = activeTab === 'Quick' 
        ? ['Quick', 'Regular'] 
        : ['Quick', 'Regular', 'MTF', 'Iceberg', 'Cover'];

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Draggable Container */}
            <div 
                className="absolute pointer-events-auto transition-none"
                style={{ left: position.x, top: position.y }}
            >
                <div className="relative flex flex-col">
                    
                    {/* Market Depth Panel - Slide Transition */}
                     <div 
                        className={`absolute top-[70px] bottom-0 w-[320px] shadow-2xl z-0 transition-all duration-300 ease-in-out ${
                            depthSide === 'left' ? 'right-full' : 'left-full'
                        }`}
                        style={{
                            transform: showMarketDepth ? 'translateX(0)' : (depthSide === 'left' ? 'translateX(100%)' : 'translateX(-100%)'),
                            opacity: showMarketDepth ? 1 : 0,
                            pointerEvents: showMarketDepth ? 'auto' : 'none'
                        }}
                    >
                         <MarketDepthContent 
                            depthData={depthData}
                            showFullDepth={showFullDepth}
                            onToggleDepth={() => setShowFullDepth(!showFullDepth)}
                            onPricePick={handlePricePick}
                            maxDepthQty={maxDepthQty}
                            themeText={themeText}
                            depthSide={depthSide}
                        />
                    </div>

                    {/* --- MAIN ORDER FORM --- */}
                    <div
                        ref={orderFormRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${transactionType === TransactionType.BUY ? 'Buy' : 'Sell'} ${stock.symbol}`}
                        className={`bg-base w-[420px] flex flex-col relative border-l-4 ${themeBorder} transition-colors duration-300 shadow-2xl z-10 ${orderFormRadiusClass}`}
                    >
                        
                        {/* Header - Fixed Height 70px */}
                        <div 
                            className={`px-4 py-3 ${themeColor} text-white transition-colors duration-300 h-[70px] shrink-0 cursor-move select-none`}
                            onMouseDown={handleMouseDown}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold pointer-events-none">{stock.symbol}</h2>
                                    <div className="flex items-center gap-3 mt-0.5 text-[11px] opacity-90">
                                        <div className="flex items-center gap-1 no-drag">
                                            <input type="radio" id="exch-nse" checked={exchange === 'NSE'} onChange={() => setExchange('NSE')} className="accent-white cursor-pointer w-3 h-3" />
                                            <label htmlFor="exch-nse" className="cursor-pointer">BSE ₹{formatCurrency(stock.ltp)}</label>
                                        </div>
                                        <div className="flex items-center gap-1 no-drag">
                                            <input type="radio" id="exch-bse" checked={exchange === 'BSE'} onChange={() => setExchange('BSE')} className="accent-white cursor-pointer w-3 h-3" />
                                            <label htmlFor="exch-bse" className="cursor-pointer">NSE ₹{formatCurrency(stock.ltp)}</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <ToggleSwitch />
                                    <Tooltip title={showMarketDepth ? "Close Market depth" : "Open Market depth"}>
                                        <button onClick={() => setShowMarketDepth(!showMarketDepth)} className="text-white opacity-80 hover:opacity-100 transition-opacity no-drag text-xs">
                                            <i className="fas fa-chart-bar"></i>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>

                        {/* Tabs - Fixed Height 36px */}
                        <div role="tablist" aria-label="Order type" className="flex border-b border-overlay bg-surface h-[36px] shrink-0">
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab}
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    onClick={() => setActiveTab(tab as TabType)}
                                    className={`flex-1 text-[11px] font-bold uppercase tracking-wide transition-colors relative ${
                                        activeTab === tab ? themeText : 'text-muted hover:text-text-primary'
                                    }`}
                                >
                                    {tab}
                                    {activeTab === tab && <div className={`absolute bottom-0 left-0 w-full h-0.5 ${themeColor}`}></div>}
                                </button>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="p-3 overflow-y-auto custom-scrollbar bg-surface relative">
                            {/* MTF Agreement Overlay */}
                            {activeTab === 'MTF' && !mtfAgreed && (
                                <div className="absolute inset-0 z-20 bg-surface/95 p-6 flex flex-col justify-center items-center text-center animate-fade-in">
                                    <h3 className="text-base font-bold text-text-primary mb-1">Enable MTF</h3>
                                    <p className="text-[10px] text-muted mb-3 leading-relaxed">
                                        Margin Trading Facility (MTF) enables buying with partial funds.
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setMtfAgreed(true)} className="px-4 py-1.5 bg-primary hover:bg-primary-focus text-white rounded text-xs font-bold">Agree</button>
                                        <button onClick={() => setActiveTab('Regular')} className="px-4 py-1.5 border border-overlay text-text-secondary rounded text-xs font-bold hover:bg-overlay">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <form id="order-form" onSubmit={handleSubmit} className="space-y-3">
                                {/* Product Type */}
                                {activeTab !== 'Quick' && (
                                    <div className="flex gap-4 mb-1">
                                        <label className="flex items-center cursor-pointer gap-1.5 group">
                                            <div className={`w-3.5 h-3.5 rounded-full border ${product === 'MIS' ? 'border-primary' : 'border-gray-500'} flex items-center justify-center`}>
                                                {product === 'MIS' && <div className={`w-2 h-2 rounded-full ${themeColor}`}></div>}
                                            </div>
                                            <input type="radio" className="hidden" checked={product === 'MIS'} onChange={() => setProduct('MIS')} />
                                            <span className={`text-xs group-hover:text-text-primary ${product === 'MIS' ? 'text-text-primary font-bold' : 'text-muted'}`}>Intraday <span className="text-[9px] text-muted uppercase ml-0.5">MIS</span></span>
                                        </label>
                                        <label className="flex items-center cursor-pointer gap-1.5 group">
                                            <div className={`w-3.5 h-3.5 rounded-full border ${product === 'CNC' ? 'border-primary' : 'border-gray-500'} flex items-center justify-center`}>
                                                {product === 'CNC' && <div className={`w-2 h-2 rounded-full ${themeColor}`}></div>}
                                            </div>
                                            <input type="radio" className="hidden" checked={product === 'CNC'} onChange={() => setProduct('CNC')} />
                                            <span className={`text-xs group-hover:text-text-primary ${product === 'CNC' ? 'text-text-primary font-bold' : 'text-muted'}`}>Longterm <span className="text-[9px] text-muted uppercase ml-0.5">CNC</span></span>
                                        </label>
                                    </div>
                                )}

                                {/* Qty & Price Inputs */}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-semibold text-muted block mb-1 uppercase">Qty</label>
                                        <div className="relative">
                                            <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min="1" className="w-full bg-base border border-gray-600 rounded py-1.5 pl-2 pr-6 text-sm text-text-primary focus:border-primary focus:outline-none" />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]"><i className="fas fa-layer-group"></i></span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-semibold text-muted block mb-1 uppercase">Price</label>
                                        <div className="relative">
                                            <input 
                                                type="number" value={price} onChange={e => setPrice(Number(e.target.value))} step="0.05"
                                                disabled={orderType === OrderType.MARKET}
                                                className={`w-full bg-base border border-gray-600 rounded py-1.5 pl-2 text-sm text-text-primary focus:border-primary focus:outline-none ${orderType === OrderType.MARKET ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Trigger Price */}
                                {(orderType === OrderType.STOP_LOSS_MARKET || orderType.includes('STOP') || activeTab === 'Cover') && (
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted block mb-1 uppercase">Trigger price</label>
                                        <input type="number" value={triggerPrice} onChange={e => setTriggerPrice(Number(e.target.value))} step="0.05" className="w-full bg-base border border-gray-600 rounded py-1.5 pl-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
                                    </div>
                                )}

                                {/* Order Type Toggles */}
                                {activeTab !== 'Quick' && (
                                    <div className="flex items-center gap-4 pt-1">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name="ordType" checked={orderType === OrderType.MARKET} onChange={() => setOrderType(OrderType.MARKET)} className="accent-primary w-3.5 h-3.5" />
                                            <span className="text-xs text-text-secondary font-medium">Market</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name="ordType" checked={orderType === OrderType.LIMIT} onChange={() => setOrderType(OrderType.LIMIT)} className="accent-primary w-3.5 h-3.5" />
                                            <span className="text-xs text-text-secondary font-medium">Limit</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name="ordType" checked={orderType.includes('STOP')} onChange={() => setOrderType(OrderType.STOP_LOSS_MARKET)} className="accent-primary w-3.5 h-3.5" />
                                            <span className="text-xs text-text-secondary font-medium">SL</span>
                                        </label>
                                    </div>
                                )}

                                {/* Advanced Options */}
                                <div className={`border-t border-overlay pt-2 ${showAdvanced ? 'block' : 'hidden'} transition-all`}>
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div>
                                            <label className="text-[10px] font-semibold text-muted block mb-1 uppercase">Validity</label>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" checked={validity === 'Day'} onChange={() => setValidity('Day')} className="accent-primary w-3 h-3" />
                                                    <span className="text-[11px] text-text-secondary">Day</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" checked={validity === 'Immediate'} onChange={() => setValidity('Immediate')} className="accent-primary w-3 h-3" />
                                                    <span className="text-[11px] text-text-secondary">IOC</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" checked={validity === 'Minutes'} onChange={() => setValidity('Minutes')} className="accent-primary w-3 h-3" />
                                                    <span className="text-[11px] text-text-secondary">Minutes</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-base border-t border-overlay shrink-0 rounded-b-lg">
                            <div className="flex justify-between items-center mb-3 text-[11px]">
                                <div className="flex gap-1">
                                    <span className="text-muted">Margin:</span>
                                    <Tooltip title="Margin required">
                                        <span className={`${themeText} font-bold cursor-help`}>{formatCurrency(marginRequired)}</span>
                                    </Tooltip>
                                </div>
                                <div className="flex gap-1">
                                    <span className="text-muted">Avail:</span>
                                    <Tooltip title="Available Balance">
                                        <span className={`${themeText} font-bold cursor-help`}>{formatCurrency(portfolio.virtualBalance)}</span>
                                    </Tooltip>
                                    <button onClick={() => setQty(1)} className={`ml-1 ${themeText} hover:underline`}><i className="fas fa-sync-alt"></i></button>
                                </div>
                            </div>
                            
                            {/* Risk block banners — shown instead of the submit button */}
                            {riskEngine.maxDrawdownState === 'breached' ? (
                                <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
                                    <i className="fas fa-ban mt-0.5 shrink-0"></i>
                                    <span>Max drawdown breached — all trading is halted. Close positions to reduce exposure.</span>
                                </div>
                            ) : (isBuy && riskEngine.dailyLossState === 'breached') ? (
                                <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
                                    <i className="fas fa-calendar-times mt-0.5 shrink-0"></i>
                                    <span>Daily loss limit reached — new positions are blocked until tomorrow.</span>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button form="order-form" type="submit" className={`flex-1 py-2 rounded font-bold text-white text-sm transition-transform active:scale-95 ${themeColor} ${themeHoverBg} hover:opacity-90 shadow-md`}>
                                        {isBuy ? 'Buy' : 'Sell'}
                                    </button>
                                    <button onClick={onClose} className="flex-1 py-2 rounded font-bold text-text-secondary text-sm border border-overlay hover:bg-overlay transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Advanced Toggle */}
                            {activeTab !== 'Quick' && (
                                <div className="flex justify-end mt-1.5">
                                    <button onClick={() => setShowAdvanced(!showAdvanced)} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${themeText} hover:underline opacity-80 hover:opacity-100`}>
                                        {showAdvanced ? (
                                            <span>Hide options <i className="fas fa-chevron-up"></i></span>
                                        ) : (
                                            <span>Advanced <i className="fas fa-chevron-down"></i></span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
