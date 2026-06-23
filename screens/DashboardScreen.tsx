
import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Screen } from '../App';
import { MOCK_INDICES } from '../constants';
import CertificateModal from '../components/common/CertificateModal';
import RiskReport from '../components/common/RiskReport';

const CHALLENGE_KEY = 'travirt_challenge';

interface ChallengeData {
    startDate: string;
    startingBalance: number;
}

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

// ── Account Health Card ───────────────────────────────────────────────────────

const AccountHealthCard: React.FC = () => {
    const { portfolio, riskEngine, sessionPnl } = usePortfolio();
    const [timeToReset, setTimeToReset] = useState('');

    useEffect(() => {
        const tick = () => {
            const now      = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const diff = midnight.getTime() - now.getTime();
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            setTimeToReset(`${h}h ${m}m`);
        };
        tick();
        const id = setInterval(tick, 60_000);
        return () => clearInterval(id);
    }, []);

    const accountValue = portfolio.virtualBalance + portfolio.totalCurrentValue;
    if (accountValue <= 0) return null;

    const sessionBase    = accountValue - sessionPnl;
    const sessionPnlPct  = sessionBase > 0 ? (sessionPnl / sessionBase) * 100 : 0;
    const dailyPct       = Math.min(riskEngine.dailyLossConsumedPct * 100, 100);

    const status =
        riskEngine.maxDrawdownState === 'breached' || riskEngine.dailyLossState === 'breached' ? 'breached' :
        riskEngine.maxDrawdownState === 'warning'  || riskEngine.dailyLossState === 'warning'  ? 'warning'  :
        'safe';

    const statusColor =
        status === 'breached' ? { ring: 'border-danger/40', icon: 'text-danger',       badge: 'bg-danger/20 text-danger',       dot: 'bg-danger',       bar: 'bg-danger'      } :
        status === 'warning'  ? { ring: 'border-yellow-400/30', icon: 'text-yellow-400', badge: 'bg-yellow-400/20 text-yellow-400', dot: 'bg-yellow-400', bar: 'bg-yellow-400' } :
                                { ring: 'border-overlay',       icon: 'text-success',    badge: 'bg-success/20 text-success',      dot: 'bg-success',      bar: 'bg-success'    };

    return (
        <div className={`bg-surface rounded-lg shadow-lg border ${statusColor.ring}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-overlay">
                <div className="flex items-center gap-2">
                    <i className={`fas fa-heartbeat ${statusColor.icon}`}></i>
                    <span className="font-bold text-text-primary">Account Health</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${statusColor.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusColor.dot}`}></span>
                    {status === 'breached' ? 'BREACHED' : status === 'warning' ? 'AT RISK' : 'HEALTHY'}
                </div>
            </div>

            {/* Metrics grid */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Current equity */}
                <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Current Equity</p>
                    <p className="text-lg font-bold text-text-primary leading-tight">{formatCurrency(accountValue)}</p>
                </div>

                {/* Session P&L */}
                <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Session P&L</p>
                    <p className={`text-lg font-bold leading-tight ${sessionPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {sessionPnl >= 0 ? '+' : ''}{formatCurrency(sessionPnl)}
                    </p>
                    <p className={`text-xs ${sessionPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {sessionPnlPct >= 0 ? '+' : ''}{sessionPnlPct.toFixed(2)}%
                    </p>
                </div>

                {/* Daily loss consumed */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] text-muted uppercase tracking-wider">Daily Limit Used</p>
                        <span className={`text-xs font-bold ${statusColor.icon}`}>{dailyPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-overlay rounded-full h-1.5 mb-1">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-700 ${statusColor.bar}`}
                            style={{ width: `${dailyPct}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-muted">
                        {formatCurrency(riskEngine.dailyLoss)} of {formatCurrency(riskEngine.dailyLossLimit)}
                    </p>
                </div>

                {/* Reset countdown */}
                <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Limit Resets In</p>
                    <div className="flex items-baseline gap-1.5">
                        <i className="fas fa-clock text-muted text-xs"></i>
                        <p className="text-lg font-bold text-text-primary leading-tight">{timeToReset}</p>
                    </div>
                    <p className="text-[10px] text-muted">at midnight</p>
                </div>
            </div>
        </div>
    );
};

// ── 30-Day Challenge Card ─────────────────────────────────────────────────────

const ChallengeCard: React.FC = () => {
    const { portfolio, breaches, consistencyScore } = usePortfolio();
    const { showToast } = useToast();
    const [challenge, setChallenge] = useState<ChallengeData | null>(() => {
        try { return JSON.parse(localStorage.getItem(CHALLENGE_KEY) ?? 'null'); } catch { return null; }
    });
    const [showCertificate, setShowCertificate] = useState(false);

    const accountValue = portfolio.virtualBalance + portfolio.totalCurrentValue;

    const startChallenge = () => {
        if (accountValue <= 0) {
            showToast('Fund your account before starting a challenge. Go to Funds → Convert NXO.', 'warning');
            return;
        }
        const data: ChallengeData = { startDate: new Date().toISOString(), startingBalance: accountValue };
        localStorage.setItem(CHALLENGE_KEY, JSON.stringify(data));
        setChallenge(data);
        showToast('30-Day Consistency Challenge started! Good luck!', 'success');
    };

    const resetChallenge = () => {
        localStorage.removeItem(CHALLENGE_KEY);
        setChallenge(null);
        showToast('Challenge reset.', 'info');
    };

    if (!challenge) {
        return (
            <div className="bg-surface rounded-lg shadow-lg border border-overlay p-5 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <i className="fas fa-flag text-primary text-xl"></i>
                </div>
                <div className="flex-1">
                    <p className="font-bold text-text-primary">30-Day Consistency Challenge</p>
                    <p className="text-xs text-muted mt-0.5">Grow your account +10% in 30 days while respecting daily loss limits, hitting 10 trading days, and maintaining a consistency score ≥60.</p>
                </div>
                <button
                    onClick={startChallenge}
                    className="shrink-0 bg-primary hover:bg-primary-focus text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                    Start Challenge
                </button>
            </div>
        );
    }

    const startTs = new Date(challenge.startDate).getTime();
    const endTs   = startTs + 30 * 24 * 3600 * 1000;
    const msLeft  = endTs - Date.now();
    const daysLeft    = Math.max(0, Math.ceil(msLeft / 86400000));
    const daysElapsed = Math.min(30, 30 - daysLeft);

    const profitPct = challenge.startingBalance > 0
        ? (accountValue - challenge.startingBalance) / challenge.startingBalance * 100
        : 0;

    const tradingDays = new Set(
        portfolio.orderHistory
            .filter(o => o.status === 'EXECUTED' && o.timestamp >= startTs)
            .map(o => new Date(o.timestamp).toISOString().slice(0, 10))
    ).size;

    const hardBreaches = breaches.filter(b => b.timestamp >= startTs && b.severity === 'hard_block');
    const isClean = hardBreaches.length === 0;

    const objectives = [
        { label: 'Profit Target',    detail: `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}% of +10%`, pct: Math.min(Math.max(0, profitPct) / 10 * 100, 100), met: profitPct >= 10 },
        { label: 'Trading Days',     detail: `${tradingDays} of 10 days`,                                    pct: Math.min(tradingDays / 10 * 100, 100),             met: tradingDays >= 10 },
        { label: 'Rule Compliance',  detail: isClean ? 'Clean' : `${hardBreaches.length} breach(es)`,        pct: isClean ? 100 : 0,                                 met: isClean },
        { label: 'Consistency',      detail: `${consistencyScore.toFixed(0)}/100`,                           pct: Math.min(consistencyScore / 60 * 100, 100),        met: consistencyScore >= 60 },
    ];

    const passed = profitPct >= 10 && tradingDays >= 10 && isClean && consistencyScore >= 60;
    const expired = daysLeft === 0 && !passed;

    const headerBg =
        passed   ? 'border-success/40'      :
        expired  ? 'border-danger/40'       :
                   'border-primary/30';

    const statusBadge =
        passed   ? 'bg-success/20 text-success'    :
        expired  ? 'bg-danger/20 text-danger'      :
                   'bg-primary/20 text-primary';

    const statusLabel = passed ? 'PASSED' : expired ? 'FAILED' : `Day ${daysElapsed}/30`;

    return (
        <div className={`bg-surface rounded-lg shadow-lg border ${headerBg}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-overlay">
                <div className="flex items-center gap-2">
                    <i className="fas fa-flag text-primary"></i>
                    <span className="font-bold text-text-primary">30-Day Consistency Challenge</span>
                    <span className="text-[10px] text-muted border border-overlay rounded-full px-2 py-0.5">
                        Started {new Date(challenge.startDate).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadge}`}>{statusLabel}</span>
                    <button onClick={resetChallenge} className="text-muted hover:text-danger text-xs" title="Reset challenge">
                        <i className="fas fa-redo-alt"></i>
                    </button>
                </div>
            </div>

            {/* Pass / Fail banners */}
            {passed && (
                <>
                    <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 bg-success/10 border border-success/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-success">
                            <i className="fas fa-check-circle shrink-0"></i>
                            <span>Challenge passed! All objectives met. Your trading consistency is prop-firm ready.</span>
                        </div>
                        <button
                            onClick={() => setShowCertificate(true)}
                            className="shrink-0 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <i className="fas fa-certificate"></i>
                            View Certificate
                        </button>
                    </div>
                    {showCertificate && (
                        <CertificateModal
                            startDate={challenge.startDate}
                            profitPct={profitPct}
                            consistencyScore={consistencyScore}
                            tradingDays={tradingDays}
                            onClose={() => setShowCertificate(false)}
                        />
                    )}
                </>
            )}
            {expired && !passed && (
                <div className="mx-5 mt-4 flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
                    <i className="fas fa-times-circle shrink-0"></i>
                    <span>Challenge expired. Review your performance and start a new challenge to try again.</span>
                </div>
            )}

            {/* Objectives */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {objectives.map(obj => (
                    <div key={obj.label} className="bg-base rounded-lg p-3 border border-overlay">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-muted uppercase tracking-wider">{obj.label}</span>
                            <i className={`fas ${obj.met ? 'fa-check-circle text-success' : 'fa-circle text-overlay'} text-xs`}></i>
                        </div>
                        <div className="w-full bg-overlay rounded-full h-1.5 mb-2">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-700 ${obj.met ? 'bg-success' : 'bg-primary'}`}
                                style={{ width: `${obj.pct}%` }}
                            />
                        </div>
                        <p className={`text-xs font-semibold ${obj.met ? 'text-success' : 'text-text-primary'}`}>{obj.detail}</p>
                    </div>
                ))}
            </div>

            {/* Days remaining bar */}
            {!passed && !expired && (
                <div className="px-5 pb-4">
                    <div className="flex justify-between text-[10px] text-muted mb-1">
                        <span>Challenge progress</span>
                        <span>{daysLeft} days remaining</span>
                    </div>
                    <div className="w-full bg-overlay rounded-full h-1">
                        <div className="bg-primary h-1 rounded-full transition-all duration-700" style={{ width: `${(daysElapsed / 30) * 100}%` }} />
                    </div>
                </div>
            )}
        </div>
    );
};

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

