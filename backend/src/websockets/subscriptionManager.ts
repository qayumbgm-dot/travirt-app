import WebSocket from 'ws';
import { setGauge } from '../services/metrics.service';

class SubscriptionManager {
  // socket → set of symbol keys the client has subscribed to ("NSE:RELIANCE")
  private readonly socketSymbols = new Map<WebSocket, Set<string>>();
  // symbol key → set of sockets that want that symbol
  private readonly symbolSockets = new Map<string, Set<WebSocket>>();

  add(socket: WebSocket, symbols: string[]): void {
    if (!this.socketSymbols.has(socket)) {
      this.socketSymbols.set(socket, new Set());
    }
    const owned = this.socketSymbols.get(socket)!;
    for (const key of symbols) {
      owned.add(key);
      if (!this.symbolSockets.has(key)) this.symbolSockets.set(key, new Set());
      this.symbolSockets.get(key)!.add(socket);
    }
    this.flushMetrics();
  }

  remove(socket: WebSocket, symbols: string[]): void {
    const owned = this.socketSymbols.get(socket);
    if (!owned) return;
    for (const key of symbols) {
      owned.delete(key);
      const bucket = this.symbolSockets.get(key);
      bucket?.delete(socket);
      if (bucket?.size === 0) this.symbolSockets.delete(key);
    }
    this.flushMetrics();
  }

  cleanup(socket: WebSocket): void {
    const owned = this.socketSymbols.get(socket);
    if (owned) {
      for (const key of owned) {
        const bucket = this.symbolSockets.get(key);
        bucket?.delete(socket);
        if (bucket?.size === 0) this.symbolSockets.delete(key);
      }
    }
    this.socketSymbols.delete(socket);
    this.flushMetrics();
  }

  /** All sockets that have explicitly subscribed to this symbol key. */
  getSubscribersForSymbol(symbolKey: string): Set<WebSocket> {
    return this.symbolSockets.get(symbolKey) ?? new Set();
  }

  /**
   * A socket in wildcard mode (no subscriptions yet) receives every tick.
   * Once the client sends its first subscribe message it leaves wildcard mode
   * and only receives ticks for its subscribed symbols.
   */
  isWildcard(socket: WebSocket): boolean {
    const owned = this.socketSymbols.get(socket);
    return !owned || owned.size === 0;
  }

  getStats(): { connections: number; uniqueSymbols: number; topSymbols: Record<string, number> } {
    const topSymbols: Record<string, number> = {};
    this.symbolSockets.forEach((sockets, sym) => { topSymbols[sym] = sockets.size; });
    return {
      connections:   this.socketSymbols.size,
      uniqueSymbols: this.symbolSockets.size,
      topSymbols,
    };
  }

  private flushMetrics(): void {
    setGauge('market_ws_connections',    this.socketSymbols.size);
    setGauge('market_subscribed_symbols', this.symbolSockets.size);
  }
}

export const subscriptionManager = new SubscriptionManager();
