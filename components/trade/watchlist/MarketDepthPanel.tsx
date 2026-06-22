
import React, { useState } from 'react';
import { Stock, TransactionType } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import Tooltip from '../../common/Tooltip';

const PriceRangeIndicator: React.FC<{
    low: number;
    high: number;
    open: number;
    ltp: number;
    onPriceClick: (price: number) => void;
}> = ({ low, high, open, ltp, onPriceClick }) => {
    const range = high > low ? high - low : 1;
    const ltpPercent = Math.max(0, Math.min(100, ((ltp - low) / range) * 100));
    const openPercent = Math.max(0, Math.min(100, ((open - low) / range) * 100));

    return (
        <div className="relative h-8 my-2 pt-4 px-12">
            <div className="relative h-1 bg-overlay rounded-full">
                {/* Open Price Marker */}
                <Tooltip title={`Open: ${formatCurrency(open)}`}>
                    <div
                        className="absolute top-1/2 w-2 h-2 bg-muted rounded-full cursor-pointer -translate-y-1/2"
                        style={{ left: `${openPercent}%` }}
                        onClick={(e) => { e.stopPropagation(); onPriceClick(open); }}
                    ></div>
                </Tooltip>

                {/* LTP Marker */}
                <Tooltip title={`LTP: ${formatCurrency(ltp)}`}>
                    <div
                        className="absolute top-1/2 w-3 h-3 bg-primary border-2 border-surface rounded-full cursor-pointer shadow-glow-blue z-10 -translate-y-1/2"
                        style={{ left: `${ltpPercent}%` }}
                        onClick={(e) => { e.stopPropagation(); onPriceClick(ltp); }}
                    ></div>
                </Tooltip>
            </div>
             {/* Low Price Label */}
             <Tooltip title={`Low: ${formatCurrency(low)}`}>
                <div className="absolute left-0 top-1/2 text-xs text-muted cursor-pointer" onClick={(e) => { e.stopPropagation(); onPriceClick(low); }}>
                    {formatCurrency(low)}
                </div>
            </Tooltip>

            {/* High Price Label */}
            <Tooltip title={`High: ${formatCurrency(high)}`}>
                <div className="absolute right-0 top-1/2 text-xs text-muted cursor-pointer" onClick={(e) => { e.stopPropagation(); onPriceClick(high); }}>
                    {formatCurrency(high)}
                </div>
            </Tooltip>
        </div>
    );
};

