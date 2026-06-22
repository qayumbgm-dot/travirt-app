
import React from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { PortfolioState } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Screen } from '../App';
import { MOCK_INDICES } from '../constants';

const StatCard: React.FC<{ title: string; value: string; change?: string; changeColor?: string; icon: string; iconBg: string; }> = ({ title, value, change, changeColor, icon, iconBg }) => (
    <div className="bg-surface rounded-lg shadow-lg p-5 flex items-center">
        <div className={`rounded-full p-3 mr-4 ${iconBg}`}>
            <i className={`fas ${icon} text-white text-xl`}></i>
        </div>
        <div>
            <p className="text-sm text-muted font-medium">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            {change && <p className={`text-sm font-medium ${changeColor}`}>{change}</p>}
        </div>
    </div>
);

const IndexCard: React.FC<{ asset: typeof MOCK_INDICES[0] }> = ({ asset }) => (
    <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <div>
            <p className="font-bold text-text-primary">{asset.symbol}</p>
            <p className={`text-lg font-semibold ${asset.change >= 0 ? 'text-success' : 'text-danger'}`}>
                {asset.ltp.toFixed(2)}
            </p>
             <p className={`text-xs ${asset.change >= 0 ? 'text-success' : 'text-danger'}`}>
                {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)} ({asset.changePercent.toFixed(2)}%)
            </p>
        </div>
        <div className="w-24 h-12">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={asset.history}>
                     <defs>
                        <linearGradient id={`color${asset.symbol.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={asset.change >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={asset.change >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={asset.change >= 0 ? '#10B981' : '#EF4444'} fill={`url(#color${asset.symbol.replace(/\s/g, '')})`} strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

// ── Prop-Firm Risk Engine ─────────────────────────────────────────────────────

interface RiskRule {
    title: string;
    description: string;
    icon: string;
    usagePct: number;
    usageLabel: string;
    limitLabel: string;
    isProfit?: boolean;
}

const getRuleStyle = (pct: number, isProfit = false) => {
    if (isProfit) {
        if (pct >= 100) return { badge: 'bg-success/20 text-success', bar: 'bg-success', border: 'border-success/30', label: 'Target Hit!' };
        if (pct >= 60) return { badge: 'bg-yellow-400/20 text-yellow-400', bar: 'bg-yellow-400', border: 'border-yellow-400/20', label: 'On Track' };
        return { badge: 'bg-primary/20 text-primary', bar: 'bg-primary', border: 'border-overlay', label: 'In Progress' };
    }
    if (pct >= 100) return { badge: 'bg-danger/20 text-danger', bar: 'bg-danger', border: 'border-danger/40', label: 'Breached!' };
    if (pct >= 70) return { badge: 'bg-yellow-400/20 text-yellow-400', bar: 'bg-yellow-400', border: 'border-yellow-400/30', label: 'Warning' };
    return { badge: 'bg-success/20 text-success', bar: 'bg-success', border: 'border-overlay', label: 'Safe' };
};

const RiskEnginePanel: React.FC<{ portfolio: PortfolioState }> = ({ portfolio }) => {
    // Account size = cash + cost basis of open positions (what was funded)
    const accountSize = portfolio.virtualBalance + portfolio.totalInvested;

    if (accountSize <= 0) {
        return (
            <div className="bg-surface rounded-lg shadow-lg p-5 border border-overlay flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <i className="fas fa-shield-alt text-primary"></i>
                </div>
                <div>
                    <p className="font-bold text-text-primary">Prop Firm Risk Engine</p>
                    <p className="text-muted text-sm">Fund your account to activate risk monitoring. Go to <span className="text-primary font-medium">Funds → Convert NXO</span> to add virtual balance.</p>
                </div>
            </div>
        );
    }

    const dailyLossLimit  = accountSize * 0.05;
    const maxDrawdownLimit = accountSize * 0.10;
    const profitTarget     = accountSize * 0.08;

    const dailyLoss = Math.max(0, -portfolio.todayPnl);
    const drawdown  = Math.max(0, -portfolio.totalPnl);
    const profit    = Math.max(0, portfolio.totalPnl);

    const dailyLossPct  = Math.min((dailyLoss  / dailyLossLimit)   * 100, 100);
    const drawdownPct   = Math.min((drawdown   / maxDrawdownLimit)  * 100, 100);
    const profitPct     = Math.min((profit     / profitTarget)      * 100, 100);

    const rules: RiskRule[] = [
        {
            title: 'Daily Loss Limit',
            description: 'Max 5% loss in a single day',
            icon: 'fas fa-calendar-day',
            usagePct: dailyLossPct,
            usageLabel: `${formatCurrency(dailyLoss)} lost today`,
            limitLabel: `Limit: ${formatCurrency(dailyLossLimit)}`,
        },
        {
            title: 'Max Drawdown',
            description: 'Max 10% total drawdown allowed',
            icon: 'fas fa-level-down-alt',
            usagePct: drawdownPct,
            usageLabel: `${formatCurrency(drawdown)} drawdown`,
            limitLabel: `Limit: ${formatCurrency(maxDrawdownLimit)}`,
        },
        {
            title: 'Profit Target',
            description: 'Reach 8% profit to pass eval',
            icon: 'fas fa-bullseye',
            usagePct: profitPct,
            usageLabel: `${formatCurrency(profit)} earned`,
            limitLabel: `Target: ${formatCurrency(profitTarget)}`,
            isProfit: true,
        },
    ];

    const anyBreach  = dailyLossPct >= 100 || drawdownPct >= 100;
    const anyWarning = !anyBreach && (dailyLossPct >= 70 || drawdownPct >= 70);

    return (
        <div className="bg-surface rounded-lg shadow-lg border border-overlay">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-overlay">
                <div className="flex items-center gap-2">
                    <i className="fas fa-shield-alt text-primary"></i>
                    <span className="font-bold text-text-primary">Prop Firm Risk Engine</span>
                    <span className="text-[10px] text-muted border border-overlay rounded-full px-2 py-0.5">Simulated evaluation rules</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                    anyBreach  ? 'bg-danger/20 text-danger' :
                    anyWarning ? 'bg-yellow-400/20 text-yellow-400' :
                                 'bg-success/20 text-success'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        anyBreach ? 'bg-danger' : anyWarning ? 'bg-yellow-400' : 'bg-success'
                    }`}></span>
                    {anyBreach ? 'RULE BREACH' : anyWarning ? 'WARNING' : 'ALL CLEAR'}
                </div>
            </div>

            <div className="p-5">
                {/* Breach alert banner */}
                {anyBreach && (
                    <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg p-3 mb-4 text-sm text-danger">
                        <i className="fas fa-exclamation-triangle mt-0.5 shrink-0"></i>
                        <span>A prop firm rule has been breached. In a real funded evaluation, your account would be suspended. Review your risk management.</span>
                    </div>
                )}

                {/* Rule Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rules.map(rule => {
                        const style = getRuleStyle(rule.usagePct, rule.isProfit);
                        return (
                            <div key={rule.title} className={`bg-base rounded-lg p-4 border ${style.border}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <i className={`${rule.icon} text-muted text-sm`}></i>
                                        <div>
                                            <p className="font-semibold text-text-primary text-sm leading-tight">{rule.title}</p>
                                            <p className="text-[10px] text-muted">{rule.description}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${style.badge}`}>
                                        {style.label}
                                    </span>
                                </div>

                                {/* Gauge bar */}
                                <div className="w-full bg-overlay rounded-full h-2 mb-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-700 ${style.bar}`}
                                        style={{ width: `${rule.usagePct}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted">{rule.usageLabel}</span>
                                    <span className="text-muted">{rule.limitLabel}</span>
                                </div>
                                <p className={`text-right text-sm font-bold mt-1 ${style.badge.split(' ')[1]}`}>
                                    {rule.usagePct.toFixed(1)}%
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Account size reference */}
                <p className="text-[10px] text-muted mt-3 text-right">
                    Account size reference: {formatCurrency(accountSize)} (cash + invested capital)
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const DashboardScreen: React.FC<{ setActiveScreen: (screen: Screen) => void; }> = ({ setActiveScreen }) => {
    const { portfolio, marketData, loading } = usePortfolio();

    const portfolioValue = portfolio.virtualBalance + portfolio.totalCurrentValue;

    const topMovers = [...marketData]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 5);

    return (
        <main className="animate-fade-in p-6">
            <div className="space-y-6">
                {/* Header Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Portfolio Value" value={formatCurrency(portfolioValue)} icon="fa-wallet" iconBg="bg-blue-500" />
                    <StatCard title="Today's P&L" value={formatCurrency(portfolio.todayPnl)} change={`${portfolio.todayPnl >= 0 ? '▲' : '▼'} ${formatPercent(portfolio.totalInvested > 0 ? portfolio.todayPnl / portfolio.totalInvested : 0)}`} changeColor={portfolio.todayPnl >= 0 ? 'text-success' : 'text-danger'} icon="fa-chart-line" iconBg="bg-purple-500" />
                    <StatCard title="NFINO Tokens (NXO)" value={portfolio.nxoBalance.toLocaleString()} icon="fa-coins" iconBg="bg-yellow-500" />
                    <StatCard title="Virtual Balance" value={formatCurrency(portfolio.virtualBalance)} icon="fa-money-bill-wave" iconBg="bg-green-500" />
                </div>

                {/* Prop Firm Risk Engine */}
                <RiskEnginePanel portfolio={portfolio} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content: Positions & Movers */}
                    <div className="lg:col-span-2 space-y-6">
                         {/* Indices */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {MOCK_INDICES.map(index => <IndexCard key={index.symbol} asset={index} />)}
                        </div>
                        {/* Your Holdings */}
                        <div className="bg-surface rounded-lg shadow-lg p-6">
                            <h3 className="text-xl font-semibold mb-4">My Holdings ({portfolio.positions.length})</h3>
                            {portfolio.positions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-muted">
                                            <tr>
                                                <th className="py-2">Instrument</th>
                                                <th className="py-2 text-right">Qty.</th>
                                                <th className="py-2 text-right">Avg. price</th>
                                                <th className="py-2 text-right">LTP</th>
                                                <th className="py-2 text-right">P&L</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {portfolio.positions.slice(0, 5).map(pos => (
                                                <tr key={pos.symbol} className="border-b border-overlay last:border-b-0">
                                                    <td className="py-3 font-bold">{pos.symbol}</td>
                                                    <td className="py-3 text-right">{pos.quantity}</td>
                                                    <td className="py-3 text-right">{formatCurrency(pos.avgPrice)}</td>
                                                    <td className="py-3 text-right">{formatCurrency(pos.ltp)}</td>
                                                    <td className={`py-3 text-right font-bold ${pos.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(pos.pnl)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted">
                                    <i className="fas fa-folder-open text-4xl mb-3"></i>
                                    <p>You have no open positions.</p>
                                    <button onClick={() => setActiveScreen('trade')} className="mt-4 text-primary font-semibold hover:underline">Start Trading →</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Market Movers */}
                    <div className="bg-surface rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">Top Movers</h3>
                        {loading ? <p className="text-center text-muted">Loading...</p> : (
                            <ul className="space-y-4">
                                {topMovers.map(stock => (
                                    <li key={`${stock.exchange}:${stock.symbol}`} className="flex justify-between items-center cursor-pointer" onClick={() => setActiveScreen('trade')}>
                                        <div>
                                            <p className="font-bold">{stock.symbol}</p>
                                            <p className="text-xs text-muted">{stock.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{formatCurrency(stock.ltp)}</p>
                                            <p className={`text-sm font-bold ${stock.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({formatPercent(stock.changePercent / 100)})
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default DashboardScreen;
