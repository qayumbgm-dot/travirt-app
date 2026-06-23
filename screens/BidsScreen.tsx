
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import type { PortfolioState } from '../types';

const CLAIMED_KEY   = 'travirt_achievements';
const PROFILE_KEY   = 'travirt_profile';

type ClaimStatus = 'available' | 'pendingClaim' | 'completed';

interface SavedClaims {
    [achievementId: string]: { status: ClaimStatus };
}

const loadClaims = (): SavedClaims => {
    try { return JSON.parse(localStorage.getItem(CLAIMED_KEY) ?? '{}'); } catch { return {}; }
};
const saveClaims = (s: SavedClaims) => {
    try { localStorage.setItem(CLAIMED_KEY, JSON.stringify(s)); } catch {}
};

interface AchievementDef {
    id: string;
    title: string;
    description: string;
    reward: number;
    icon: string;
    category: string;
    check: (p: PortfolioState) => boolean;
    special?: 'daily_bonus' | 'manual';
    progressOf?: (p: PortfolioState) => { current: number; target: number };
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
    {
        id: 'first_trade',
        title: 'First Trade',
        description: 'Execute your very first trade on any instrument.',
        reward: 10,
        icon: 'fas fa-chart-line',
        category: 'Trading',
        check: p => p.orderHistory.filter(o => o.status === 'EXECUTED').length >= 1,
    },
    {
        id: 'ten_trades',
        title: '10 Trades Milestone',
        description: 'Get hands-on by executing your first 10 trades.',
        reward: 20,
        icon: 'fas fa-chart-bar',
        category: 'Trading',
        check: p => p.orderHistory.filter(o => o.status === 'EXECUTED').length >= 10,
        progressOf: p => ({ current: Math.min(p.orderHistory.filter(o => o.status === 'EXECUTED').length, 10), target: 10 }),
    },
    {
        id: 'fifty_trades',
        title: 'Veteran Trader',
        description: 'Execute 50 trades to prove your trading dedication.',
        reward: 50,
        icon: 'fas fa-trophy',
        category: 'Trading',
        check: p => p.orderHistory.filter(o => o.status === 'EXECUTED').length >= 50,
        progressOf: p => ({ current: Math.min(p.orderHistory.filter(o => o.status === 'EXECUTED').length, 50), target: 50 }),
    },
    {
        id: 'first_gtt',
        title: 'GTT Order Set',
        description: 'Create your first Good Till Triggered order to automate entries.',
        reward: 10,
        icon: 'fas fa-clock',
        category: 'Risk Management',
        check: p => p.gttOrders.length >= 1,
    },
    {
        id: 'first_alert',
        title: 'Price Alert Set',
        description: 'Set your first price alert on any instrument.',
        reward: 10,
        icon: 'fas fa-bell',
        category: 'Monitoring',
        check: p => p.alerts.length >= 1,
    },
    {
        id: 'profile_complete',
        title: 'Profile Completed',
        description: 'Fill in your first and last name in your profile settings.',
        reward: 5,
        icon: 'fas fa-user-check',
        category: 'Onboarding',
        check: () => {
            try {
                const pr = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}');
                return !!(pr.firstName?.trim() && pr.lastName?.trim());
            } catch { return false; }
        },
    },
    {
        id: 'daily_login',
        title: 'Daily Login Bonus',
        description: 'Log in every day and claim your daily reward.',
        reward: 10,
        icon: 'fas fa-calendar-check',
        category: 'Daily',
        check: p => p.dailyBonusClaimed,
        special: 'daily_bonus',
    },
    {
        id: 'refer_friend',
        title: 'Refer a Friend',
        description: 'Copy your referral link and share it with a friend.',
        reward: 50,
        icon: 'fas fa-share-alt',
        category: 'Social',
        check: () => false,
        special: 'manual',
    },
];

