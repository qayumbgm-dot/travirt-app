
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, Time, CandlestickData, HistogramData } from 'lightweight-charts';
import { Stock, InstrumentType, Candle } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

type Timeframe = '1m' | '5m' | '15m' | '1h' | '1D';

const TIMEFRAME_CONFIG: Record<Timeframe, { intervalSeconds: number; count: number }> = {
    '1m':  { intervalSeconds: 60,    count: 200 },
    '5m':  { intervalSeconds: 300,   count: 200 },
    '15m': { intervalSeconds: 900,   count: 100 },
    '1h':  { intervalSeconds: 3600,  count: 100 },
    '1D':  { intervalSeconds: 86400, count: 100 },
};

const generateHistoricalData = (basePrice: number, count: number, intervalSeconds: number): Candle[] => {
    const data: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    const currentBar = Math.floor(now / intervalSeconds) * intervalSeconds;

    // Start count bars before the current bar
    let time = currentBar - ((count - 1) * intervalSeconds);
    // Offset starting price slightly so history isn't flat
    const volatility = intervalSeconds >= 86400 ? 0.015 : intervalSeconds >= 3600 ? 0.008 : 0.002;
    let price = basePrice * (1 + (Math.random() - 0.5) * 0.05);

    for (let i = 0; i < count; i++) {
        const open = price;
        const move = basePrice * volatility;
        const high = open + Math.abs(Math.random() * move);
        const low  = open - Math.abs(Math.random() * move);
        const close = low + Math.random() * (high - low);
        const volume = Math.floor(Math.random() * 10000 * (intervalSeconds / 60)) + 500;

        data.push({
            time,
            open,
            high: Math.max(high, open, close),
            low:  Math.min(low,  open, close),
            close,
            volume,
        });

        price = close;
        time += intervalSeconds;
    }
    return data;
};

