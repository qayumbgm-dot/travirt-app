
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';
import { Order, TransactionType } from '../../types';

interface ClosedTrade { symbol: string; pnl: number; }

function pairOrders(orders: Order[]): ClosedTrade[] {
    const trades: ClosedTrade[] = [];
    const queues: Record<string, { price: number; quantity: number }[]> = {};
    const sorted = [...orders].filter(o => o.status === 'EXECUTED').sort((a, b) => a.timestamp - b.timestamp);
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
                trades.push({ symbol: order.symbol, pnl: (order.price || 0 - entry.price) * matched });
                entry.quantity -= matched;
                remaining -= matched;
                if (entry.quantity === 0) queues[key].shift();
            }
        }
    }
    return trades;
}

const RiskReport: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { portfolio, riskEngine, breaches, consistencyScore } = usePortfolio();

    const trades = useMemo(() => pairOrders(portfolio.orderHistory), [portfolio.orderHistory]);

    const accountSize = portfolio.virtualBalance + portfolio.totalCurrentValue;

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    const bySymbol: Record<string, number> = {};
    trades.forEach(t => { bySymbol[t.symbol] = (bySymbol[t.symbol] ?? 0) + t.pnl; });
    const instrumentStats = Object.entries(bySymbol)
        .map(([symbol, pnl]) => ({ symbol, pnl }))
        .sort((a, b) => b.pnl - a.pnl);
    const topBest = instrumentStats.slice(0, 5);
    const topWorst = [...instrumentStats].sort((a, b) => a.pnl - b.pnl).slice(0, 5);

    const dailyPct = (riskEngine.dailyLossConsumedPct * 100).toFixed(1);
    const drawdownPct = (riskEngine.maxDrawdownConsumedPct * 100).toFixed(1);

    const reportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const rules = [
        { rule: 'Daily Loss Limit (5%)', pass: riskEngine.dailyLossState !== 'breached', detail: `${dailyPct}% consumed` },
        { rule: 'Max Drawdown (10%)', pass: riskEngine.maxDrawdownState !== 'breached', detail: `${drawdownPct}% from peak` },
        { rule: 'Profit Factor ≥1', pass: profitFactor >= 1, detail: profitFactor >= 999 ? '∞' : profitFactor.toFixed(2) },
        { rule: 'Win Rate ≥50%', pass: winRate >= 50, detail: `${winRate.toFixed(1)}%` },
        { rule: 'Consistency Score ≥60', pass: consistencyScore >= 60, detail: `${consistencyScore.toFixed(0)}/100` },
        { rule: 'No Hard Breaches', pass: breaches.filter(b => b.severity === 'hard_block').length === 0, detail: `${breaches.filter(b => b.severity === 'hard_block').length} hard block(s)` },
    ];

    const handlePrint = () => {
        const rulesHtml = rules.map(r => `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${r.rule}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:${r.pass ? '#10b981' : '#ef4444'};font-weight:bold">${r.pass ? 'PASS' : 'FAIL'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">${r.detail}</td>
        </tr>`).join('');

        const bestHtml = topBest.map(s => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9">
            <span>${s.symbol}</span><span style="color:#10b981;font-weight:bold">${s.pnl >= 0 ? '+' : ''}₹${s.pnl.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </li>`).join('');

        const worstHtml = topWorst.map(s => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9">
            <span>${s.symbol}</span><span style="color:#ef4444;font-weight:bold">${s.pnl >= 0 ? '+' : ''}₹${s.pnl.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </li>`).join('');

        const breachHtml = breaches.length === 0
            ? '<p style="color:#10b981">No violations recorded.</p>'
            : breaches.slice(0, 10).map(b => `<li style="padding:6px 0;border-bottom:1px solid #f1f5f9">
                <span style="color:${b.severity === 'hard_block' ? '#ef4444' : b.severity === 'warning' ? '#f59e0b' : '#3b82f6'};font-weight:bold;font-size:11px">[${b.severity.toUpperCase()}]</span>
                <strong style="margin:0 8px">${b.rule}</strong>
                <span style="color:#64748b;font-size:12px">${b.description}</span>
            </li>`).join('');

        const w = window.open('', '_blank', 'width=900,height=800');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>TraVirt Risk Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:40px}
h1{font-size:24px;color:#1d4ed8;margin-bottom:4px}
.subtitle{font-size:12px;color:#64748b;margin-bottom:32px}
h2{font-size:14px;font-weight:bold;color:#0f172a;margin:24px 0 12px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px}
.metric{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center}
.metric-val{font-size:20px;font-weight:bold;color:#1d4ed8}
.metric-lbl{font-size:10px;color:#94a3b8;margin-top:3px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0}
th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
ul{list-style:none;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px}
.footer{margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
</style></head><body>
<h1>Risk Report Card</h1>
<p class="subtitle">TraVirt Virtual Trading Platform &nbsp;&middot;&nbsp; Generated: ${reportDate}</p>

<h2>Account Summary</h2>
<div class="metrics">
<div class="metric"><div class="metric-val">₹${accountSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div><div class="metric-lbl">Account Size</div></div>
<div class="metric"><div class="metric-val" style="color:${portfolio.totalPnl >= 0 ? '#10b981' : '#ef4444'}">${portfolio.totalPnl >= 0 ? '+' : ''}₹${Math.abs(portfolio.totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div><div class="metric-lbl">Total P&amp;L</div></div>
<div class="metric"><div class="metric-val">${trades.length}</div><div class="metric-lbl">Closed Trades</div></div>
<div class="metric"><div class="metric-val">${consistencyScore.toFixed(0)}/100</div><div class="metric-lbl">Consistency</div></div>
</div>

<h2>Risk Metrics</h2>
<div class="metrics">
<div class="metric"><div class="metric-val" style="color:${riskEngine.dailyLossState === 'breached' ? '#ef4444' : '#10b981'}">${dailyPct}%</div><div class="metric-lbl">Daily Limit Used</div></div>
<div class="metric"><div class="metric-val" style="color:${riskEngine.maxDrawdownState === 'breached' ? '#ef4444' : '#10b981'}">${drawdownPct}%</div><div class="metric-lbl">Max Drawdown</div></div>
<div class="metric"><div class="metric-val">${winRate.toFixed(1)}%</div><div class="metric-lbl">Win Rate</div></div>
<div class="metric"><div class="metric-val">${profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)}</div><div class="metric-lbl">Profit Factor</div></div>
</div>

<h2>Rule Compliance</h2>
<table><thead><tr><th>Rule</th><th>Result</th><th>Detail</th></tr></thead><tbody>${rulesHtml}</tbody></table>

<h2>Performing Instruments</h2>
<div class="two-col">
<div><p style="font-size:12px;color:#10b981;font-weight:bold;margin-bottom:8px">Top Performers</p><ul>${bestHtml || '<li style="padding:8px 0;color:#94a3b8">No data</li>'}</ul></div>
<div><p style="font-size:12px;color:#ef4444;font-weight:bold;margin-bottom:8px">Worst Performers</p><ul>${worstHtml || '<li style="padding:8px 0;color:#94a3b8">No data</li>'}</ul></div>
</div>

<h2>Rule Violations (${breaches.length})</h2>
<ul>${breachHtml}</ul>

<div class="footer">This report is for educational purposes only. Not financial advice. TraVirt simulates prop firm evaluation rules on virtual capital.</div>
</body></html>`);
        w.document.close();
        w.print();
        w.close();
    };

    const passCount = rules.filter(r => r.pass).length;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-surface w-full max-w-2xl rounded-xl shadow-2xl border border-overlay overflow-hidden max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-overlay shrink-0">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-file-medical-alt text-primary text-lg"></i>
                        <div>
                            <p className="font-bold text-text-primary">Risk Report Card</p>
                            <p className="text-xs text-muted">{reportDate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text-primary p-1 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {/* Summary metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Account Size', value: formatCurrency(accountSize) },
                            { label: 'Total P&L', value: formatCurrency(portfolio.totalPnl), color: portfolio.totalPnl >= 0 ? 'text-success' : 'text-danger' },
                            { label: 'Closed Trades', value: `${trades.length}` },
                            { label: 'Consistency', value: `${consistencyScore.toFixed(0)}/100`, color: consistencyScore >= 60 ? 'text-success' : 'text-danger' },
                        ].map(m => (
                            <div key={m.label} className="bg-base rounded-lg p-3 border border-overlay text-center">
                                <p className={`text-lg font-bold ${m.color ?? 'text-text-primary'}`}>{m.value}</p>
                                <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">{m.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Rule compliance */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-text-primary uppercase tracking-wider">Rule Compliance</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${passCount === rules.length ? 'bg-success/20 text-success' : passCount >= 4 ? 'bg-yellow-400/20 text-yellow-400' : 'bg-danger/20 text-danger'}`}>
                                {passCount}/{rules.length} passing
                            </span>
                        </div>
                        <div className="space-y-2">
                            {rules.map(r => (
                                <div key={r.rule} className="flex items-center justify-between bg-base rounded-lg px-4 py-2.5 border border-overlay">
                                    <span className="text-sm text-text-secondary">{r.rule}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted">{r.detail}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.pass ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                            {r.pass ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top/Worst instruments */}
                    {instrumentStats.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-success uppercase tracking-wider mb-2">Top Performers</p>
                                <div className="space-y-1.5">
                                    {topBest.slice(0, 4).map(s => (
                                        <div key={s.symbol} className="flex justify-between bg-base rounded px-3 py-2 border border-overlay text-sm">
                                            <span className="text-text-primary font-medium">{s.symbol}</span>
                                            <span className={`font-bold ${s.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(s.pnl)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-danger uppercase tracking-wider mb-2">Worst Performers</p>
                                <div className="space-y-1.5">
                                    {topWorst.slice(0, 4).map(s => (
                                        <div key={s.symbol} className="flex justify-between bg-base rounded px-3 py-2 border border-overlay text-sm">
                                            <span className="text-text-primary font-medium">{s.symbol}</span>
                                            <span className={`font-bold ${s.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(s.pnl)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Breaches */}
                    <div>
                        <p className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
                            Rule Violations <span className="text-muted font-normal">({breaches.length})</span>
                        </p>
                        {breaches.length === 0 ? (
                            <div className="flex items-center gap-2 text-success text-sm bg-success/10 rounded-lg px-4 py-3 border border-success/20">
                                <i className="fas fa-check-circle"></i> No violations recorded.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {breaches.slice().reverse().map(b => (
                                    <div key={b.id} className="flex items-start gap-3 bg-base rounded-lg px-4 py-2.5 border border-overlay text-sm">
                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${b.severity === 'hard_block' ? 'bg-danger/20 text-danger' : b.severity === 'warning' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-blue-400/20 text-blue-400'}`}>
                                            {b.severity === 'hard_block' ? 'BLOCK' : b.severity.toUpperCase()}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-text-primary text-xs">{b.rule}</p>
                                            <p className="text-muted text-xs">{b.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-overlay flex items-center justify-between shrink-0">
                    <p className="text-[10px] text-muted">Educational only — not financial advice.</p>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="border border-overlay text-muted hover:text-text-primary font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                            Close
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-primary hover:bg-primary-focus text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-print text-xs"></i>
                            Print Report
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RiskReport;
