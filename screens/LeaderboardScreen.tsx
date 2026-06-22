
import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { formatCurrency } from '../utils/formatters';
import { leaderboardApi } from '../api/leaderboard.api';

const PROFILE_KEY = 'travirt_profile';

interface LeaderEntry {
    id: string;
    name: string;
    returns: number;   // %
    pnl: number;       // absolute ₹
    trades: number;
    isMe?: boolean;
    rank?: number;
}

const PEERS: LeaderEntry[] = [
    { id: 'p1', name: 'Trader_Ace',     returns: 45.78, pnl: 91560,  trades: 234 },
    { id: 'p2', name: 'MarketMaverick', returns: 39.12, pnl: 78240,  trades: 187 },
    { id: 'p3', name: 'CryptoKing',     returns: 35.45, pnl: 70900,  trades: 312 },
    { id: 'p4', name: 'StockSensei',    returns: 28.99, pnl: 57980,  trades: 156 },
    { id: 'p5', name: 'ProfitPro',      returns: 25.67, pnl: 51340,  trades: 98  },
    { id: 'p6', name: 'QuickFlip',      returns: 11.23, pnl: 22460,  trades: 445 },
    { id: 'p7', name: 'NewbieTrader',   returns: -2.50, pnl: -5000,  trades: 23  },
];

const getInitials = (name: string) =>
    name.replace(/[^a-zA-Z ]/g, ' ').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();

const getMedalStyle = (rank: number) => {
    if (rank === 1) return { badge: 'bg-yellow-400 text-yellow-900', border: 'border-yellow-400/30' };
    if (rank === 2) return { badge: 'bg-gray-300 text-gray-800',     border: 'border-gray-300/30' };
    if (rank === 3) return { badge: 'bg-yellow-700 text-yellow-100', border: 'border-yellow-700/30' };
    return { badge: 'bg-overlay text-text-primary', border: 'border-overlay' };
};

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

