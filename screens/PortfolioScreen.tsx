
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { usePortfolio } from '../contexts/PortfolioContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Order, TransactionType } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClosedTrade {
    symbol: string;
    pnl: number;
    returnPct: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    timestamp: number;
}

type PortfolioTab = 'holdings' | 'equity' | 'stats' | 'calendar' | 'instruments';

// ── FIFO Trade Matcher ────────────────────────────────────────────────────────

function pairOrders(orders: Order[]): ClosedTrade[] {
    const trades: ClosedTrade[] = [];
    const queues: Record<string, { price: number; quantity: number }[]> = {};
    const sorted = [...orders]
        .filter(o => o.status === 'EXECUTED')
        .sort((a, b) => a.timestamp - b.timestamp);

    for (const order of sorted) {
        const key = `${order.symbol}:${order.exchange ?? ''}`;
        if (!queues[key]) queues[key] = [];

        if (order.transactionType === TransactionType.BUY) {
            queues[key].push({ price: order.price || 0, quantity: order.quantity });
        } else {
            let remaining = order.quantity;
            while (remaining > 0 && queues[key].length > 0) {
                const entry = queues[key][0];
                const matched = Math.min(remaining, entry.quantity);
                const entryPrice = entry.price;
                const exitPrice  = order.price || 0;
                trades.push({
                    symbol: order.symbol,
                    pnl: (exitPrice - entryPrice) * matched,
                    returnPct: entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0,
                    entryPrice,
                    exitPrice,
                    quantity: matched,
                    timestamp: order.timestamp,
                });
                entry.quantity -= matched;
                remaining -= matched;
                if (entry.quantity === 0) queues[key].shift();
            }
        }
    }
    return trades;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: string; message: string }> = ({ icon, message }) => (
    <div className="flex flex-col items-center justify-center py-16 text-muted">
        <i className={`fas ${icon} text-4xl mb-4 opacity-40`}></i>
        <p className="text-sm text-center max-w-xs leading-relaxed">{message}</p>
    </div>
);

const StatBox: React.FC<{ label: string; value: string; color?: string; sub?: string }> = ({
    label, value, color = 'text-text-primary', sub,
}) => (
    <div className="bg-base rounded-lg p-4">
        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </div>
);

// ── Holdings Tab ──────────────────────────────────────────────────────────────

