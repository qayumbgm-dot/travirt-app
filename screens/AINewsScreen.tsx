
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLiveHeadlines, summarizeNews, LiveNewsResult } from '../services/geminiService';
import { useSubscription } from '../contexts/SubscriptionContext';
import UpgradePrompt from '../components/billing/UpgradePrompt';

const inferCategory = (headline: string): { label: string; cls: string } => {
    const h = headline.toLowerCase();
    if (/\b(nifty|sensex|index|indices|bse|nse|market)\b/.test(h))
        return { label: 'Market', cls: 'text-primary bg-primary/10' };
    if (/\b(q[1-4]|result|profit|revenue|earnings|quarterly)\b/.test(h))
        return { label: 'Earnings', cls: 'text-success bg-success/10' };
    if (/\b(rbi|sebi|gdp|inflation|rate|repo|policy|budget|fiscal)\b/.test(h))
        return { label: 'Macro', cls: 'text-yellow-400 bg-yellow-400/10' };
    if (/\b(ipo|merger|acquisition|stake|deal|buyback|takeover)\b/.test(h))
        return { label: 'Corp', cls: 'text-purple-400 bg-purple-400/10' };
    if (/\b(option|future|derivative|fii|dii|f&o|put|call)\b/.test(h))
        return { label: 'F&O', cls: 'text-orange-400 bg-orange-400/10' };
    if (/\b(rupee|dollar|crude|gold|silver|forex|oil|commodity)\b/.test(h))
        return { label: 'Commodity', cls: 'text-amber-400 bg-amber-400/10' };
    if (/\b(bank|banking|nbfc|loan|npa|credit|hdfc|icici|kotak|sbi)\b/.test(h))
        return { label: 'Banking', cls: 'text-cyan-400 bg-cyan-400/10' };
    if (/\b(pharma|healthcare|drug|fda|approval|biotech)\b/.test(h))
        return { label: 'Healthcare', cls: 'text-green-400 bg-green-400/10' };
    if (/\b(it|tech|technology|software|digital|infosys|wipro|tcs|hcl)\b/.test(h))
        return { label: 'IT/Tech', cls: 'text-indigo-400 bg-indigo-400/10' };
    if (/\b(auto|automobile|vehicle|ev|electric|maruti|tata motors)\b/.test(h))
        return { label: 'Auto', cls: 'text-red-400 bg-red-400/10' };
    return { label: 'General', cls: 'text-muted bg-overlay' };
};

const formatClock = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const AINewsScreen: React.FC<{ onUpgrade?: () => void }> = ({ onUpgrade }) => {
    const { features, isLoading: subLoading } = useSubscription();
    const [newsData, setNewsData] = useState<LiveNewsResult | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [isLoadingNews, setIsLoadingNews] = useState(true);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const locked = !subLoading && !features.aiNews;

    const fetchAll = useCallback(async () => {
        if (locked) return;
        setIsLoadingNews(true);
        setIsLoadingAI(false);
        setSummary('');
        setNewsData(null);

        const data = await fetchLiveHeadlines();
        setNewsData(data);
        setIsLoadingNews(false);

        setIsLoadingAI(true);
        const sum = await summarizeNews(data.headlines);
        setSummary(sum);
        setIsLoadingAI(false);
    }, [locked]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    if (locked) {
        return <UpgradePrompt feature="AI News" requiredPlan="Pro" onUpgrade={onUpgrade} />;
    }

    const isBusy = isLoadingNews || isLoadingAI;

    return (
        <main className="animate-fade-in p-6 text-text-primary">
            {/* Header */}
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <i className="fas fa-robot text-primary"></i>
                        AI Market News
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Live Indian market headlines summarised by Google Gemini.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 mt-1">
                    {/* Live / Cached badge */}
                    {newsData && (
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                            newsData.fromCache
                                ? 'bg-overlay text-muted border-overlay'
                                : 'bg-success/10 text-success border-success/30'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                newsData.fromCache ? 'bg-muted' : 'bg-success animate-pulse'
                            }`}></span>
                            {newsData.fromCache ? 'Cached data' : `Live · ${newsData.sourceName}`}
                        </span>
                    )}

                    {newsData && (
                        <span className="text-xs text-muted">
                            at {formatClock(newsData.fetchedAt)}
                        </span>
                    )}

                    <button
                        onClick={fetchAll}
                        disabled={isBusy}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-focus disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        <i className={`fas fa-sync-alt text-xs ${isBusy ? 'animate-spin' : ''}`}></i>
                        {isBusy ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gemini AI Summary */}
                <div className="bg-surface rounded-xl border border-overlay p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <i className="fas fa-brain text-primary text-sm"></i>
                        <h3 className="font-bold text-text-primary">Gemini Market Pulse</h3>
                        {isLoadingAI && (
                            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold animate-pulse ml-1">
                                Generating…
                            </span>
                        )}
                    </div>

                    {isLoadingNews || isLoadingAI ? (
                        <div className="space-y-3 animate-pulse flex-1">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-3.5 bg-overlay rounded-full" style={{ width: `${75 + (i % 3) * 8}%` }}></div>
                            ))}
                        </div>
                    ) : summary ? (
                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line flex-1">
                            {summary}
                        </p>
                    ) : null}

                    <p className="text-[10px] text-muted mt-5 pt-3 border-t border-overlay/50">
                        Powered by Gemini 2.5 Flash · Informational only — not financial advice.
                    </p>
                </div>

                {/* Live Headlines */}
                <div className="bg-surface rounded-xl border border-overlay p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-newspaper text-muted text-sm"></i>
                            <h3 className="font-bold text-text-primary">Today's Headlines</h3>
                        </div>
                        {newsData && (
                            <span className="text-[10px] text-muted">{newsData.headlines.length} articles</span>
                        )}
                    </div>

                    {isLoadingNews ? (
                        <ul className="space-y-3.5 animate-pulse">
                            {[...Array(7)].map((_, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-14 h-4 bg-overlay rounded-full shrink-0 mt-0.5"></div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-overlay rounded-full w-full"></div>
                                        <div className="h-3 bg-overlay rounded-full w-4/5"></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : newsData ? (
                        <ul className="space-y-3">
                            {newsData.headlines.map((headline, i) => {
                                const cat = inferCategory(headline);
                                return (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5 shrink-0 ${cat.cls}`}>
                                            {cat.label}
                                        </span>
                                        <p className="text-text-secondary text-sm leading-snug group-hover:text-text-primary transition-colors">
                                            {headline}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
            </div>

            {/* Cached-data notice */}
            {newsData?.fromCache && (
                <div className="mt-4 flex items-start gap-2 text-xs text-muted bg-overlay/40 rounded-lg px-4 py-3 border border-overlay">
                    <i className="fas fa-info-circle text-primary mt-0.5 shrink-0"></i>
                    <span>
                        Live news fetch failed (network or CORS restriction). Showing cached sample headlines.
                        Click <strong className="text-text-primary">Refresh</strong> to try again, or check your internet connection.
                    </span>
                </div>
            )}
        </main>
    );
};

export default AINewsScreen;