const LeaderboardScreen: React.FC = () => {
    const { portfolio } = usePortfolio();
    const [apiEntries, setApiEntries] = useState<LeaderEntry[] | null>(null);
    const [computedAt, setComputedAt] = useState<number | null>(null);

    // Resolve display name from saved profile
    let displayName = 'You';
    let myUserId = '';
    try {
        const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
        if (p.firstName?.trim()) displayName = p.firstName.trim();
        if (p.userId?.trim()) myUserId = p.userId.trim();
    } catch {}

    useEffect(() => {
        leaderboardApi.get()
            .then((res) => {
                setComputedAt(res.computedAt);
                setApiEntries(res.data.map((e) => ({
                    id: e.userId,
                    name: e.displayName,
                    returns: e.returnPct,
                    pnl: e.pnl,
                    trades: e.tradeCount,
                    isMe: e.userId === myUserId,
                })));
            })
            .catch(() => { /* fall through to local data */ });
    }, [myUserId]);

    // Compute real user return %: P&L / invested capital
    const userReturns = portfolio.totalInvested > 0
        ? (portfolio.totalPnl / portfolio.totalInvested) * 100
        : 0;

    const userEntry: LeaderEntry = {
        id: 'me',
        name: displayName,
        returns: userReturns,
        pnl: portfolio.totalPnl,
        trades: portfolio.orderHistory.length,
        isMe: true,
    };

    // Use API data when available; mark current user in the list
    const ranked = (apiEntries
        ? apiEntries.some((e) => e.isMe)
            ? apiEntries
            : [...apiEntries, userEntry]
        : [...PEERS, userEntry]
    )
        .sort((a, b) => b.returns - a.returns)
        .map((e, idx) => ({ ...e, rank: idx + 1 }));

    const myEntry = ranked.find(e => e.isMe)!;
    const top3 = ranked.slice(0, 3);
    // Podium visual order: silver (2nd), gold (1st), bronze (3rd)
    const podiumOrder = [top3[1], top3[0], top3[2]];
    const podiumHeight = ['h-28', 'h-36', 'h-24'];

    return (
        <main className="animate-fade-in p-6 text-text-primary">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <i className="fas fa-trophy text-yellow-400"></i>
                    Leaderboard
                </h1>
                <p className="text-muted text-sm mt-1">
                    Rankings by % return on invested capital. Your position updates live with every trade.
                </p>
            </header>

            {/* Your rank callout */}
            <div className={`mb-6 flex items-center gap-4 rounded-xl p-4 border ${myEntry.rank! <= 3 ? 'bg-primary/10 border-primary/30' : 'bg-surface border-overlay'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getMedalStyle(myEntry.rank!).badge}`}>
                    {myEntry.rank! <= 3 ? MEDAL_EMOJI[myEntry.rank! - 1] : `#${myEntry.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary">Your Rank: #{myEntry.rank} of {ranked.length}</p>
                    <p className="text-muted text-sm truncate">
                        {myEntry.trades === 0
                            ? 'Place your first trade to earn a real return and climb the ranks.'
                            : `${myEntry.trades} trade${myEntry.trades !== 1 ? 's' : ''} · ${userReturns >= 0 ? '+' : ''}${userReturns.toFixed(2)}% return · ${formatCurrency(portfolio.totalPnl)} P&L`}
                    </p>
                </div>
                {myEntry.rank! > 1 && (
                    <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-[10px] text-muted uppercase tracking-wider">Beat next</p>
                        <p className="font-semibold text-sm text-text-primary">
                            {ranked[myEntry.rank! - 2].name}
                        </p>
                        <p className="text-xs text-success">
                            {ranked[myEntry.rank! - 2].returns.toFixed(2)}%
                        </p>
                    </div>
                )}
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-3 mb-6 items-end">
                {podiumOrder.map((entry, idx) => {
                    if (!entry) return <div key={idx} />;
                    const style = getMedalStyle(entry.rank!);
                    return (
                        <div
                            key={entry.id}
                            className={`rounded-xl border p-3 flex flex-col items-center justify-end text-center relative ${style.border} ${entry.isMe ? 'bg-primary/10' : 'bg-surface'} ${podiumHeight[idx]}`}
                        >
                            {idx === 1 && (
                                <i className="fas fa-crown text-yellow-400 text-base absolute -top-3.5"></i>
                            )}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${entry.isMe ? 'bg-primary text-white' : 'bg-overlay text-text-primary'}`}>
                                {getInitials(entry.name)}
                            </div>
                            <p className="font-bold text-text-primary text-xs leading-tight truncate w-full px-1">
                                {entry.name}{entry.isMe ? ' (You)' : ''}
                            </p>
                            <p className={`font-bold text-sm mt-0.5 ${entry.returns >= 0 ? 'text-success' : 'text-danger'}`}>
                                {entry.returns >= 0 ? '+' : ''}{entry.returns.toFixed(2)}%
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${style.badge}`}>
                                {MEDAL_EMOJI[entry.rank! - 1] || `#${entry.rank}`}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Full Table */}
            <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
                <div className="px-5 py-3 border-b border-overlay flex items-center gap-2">
                    <i className="fas fa-list-ol text-muted text-sm"></i>
                    <span className="font-bold text-sm text-text-primary">Full Rankings</span>
                    <span className="text-[10px] text-muted ml-1">({ranked.length} traders)</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted text-xs uppercase border-b border-overlay bg-base/30">
                                <th className="p-4 text-center w-16">Rank</th>
                                <th className="p-4 text-left">Trader</th>
                                <th className="p-4 text-right">Trades</th>
                                <th className="p-4 text-right">P&L</th>
                                <th className="p-4 text-right">Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranked.map(entry => {
                                const style = getMedalStyle(entry.rank!);
                                const noTrades = entry.isMe && entry.trades === 0;
                                return (
                                    <tr
                                        key={entry.id}
                                        className={`border-b border-overlay last:border-b-0 transition-colors ${entry.isMe ? 'bg-primary/10' : 'hover:bg-overlay/40'}`}
                                    >
                                        {/* Rank */}
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${style.badge}`}>
                                                {entry.rank! <= 3 ? MEDAL_EMOJI[entry.rank! - 1] : entry.rank}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${entry.isMe ? 'bg-primary text-white' : 'bg-overlay text-text-primary'}`}>
                                                    {getInitials(entry.name)}
                                                </div>
                                                <div>
                                                    <span className={`font-semibold ${entry.isMe ? 'text-primary' : 'text-text-primary'}`}>
                                                        {entry.name}
                                                    </span>
                                                    {entry.isMe && (
                                                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 bg-primary/20 text-primary rounded-full uppercase tracking-wider">
                                                            You
                                                        </span>
                                                    )}
                                                    {noTrades && (
                                                        <p className="text-[10px] text-muted leading-tight">No trades yet</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Trades */}
                                        <td className="p-4 text-right text-muted font-mono">
                                            {entry.trades.toLocaleString()}
                                        </td>

                                        {/* P&L */}
                                        <td className={`p-4 text-right font-bold font-mono ${entry.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {noTrades ? <span className="text-muted font-normal">--</span> : formatCurrency(entry.pnl)}
                                        </td>

                                        {/* Return % */}
                                        <td className={`p-4 text-right font-bold ${entry.returns >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {noTrades
                                                ? <span className="text-muted font-normal">--</span>
                                                : `${entry.returns >= 0 ? '+' : ''}${entry.returns.toFixed(2)}%`
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-[10px] text-muted mt-3 text-center">
                {computedAt
                    ? `Live rankings · last computed ${new Date(computedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Simulated competition. Peer figures are illustrative. Your row updates live from your portfolio.'}
            </p>
        </main>
    );
};

export default LeaderboardScreen;
