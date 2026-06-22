
import React from 'react';
import { Stock, WatchlistSettings, TransactionType } from '../../../types';
import { formatCurrency, formatPercent } from '../../../utils/formatters';
import Tooltip from '../../common/Tooltip';

interface StockRowProps {
    stock: Stock;
    settings: WatchlistSettings;
    isDiscover: boolean;
    isPredefined?: boolean; // New prop for static lists like Nifty 50
    hasNote: boolean;
    holdingQty?: number;
    onSelect: () => void;
    onOrder: (type: TransactionType) => void;
    onRemove: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    isExpanded: boolean;
    onDepthClick: () => void;
    onMoreClick: (symbol: string, event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StockRow: React.FC<StockRowProps> = ({ stock, settings, isDiscover, isPredefined = false, hasNote, holdingQty, onSelect, onOrder, onRemove, onDragStart, onDragEnter, onDragEnd, onMouseEnter, onMouseLeave, isExpanded, onDepthClick, onMoreClick }) => {
    
    const referencePrice = settings.changeType === 'open' ? stock.open : stock.prevClose;
    const change = stock.ltp - referencePrice;
    const changePercent = referencePrice > 0 ? (change / referencePrice) * 100 : 0;
    const changeColor = change >= 0 ? 'text-success' : 'text-danger';

    // Disable dragging for Discover lists AND Predefined lists
    const isDraggable = !isDiscover && !isPredefined;

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragEnd={onDragEnd}
            className="flex items-center p-2.5 rounded-t-lg transition-colors group/row relative hover:z-20"
        >
            <div className="flex items-center flex-1 overflow-hidden">
                {isDraggable && <span className="text-muted cursor-grab pr-2 touch-none"><i className="fas fa-grip-vertical"></i></span>}
                <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                        <p className={`font-bold truncate text-sm ${changeColor}`}>{stock.symbol}</p>
                        <span className="text-[9px] bg-overlay text-muted px-1 rounded uppercase tracking-wider">{stock.exchange}</span>
                        {settings.showOptions.notes && hasNote && (
                            <Tooltip title="This stock has a note"><i className="fas fa-sticky-note text-xs text-yellow-400"></i></Tooltip>
                        )}
                    </div>
                    {settings.showOptions.holdings && holdingQty && (
                        <p className="text-xs text-muted">Qty: {holdingQty}</p>
                    )}
                </div>
            </div>

            <div className="text-right transition-opacity group-hover/row:opacity-0 w-36 flex flex-col items-end">
                <p className="font-semibold text-sm">{formatCurrency(stock.ltp)}</p>
                <div className="flex gap-2 items-baseline">
                    {settings.showOptions.priceChange && <span className={`text-xs ${changeColor}`}>{change.toFixed(2)}</span>}
                    {settings.showOptions.priceChangePercent && <span className={`text-xs font-bold ${changeColor}`}>{formatPercent(changePercent / 100)}</span>}
                    {settings.showOptions.priceDirection && <i className={`fas fa-caret-${change >= 0 ? 'up' : 'down'} text-xs ${changeColor}`}></i>}
                </div>
            </div>

            {/* Show actions if it's NOT a discover list (or if we explicitly enable them via logic, but here !isDiscover handles it) */}
            {/* We passed isDiscover={false} for Predefined lists to show this block, but we hide specific items based on isPredefined */}
            {!isDiscover &&
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity bg-surface p-1 rounded-md shadow-lg">
                    <Tooltip title="Buy" shortcut="B">
                        <button onClick={(e) => { e.stopPropagation(); onOrder(TransactionType.BUY); }} className="w-8 h-8 rounded bg-success text-white font-bold text-sm hover:bg-green-600">B</button>
                    </Tooltip>
                    <Tooltip title="Sell" shortcut="S">
                        <button onClick={(e) => { e.stopPropagation(); onOrder(TransactionType.SELL); }} className="w-8 h-8 rounded bg-danger text-white font-bold text-sm hover:bg-red-600">S</button>
                    </Tooltip>
                     <Tooltip title={isExpanded ? "Hide Depth" : "Market Depth"} shortcut="D">
                        <button onClick={(e) => { e.stopPropagation(); onDepthClick(); }} className={`w-8 h-8 rounded hover:bg-base text-muted ${isExpanded ? 'bg-primary/20 text-primary' : 'bg-overlay'}`}>
                            <i className="fas fa-bars"></i>
                        </button>
                    </Tooltip>
                    <Tooltip title="Chart" shortcut="C">
                        <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="w-8 h-8 rounded bg-overlay hover:bg-base text-muted"><i className="fas fa-chart-line"></i></button>
                    </Tooltip>
                    
                    {/* Hide Delete button for Predefined lists */}
                    {!isPredefined && (
                        <Tooltip title="Delete" shortcut="Delete">
                            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-8 h-8 rounded bg-overlay hover:bg-base text-muted"><i className="fas fa-trash-alt"></i></button>
                        </Tooltip>
                    )}
                    
                    <Tooltip title="More">
                        <button 
                            onMouseDown={(e) => { 
                                e.stopPropagation(); 
                                e.preventDefault(); 
                                onMoreClick(stock.symbol, e); 
                            }} 
                            className="w-8 h-8 rounded bg-overlay hover:bg-base text-muted"
                        >
                            <i className="fas fa-ellipsis-h"></i>
                        </button>
                    </Tooltip>
                </div>
            }
        </div>
    );
};

export default StockRow;
