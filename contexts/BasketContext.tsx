
import React, { createContext, useContext, useState, useCallback } from 'react';
import { BasketItem, Stock, TransactionType, OrderType } from '../types';

type BasketUpdate = Partial<Pick<BasketItem, 'transactionType' | 'orderType' | 'quantity' | 'price'>>;

interface BasketContextType {
    basketItems: BasketItem[];
    isBasketOpen: boolean;
    addToBasket: (stock: Stock) => void;
    removeFromBasket: (id: string) => void;
    updateBasketItem: (id: string, updates: BasketUpdate) => void;
    clearBasket: () => void;
    toggleBasket: () => void;
    closeBasket: () => void;
}

const BasketContext = createContext<BasketContextType | null>(null);

export const useBasket = () => {
    const ctx = useContext(BasketContext);
    if (!ctx) throw new Error('useBasket must be used inside BasketProvider');
    return ctx;
};

export const BasketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
    const [isBasketOpen, setIsBasketOpen] = useState(false);

    const addToBasket = useCallback((stock: Stock) => {
        setBasketItems(prev => {
            const exists = prev.find(i => i.stock.symbol === stock.symbol && i.stock.exchange === stock.exchange);
            if (exists) return prev;
            return [...prev, {
                id: `${Date.now()}-${stock.symbol}`,
                stock,
                transactionType: TransactionType.BUY,
                orderType: OrderType.MARKET,
                quantity: 1,
            }];
        });
        setIsBasketOpen(true);
    }, []);

    const removeFromBasket = useCallback((id: string) => {
        setBasketItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const updateBasketItem = useCallback((id: string, updates: BasketUpdate) => {
        setBasketItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    }, []);

    const clearBasket = useCallback(() => setBasketItems([]), []);
    const toggleBasket = useCallback(() => setIsBasketOpen(prev => !prev), []);
    const closeBasket = useCallback(() => setIsBasketOpen(false), []);

    return (
        <BasketContext.Provider value={{ basketItems, isBasketOpen, addToBasket, removeFromBasket, updateBasketItem, clearBasket, toggleBasket, closeBasket }}>
            {children}
        </BasketContext.Provider>
    );
};
