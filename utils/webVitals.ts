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

const ENDPOINT = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/analytics/vitals`;

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
    navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
  } catch { /* sendBeacon not available */ }
};

export const initWebVitals = (): void => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    // LCP — largest contentful paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries() as (PerformanceEntry & { startTime: number })[];
      const last = entries[entries.length - 1];
      if (last) beacon('LCP', last.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS — cumulative layout shift (accumulate across session)
    let clsTotal = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) {
        if (!entry.hadRecentInput) clsTotal += entry.value;
      }
      beacon('CLS', clsTotal);
    }).observe({ type: 'layout-shift', buffered: true });

    // FCP — first contentful paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') beacon('FCP', entry.startTime);
      }
    }).observe({ type: 'paint', buffered: true });

    // INP — interaction to next paint (modern replacement for FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { duration: number })[]) {
        beacon('INP', entry.duration);
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);

    // TTFB — time to first byte from navigation timing
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      beacon('TTFB', navEntry.responseStart - navEntry.requestStart);
    }
  } catch { /* PerformanceObserver not supported — skip silently */ }
};
