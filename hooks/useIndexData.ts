
import { useState, useEffect } from 'react';
import { MOCK_INDICES } from '../constants';

interface IndexQuote {
    c: number; // current price
    d: number | null; // change
    dp: number | null; // percent change
    h: number; // high
    l: number; // low
    o: number; // open
    pc: number; // previous close
}

export const useIndexData = (symbols: string[]) => {
    const [data, setData] = useState<Record<string, IndexQuote>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let intervalId: number;

        const symbolMap: { [key: string]: string } = {
            '^NSEI': 'NIFTY 50',
            '^BSESN': 'SENSEX',
            'NIFTY BANK': 'NIFTY BANK'
        };

        const initialData = symbols.reduce((acc, symbol) => {
            const mockIndex = MOCK_INDICES.find(m => m.symbol === symbolMap[symbol] || m.symbol === symbol);
            if (mockIndex) {
                const effectiveSymbol = Object.keys(symbolMap).find(key => symbolMap[key] === mockIndex.symbol) || symbol;
                acc[effectiveSymbol] = {
                    c: mockIndex.ltp,
                    d: mockIndex.change,
                    dp: mockIndex.changePercent,
                    h: Math.max(...mockIndex.history.map(h => h.value), mockIndex.ltp),
                    l: Math.min(...mockIndex.history.map(h => h.value), mockIndex.ltp),
                    o: mockIndex.history[0]?.value ?? mockIndex.ltp,
                    pc: mockIndex.ltp - mockIndex.change,
                };
            }
            return acc;
        }, {} as Record<string, IndexQuote>);


        const initialTimeout = setTimeout(() => {
            setData(initialData);
            setLoading(false);

            intervalId = window.setInterval(() => {
                setData(prevData => {
                    const newData = { ...prevData };
                    for (const symbol in newData) {
                        const currentIndex = newData[symbol];
                        if (!currentIndex) continue;
                        
                        const changeFactor = (Math.random() - 0.5) * 0.001;
                        const newLtp = currentIndex.c * (1 + changeFactor);
                        const newChange = newLtp - currentIndex.pc;
                        const newChangePercent = (newChange / currentIndex.pc) * 100;

                        newData[symbol] = {
                            ...currentIndex,
                            c: newLtp,
                            d: newChange,
                            dp: newChangePercent,
                        };
                    }
                    return newData;
                });
            }, 3000);

        }, 500);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(intervalId);
        };

    }, [JSON.stringify(symbols)]);

    return { data, loading };
};