const BidsScreen: React.FC = () => {
    const { claimDailyBonus, addReward, portfolio } = usePortfolio();
    const { showToast } = useToast();
    const [claims, setClaims] = useState<SavedClaims>(loadClaims);
    const newUnlockToastRef = useRef<Set<string>>(new Set());

    // Notify once when an achievement newly unlocks while the screen is open
    useEffect(() => {
        for (const def of ACHIEVEMENT_DEFS) {
            if (def.special === 'manual') continue;
            const alreadyClaimed = claims[def.id]?.status === 'completed';
            if (alreadyClaimed) continue;
            const conditionMet = def.check(portfolio);
            if (conditionMet && !newUnlockToastRef.current.has(def.id)) {
                newUnlockToastRef.current.add(def.id);
                showToast(`Achievement unlocked: ${def.title}! Click Claim to earn ${def.reward} NXO.`, 'success');
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [portfolio.orderHistory.length, portfolio.gttOrders.length, portfolio.alerts.length, portfolio.dailyBonusClaimed]);

    const updateClaim = useCallback((id: string, status: ClaimStatus) => {
        setClaims(prev => {
            const next = { ...prev, [id]: { status } };
            saveClaims(next);
            return next;
        });
    }, []);

    const getStatus = useCallback((def: AchievementDef): ClaimStatus => {
        if (claims[def.id]?.status === 'completed') return 'completed';

        if (def.special === 'daily_bonus') {
            return portfolio.dailyBonusClaimed ? 'completed' : 'available';
        }

        if (def.special === 'manual') {
            return claims[def.id]?.status ?? 'available';
        }

        if (def.check(portfolio)) return 'pendingClaim';
        return 'available';
    }, [claims, portfolio]);

    const handleAction = (def: AchievementDef) => {
        const status = getStatus(def);

        // Daily bonus special case
        if (def.special === 'daily_bonus') {
            if (claimDailyBonus()) {
                showToast(`+${def.reward} NXO daily bonus claimed!`, 'success');
            } else {
                showToast('Daily bonus already claimed. Come back tomorrow!', 'warning');
            }
            return;
        }

        // Claim ready
        if (status === 'pendingClaim') {
            addReward(def.reward, def.title);
            updateClaim(def.id, 'completed');
            showToast(`+${def.reward} NXO earned — ${def.title}!`, 'success');
            return;
        }

        // Trigger manual actions
        switch (def.id) {
            case 'first_trade':
                showToast('Go to the Watchlist and place a trade on any instrument.', 'info');
                break;
            case 'ten_trades':
            case 'fifty_trades':
                showToast(`Keep trading! ${portfolio.orderHistory.filter(o => o.status === 'EXECUTED').length} executed so far.`, 'info');
                break;
            case 'first_gtt':
                showToast('Open any instrument → Order Window → set a GTT (Stop Loss or Target).', 'info');
                break;
            case 'first_alert':
                showToast('Right-click any instrument in your watchlist to create a price alert.', 'info');
                break;
            case 'profile_complete':
                showToast('Go to Profile via the top-right menu, fill in your name and hit "Update Profile".', 'info');
                break;
            case 'refer_friend': {
                const code = 'TRVRT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                const text = `Join TraVirt — India's best virtual trading platform! Use my code: ${code}`;
                navigator.clipboard?.writeText(text).catch(() => {});
                updateClaim(def.id, 'pendingClaim');
                showToast('Referral code copied to clipboard! Click Claim to earn your reward.', 'success');
                break;
            }
        }
    };

    const completedCount = ACHIEVEMENT_DEFS.filter(d => getStatus(d) === 'completed').length;
    const earnedNxo      = ACHIEVEMENT_DEFS.filter(d => getStatus(d) === 'completed').reduce((s, d) => s + d.reward, 0);
    const totalNxo       = ACHIEVEMENT_DEFS.reduce((s, d) => s + d.reward, 0);
    const execCount      = portfolio.orderHistory.filter(o => o.status === 'EXECUTED').length;

    const renderButton = (def: AchievementDef) => {
        const status = getStatus(def);

        if (def.special === 'daily_bonus') {
            if (portfolio.dailyBonusClaimed) {
                return (
                    <button disabled className="flex items-center gap-1.5 border border-overlay text-muted font-semibold py-2 px-5 rounded-lg text-sm cursor-not-allowed whitespace-nowrap">
                        <i className="fas fa-check text-success text-xs"></i> Claimed
                    </button>
                );
            }
            return (
                <button onClick={() => handleAction(def)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold py-2 px-5 rounded-lg text-sm transition-colors whitespace-nowrap">
                    Claim
                </button>
            );
        }

        if (status === 'completed') {
            return (
                <button disabled className="flex items-center gap-1.5 border border-overlay text-muted font-semibold py-2 px-5 rounded-lg text-sm cursor-not-allowed whitespace-nowrap">
                    <i className="fas fa-check text-success text-xs"></i> Done
                </button>
            );
        }

        if (status === 'pendingClaim') {
            return (
                <button onClick={() => handleAction(def)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold py-2 px-5 rounded-lg text-sm transition-colors whitespace-nowrap">
                    Claim
                </button>
            );
        }

        return (
            <button onClick={() => handleAction(def)} className="bg-primary hover:bg-primary-focus text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors whitespace-nowrap">
                Start
            </button>
        );
    };

    return (
        <main className="animate-fade-in text-text-primary p-6">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <i className="fas fa-coins text-yellow-400"></i>
                    Earn NXO Tokens
                </h1>
                <p className="text-muted mt-1 text-sm">Complete achievements to earn NFINO (NXO) tokens — convert them into virtual trading balance.</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-xl p-4 border border-overlay text-center">
                    <p className="text-3xl font-bold text-yellow-400">{completedCount}/{ACHIEVEMENT_DEFS.length}</p>
                    <p className="text-xs text-muted mt-1">Achievements Unlocked</p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-overlay text-center">
                    <p className="text-3xl font-bold text-success">+{earnedNxo}</p>
                    <p className="text-xs text-muted mt-1">NXO Earned <span className="text-muted/60">of {totalNxo}</span></p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-overlay text-center">
                    <p className="text-3xl font-bold text-primary">{execCount}</p>
                    <p className="text-xs text-muted mt-1">{execCount < 10 ? `${10 - execCount} trades to next reward` : execCount < 50 ? `${50 - execCount} trades to Veteran` : 'All trade goals hit!'}</p>
                </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-6 bg-surface rounded-xl p-4 border border-overlay">
                <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Overall Progress</span>
                    <span>{completedCount} of {ACHIEVEMENT_DEFS.length} complete</span>
                </div>
                <div className="w-full bg-overlay rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-700"
                        style={{ width: `${(completedCount / ACHIEVEMENT_DEFS.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Achievement List */}
            <div className="space-y-3">
                {ACHIEVEMENT_DEFS.map(def => {
                    const status  = getStatus(def);
                    const isDone  = status === 'completed';
                    const isPending = status === 'pendingClaim';
                    const prog    = def.progressOf?.(portfolio);

                    return (
                        <div
                            key={def.id}
                            className={`rounded-xl p-5 border transition-all duration-200 ${
                                isDone    ? 'bg-surface border-overlay opacity-50'
                                : isPending ? 'bg-surface border-yellow-500/60 shadow-lg shadow-yellow-500/5'
                                : 'bg-surface border-overlay hover:border-primary/40'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-xl ${
                                    isDone    ? 'bg-overlay text-muted'
                                    : isPending ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-primary/10 text-primary'
                                }`}>
                                    {isDone ? <i className="fas fa-check"></i> : <i className={def.icon}></i>}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={`font-bold text-sm ${isDone ? 'text-muted line-through' : 'text-text-primary'}`}>
                                            {def.title}
                                        </h3>
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-overlay text-muted uppercase tracking-wider">
                                            {def.category}
                                        </span>
                                        {isPending && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">
                                                Ready!
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted mt-0.5">{def.description}</p>

                                    {/* Progress bar for countable achievements */}
                                    {prog && !isDone && (
                                        <div className="mt-2 max-w-xs">
                                            <div className="w-full bg-overlay rounded-full h-1.5">
                                                <div
                                                    className="bg-primary h-1.5 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(prog.current / prog.target, 1) * 100}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted mt-1">{prog.current}/{prog.target} trades executed</p>
                                        </div>
                                    )}
                                </div>

                                {/* Reward + Action */}
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-center">
                                        <p className={`font-bold text-xl ${isDone ? 'text-muted' : 'text-yellow-400'}`}>+{def.reward}</p>
                                        <p className="text-[10px] text-muted">NXO</p>
                                    </div>
                                    {renderButton(def)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All-done banner */}
            {completedCount === ACHIEVEMENT_DEFS.length && (
                <div className="mt-6 text-center py-8 bg-surface rounded-xl border border-success/30">
                    <i className="fas fa-trophy text-4xl text-yellow-400 mb-3 block"></i>
                    <p className="font-bold text-text-primary text-lg">All achievements complete!</p>
                    <p className="text-muted text-sm mt-1">You've earned {earnedNxo} NXO. Check back tomorrow for your daily bonus.</p>
                </div>
            )}
        </main>
    );
};

export default BidsScreen;