const MarketDepthPanel: React.FC<{
    stock: Stock;
    onPriceClick: (price: number, type: TransactionType) => void;
}> = ({ stock, onPriceClick }) => {
    const [showFullDepth, setShowFullDepth] = useState(false);
    const depth = showFullDepth ? 20 : 5;
    const bids = stock.marketDepth?.bids.slice(0, depth) || [];
    const asks = stock.marketDepth?.asks.slice(0, depth) || [];
    
    const totalBidQty = stock.marketDepth?.bids.reduce((sum, b) => sum + b.quantity, 0) || 0;
    const totalAskQty = stock.marketDepth?.asks.reduce((sum, a) => sum + a.quantity, 0) || 0;
    const maxQty = Math.max(
        ...(stock.marketDepth?.bids.map(d => d.quantity) || [0]), 
        ...(stock.marketDepth?.asks.map(d => d.quantity) || [0])
    );

    const DepthRow: React.FC<{ level: any; side: 'bid' | 'ask' }> = ({ level, side }) => {
        const percentage = maxQty > 0 ? (level.quantity / maxQty) * 100 : 0;
        const type = side === 'bid' ? TransactionType.SELL : TransactionType.BUY;
        
        const priceClass = side === 'bid' ? 'text-success' : 'text-danger';
        const barBgClass = side === 'bid' ? 'bg-success/20' : 'bg-danger/20';

        return (
            <tr className="text-xs hover:bg-overlay/50 cursor-pointer" onClick={() => onPriceClick(level.price, type)}>
                {side === 'bid' && <>
                    <td className="p-1 text-center text-text-secondary">{level.orders}</td>
                    <td className="p-1 text-right text-text-secondary relative overflow-hidden">
                        <div className={`absolute top-0 bottom-0 right-0 h-full ${barBgClass}`} style={{width: `${percentage}%`}}></div>
                        <span className="relative z-[1]">{level.quantity.toLocaleString('en-IN')}</span>
                    </td>
                    <td className={`p-1 text-right font-semibold ${priceClass}`}>{level.price.toFixed(2)}</td>
                </>}
                {side === 'ask' && <>
                    <td className={`p-1 text-left font-semibold ${priceClass}`}>{level.price.toFixed(2)}</td>
                    <td className="p-1 text-right text-text-secondary relative overflow-hidden">
                        <div className={`absolute top-0 bottom-0 left-0 h-full ${barBgClass}`} style={{width: `${percentage}%`}}></div>
                        <span className="relative z-[1]">{level.quantity.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="p-1 text-center text-text-secondary">{level.orders}</td>
                </>}
            </tr>
        );
    };

    return (
        <div className="bg-surface/50 p-3 animate-fade-in border-t border-overlay">
            <div className="grid grid-cols-2 gap-2 text-xs">
                <table className="w-full">
                    <thead>
                        <tr className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                            <th className="text-center w-1/4 pb-1">Orders</th>
                            <th className="text-right w-1/2 pb-1">Qty.</th>
                            <th className="text-right w-1/4 pb-1">Bid</th>
                        </tr>
                    </thead>
                    <tbody>{bids.map(bid => <DepthRow key={`bid-${bid.price}`} level={bid} side="bid" />)}</tbody>
                </table>
                <table className="w-full">
                    <thead>
                        <tr className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                            <th className="text-left w-1/4 pb-1">Offer</th>
                            <th className="text-right w-1/2 pb-1">Qty.</th>
                            <th className="text-center w-1/4 pb-1">Orders</th>
                        </tr>
                    </thead>
                    <tbody>{asks.map(ask => <DepthRow key={`ask-${ask.price}`} level={ask} side="ask" />)}</tbody>
                </table>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-1 text-text-primary">
                <div className="flex justify-between p-1 border-t border-overlay"><span className="font-bold">Total</span><span className="font-bold">{totalBidQty.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between p-1 border-t border-overlay"><span className="font-bold">Total</span><span className="font-bold">{totalAskQty.toLocaleString('en-IN')}</span></div>
            </div>
            <div className="text-center my-1">
                <Tooltip title={showFullDepth ? "Show 5 depth" : "Show 20 depth"}>
                    <button onClick={() => setShowFullDepth(!showFullDepth)} className="text-muted hover:text-primary text-lg leading-none"><i className={`fas fa-chevron-down transition-transform ${showFullDepth ? 'rotate-180' : ''}`}></i></button>
                </Tooltip>
            </div>
            <PriceRangeIndicator low={stock.low} high={stock.high} open={stock.open} ltp={stock.ltp} onPriceClick={(price) => onPriceClick(price, TransactionType.BUY)} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                <div className="flex justify-between"><span className="text-muted">Open</span><span className="font-semibold cursor-pointer hover:text-primary" onClick={() => onPriceClick(stock.open, TransactionType.BUY)}>{formatCurrency(stock.open)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Prev. Close</span><span className="font-semibold cursor-pointer hover:text-primary" onClick={() => onPriceClick(stock.prevClose, TransactionType.BUY)}>{formatCurrency(stock.prevClose)}</span></div>
                <div className="flex justify-between"><span className="text-muted">High</span><span className="font-semibold cursor-pointer hover:text-primary" onClick={() => onPriceClick(stock.high, TransactionType.BUY)}>{formatCurrency(stock.high)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Low</span><span className="font-semibold cursor-pointer hover:text-primary" onClick={() => onPriceClick(stock.low, TransactionType.BUY)}>{formatCurrency(stock.low)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Volume</span><span className="font-semibold">{(stock.volume || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-muted">Avg. Price</span><span className="font-semibold">{formatCurrency(stock.avgTradePrice || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Lower Circuit</span><span className="font-semibold cursor-pointer hover:text-primary" onClick={() => onPriceClick(stock.lowerCircuit || 0, TransactionType.BUY)}>{formatCurrency(stock.lowerCircuit || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Upper Circuit</span><span className="font-semibold cursor-pointer hover:text-primary" onClick={() => onPriceClick(stock.upperCircuit || 0, TransactionType.SELL)}>{formatCurrency(stock.upperCircuit || 0)}</span></div>
            </div>
        </div>
    );
};

export default MarketDepthPanel;