const RiskEnginePanel: React.FC = () => {
    const { portfolio, riskEngine } = usePortfolio();
    const [showReport, setShowReport] = useState(false);

    const accountSize  = portfolio.virtualBalance + portfolio.totalInvested;
    const profitTarget = accountSize * 0.08;
    const profit       = Math.max(0, portfolio.totalPnl);
    const profitPct    = profitTarget > 0 ? Math.min((profit / profitTarget) * 100, 100) : 0;

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

    const dailyLossPct = Math.min(riskEngine.dailyLossConsumedPct * 100, 100);
    const drawdownPct  = Math.min(riskEngine.maxDrawdownConsumedPct * 100, 100);

    const rules: RiskRule[] = [
        {
            title: 'Daily Loss Limit',
            description: 'Max 5% loss in a single day',
            icon: 'fas fa-calendar-day',
            usagePct: dailyLossPct,
            usageLabel: `${formatCurrency(riskEngine.dailyLoss)} lost today`,
            limitLabel: `Limit: ${formatCurrency(riskEngine.dailyLossLimit)}`,
        },
        {
            title: 'Max Drawdown',
            description: 'Max 10% drawdown from peak equity',
            icon: 'fas fa-level-down-alt',
            usagePct: drawdownPct,
            usageLabel: `${formatCurrency(riskEngine.drawdownAmount)} from peak`,
            limitLabel: `Peak: ${formatCurrency(riskEngine.peakAccountValue)}`,
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

    const anyBreach  = riskEngine.dailyLossState === 'breached' || riskEngine.maxDrawdownState === 'breached';
    const anyWarning = !anyBreach && (riskEngine.dailyLossState === 'warning' || riskEngine.maxDrawdownState === 'warning');

    return (
        <div className="bg-surface rounded-lg shadow-lg border border-overlay">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-overlay">
                <div className="flex items-center gap-2">
                    <i className="fas fa-shield-alt text-primary"></i>
                    <span className="font-bold text-text-primary">Prop Firm Risk Engine</span>
                    <span className="text-[10px] text-muted border border-overlay rounded-full px-2 py-0.5">Simulated evaluation rules</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowReport(true)}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-text-primary border border-overlay rounded-lg px-3 py-1.5 transition-colors"
                    >
                        <i className="fas fa-file-alt text-xs"></i>
                        Risk Report
                    </button>
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
            </div>
            {showReport && <RiskReport onClose={() => setShowReport(false)} />}

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

// ── Economic Calendar Card ────────────────────────────────────────────────────

const EconomicCalendarCard: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-surface rounded-lg shadow-lg border border-overlay overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-overlay/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <i className="fas fa-calendar-alt text-primary"></i>
                    <span className="font-bold text-text-primary">Economic Calendar</span>
                    <span className="text-[10px] text-muted border border-overlay rounded-full px-2 py-0.5">India · This Week</span>
                </div>
                <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-muted text-xs`}></i>
            </button>
            {expanded && (
                <div className="border-t border-overlay">
                    <iframe
                        src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=14&calType=week&timeZone=23&lang=1"
                        width="100%"
                        height="460"
                        frameBorder="0"
                        title="Economic Calendar — India"
                        className="block bg-transparent"
                        allowFullScreen
                    />
                    <p className="px-5 py-2 text-[10px] text-muted border-t border-overlay">
                        Powered by <span className="text-primary">Investing.com</span> · Filtered to India macro events.
                    </p>
                </div>
            )}
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

                {/* Account Health */}
                <AccountHealthCard />

                {/* 30-Day Challenge */}
                <ChallengeCard />

                {/* Prop Firm Risk Engine */}
                <RiskEnginePanel />

                {/* Economic Calendar */}
                <EconomicCalendarCard />

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
