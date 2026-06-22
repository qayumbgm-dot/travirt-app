import { useState, useEffect, useRef, useCallback } from 'react';
import { Stock, MarketStatus, DepthLevel } from '../types';
import { MOCK_STOCKS } from '../constants';

const API_WS_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/^http/, 'ws') + '/market/ws'
  : 'ws://localhost:3001/api/market/ws';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildStockFromTick = (tick: any, existing: Stock): Stock => ({
  ...existing,
  ltp: tick.ltp ?? existing.ltp,
  change: tick.change ?? existing.change,
  changePercent: tick.changePercent ?? existing.changePercent,
  high: tick.high ?? existing.high,
  low: tick.low ?? existing.low,
  open: tick.open ?? existing.open,
  prevClose: tick.prevClose ?? existing.prevClose,
  volume: tick.volume ?? existing.volume,
  marketDepth: tick.bid != null
    ? {
        bids: [{ price: tick.bid, quantity: tick.bidQty ?? 100, orders: 1 }],
        asks: [{ price: tick.ask, quantity: tick.askQty ?? 100, orders: 1 }],
      }
    : existing.marketDepth,
});

const snapshotToStocks = (ticks: any[]): Stock[] => {
  // Merge server ticks with MOCK_STOCKS to preserve full Stock fields
  const mockMap = new Map<string, Stock>(MOCK_STOCKS.map((s) => [`${s.exchange}:${s.symbol}`, s]));
  const result: Stock[] = [];

  ticks.forEach((tick) => {
    const key = `${tick.exchange}:${tick.symbol}`;
    const base = mockMap.get(key) ?? ({
      symbol: tick.symbol, exchange: tick.exchange, name: tick.symbol,
      ltp: 0, open: 0, high: 0, low: 0, prevClose: 0, change: 0,
      changePercent: 0, volume: 0, instrumentType: 'EQUITY',
    } as Stock);
    result.push(buildStockFromTick(tick, base));
  });

  // Add any mock stocks not in server snapshot (options/futures)
  mockMap.forEach((s, key) => {
    if (!result.find((r) => `${r.exchange}:${r.symbol}` === key)) {
      result.push(s);
    }
  });

  return result;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMarketData = () => {
  const [marketData, setMarketData] = useState<Stock[]>(MOCK_STOCKS);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('CONNECTING');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketDataRef = useRef<Stock[]>(MOCK_STOCKS);

  const startSimulation = useCallback(() => {
    if (mockTimer.current) return;
    setMarketStatus('SIMULATION');
    setLoading(false);
    setIsConnected(true);
    mockTimer.current = setInterval(() => {
      setMarketData((prev) => {
        const updated = prev.map((stock) => {
          const vol = stock.instrumentType === 'OPTION' ? 0.002 : 0.001;
          const delta = stock.ltp * (Math.random() - 0.5) * vol;
          const newLtp = Math.max(0.05, Math.round((stock.ltp + delta) * 20) / 20);
          return {
            ...stock, ltp: newLtp,
            change: newLtp - stock.prevClose,
            changePercent: ((newLtp - stock.prevClose) / stock.prevClose) * 100,
            high: Math.max(stock.high, newLtp),
            low: Math.min(stock.low, newLtp),
            volume: (stock.volume || 0) + Math.floor(Math.random() * 100),
            marketDepth: {
              bids: stock.marketDepth?.bids.map((b: DepthLevel) => ({ ...b, price: newLtp - (stock.ltp - b.price) })) || [],
              asks: stock.marketDepth?.asks.map((a: DepthLevel) => ({ ...a, price: newLtp + (a.price - stock.ltp) })) || [],
            },
          };
        });
        marketDataRef.current = updated;
        return updated;
      });
    }, 1000);
  }, []);

  const stopSimulation = useCallback(() => {
    if (mockTimer.current) { clearInterval(mockTimer.current); mockTimer.current = null; }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(API_WS_URL);
    wsRef.current = ws;

    // Timeout: if not connected in 5s, fall back
    const timeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        startSimulation();
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      setIsConnected(true);
      stopSimulation();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'snapshot') {
          const stocks = snapshotToStocks(msg.data);
          marketDataRef.current = stocks;
          setMarketData(stocks);
          setMarketStatus(msg.mode === 'LIVE' ? 'LIVE' : 'SIMULATION');
          setLoading(false);
          setIsConnected(true);
        } else if (msg.type === 'tick') {
          const tick = msg.data;
          setMarketData((prev) => {
            const updated = prev.map((s) => {
              if (s.symbol === tick.symbol && s.exchange === tick.exchange) {
                return buildStockFromTick(tick, s);
              }
              return s;
            });
            marketDataRef.current = updated;
            return updated;
          });
        }
      } catch { /* ignore malformed */ }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      setIsConnected(false);
      wsRef.current = null;
      // Fall back to simulation, reconnect in 10s
      startSimulation();
      reconnectTimer.current = setTimeout(() => {
        stopSimulation();
        connect();
      }, 10000);
    };
  }, [startSimulation, stopSimulation]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopSimulation();
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [connect, stopSimulation]);

  return { marketData, loading, isConnected, marketStatus };
};
