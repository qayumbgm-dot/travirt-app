
import React from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Position } from '../types';

const PositionsScreen: React.FC = () => {
    const { portfolio, getStock } = usePortfolio();
    const positions = portfolio.positions;

    const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
    const totalInvested = positions.reduce((sum, p) => sum + p.investedValue, 0);
    const totalCurrent = positions.reduce((sum, p) => sum + p.currentValue, 0);

    const PositionRow: React.FC<{ position: Position }> = ({ position }) => {
        const stock = getStock(position.symbol, position.exchange);
        const dayChange = stock ? (stock.ltp - stock.prevClose) * position.quantity : 0;
        const pnlPct = position.investedValue > 0 ? position.pnl / position.investedValue : 0;
        const isProfit = position.pnl >= 0;

        return (
            <tr className="border-b border-overlay hover:bg-overlay/50 transition-colors">
                <td className="p-4">
                    <p className="font-bold text-text-primary">{position.symbol}</p>
                    <p className="text-xs text-muted">{position.exchange}</p>
                </td>
                <td className="p-4 text-right text-text-primary">{position.quantity}</td>
                <td className="p-4 text-right text-text-primary">{formatCurrency(position.avgPrice)}</td>
                <td className="p-4 text-right font-semibold text-text-primary">{formatCurrency(position.ltp)}</td>
                <td className={`p-4 text-right text-sm font-semibold ${dayChange >= 0 ? 'text-success' : 'text-danger'}`}>
                    {dayChange >= 0 ? '+' : ''}{formatCurrency(dayChange)}
                </td>
                <td className="p-4 text-right text-text-primary">{formatCurrency(position.investedValue)}</td>
                <td className="p-4 text-right text-text-primary">{formatCurrency(position.currentValue)}</td>
                <td className={`p-4 text-right font-bold ${isProfit ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(position.pnl)}
                    <p className="text-xs font-normal">{formatPercent(pnlPct)}</p>
                </td>
            </tr>
        );
    };

    return (
        <main className="animate-fade-in p-6">
            <header className="mb-6">
                <h2 className="text-3xl font-bold text-text-primary">Positions</h2>
                <p className="text-muted mt-1">All open holdings across your virtual portfolio.</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Open Positions</p>
                    <p className="text-2xl font-bold text-text-primary">{positions.length}</p>
                </div>
                <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Invested</p>
                    <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalInvested)}</p>
                </div>
                <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Current Value</p>
                    <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalCurrent)}</p>
                </div>
                <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Total P&amp;L</p>
                    <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(totalPnl)}
                    </p>
                </div>
            </div>

            {/* Positions Table */}
            <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
                {positions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-text-secondary">
                            <thead className="text-xs uppercase bg-overlay">
                                <tr>
                                    <th className="p-4">Instrument</th>
                                    <th className="p-4 text-right">Qty</th>
                                    <th className="p-4 text-right">Avg Price</th>
                                    <th className="p-4 text-right">LTP</th>
                                    <th className="p-4 text-right">Day P&amp;L</th>
                                    <th className="p-4 text-right">Invested</th>
                                    <th className="p-4 text-right">Current Value</th>
                                    <th className="p-4 text-right">Total P&amp;L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.map(pos => (
                                    <PositionRow key={`${pos.exchange}:${pos.symbol}`} position={pos} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-16 text-muted">
                        <i className="fas fa-chart-pie text-5xl mb-4 opacity-30"></i>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">No Open Positions</h3>
                        <p className="text-sm">Execute trades from the Trade screen to see your positions here.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default PositionsScreen;
