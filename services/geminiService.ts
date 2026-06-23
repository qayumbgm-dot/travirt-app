import { apiClient } from '../apiClient/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveNewsResult {
  headlines: string[];
  sourceName: string;
  fromCache: boolean;
  fetchedAt: number;
  summary?: string;
}

// Fallback for when backend is unavailable
const FALLBACK_HEADLINES = [
  'Reliance Industries Q2 results beat estimates, net profit jumps 15%.',
  'IT sector faces headwinds as major US clients cut spending; Infosys and TCS trade lower.',
  'HDFC Bank reports strong loan growth, asset quality remains stable.',
  'SEBI introduces new margin rules for derivatives trading, impacting retail traders.',
  'Auto sales show mixed trend; Maruti Suzuki up, Tata Motors down.',
  'Pharmaceutical sector gains on strong export data and new drug approvals.',
  'Sensex and Nifty hit record highs amid positive global cues.',
  'FIIs net buyers for third consecutive session as global risk appetite improves.',
  'RBI keeps repo rate unchanged; signals data-dependent stance for next quarter.',
  'Adani Ports wins major government contract, stock hits 52-week high.',
];

// ─── API proxy calls (secrets stay server-side) ───────────────────────────────

export const fetchLiveHeadlines = async (): Promise<LiveNewsResult> => {
  try {
    const res = await apiClient.get<LiveNewsResult>('/ai/headlines');
    return res.data;
  } catch {
    // Backend offline — use local fallback (no DOMParser needed, server handles RSS)
    return {
      headlines: FALLBACK_HEADLINES,
      sourceName: 'Curated',
      fromCache: true,
      fetchedAt: Date.now(),
    };
  }
};

export const summarizeNews = async (headlines: string[]): Promise<string> => {
  try {
    const res = await apiClient.post<{ summary: string }>('/ai/summarize', { headlines });
    return res.data.summary;
  } catch {
    return 'AI summary unavailable — backend not connected.';
  }
};

// ─── AI Insights ─────────────────────────────────────────────────────────────

export interface InsightStats {
  winRate: number;
  profitFactor: number;
  consistencyScore: number;
  worstInstrument: string;
  drawdownPct: number;
  totalTrades: number;
}

const FALLBACK_INSIGHTS = [
  'Maintain a detailed trading journal — recording your entry rationale and post-trade review on every order helps identify behavioural patterns that raw statistics alone cannot reveal.',
  'Strict position sizing (1–2% risk per trade) is the single most effective way to survive an inevitable losing streak and protect your capital through drawdown periods.',
  'Reduce exposure on your worst-performing instrument until you can identify a specific edge. Repeated losses in one symbol suggest the setup does not suit your current strategy.',
];

export const getInsights = async (stats: InsightStats): Promise<string[]> => {
  try {
    const res = await apiClient.post<{ insights: string[] }>('/ai/insights', stats);
    return res.data.insights;
  } catch {
    return FALLBACK_INSIGHTS;
  }
};

export const fetchNewsWithSummary = async (): Promise<LiveNewsResult & { summary: string }> => {
  try {
    const res = await apiClient.get<LiveNewsResult & { summary: string }>('/ai/news');
    return res.data;
  } catch {
    const headlines = FALLBACK_HEADLINES;
    return {
      headlines,
      sourceName: 'Curated',
      fromCache: true,
      fetchedAt: Date.now(),
      summary: 'AI summary unavailable — backend not connected.',
    };
  }
};
