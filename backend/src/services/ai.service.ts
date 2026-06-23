import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

const RSS_SOURCES = [
  { url: 'https://economictimes.indiatimes.com/markets/rss.cms', name: 'Economic Times' },
  { url: 'https://feeds.business-standard.com/rss/latest-breaking-news', name: 'Business Standard' },
  { url: 'https://www.moneycontrol.com/rss/marketsnews.xml', name: 'MoneyControl' },
];

const PROXY = 'https://api.allorigins.win/get?url=';

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

const headlineCache = { headlines: [] as string[], sourceName: '', fetchedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface NewsResult {
  headlines: string[];
  sourceName: string;
  fromCache: boolean;
  fetchedAt: number;
}

export const fetchHeadlines = async (): Promise<NewsResult> => {
  const now = Date.now();
  if (headlineCache.headlines.length > 0 && now - headlineCache.fetchedAt < CACHE_TTL) {
    return { ...headlineCache, fromCache: true };
  }

  for (const source of RSS_SOURCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${PROXY}${encodeURIComponent(source.url)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const json = await res.json() as { contents?: string };
      const xml = json.contents ?? '';
      const titles = [...xml.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)].map((m) => m[1]);
      const headings = titles.length ? titles : [...xml.matchAll(/<title>(.+?)<\/title>/g)].slice(1).map((m) => m[1]);

      if (headings.length > 0) {
        const result: NewsResult = {
          headlines: headings.slice(0, 15),
          sourceName: source.name,
          fromCache: false,
          fetchedAt: now,
        };
        Object.assign(headlineCache, result);
        return result;
      }
    } catch { /* try next source */ }
  }

  return { headlines: FALLBACK_HEADLINES, sourceName: 'Curated', fromCache: false, fetchedAt: now };
};

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

export const generateInsights = async (stats: InsightStats): Promise<string[]> => {
  if (!ai) return FALLBACK_INSIGHTS;

  const pf = stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2);
  const prompt = `You are a professional trading coach specialising in Indian retail traders learning prop firm discipline.

Given this trader's current statistics:
- Win Rate: ${stats.winRate.toFixed(1)}%
- Profit Factor: ${pf}
- Consistency Score: ${stats.consistencyScore.toFixed(0)}/100 (higher = more evenly distributed profits across trading days)
- Worst performing instrument: ${stats.worstInstrument || 'N/A'}
- Current drawdown from peak: ${stats.drawdownPct.toFixed(1)}%
- Total closed trades: ${stats.totalTrades}

Provide exactly 3 specific, actionable coaching recommendations to improve their trading discipline.
Format your response as exactly 3 numbered lines (1., 2., 3.), each under 60 words.
Reference the actual numbers provided — do not give generic advice.`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const text = response.text ?? '';
    const lines = text.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 20);
    return lines.slice(0, 3).length === 3 ? lines.slice(0, 3) : FALLBACK_INSIGHTS;
  } catch {
    return FALLBACK_INSIGHTS;
  }
};

export const summarizeNews = async (headlines: string[]): Promise<string> => {
  if (!ai) {
    return `**Market Wrap** (AI disabled — set GEMINI_API_KEY)\n\n${headlines.slice(0, 5).map((h) => `• ${h}`).join('\n')}`;
  }

  const prompt = `You are a professional Indian stock market analyst. Based on these live news headlines from Indian financial markets, write a concise market intelligence briefing (max 120 words). Use bullet points. Be factual, insightful, and use trader-relevant language.\n\nHeadlines:\n${headlines.slice(0, 10).map((h, i) => `${i + 1}. ${h}`).join('\n')}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text ?? 'Unable to generate summary.';
};