interface ChartPanelProps {
    stock: Stock;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ stock }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef          = useRef<IChartApi | null>(null);
    const candleSeriesRef   = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef   = useRef<ISeriesApi<'Histogram'>   | null>(null);

    // Refs used inside the tick interval to avoid stale closures
    const currentCandleRef  = useRef<Candle | null>(null);
    const stockRef          = useRef<Stock>(stock);
    const timeframeRef      = useRef<Timeframe>('1m');

    const [timeframe, setTimeframe] = useState<Timeframe>('1m');

    // Keep refs current on every render — no extra effects needed
    stockRef.current    = stock;
    timeframeRef.current = timeframe;

    const { displayTitle, isOption } = useMemo(() => {
        if (stock.instrumentType === InstrumentType.OPTION) {
            return {
                displayTitle: `${stock.symbol} (Underlying: ${stock.underlying})`,
                isOption: true,
            };
        }
        return { displayTitle: stock.name, isOption: false };
    }, [stock.instrumentType, stock.name, stock.symbol, stock.underlying]);

    // ── Effect 1: Create chart once on mount ────────────────────────────────
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            // autoSize makes lightweight-charts own its ResizeObserver —
            // the chart always fills its container without manual width/height.
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: '#0B1B3F' },
                textColor: '#93C5FD',
            },
            grid: {
                vertLines: { color: '#1E3A8A' },
                horzLines: { color: '#1E3A8A' },
            },
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: {
                borderColor: '#1E3A8A',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: { borderColor: '#1E3A8A' },
        });

        const candleSeries = (chart as any).addCandlestickSeries({
            upColor: '#10B981',
            downColor: '#EF4444',
            borderVisible: false,
            wickUpColor: '#10B981',
            wickDownColor: '#EF4444',
        });

        const volumeSeries = (chart as any).addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        chartRef.current        = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        return () => { chart.remove(); };
    }, []);

    // ── Effect 2: Load historical data when symbol or timeframe changes ──────
    useEffect(() => {
        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

        const { intervalSeconds, count } = TIMEFRAME_CONFIG[timeframe];
        const history = generateHistoricalData(stock.ltp, count, intervalSeconds);

        candleSeriesRef.current.setData(history as unknown as CandlestickData<Time>[]);

        const volumeData: HistogramData<Time>[] = history.map(h => ({
            time:  h.time as Time,
            value: h.volume ?? 0,
            color: h.close >= h.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        }));
        volumeSeriesRef.current.setData(volumeData);

        currentCandleRef.current = history[history.length - 1];

        chartRef.current?.timeScale().fitContent();
    }, [stock.symbol, stock.exchange, timeframe]);

    // ── Effect 3: Single persistent tick interval (reads refs, never re-creates) ──
    useEffect(() => {
        const interval = setInterval(() => {
            if (!candleSeriesRef.current || !volumeSeriesRef.current || !currentCandleRef.current) return;

            const { intervalSeconds } = TIMEFRAME_CONFIG[timeframeRef.current];
            const tickPrice  = stockRef.current.ltp;
            const now        = Math.floor(Date.now() / 1000);
            const currentBar = Math.floor(now / intervalSeconds) * intervalSeconds;
            const lastCandle = currentCandleRef.current;

            if (currentBar > (lastCandle.time as number)) {
                // New bar started
                const newCandle: Candle = {
                    time:   currentBar,
                    open:   tickPrice,
                    high:   tickPrice,
                    low:    tickPrice,
                    close:  tickPrice,
                    volume: Math.floor(Math.random() * 50),
                };
                candleSeriesRef.current.update(newCandle as unknown as CandlestickData<Time>);
                volumeSeriesRef.current.update({
                    time:  currentBar as Time,
                    value: newCandle.volume!,
                    color: 'rgba(16, 185, 129, 0.3)',
                } as HistogramData<Time>);
                currentCandleRef.current = newCandle;
            } else {
                // Update the open bar
                const updated: Candle = {
                    ...lastCandle,
                    high:   Math.max(lastCandle.high, tickPrice),
                    low:    Math.min(lastCandle.low,  tickPrice),
                    close:  tickPrice,
                    volume: (lastCandle.volume ?? 0) + Math.floor(Math.random() * 10),
                };
                candleSeriesRef.current.update(updated as unknown as CandlestickData<Time>);
                volumeSeriesRef.current.update({
                    time:  lastCandle.time as Time,
                    value: updated.volume!,
                    color: updated.close >= updated.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                } as HistogramData<Time>);
                currentCandleRef.current = updated;
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []); // empty deps — interval runs for the lifetime of this ChartPanel instance

    const handleTimeframeChange = useCallback((tf: Timeframe) => {
        setTimeframe(tf);
    }, []);

    return (
        <div className="flex flex-col h-full relative bg-base overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start p-3 border-b border-overlay z-10 bg-surface shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center">
                        {displayTitle}
                        {!isOption && (
                            <span className="text-xs text-muted ml-2 bg-overlay px-1.5 py-0.5 rounded">
                                {stock.exchange}
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center gap-3 text-xs mt-1">
                        <span className={`font-bold text-lg ${stock.change >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(stock.ltp)}
                        </span>
                        <span className={`font-medium ${stock.change >= 0 ? 'text-success' : 'text-danger'}`}>
                            {stock.change >= 0 ? '+' : ''}
                            {stock.change.toFixed(2)} ({formatPercent(stock.changePercent / 100)})
                        </span>
                    </div>
                </div>

                {/* Daily OHLC pill */}
                <div className="hidden md:flex gap-3 text-[10px] bg-base/50 px-3 py-1 rounded-full border border-overlay/50">
                    {[
                        { label: 'O', value: stock.open },
                        { label: 'H', value: stock.high },
                        { label: 'L', value: stock.low },
                        { label: 'C', value: stock.prevClose },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col items-center">
                            <span className="text-muted">{label}</span>
                            <span className="text-text-secondary">{formatCurrency(value, 2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {isOption && (
                <div className="bg-yellow-500/10 text-yellow-400 px-3 py-1 text-xs border-b border-yellow-500/20 text-center">
                    <i className="fas fa-info-circle mr-1" />
                    Viewing Spot Chart (Option charts require premium feed)
                </div>
            )}

            {/* Lightweight Charts container — flex-1 gives it all remaining height */}
            <div className="flex-1 w-full relative" ref={chartContainerRef} />

            {/* Timeframe + drawing toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-surface/90 backdrop-blur px-2 py-1 rounded-full border border-overlay shadow-lg z-20">
                {(['1m', '5m', '15m', '1h', '1D'] as Timeframe[]).map((tf) => (
                    <button
                        key={tf}
                        onClick={() => handleTimeframeChange(tf)}
                        className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                            timeframe === tf
                                ? 'bg-primary text-white'
                                : 'text-muted hover:text-text-primary hover:bg-overlay'
                        }`}
                    >
                        {tf}
                    </button>
                ))}
                <div className="w-px bg-overlay mx-1" />
                <button className="text-xs text-muted hover:text-primary px-2 py-1">
                    <i className="fas fa-pencil-alt" />
                </button>
                <button className="text-xs text-muted hover:text-primary px-2 py-1">
                    <i className="fas fa-fx" />
                </button>
            </div>
        </div>
    );
};

export default ChartPanel;
