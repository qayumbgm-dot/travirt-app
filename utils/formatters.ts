
import { Stock } from '../types';

export const formatCurrency = (value: number, maximumFractionDigits: number = 2): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits,
    }).format(value);
};

export const formatPercent = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const getInstrumentKey = (stock: Stock | { symbol: string, exchange: string }): string => {
    return `${stock.exchange}:${stock.symbol}`;
};

export const parseInstrumentKey = (key: string): { symbol: string, exchange?: string } => {
    if (key.includes(':')) {
        const [exchange, symbol] = key.split(':');
        return { exchange, symbol };
    }
    return { symbol: key };
};
