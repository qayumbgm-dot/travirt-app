/// <reference types="vite/client" />
// Core Web Vitals reporter — fires sendBeacon so it doesn't block navigation.
// Call initWebVitals() once from index.tsx after the app mounts.

type VitalName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';
type Rating    = 'good' | 'needs-improvement' | 'poor';

interface VitalPayload {
  name:   VitalName;
  value:  number;
  id:     string;
  rating: Rating;
}

const ENDPOINT = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'}/analytics/vitals`;

const THRESHOLDS: Record<VitalName, [number, number]> = {
  CLS:  [0.1,   0.25],
  FID:  [100,   300],
  LCP:  [2500,  4000],
  FCP:  [1800,  3000],
  TTFB: [800,   1800],
  INP:  [200,   500],
};

const rate = (name: VitalName, value: number): Rating => {
  const [good, poor] = THRESHOLDS[name];
  return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor';
};

const beacon = (name: VitalName, value: number): void => {
  const payload: VitalPayload = {
    name,
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    id:     crypto.randomUUID(),
    rating: rate(name, value),
  };
  try {
    // Blob forces Content-Type: application/json so Fastify can parse the body
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(ENDPOINT, blob);
  } catch { /* sendBeacon not available */ }
};

export const initWebVitals = (): void => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    // LCP — only the last (most accurate) entry, sent on page hide
    let lcpValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries() as (PerformanceEntry & { startTime: number })[];
      const last = entries[entries.length - 1];
      if (last) lcpValue = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS — accumulate but only send once on page hide
    let clsTotal = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) {
        if (!entry.hadRecentInput) clsTotal += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });

    // FCP — fires once
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') beacon('FCP', entry.startTime);
      }
    }).observe({ type: 'paint', buffered: true });

    // INP — track worst interaction, send on page hide
    let inpWorst = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { duration: number })[]) {
        if (entry.duration > inpWorst) inpWorst = entry.duration;
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);

    // TTFB — fires once from navigation timing
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      beacon('TTFB', navEntry.responseStart - navEntry.requestStart);
    }

    // Send accumulated metrics on page unload (once per session)
    const sendFinal = () => {
      if (lcpValue > 0) beacon('LCP', lcpValue);
      if (clsTotal > 0) beacon('CLS', clsTotal);
      if (inpWorst > 0) beacon('INP', inpWorst);
    };
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendFinal();
    }, { once: true });
    addEventListener('pagehide', sendFinal, { once: true });
  } catch { /* PerformanceObserver not supported — skip silently */ }
};
