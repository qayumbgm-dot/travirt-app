
import React from 'react';
import { createPortal } from 'react-dom';
import { useBasket } from '../../contexts/BasketContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useToast } from '../../contexts/ToastContext';
import { BasketItem, TransactionType, OrderType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type BasketUpdate = Partial<Pick<BasketItem, 'transactionType' | 'orderType' | 'quantity' | 'price'>>;

const BasketItemRow: React.FC<{
    item: BasketItem;
    onRemove: (id: string) => void;
    onUpdate: (id: string, updates: BasketUpdate) => void;
}> = ({ item, onRemove, onUpdate }) => {
    const isBuy = item.transactionType === TransactionType.BUY;
    const isLimit = item.orderType === OrderType.LIMIT;

    return (
        <div className="bg-base rounded-lg p-3 border border-overlay">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                            {item.transactionType}
                        </span>
                        <span className="font-bold text-text-primary text-sm">{item.stock.symbol}</span>
                        <span className="text-xs text-muted">{item.stock.exchange}</span>
                    </div>
                    <span className="text-xs text-muted mt-0.5 block">LTP: {formatCurrency(item.stock.ltp)}</span>
                </div>
                <button
                    onClick={() => onRemove(item.id)}
                    className="text-muted hover:text-danger transition-colors p-1 ml-2 shrink-0"
                >
                    <i className="fas fa-times text-xs"></i>
                </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 items-center">
                {/* BUY / SELL toggle */}
                <button
                    onClick={() => onUpdate(item.id, { transactionType: isBuy ? TransactionType.SELL : TransactionType.BUY })}
                    className={`text-xs font-bold px-3 py-1 rounded transition-colors ${isBuy ? 'bg-success text-white' : 'bg-danger text-white'}`}
                >
                    {isBuy ? 'BUY' : 'SELL'}
                </button>

                {/* Order type */}
                <select
                    value={item.orderType}
                    onChange={e => onUpdate(item.id, { orderType: e.target.value as OrderType })}
                    className="text-xs bg-overlay border border-gray-600 rounded px-2 py-1 text-text-primary"
                >
                    <option value={OrderType.MARKET}>MKT</option>
                    <option value={OrderType.LIMIT}>LMT</option>
                    <option value={OrderType.STOP_LOSS_MARKET}>SL-M</option>
                </select>

                {/* Quantity */}
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted">Qty</span>
                    <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => onUpdate(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-14 text-xs bg-overlay border border-gray-600 rounded px-2 py-1 text-text-primary text-center"
                    />
                </div>

                {/* Price (limit orders only) */}
                {isLimit && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted">@</span>
                        <input
                            type="number"
                            step="0.05"
                            value={item.price ?? item.stock.ltp}
                            onChange={e => onUpdate(item.id, { price: parseFloat(e.target.value) || item.stock.ltp })}
                            className="w-20 text-xs bg-overlay border border-gray-600 rounded px-2 py-1 text-text-primary text-center"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const BasketPanel: React.FC = () => {
    const { basketItems, isBasketOpen, closeBasket, removeFromBasket, updateBasketItem, clearBasket } = useBasket();
    const { executeTrade } = usePortfolio();
    const { showToast } = useToast();

    if (!isBasketOpen) return null;

    const handleExecuteAll = () => {
        if (basketItems.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        for (const item of basketItems) {
            const ok = executeTrade({
                symbol: item.stock.symbol,
                exchange: item.stock.exchange,
                quantity: item.quantity,
                orderType: item.orderType,
                transactionType: item.transactionType,
                price: item.orderType === OrderType.LIMIT ? (item.price ?? item.stock.ltp) : undefined,
            });
            if (ok) successCount++;
            else failCount++;
        }

        if (successCount > 0) {
            showToast(`${successCount} order${successCount > 1 ? 's' : ''} executed successfully.`, 'success');
            clearBasket();
            closeBasket();
        }
        if (failCount > 0) {
            showToast(`${failCount} order${failCount > 1 ? 's' : ''} failed — insufficient balance.`, 'error');
        }
    };

    const totalValue = basketItems.reduce((sum, item) => {
        const price = item.orderType === OrderType.LIMIT && item.price ? item.price : item.stock.ltp;
        return sum + price * item.quantity;
    }, 0);

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[105] animate-fade-in"
                onClick={closeBasket}
            />

            {/* Slide-in panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-overlay z-[106] flex flex-col shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-overlay shrink-0 bg-base">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-shopping-basket text-primary text-lg"></i>
                        <h2 className="font-bold text-text-primary text-base">Orders Basket</h2>
                        {basketItems.length > 0 && (
                            <span className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {basketItems.length}
                            </span>
                        )}
                    </div>
                    <button onClick={closeBasket} className="text-muted hover:text-text-primary transition-colors p-1">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {basketItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-16">
                            <i className="fas fa-shopping-basket text-5xl text-muted mb-4 opacity-30"></i>
                            <p className="text-text-secondary font-semibold">Basket is empty</p>
                            <p className="text-muted text-sm mt-1">
                                Right-click a stock in the watchlist and choose
                                <br /><span className="text-primary font-semibold">Add to basket</span>.
                            </p>
                        </div>
                    ) : (
                        basketItems.map(item => (
                            <BasketItemRow
                                key={item.id}
                                item={item}
                                onRemove={removeFromBasket}
                                onUpdate={updateBasketItem}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                {basketItems.length > 0 && (
                    <div className="shrink-0 p-4 border-t border-overlay bg-base space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted">Estimated Total</span>
                            <span className="font-bold text-text-primary">{formatCurrency(totalValue)}</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={clearBasket}
                                className="flex-1 py-2 rounded-md bg-overlay hover:bg-surface text-text-primary font-semibold text-sm transition-colors border border-overlay"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handleExecuteAll}
                                className="flex-1 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-bold text-sm transition-colors"
                            >
                                Execute All ({basketItems.length})
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>,
        document.body
    );
};

export default BasketPanel;
