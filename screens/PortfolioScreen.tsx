
import React from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Position } from '../types';

const PortfolioScreen: React.FC = () => {
    const { portfolio, getStock } = usePortfolio();

    const PortfolioHeader: React.FC<{ title: string, value: string, color?: string }> = ({title, value, color='text-text-primary'}) => (
        <div className="bg-surface p-4 rounded-lg text-center">
            <p className="text-sm text-muted uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );

    const PositionRow: React.FC<{ position: Position }> = ({ position }) => {
        const stock = getStock(position.symbol);
        return (
            <tr className="border-b border-overlay hover:bg-overlay transition-colors">
                <td className="p-4 font-bold">{position.symbol}</td>
                <td className="p-4 text-right">{position.quantity}</td>
                <td className="p-4 text-right">{formatCurrency(position.avgPrice)}</td>
                <td className="p-4 text-right">{formatCurrency(position.ltp)}</td>
                <td className="p-4 text-right text-success">{stock?.bid ? formatCurrency(stock.bid) : 'N/A'}</td>
                <td className="p-4 text-right text-danger">{stock?.ask ? formatCurrency(stock.ask) : 'N/A'}</td>
                <td className="p-4 text-right">{formatCurrency(position.investedValue)}</td>
                <td className="p-4 text-right">{formatCurrency(position.currentValue)}</td>
                <td className={`p-4 text-right font-bold ${position.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(position.pnl)}
                </td>
                <td className={`p-4 text-right font-bold ${position.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatPercent(position.pnl / position.investedValue)}
                </td>
            </tr>
        );
    };

    return (
        <main className="animate-fade-in p-6">
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-text-primary">Portfolio Holdings</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <PortfolioHeader title="Total Invested" value={formatCurrency(portfolio.totalInvested)} />
                    <PortfolioHeader title="Current Value" value={formatCurrency(portfolio.totalCurrentValue)} />
                    <PortfolioHeader title="Overall P&L" value={formatCurrency(portfolio.totalPnl)} color={portfolio.totalPnl >= 0 ? 'text-success' : 'text-danger'}/>
                    <PortfolioHeader title="P&L %" value={formatPercent(portfolio.totalInvested > 0 ? portfolio.totalPnl / portfolio.totalInvested : 0)} color={portfolio.totalPnl >= 0 ? 'text-success' : 'text-danger'}/>
                </div>
                
                <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-text-secondary">
                            <thead className="text-xs text-text-secondary uppercase bg-overlay">
                                <tr>
                                    <th scope="col" className="p-4">Symbol</th>
                                    <th scope="col" className="p-4 text-right">Quantity</th>
                                    <th scope="col" className="p-4 text-right">Avg. Price</th>
                                    <th scope="col" className="p-4 text-right">LTP</th>
                                    <th scope="col" className="p-4 text-right">Bid</th>
                                    <th scope="col" className="p-4 text-right">Ask</th>
                                    <th scope="col" className="p-4 text-right">Invested</th>
                                    <th scope="col" className="p-4 text-right">Current Value</th>
                                    <th scope="col" className="p-4 text-right">P&L</th>
                                    <th scope="col" className="p-4 text-right">P&L %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolio.positions.length > 0 ? (
                                    portfolio.positions.map(pos => <PositionRow key={pos.symbol} position={pos} />)
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="text-center p-8 text-muted">
                                            You have no open positions. Visit the Trade screen to get started!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default PortfolioScreen;