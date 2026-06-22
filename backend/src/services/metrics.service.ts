// Lightweight in-process metrics — Prometheus text format on /metrics
// For production, wire to a real Prometheus + Grafana stack.

const counters = new Map<string, number>();
const gauges   = new Map<string, number>();
const histData = new Map<string, number[]>();

export const incCounter = (name: string, by = 1): void => {
  counters.set(name, (counters.get(name) ?? 0) + by);
};

export const setGauge = (name: string, value: number): void => {
  gauges.set(name, value);
};

export const observeHistogram = (name: string, value: number): void => {
  if (!histData.has(name)) histData.set(name, []);
  histData.get(name)!.push(value);
};

const quantile = (sorted: number[], q: number): number => {
  const idx = Math.floor(sorted.length * q);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
};

export const toPrometheusText = (): string => {
  const lines: string[] = [
    `# TraVirt metrics — generated ${new Date().toISOString()}`,
    '',
  ];

  counters.forEach((value, name) => {
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${value}`);
  });

  gauges.forEach((value, name) => {
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  });

  histData.forEach((values, name) => {
    const sorted = [...values].sort((a, b) => a - b);
    const sum    = sorted.reduce((a, b) => a + b, 0);
    lines.push(`# TYPE ${name} summary`);
    lines.push(`${name}{quantile="0.5"}  ${quantile(sorted, 0.5)}`);
    lines.push(`${name}{quantile="0.95"} ${quantile(sorted, 0.95)}`);
    lines.push(`${name}{quantile="0.99"} ${quantile(sorted, 0.99)}`);
    lines.push(`${name}_sum   ${sum}`);
    lines.push(`${name}_count ${sorted.length}`);
  });

  return lines.join('\n') + '\n';
};

// Convenience: track HTTP requests from app.ts hooks
export const recordRequest = (method: string, routePath: string, statusCode: number, durationMs: number): void => {
  incCounter('http_requests_total');
  incCounter(`http_requests_${statusCode >= 400 ? 'error' : 'success'}_total`);
  observeHistogram('http_request_duration_ms', durationMs);
};
