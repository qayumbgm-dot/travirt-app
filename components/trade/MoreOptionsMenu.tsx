
import React, { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Stock } from '../../types';
import { useBasket } from '../../contexts/BasketContext';

interface MoreOptionsMenuProps {
    stock: Stock;
    triggerEl: HTMLElement;
    onClose: () => void;
    onPin: (symbol: string, slot: number) => void;
    onCreateGTT: () => void;
    onCreateAlert: () => void;
    onShowNotes: () => void;
    onShowMarketDepthModal: () => void;
}

const menuItems = [
    { type: 'pin', label: 'Pin', icon: 'fas fa-paperclip' },
    { type: 'notes', label: 'Notes', icon: 'fas fa-sticky-note' },
    { type: 'action', label: 'Chart', icon: 'fas fa-chart-line', popout: true },
    { type: 'action', label: 'Option chain', icon: 'fas fa-stream', popout: true },
    { type: 'gtt', label: 'Create GTT / GTC', icon: 'fas fa-directions' },
    { type: 'alert', label: 'Create alert / ATO', icon: 'fas fa-bell' },
    { type: 'marketDepthModal', label: 'Market depth', icon: 'fas fa-bars' },
    { type: 'action', label: 'Add to basket', icon: 'fas fa-shopping-basket' },
    { type: 'action', label: 'Fundamentals', icon: 'fas fa-arrow-up', popout: true },
    { type: 'action', label: 'Technicals', icon: 'fas fa-bolt', popout: true }
];


export const MoreOptionsMenu: React.FC<MoreOptionsMenuProps> = ({ stock, triggerEl, onClose, onPin, onCreateGTT, onCreateAlert, onShowNotes, onShowMarketDepthModal }) => {
    const { addToBasket } = useBasket();
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [isFlipped, setIsFlipped] = useState(false);

    useLayoutEffect(() => {
        if (triggerEl && menuRef.current) {
            const triggerRect = triggerEl.getBoundingClientRect();
            const menuRect = menuRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            let top = triggerRect.bottom + 4;
            let flipped = false;

            // If the menu would render outside the viewport, flip it to display above the trigger.
            if (top + menuRect.height > viewportHeight) {
                top = triggerRect.top - menuRect.height - 4;
                flipped = true;
            }
            
            setIsFlipped(flipped);

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${triggerRect.right - menuRect.width}px`,
                zIndex: 50,
            });
        }
    }, [triggerEl]);

    const handleActionClick = (label: string) => {
        // Helper to format symbol for TradingView website
        const getTvSymbol = () => {
             if (stock.exchange === 'INDEX') {
                 if (stock.symbol === 'NIFTY 50') return 'NSE-NIFTY';
                 if (stock.symbol === 'NIFTY BANK') return 'NSE-BANKNIFTY';
                 if (stock.symbol === 'SENSEX') return 'BSE-SENSEX';
                 return `NSE-${stock.symbol.replace(/ /g, '')}`;
             }
             return `${stock.exchange}-${stock.symbol}`;
        };

        if (label === 'Chart') {
            window.open(`https://www.tradingview.com/chart/?symbol=${stock.exchange === 'BSE' ? 'BSE' : 'NSE'}:${stock.symbol}`, '_blank');
        } else if (label === 'Fundamentals') {
            window.open(`https://in.tradingview.com/symbols/${getTvSymbol()}/financials-overview/`, '_blank');
        } else if (label === 'Technicals') {
             window.open(`https://in.tradingview.com/symbols/${getTvSymbol()}/technicals/`, '_blank');
        } else if (label === 'Add to basket') {
            addToBasket(stock);
        }
        onClose();
    };
    
    const handlePin = (slot: number) => {
        onPin(stock.symbol, slot);
        onClose();
    };

    return createPortal(
        <div 
            ref={menuRef} 
            style={style}
            data-more-menu-container="true"
            onMouseLeave={onClose}
            className="bg-surface w-48 rounded-md shadow-2xl border border-overlay text-text-secondary text-sm animate-fade-in"
        >
            <ul className={`py-1 flex flex-col ${isFlipped ? 'flex-col-reverse' : ''}`}>
                 {menuItems.map(item => {
                    if (item.type === 'pin') {
                        return (
                            <li key={item.label} className="flex items-center justify-between px-3 py-2">
                                <div className="flex items-center">
                                    <i className={`${item.icon} w-6 text-muted`}></i>
                                    <span>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2].map(num => (
                                         <button key={num} onClick={() => handlePin(num)} className="w-6 h-6 text-xs font-semibold rounded hover:bg-primary-focus text-white bg-primary">{num}</button>
                                    ))}
                                </div>
                            </li>
                        );
                    }
                     if (item.type === 'notes') {
                        return (
                             <li key={item.label}>
                                <a href="#" onClick={(e) => { e.preventDefault(); onShowNotes(); onClose(); }} className="flex items-center justify-between px-3 py-2 hover:bg-overlay">
                                    <div className="flex items-center">
                                        <i className={`${item.icon} w-6 text-muted`}></i>
                                        <span className="text-text-primary">{item.label}</span>
                                    </div>
                                </a>
                            </li>
                        );
                    }
                    if (item.type === 'gtt') {
                        return (
                             <li key={item.label}>
                                <a href="#" onClick={(e) => { e.preventDefault(); onCreateGTT(); onClose(); }} className="flex items-center justify-between px-3 py-2 hover:bg-overlay">
                                    <div className="flex items-center">
                                        <i className={`${item.icon} w-6 text-muted`}></i>
                                        <span className="text-text-primary font-semibold">{item.label}</span>
                                    </div>
                                </a>
                            </li>
                        );
                    }
                     if (item.type === 'alert') {
                        return (
                             <li key={item.label}>
                                <a href="#" onClick={(e) => { e.preventDefault(); onCreateAlert(); onClose(); }} className="flex items-center justify-between px-3 py-2 hover:bg-overlay">
                                    <div className="flex items-center">
                                        <i className={`${item.icon} w-6 text-muted`}></i>
                                        <span className="text-text-primary font-semibold">{item.label}</span>
                                    </div>
                                </a>
                            </li>
                        );
                    }
                    if (item.type === 'marketDepthModal') {
                        return (
                             <li key={item.label}>
                                <a href="#" onClick={(e) => { e.preventDefault(); onShowMarketDepthModal(); onClose(); }} className="flex items-center justify-between px-3 py-2 hover:bg-overlay">
                                    <div className="flex items-center">
                                        <i className={`${item.icon} w-6 text-muted`}></i>
                                        <span className="text-text-primary">{item.label}</span>
                                    </div>
                                </a>
                            </li>
                        );
                    }
                    // type 'action'
                    return (
                        <li key={item.label}>
                            <a href="#" onClick={(e) => { e.preventDefault(); handleActionClick(item.label); }} className="flex items-center justify-between px-3 py-2 hover:bg-overlay">
                                <div className="flex items-center">
                                    <i className={`${item.icon} w-6 text-muted`}></i>
                                    <span>{item.label}</span>
                                </div>
                                {item.popout && (
                                    <i className="fas fa-external-link-alt text-xs text-muted"></i>
                                )}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </div>,
        document.body
    );
};
