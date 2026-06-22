
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';

const TASKS_KEY = 'travirt_tasks';
const PROFILE_KEY = 'travirt_profile';

type TaskStatus = 'available' | 'pendingClaim' | 'completed';

interface SavedTasks {
    [taskId: string]: { status: TaskStatus };
}

const loadTaskStates = (): SavedTasks => {
    try {
        const raw = localStorage.getItem(TASKS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
};

const saveTaskStates = (states: SavedTasks) => {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(states)); } catch {}
};

interface TaskDef {
    id: string;
    title: string;
    description: string;
    reward: number;
    icon: string;
    category: string;
}

const TASK_DEFS: TaskDef[] = [
    { id: 'task1', title: 'Complete Your Profile', description: 'Fill in your first and last name, then save your profile details.', reward: 5, icon: 'fas fa-user-check', category: 'Onboarding' },
    { id: 'task2', title: 'Watch a Tutorial Video', description: 'Learn the platform basics by watching our introductory tutorial video.', reward: 10, icon: 'fas fa-play-circle', category: 'Learning' },
    { id: 'task3', title: 'Execute Your First 10 Trades', description: 'Get hands-on experience by placing your first ten trades on any instrument.', reward: 20, icon: 'fas fa-chart-bar', category: 'Trading' },
    { id: 'task4', title: 'Refer a Friend', description: 'Copy your personal referral link and share it with a friend to join.', reward: 50, icon: 'fas fa-share-alt', category: 'Social' },
    { id: 'task5', title: 'Daily Login Bonus', description: 'Log in every day to claim your daily reward and keep your streak going.', reward: 10, icon: 'fas fa-calendar-check', category: 'Daily' },
    { id: 'task6', title: 'Follow us on Social Media', description: 'Stay updated with the latest news by following our social channels.', reward: 5, icon: 'fas fa-thumbs-up', category: 'Social' },
];