const HoldingsTab: React.FC = () => {
    const { portfolio, getStock } = usePortfolio();

    if (portfolio.positions.length === 0) {
        return <EmptyState icon="fa-folder-open" message="You have no open positions. Visit the Trade screen to get started!" />;
    }

    return (
        <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-text-secondary">
                    <thead className="text-xs uppercase bg-overlay">
                        <tr>
                            <th className="p-4">Symbol</th>
                            <th className="p-4 text-right">Quantity</th>
                            <th className="p-4 text-right">Avg. Price</th>
                            <th className="p-4 text-right">LTP</th>
                            <th className="p-4 text-right">Bid</th>
                            <th className="p-4 text-right">Ask</th>
                            <th className="p-4 text-right">Invested</th>
                            <th className="p-4 text-right">Current Value</th>
                            <th className="p-4 text-right">P&L</th>
                            <th className="p-4 text-right">P&L %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {portfolio.positions.map(pos => {
                            const stock = getStock(pos.symbol);
                            return (
                                <tr key={pos.symbol} className="border-b border-overlay hover:bg-overlay transition-colors">
                                    <td className="p-4 font-bold">{pos.symbol}</td>
                                    <td className="p-4 text-right">{pos.quantity}</td>
                                    <td className="p-4 text-right">{formatCurrency(pos.avgPrice)}</td>
                                    <td className="p-4 text-right">{formatCurrency(pos.ltp)}</td>
                                    <td className="p-4 text-right text-success">{stock?.bid ? formatCurrency(stock.bid) : 'N/A'}</td>
                                    <td className="p-4 text-right text-danger">{stock?.ask ? formatCurrency(stock.ask) : 'N/A'}</td>
                                    <td className="p-4 text-right">{formatCurrency(pos.investedValue)}</td>
                                    <td className="p-4 text-right">{formatCurrency(pos.currentValue)}</td>
                                    <td className={`p-4 text-right font-bold ${pos.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {formatCurrency(pos.pnl)}
                                    </td>
                                    <td className={`p-4 text-right font-bold ${pos.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {formatPercent(pos.pnl / pos.investedValue)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Equity Curve Tab ──────────────────────────────────────────────────────────

const EquityTab: React.FC = () => {
    const { equityHistory } = usePortfolio();
    const containerRef = useRef<HTMLDivElement>(null);

    // Deduplicate by second-level timestamp (LWC requires unique times)
    const chartData = useMemo(() => {
        const seen = new Set<number>();
        return equityHistory
            .map((pt, i) => ({ time: Math.floor(pt.time / 1000) + i, value: pt.value }))
            .filter(pt => { if (seen.has(pt.time)) return false; seen.add(pt.time); return true; });
    }, [equityHistory]);

    useEffect(() => {
        if (!containerRef.current || chartData.length < 2) return;

        const first = chartData[0].value;
        const last  = chartData[chartData.length - 1].value;
        const isUp  = last >= first;

        const chart = createChart(containerRef.current, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: '#0B1B3F' },
                textColor: '#93C5FD',
            },
            grid: {
                vertLines: { color: '#1E3A8A33' },
                horzLines: { color: '#1E3A8A33' },
            },
            timeScale: {
                borderColor: '#1E3A8A',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: { borderColor: '#1E3A8A' },
        });

        const line = (chart as any).addLineSeries({
            color: isUp ? '#10B981' : '#EF4444',
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        line.setData(chartData);

        (line as any).createPriceLine({
            price: first,
            color: '#93C5FD44',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: 'session start',
        });

        chart.timeScale().fitContent();
        return () => chart.remove();
    }, [chartData]);

    if (chartData.length < 2) {
        return <EmptyState icon="fa-chart-line" message="Execute at least 2 trades to see your equity curve. Each trade adds a data point to the chart." />;
    }

    const first  = equityHistory[0].value;
    const last   = equityHistory[equityHistory.length - 1].value;
    const gain   = last - first;
    const gainPct = first > 0 ? (gain / first) * 100 : 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider">Session Start</p>
                    <p className="font-bold text-text-primary">{formatCurrency(first)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider">Current Equity</p>
                    <p className="font-bold text-text-primary">{formatCurrency(last)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider">Session P&L</p>
                    <p className={`font-bold ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)
                    </p>
                </div>
                <div className="ml-auto text-xs text-muted">{equityHistory.length} data points</div>
            </div>
            <div ref={containerRef} className="h-72 rounded-lg overflow-hidden" />
            <p className="text-[10px] text-muted text-right">Each point represents the account value at the moment a trade was executed.</p>
        </div>
    );
};

// ── Statistics Tab ────────────────────────────────────────────────────────────

const StatsTab: React.FC = () => {
    const { portfolio } = usePortfolio();
    const trades = useMemo(() => pairOrders(portfolio.orderHistory), [portfolio.orderHistory]);

    if (trades.length === 0) {
        return <EmptyState icon="fa-calculator" message="Close at least one position to generate trade statistics." />;
    }

    const wins      = trades.filter(t => t.pnl > 0);
    const losses    = trades.filter(t => t.pnl < 0);
    const winRate   = (wins.length / trades.length) * 100;
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
    const avgWin    = wins.length   > 0 ? grossProfit / wins.length   : 0;
    const avgLoss   = losses.length > 0 ? grossLoss   / losses.length : 0;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
    const totalPnl  = trades.reduce((s, t) => s + t.pnl, 0);

    const bestTrade  = trades.reduce((b, t) => t.pnl > b.pnl ? t : b);
    const worstTrade = trades.reduce((w, t) => t.pnl < w.pnl ? t : w);

    let maxWins = 0, maxLosses = 0, curW = 0, curL = 0;
    for (const t of trades) {
        if (t.pnl > 0) { curW++; curL = 0; maxWins   = Math.max(maxWins,   curW); }
        else            { curL++; curW = 0; maxLosses = Math.max(maxLosses, curL); }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Win Rate"         value={`${winRate.toFixed(1)}%`}            color={winRate >= 50 ? 'text-success' : 'text-danger'} sub={`${wins.length}W / ${losses.length}L`} />
                <StatBox label="Profit Factor"    value={profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)} color={profitFactor >= 1 ? 'text-success' : 'text-danger'} />
                <StatBox label="Total Realized"   value={formatCurrency(totalPnl)}            color={totalPnl >= 0 ? 'text-success' : 'text-danger'} />
                <StatBox label="Closed Trades"    value={`${trades.length}`} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Avg Win"           value={formatCurrency(avgWin)}   color="text-success" />
                <StatBox label="Avg Loss"          value={formatCurrency(avgLoss)}  color="text-danger" />
                <StatBox label="Expectancy / Trade" value={formatCurrency(expectancy)} color={expectancy >= 0 ? 'text-success' : 'text-danger'} />
                <StatBox label="Max Consec. Losses" value={`${maxLosses}`}          color="text-danger" sub={`Max wins: ${maxWins}`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-base rounded-lg p-4">
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Best Trade</p>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-text-primary">{bestTrade.symbol}</span>
                        <span className={`font-bold text-lg ${bestTrade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(bestTrade.pnl)}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{bestTrade.quantity} × {formatCurrency(bestTrade.entryPrice)} → {formatCurrency(bestTrade.exitPrice)}</p>
                </div>
                <div className="bg-base rounded-lg p-4">
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Worst Trade</p>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-text-primary">{worstTrade.symbol}</span>
                        <span className={`font-bold text-lg ${worstTrade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(worstTrade.pnl)}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{worstTrade.quantity} × {formatCurrency(worstTrade.entryPrice)} → {formatCurrency(worstTrade.exitPrice)}</p>
                </div>
            </div>
        </div>
    );
};

// ── P&L Calendar Tab ──────────────────────────────────────────────────────────

const CalendarTab: React.FC = () => {
    const { portfolio } = usePortfolio();
    const closedTrades = useMemo(() => pairOrders(portfolio.orderHistory), [portfolio.orderHistory]);

    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const dailyPnl = useMemo(() => {
        const map: Record<string, number> = {};
        closedTrades.forEach(t => {
            const key = new Date(t.timestamp).toISOString().slice(0, 10);
            map[key] = (map[key] ?? 0) + t.pnl;
        });
        return map;
    }, [closedTrades]);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
    const maxAbs      = Math.max(...Object.values(dailyPnl).map(Math.abs), 1);
    const monthLabel  = new Date(viewYear, viewMonth, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    return (
        <div className="space-y-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
                <button onClick={prevMonth} className="text-muted hover:text-text-primary p-2 rounded hover:bg-overlay transition-colors">
                    <i className="fas fa-chevron-left"></i>
                </button>
                <span className="font-bold text-text-primary">{monthLabel}</span>
                <button onClick={nextMonth} className="text-muted hover:text-text-primary p-2 rounded hover:bg-overlay transition-colors">
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-[10px] text-muted py-1 font-semibold uppercase">{d}</div>
                ))}

                {/* Blank cells before month start */}
                {Array.from({ length: firstDow }).map((_, i) => <div key={`blank-${i}`} />)}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day      = i + 1;
                    const dateKey  = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const pnl      = dailyPnl[dateKey];
                    const isToday  = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                    const intensity = pnl != null ? Math.min(Math.abs(pnl) / maxAbs, 1) : 0;
                    const bgStyle   = pnl == null ? {} : {
                        backgroundColor: pnl >= 0
                            ? `rgba(16, 185, 129, ${0.08 + intensity * 0.42})`
                            : `rgba(239, 68, 68, ${0.08 + intensity * 0.42})`,
                    };

                    const abbrev = (v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 100_000) return `${(v / 100_000).toFixed(1)}L`;
                        if (abs >= 1_000)   return `${(v / 1_000).toFixed(1)}k`;
                        return v.toFixed(0);
                    };

                    return (
                        <div
                            key={day}
                            className={`rounded p-1.5 min-h-[52px] flex flex-col ${isToday ? 'ring-1 ring-primary' : ''} ${pnl == null ? 'bg-overlay/20' : ''}`}
                            style={bgStyle}
                        >
                            <p className={`text-xs leading-none ${isToday ? 'text-primary font-bold' : 'text-muted'}`}>{day}</p>
                            {pnl != null && (
                                <p className={`text-[9px] font-bold mt-auto ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {pnl >= 0 ? '+' : ''}{abbrev(pnl)}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 text-[10px] text-muted pt-1">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.35)' }} />
                    <span>Loss</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.35)' }} />
                    <span>Profit</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-overlay/20" />
                    <span>No closed trades</span>
                </div>
            </div>
            <p className="text-[10px] text-muted">Colour intensity reflects magnitude. Based on realized P&L from closed positions.</p>
        </div>
    );
};

// ── Performing Instruments Tab ────────────────────────────────────────────────

const InstrumentsTab: React.FC = () => {
    const { portfolio } = usePortfolio();
    const trades = useMemo(() => pairOrders(portfolio.orderHistory), [portfolio.orderHistory]);

    const stats = useMemo(() => {
        const bySymbol: Record<string, ClosedTrade[]> = {};
        trades.forEach(t => {
            if (!bySymbol[t.symbol]) bySymbol[t.symbol] = [];
            bySymbol[t.symbol].push(t);
        });
        return Object.entries(bySymbol).map(([symbol, ts]) => {
            const wins  = ts.filter(t => t.pnl > 0).length;
            const total = ts.reduce((s, t) => s + t.pnl, 0);
            return {
                symbol,
                total,
                count: ts.length,
                winRate: (wins / ts.length) * 100,
                best:  Math.max(...ts.map(t => t.pnl)),
                worst: Math.min(...ts.map(t => t.pnl)),
            };
        }).sort((a, b) => b.total - a.total);
    }, [trades]);

    if (stats.length === 0) {
        return <EmptyState icon="fa-chart-bar" message="Close at least one position to see instrument-level performance." />;
    }

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-2">
                <span className="col-span-2">Symbol</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Win %</span>
                <span className="text-right">Total P&L</span>
                <span className="text-right">Best / Worst</span>
            </div>
            {stats.map(s => (
                <div key={s.symbol} className="bg-base rounded-lg px-4 py-3 grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-2 flex items-center gap-2">
                        <div className={`w-1.5 h-8 rounded-full ${s.total >= 0 ? 'bg-success' : 'bg-danger'}`} />
                        <span className="font-bold text-text-primary">{s.symbol}</span>
                    </div>
                    <span className="text-right text-muted text-sm">{s.count}</span>
                    <span className={`text-right text-sm font-semibold ${s.winRate >= 50 ? 'text-success' : 'text-danger'}`}>
                        {s.winRate.toFixed(0)}%
                    </span>
                    <span className={`text-right font-bold ${s.total >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(s.total)}
                    </span>
                    <div className="text-right text-xs">
                        <p className="text-success">{formatCurrency(s.best)}</p>
                        <p className="text-danger">{formatCurrency(s.worst)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const PortfolioScreen: React.FC = () => {
    const { portfolio } = usePortfolio();
    const [activeTab, setActiveTab] = useState<PortfolioTab>('holdings');

    const tabs: { key: PortfolioTab; label: string; icon: string }[] = [
        { key: 'holdings',    label: 'Holdings',    icon: 'fa-briefcase'   },
        { key: 'equity',      label: 'Equity',      icon: 'fa-chart-line'  },
        { key: 'stats',       label: 'Statistics',  icon: 'fa-calculator'  },
        { key: 'calendar',    label: 'Calendar',    icon: 'fa-calendar-alt'},
        { key: 'instruments', label: 'Instruments', icon: 'fa-chart-bar'   },
    ];

    return (
        <main className="animate-fade-in p-6">
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-text-primary">Portfolio</h2>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { title: 'Total Invested',   value: formatCurrency(portfolio.totalInvested) },
                        { title: 'Current Value',    value: formatCurrency(portfolio.totalCurrentValue) },
                        { title: 'Overall P&L',      value: formatCurrency(portfolio.totalPnl),
                          color: portfolio.totalPnl >= 0 ? 'text-success' : 'text-danger' },
                        { title: 'P&L %',            value: formatPercent(portfolio.totalInvested > 0 ? portfolio.totalPnl / portfolio.totalInvested : 0),
                          color: portfolio.totalPnl >= 0 ? 'text-success' : 'text-danger' },
                    ].map(card => (
                        <div key={card.title} className="bg-surface p-4 rounded-lg text-center">
                            <p className="text-sm text-muted uppercase tracking-wider">{card.title}</p>
                            <p className={`text-2xl font-bold ${card.color ?? 'text-text-primary'}`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tab bar */}
                <div className="border-b border-overlay flex gap-0.5">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors relative ${
                                activeTab === tab.key
                                    ? 'text-primary bg-surface'
                                    : 'text-muted hover:text-text-primary hover:bg-surface/50'
                            }`}
                        >
                            <i className={`fas ${tab.icon} text-xs`}></i>
                            {tab.label}
                            {activeTab === tab.key && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div>
                    {activeTab === 'holdings'    && <HoldingsTab />}
                    {activeTab === 'equity'      && <EquityTab />}
                    {activeTab === 'stats'       && <StatsTab />}
                    {activeTab === 'calendar'    && <CalendarTab />}
                    {activeTab === 'instruments' && <InstrumentsTab />}
                </div>
            </div>
        </main>
    );
};

export default PortfolioScreen;
