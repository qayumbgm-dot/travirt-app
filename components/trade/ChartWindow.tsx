
import React, { useState, useRef, useEffect } from 'react';
import { Stock, TransactionType, OrderType, InstrumentType } from '../../types';
import ChartPanel from './ChartPanel';
import OptionChainPanel from './OptionChainPanel';

interface ChartWindowProps {
    stock: Stock;
    onClose: () => void;
    onOrderAction: (action: { stock: Stock, type: TransactionType, price?: number, orderType?: OrderType }) => void;
}

type ChartViewMode = 'chart' | 'optionChain';

export const ChartWindow: React.FC<ChartWindowProps> = ({ stock, onClose, onOrderAction }) => {
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [size, setSize] = useState({ width: 800, height: 500 });
    const [viewMode, setViewMode] = useState<ChartViewMode>('chart');

    const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);
    const resizeRef = useRef<{ startX: number, startY: number, initialWidth: number, initialHeight: number } | null>(null);
    const windowRef = useRef<HTMLDivElement>(null);

    // Center initial position
    useEffect(() => {
        setPosition({
            x: (window.innerWidth - size.width) / 2,
            y: (window.innerHeight - size.height) / 2
        });
    }, []);

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.no-drag')) return;
        
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
            
            setPosition({
                x: dragRef.current.initialX + dx,
                y: dragRef.current.initialY + dy
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

    // Resize Logic
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizeRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialWidth: size.width,
            initialHeight: size.height
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!resizeRef.current) return;
            const dx = moveEvent.clientX - resizeRef.current.startX;
            const dy = moveEvent.clientY - resizeRef.current.startY;

            setSize({
                width: Math.max(400, resizeRef.current.initialWidth + dx),
                height: Math.max(300, resizeRef.current.initialHeight + dy)
            });
        };

        const handleMouseUp = () => {
            resizeRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const showOptionChainTab = stock.exchange === 'INDEX' || 
                               stock.instrumentType === InstrumentType.INDEX || 
                               stock.instrumentType === InstrumentType.FUTURE || 
                               stock.instrumentType === InstrumentType.OPTION ||
                               stock.exchange === 'NSE' ||
                               stock.exchange === 'BSE';

    const handleAddOptionToWatchlist = (_s: Stock) => {
        // no-op in floating window — watchlist add handled by main app
    };

    return (
        <div className="fixed inset-0 z-[90] pointer-events-none">
            <div 
                ref={windowRef}
                className="absolute bg-surface rounded-lg shadow-2xl border border-overlay flex flex-col pointer-events-auto overflow-hidden"
                style={{ 
                    left: position.x, 
                    top: position.y, 
                    width: size.width, 
                    height: size.height 
                }}
            >
                {/* Header */}
                <div 
                    className="h-10 bg-base border-b border-overlay flex justify-between items-center px-3 shrink-0 cursor-move select-none"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-text-primary">{stock.symbol}</span>
                        
                        <div className="flex gap-2 no-drag h-full items-center">
                            <button 
                                onClick={() => setViewMode('chart')}
                                className={`px-2 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'chart' ? 'bg-primary text-white' : 'text-muted hover:bg-overlay'}`}
                            >
                                Chart
                            </button>
                            {showOptionChainTab && (
                                <button 
                                    onClick={() => setViewMode('optionChain')}
                                    className={`px-2 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'optionChain' ? 'bg-primary text-white' : 'text-muted hover:bg-overlay'}`}
                                >
                                    Option Chain
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text-primary w-6 h-6 flex items-center justify-center rounded hover:bg-overlay no-drag">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 relative bg-base">
                    {viewMode === 'optionChain' && showOptionChainTab ? (
                        <OptionChainPanel
                            key={`option-chain-${stock.exchange}:${stock.symbol}`}
                            underlyingSymbol={stock.instrumentType === InstrumentType.FUTURE || stock.instrumentType === InstrumentType.OPTION ? (stock.underlying || stock.symbol) : stock.symbol}
                            underlyingLtp={stock.ltp}
                            exchange={stock.exchange}
                            onOrderAction={onOrderAction}
                            onAddToWatchlist={handleAddOptionToWatchlist}
                            onChartSelect={() => {}}
                            onCreateGTT={() => {}}
                            onCreateAlert={() => {}}
                            onShowDepth={() => {}}
                        />
                    ) : (
                        <ChartPanel
                            key={`chart-${stock.exchange}:${stock.symbol}`}
                            stock={stock}
                        />
                    )}
                </div>

                {/* Resize Handle */}
                <div 
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50"
                    onMouseDown={handleResizeMouseDown}
                >
                    <svg viewBox="0 0 10 10" className="w-full h-full opacity-50 fill-muted">
                        <path d="M6 9 L9 9 L9 6 Z" />
                        <path d="M2 9 L4 9 L9 4 L9 2 Z" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