const BidsScreen: React.FC = () => {
    const { claimDailyBonus, addReward, portfolio } = usePortfolio();
    const { showToast } = useToast();
    const [taskStates, setTaskStates] = useState<SavedTasks>(loadTaskStates);
    const task3ToastShown = useRef(false);

    const tradeCount = portfolio.orderHistory.length;

    const updateTask = useCallback((id: string, status: TaskStatus) => {
        setTaskStates(prev => {
            const next = { ...prev, [id]: { status } };
            saveTaskStates(next);
            return next;
        });
    }, []);

    // Auto-notify when trade milestone is freshly reached (only while on this screen)
    useEffect(() => {
        if (tradeCount >= 10 && !task3ToastShown.current) {
            const saved = taskStates['task3'];
            if (!saved || saved.status === 'available') {
                task3ToastShown.current = true;
                showToast('10 trades milestone reached! Claim your 20 NXO below.', 'success');
            }
        }
    }, [tradeCount]); // eslint-disable-line react-hooks/exhaustive-deps

    const getStatus = useCallback((taskId: string): TaskStatus => {
        const saved = taskStates[taskId];
        if (saved?.status === 'completed') return 'completed';

        if (taskId === 'task1') {
            try {
                const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
                if (profile.firstName?.trim() && profile.lastName?.trim()) return 'pendingClaim';
            } catch {}
            return 'available';
        }

        if (taskId === 'task3') {
            if (tradeCount >= 10) return 'pendingClaim';
            return 'available';
        }

        if (taskId === 'task5') {
            return portfolio.dailyBonusClaimed ? 'completed' : 'available';
        }

        return saved?.status || 'available';
    }, [taskStates, tradeCount, portfolio.dailyBonusClaimed]);

    const handleAction = (taskId: string) => {
        const def = TASK_DEFS.find(t => t.id === taskId)!;
        const status = getStatus(taskId);

        if (taskId === 'task5') {
            if (claimDailyBonus()) {
                showToast(`+${def.reward} NXO daily bonus claimed!`, 'success');
            } else {
                showToast('Daily bonus already claimed. Come back tomorrow!', 'warning');
            }
            return;
        }

        if (status === 'pendingClaim') {
            addReward(def.reward, def.title);
            updateTask(taskId, 'completed');
            showToast(`+${def.reward} NXO earned — ${def.title}!`, 'success');
            return;
        }

        // available — Start action
        switch (taskId) {
            case 'task1':
                showToast('Go to Profile via the top-right menu, fill in your name and hit "Update Profile".', 'info');
                break;
            case 'task2':
                window.open('https://www.youtube.com/results?search_query=paper+trading+beginners+tutorial', '_blank');
                updateTask(taskId, 'pendingClaim');
                showToast('Video opened! Come back here to claim your reward.', 'info');
                break;
            case 'task3':
                showToast(`${tradeCount}/10 trades done. Place trades from the watchlist to continue.`, 'info');
                break;
            case 'task4': {
                const code = 'TRVRT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                const text = `Join TraVirt — India's best virtual trading platform! Use my code: ${code}`;
                navigator.clipboard?.writeText(text).catch(() => {});
                updateTask(taskId, 'pendingClaim');
                showToast('Referral code copied to clipboard!', 'success');
                break;
            }
            case 'task6':
                window.open('https://twitter.com', '_blank');
                updateTask(taskId, 'pendingClaim');
                showToast('Thanks for following! Click Claim to earn your reward.', 'info');
                break;
        }
    };

    const completedCount = TASK_DEFS.filter(t => getStatus(t.id) === 'completed').length;
    const earnedNxo = TASK_DEFS.filter(t => getStatus(t.id) === 'completed').reduce((s, t) => s + t.reward, 0);
    const totalPossibleNxo = TASK_DEFS.reduce((s, t) => s + t.reward, 0);

    const renderButton = (taskId: string) => {
        const status = getStatus(taskId);

        if (taskId === 'task5') {
            if (portfolio.dailyBonusClaimed) {
                return (
                    <button disabled className="flex items-center gap-1.5 border border-overlay text-muted font-semibold py-2 px-5 rounded-lg text-sm cursor-not-allowed whitespace-nowrap">
                        <i className="fas fa-check text-success text-xs"></i> Claimed
                    </button>
                );
            }
            return (
                <button onClick={() => handleAction(taskId)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold py-2 px-5 rounded-lg text-sm transition-colors whitespace-nowrap">
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
                <button onClick={() => handleAction(taskId)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold py-2 px-5 rounded-lg text-sm transition-colors whitespace-nowrap">
                    Claim
                </button>
            );
        }

        if (taskId === 'task3') {
            return (
                <button onClick={() => handleAction(taskId)} className="border border-overlay text-muted font-semibold py-2 px-5 rounded-lg text-sm whitespace-nowrap">
                    {tradeCount}/10
                </button>
            );
        }

        return (
            <button onClick={() => handleAction(taskId)} className="bg-primary hover:bg-primary-focus text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors whitespace-nowrap">
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
                <p className="text-muted mt-1 text-sm">Complete tasks to earn NFINO (NXO) tokens — convert them into virtual trading balance.</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-xl p-4 border border-overlay text-center">
                    <p className="text-3xl font-bold text-yellow-400">{completedCount}/{TASK_DEFS.length}</p>
                    <p className="text-xs text-muted mt-1">Tasks Completed</p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-overlay text-center">
                    <p className="text-3xl font-bold text-success">+{earnedNxo}</p>
                    <p className="text-xs text-muted mt-1">NXO Earned <span className="text-muted/60">of {totalPossibleNxo}</span></p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-overlay text-center">
                    <p className="text-3xl font-bold text-primary">{tradeCount}</p>
                    <p className="text-xs text-muted mt-1">{tradeCount < 10 ? `${10 - tradeCount} trades to bonus` : 'Trade target met!'}</p>
                </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mb-6 bg-surface rounded-xl p-4 border border-overlay">
                <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Overall Progress</span>
                    <span>{completedCount} of {TASK_DEFS.length} tasks complete</span>
                </div>
                <div className="w-full bg-overlay rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-700"
                        style={{ width: `${(completedCount / TASK_DEFS.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-3">
                {TASK_DEFS.map(task => {
                    const status = getStatus(task.id);
                    const isDone = status === 'completed';
                    const isPending = status === 'pendingClaim';

                    return (
                        <div
                            key={task.id}
                            className={`rounded-xl p-5 border transition-all duration-200 ${
                                isDone
                                    ? 'bg-surface border-overlay opacity-50'
                                    : isPending
                                    ? 'bg-surface border-yellow-500/60 shadow-lg shadow-yellow-500/5'
                                    : 'bg-surface border-overlay hover:border-primary/40'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-xl ${
                                    isDone
                                        ? 'bg-overlay text-muted'
                                        : isPending
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-primary/10 text-primary'
                                }`}>
                                    {isDone ? <i className="fas fa-check"></i> : <i className={task.icon}></i>}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={`font-bold text-sm ${isDone ? 'text-muted line-through' : 'text-text-primary'}`}>
                                            {task.title}
                                        </h3>
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-overlay text-muted uppercase tracking-wider">
                                            {task.category}
                                        </span>
                                        {isPending && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">
                                                Ready!
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted mt-0.5">{task.description}</p>

                                    {/* Trade progress bar (task3 only, while not done) */}
                                    {task.id === 'task3' && !isDone && (
                                        <div className="mt-2 max-w-xs">
                                            <div className="w-full bg-overlay rounded-full h-1.5">
                                                <div
                                                    className="bg-primary h-1.5 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(tradeCount, 10) * 10}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted mt-1">{Math.min(tradeCount, 10)}/10 trades executed</p>
                                        </div>
                                    )}
                                </div>

                                {/* Reward + Action */}
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-center">
                                        <p className={`font-bold text-xl ${isDone ? 'text-muted' : 'text-yellow-400'}`}>+{task.reward}</p>
                                        <p className="text-[10px] text-muted">NXO</p>
                                    </div>
                                    {renderButton(task.id)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All-done banner */}
            {completedCount === TASK_DEFS.length && (
                <div className="mt-6 text-center py-8 bg-surface rounded-xl border border-success/30">
                    <i className="fas fa-trophy text-4xl text-yellow-400 mb-3 block"></i>
                    <p className="font-bold text-text-primary text-lg">All tasks complete!</p>
                    <p className="text-muted text-sm mt-1">You've earned {earnedNxo} NXO. Check back tomorrow for your daily bonus.</p>
                </div>
            )}
        </main>
    );
};

export default BidsScreen;
