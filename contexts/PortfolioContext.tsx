
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { PortfolioState, Order, TransactionType, OrderType, OrderVariety, Stock, Transaction, GTTOrder, GTTStatus, GTTTriggerType, Alert, AlertOperator, AlertStatus, MarketStatus, Breach } from '../types';
import { useMarketData } from '../hooks/useMarketData';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_INR_BALANCE, INITIAL_NXO_BALANCE, INITIAL_VIRTUAL_BALANCE, RISK_CONFIG } from '../constants';
import { portfolioApi, ApiPortfolio } from '../apiClient/portfolio.api';
import { tradeApi } from '../apiClient/trade.api';
import { fundsApi } from '../apiClient/funds.api';
import { useToast } from './ToastContext';

export interface RiskEngine {
    dailyLossConsumedPct:   number;
    maxDrawdownConsumedPct: number;
    dailyLossState:   'safe' | 'warning' | 'breached';
    maxDrawdownState: 'safe' | 'warning' | 'breached';
    peakAccountValue: number;
    dailyLoss:        number;
    dailyLossLimit:   number;
    drawdownAmount:   number;
}

interface PortfolioContextType {
    portfolio: PortfolioState;
    riskEngine: RiskEngine;
    executeTrade: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => boolean;
    executeBracketOrder: (mainOrder: Omit<Order, 'id' | 'timestamp' | 'status'>, stopLossPrice: number, takeProfitPrice: number) => boolean;
    createGTT: (gttData: Omit<GTTOrder, 'id' | 'createdAt' | 'expiresAt' | 'status'>) => void;
    deleteGTT: (gttId: string) => void;
    createAlert: (alertData: Omit<Alert, 'id' | 'createdAt' | 'expiresAt' | 'status'>) => void;
    deleteAlert: (alertId: string) => void;
    getStock: (symbol: string, exchange?: string) => Stock | undefined;
    marketData: Stock[];
    marketStatus: MarketStatus;
    loading: boolean;
    sessionPnl: number;
    equityHistory: { time: number; value: number }[];
    breaches: Breach[];
    consistencyScore: number;
    addInstruments: (stocks: Stock[]) => void;
    addInr: (amount: number) => void;
    buyNfino: (inrAmount: number) => boolean;
    convertNfinoToVirtual: (nxoAmount: number) => boolean;
    claimDailyBonus: () => boolean;
    addReward: (amount: number, description: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// ─── Session tracking helpers ─────────────────────────────────────────────────
const SESSION_DATE_KEY    = 'travirt_session_date';
const SESSION_BALANCE_KEY = 'travirt_session_balance';
const getTodayKey = () => new Date().toISOString().slice(0, 10);

// ─── DB row → frontend type mappers ──────────────────────────────────────────

const mapApiPortfolio = (api: ApiPortfolio): Partial<PortfolioState> => ({
    inrBalance: Number(api.balances.inr_balance),
    nxoBalance: Number(api.balances.nxo_balance),
    virtualBalance: Number(api.balances.virtual_balance),
    dailyBonusClaimed: api.balances.daily_bonus_claimed,
    totalInvested: api.totalInvested,
    positions: api.positions.map((p) => ({
        symbol: p.symbol,
        exchange: p.exchange,
        quantity: p.quantity,
        avgPrice: Number(p.avg_price),
        ltp: 0,
        pnl: 0,
        currentValue: 0,
        investedValue: p.quantity * Number(p.avg_price),
    })),
    orderHistory: api.orders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        exchange: o.exchange,
        quantity: o.quantity,
        price: Number(o.price ?? 0),
        orderType: o.order_type as OrderType,
        transactionType: o.transaction_type as TransactionType,
        variety: o.variety as OrderVariety | undefined,
        status: o.status as Order['status'],
        validity: o.validity as Order['validity'],
        stopLoss: o.stop_loss ? Number(o.stop_loss) : undefined,
        takeProfit: o.take_profit ? Number(o.take_profit) : undefined,
        triggerPrice: o.trigger_price ? Number(o.trigger_price) : undefined,
        timestamp: new Date(o.executed_at).getTime(),
    })),
    transactionHistory: api.transactions.map((t) => ({
        id: t.id,
        type: t.type as Transaction['type'],
        description: t.description,
        amount: t.amount,
        timestamp: new Date(t.created_at).getTime(),
    })),
    gttOrders: api.gttOrders.map((g) => ({
        id: g.id,
        symbol: g.symbol,
        exchange: g.exchange ?? undefined,
        transactionType: g.transaction_type as TransactionType,
        triggerType: g.trigger_type as GTTTriggerType,
        quantity: g.quantity,
        status: g.status as GTTStatus,
        triggerPrice: g.trigger_price ? Number(g.trigger_price) : undefined,
        limitPrice: g.limit_price ? Number(g.limit_price) : undefined,
        stoplossTriggerPrice: g.stoploss_trigger_price ? Number(g.stoploss_trigger_price) : undefined,
        stoplossLimitPrice: g.stoploss_limit_price ? Number(g.stoploss_limit_price) : undefined,
        targetTriggerPrice: g.target_trigger_price ? Number(g.target_trigger_price) : undefined,
        targetLimitPrice: g.target_limit_price ? Number(g.target_limit_price) : undefined,
        createdAt: new Date(g.created_at).getTime(),
        expiresAt: new Date(g.expires_at).getTime(),
    })),
    alerts: api.alerts.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        exchange: a.exchange ?? undefined,
        property: a.property as Alert['property'],
        operator: a.operator as Alert['operator'],
        value: Number(a.value),
        type: a.type as Alert['type'],
        status: a.status as AlertStatus,
        createdAt: new Date(a.created_at).getTime(),
        expiresAt: new Date(a.expires_at).getTime(),
    })),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const PortfolioProvider: React.FC<{ children: ReactNode; setShowRefillPrompt: (show: boolean) => void }> = ({ children, setShowRefillPrompt }) => {
    const { marketData, loading: marketLoading, marketStatus, addInstruments } = useMarketData();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const apiAvailable   = useRef(true);
    const warnedDailyRef    = useRef(false);
    const warnedDrawdownRef = useRef(false);
    const sessionInitializedRef = useRef(false);
    const alertsRef = useRef<Alert[]>([]);
    const [equityHistory, setEquityHistory] = useState<{ time: number; value: number }[]>([]);
    const [breaches, setBreaches] = useState<Breach[]>([]);
    const prevDailyBreachRef = useRef(false);
    const prevDrawdownBreachRef = useRef(false);

    const [sessionStartBalance, setSessionStartBalance] = useState<number>(() => {
        const today = getTodayKey();
        const storedDate = localStorage.getItem(SESSION_DATE_KEY);
        if (storedDate !== today) return 0;
        const stored = parseFloat(localStorage.getItem(SESSION_BALANCE_KEY) ?? '0');
        return isNaN(stored) ? 0 : stored;
    });

    const PEAK_KEY = 'travirt_peak_account_value';
    const [peakAccountValue, setPeakAccountValue] = useState<number>(() => {
        const stored = parseFloat(localStorage.getItem('travirt_peak_account_value') ?? '0');
        return isNaN(stored) ? 0 : stored;
    });

    const [portfolio, setPortfolio] = useState<PortfolioState>({
        inrBalance: INITIAL_INR_BALANCE,
        nxoBalance: INITIAL_NXO_BALANCE,
        virtualBalance: INITIAL_VIRTUAL_BALANCE,
        positions: [],
        orderHistory: [],
        transactionHistory: [],
        gttOrders: [],
        alerts: [],
        totalInvested: 0,
        totalCurrentValue: 0,
        totalPnl: 0,
        todayPnl: 0,
        marginUsed: 0,
        dailyBonusClaimed: false,
    });

    // ── Load from API on mount ────────────────────────────────────────────────
    useEffect(() => {
        portfolioApi.getAll()
            .then((data) => {
                setPortfolio((prev) => ({ ...prev, ...mapApiPortfolio(data) }));
                apiAvailable.current = true;
            })
            .catch(() => {
                // Backend not running — fall through with defaults (demo mode)
                apiAvailable.current = false;
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Refetch helper ────────────────────────────────────────────────────────
    const refetchPortfolio = useCallback(async () => {
        try {
            const data = await portfolioApi.getAll();
            setPortfolio((prev) => ({ ...prev, ...mapApiPortfolio(data) }));
        } catch {
            // ignore
        }
    }, []);

    const getStock = useCallback((symbol: string, exchange?: string) => {
        if (exchange) return marketData.find((s) => s.symbol === symbol && s.exchange === exchange);
        return marketData.find((s) => s.symbol === symbol);
    }, [marketData]);

    // ── Live P&L — event-driven, fires on every market tick instead of polling ──
    // Replacing the former 1-second setInterval: this only re-renders when market
    // data actually changes, not on a fixed clock regardless of data activity.
    useEffect(() => {
        if (marketData.length === 0) return;
        setPortfolio((prev) => {
            if (prev.positions.length === 0) return prev;

            let totalInvested = 0;
            let totalCurrentValue = 0;

            const updatedPositions = prev.positions.map((pos) => {
                const stock = getStock(pos.symbol, pos.exchange);
                if (stock) {
                    const currentValue  = pos.quantity * stock.ltp;
                    const investedValue = pos.quantity * pos.avgPrice;
                    totalInvested      += investedValue;
                    totalCurrentValue  += currentValue;
                    return { ...pos, ltp: stock.ltp, pnl: currentValue - investedValue, currentValue, investedValue };
                }
                return pos;
            });

            const totalPnl = totalCurrentValue - totalInvested;
            const todayPnl = updatedPositions.reduce((acc, pos) => {
                const stock = getStock(pos.symbol, pos.exchange);
                return acc + (stock ? (stock.ltp - stock.prevClose) * pos.quantity : 0);
            }, 0);

            return { ...prev, positions: updatedPositions, totalInvested, totalCurrentValue, totalPnl, todayPnl, marginUsed: totalInvested };
        });
    }, [marketData, getStock]);

    // ── Risk engine ───────────────────────────────────────────────────────────
    const riskEngine = useMemo((): RiskEngine => {
        const accountSize    = portfolio.virtualBalance + portfolio.totalInvested;
        const accountValue   = portfolio.virtualBalance + portfolio.totalCurrentValue;
        const dailyLossLimit = accountSize * RISK_CONFIG.dailyLossLimitPct;
        const dailyLoss      = Math.max(0, -portfolio.todayPnl);
        const drawdownAmount = Math.max(0, peakAccountValue - accountValue);

        const dailyLossConsumedPct   = dailyLossLimit > 0 ? dailyLoss / dailyLossLimit : 0;
        const maxDrawdownConsumedPct = peakAccountValue > 0
            ? drawdownAmount / (peakAccountValue * RISK_CONFIG.maxDrawdownPct)
            : 0;

        const toState = (pct: number): 'safe' | 'warning' | 'breached' =>
            pct >= 1 ? 'breached' : pct >= RISK_CONFIG.warningThresholdPct ? 'warning' : 'safe';

        return {
            dailyLossConsumedPct,
            maxDrawdownConsumedPct,
            dailyLossState:   accountSize > 0     ? toState(dailyLossConsumedPct)   : 'safe',
            maxDrawdownState: peakAccountValue > 0 ? toState(maxDrawdownConsumedPct) : 'safe',
            peakAccountValue,
            dailyLoss,
            dailyLossLimit,
            drawdownAmount,
        };
    }, [portfolio.virtualBalance, portfolio.totalInvested, portfolio.totalCurrentValue, portfolio.todayPnl, peakAccountValue]);

    // Update high-water mark whenever account value reaches a new high
    useEffect(() => {
        const accountValue = portfolio.virtualBalance + portfolio.totalCurrentValue;
        if (accountValue > peakAccountValue) {
            setPeakAccountValue(accountValue);
            localStorage.setItem(PEAK_KEY, accountValue.toString());
        }
    }, [portfolio.virtualBalance, portfolio.totalCurrentValue, peakAccountValue]);

    // Fire warning toasts exactly once when crossing 80% threshold
    useEffect(() => {
        const { dailyLossConsumedPct, maxDrawdownConsumedPct, dailyLossState, maxDrawdownState } = riskEngine;

        if (dailyLossConsumedPct >= RISK_CONFIG.warningThresholdPct && dailyLossState !== 'breached' && !warnedDailyRef.current) {
            warnedDailyRef.current = true;
            showToast('Daily loss limit at 80% — trade with caution.', 'warning');
        } else if (dailyLossConsumedPct < RISK_CONFIG.warningThresholdPct) {
            warnedDailyRef.current = false;
        }

        if (maxDrawdownConsumedPct >= RISK_CONFIG.warningThresholdPct && maxDrawdownState !== 'breached' && !warnedDrawdownRef.current) {
            warnedDrawdownRef.current = true;
            showToast('Max drawdown at 80% — critical risk level.', 'warning');
        } else if (maxDrawdownConsumedPct < RISK_CONFIG.warningThresholdPct) {
            warnedDrawdownRef.current = false;
        }
    }, [riskEngine, showToast]);

    // ── Consistency score (equity spread across trading days) ─────────────────
    const consistencyScore = useMemo((): number => {
        if (equityHistory.length < 2) return 0;
        const totalPnl = equityHistory[equityHistory.length - 1].value - equityHistory[0].value;
        if (totalPnl <= 0) return 0;
        const byDay: Record<string, { start: number; end: number }> = {};
        for (const pt of equityHistory) {
            const day = new Date(pt.time).toISOString().slice(0, 10);
            if (!byDay[day]) byDay[day] = { start: pt.value, end: pt.value };
            byDay[day].end = pt.value;
        }
        const days = Object.values(byDay);
        if (days.length < 2) return 0;
        const maxDayPnl = Math.max(...days.map(d => Math.max(0, d.end - d.start)));
        if (maxDayPnl === 0) return 100;
        return Math.max(0, Math.min(100, 100 * (1 - maxDayPnl / totalPnl)));
    }, [equityHistory]);

    // ── Hard-breach logging for risk rule violations ──────────────────────────
    useEffect(() => {
        const isDailyBreach = riskEngine.dailyLossState === 'breached';
        if (isDailyBreach && !prevDailyBreachRef.current) {
            setBreaches(prev => [...prev, {
                id: `breach_${Date.now()}_daily`,
                rule: 'Daily Loss Breach',
                description: `Daily loss limit of ${(RISK_CONFIG.dailyLossLimitPct * 100).toFixed(0)}% breached — ₹${riskEngine.dailyLoss.toLocaleString('en-IN')} lost today`,
                timestamp: Date.now(),
                severity: 'hard_block',
            }]);
        }
        prevDailyBreachRef.current = isDailyBreach;

        const isDrawdownBreach = riskEngine.maxDrawdownState === 'breached';
        if (isDrawdownBreach && !prevDrawdownBreachRef.current) {
            setBreaches(prev => [...prev, {
                id: `breach_${Date.now()}_drawdown`,
                rule: 'Max Drawdown Breach',
                description: `Max drawdown of ${(RISK_CONFIG.maxDrawdownPct * 100).toFixed(0)}% breached — ₹${riskEngine.drawdownAmount.toLocaleString('en-IN')} from peak`,
                timestamp: Date.now(),
                severity: 'hard_block',
            }]);
        }
        prevDrawdownBreachRef.current = isDrawdownBreach;
    }, [riskEngine.dailyLossState, riskEngine.maxDrawdownState, riskEngine.dailyLoss, riskEngine.drawdownAmount]);

    // ── Session start-balance initialisation (once per day, after data loads) ──
    useEffect(() => {
        if (loading || marketLoading || sessionInitializedRef.current) return;
        // Wait for positions to be marked to market before snapshotting
        if (portfolio.positions.length > 0 && portfolio.totalCurrentValue === 0) return;

        const today = getTodayKey();
        const storedDate  = localStorage.getItem(SESSION_DATE_KEY);
        const storedBal   = parseFloat(localStorage.getItem(SESSION_BALANCE_KEY) ?? '0');

        if (storedDate === today && !isNaN(storedBal) && storedBal > 0) {
            setSessionStartBalance(storedBal);
        } else {
            const snap = portfolio.virtualBalance + portfolio.totalCurrentValue;
            localStorage.setItem(SESSION_DATE_KEY,    today);
            localStorage.setItem(SESSION_BALANCE_KEY, snap.toString());
            setSessionStartBalance(snap);
        }
        sessionInitializedRef.current = true;
        // Seed the equity curve with the session-start value
        const snap = portfolio.virtualBalance + portfolio.totalCurrentValue;
        setEquityHistory([{ time: Date.now(), value: snap }]);
    }, [loading, marketLoading, portfolio.positions.length, portfolio.virtualBalance, portfolio.totalCurrentValue]);

    // ── Alert evaluation — fires on every market-data tick ───────────────────
    useEffect(() => {
        if (marketData.length === 0) return;
        const active = alertsRef.current.filter(a => a.status === AlertStatus.ACTIVE);
        if (active.length === 0) return;

        const triggered: Alert[] = [];
        for (const alert of active) {
            const stock = marketData.find(s =>
                s.symbol === alert.symbol && (!alert.exchange || s.exchange === alert.exchange)
            );
            if (!stock) continue;
            const ltp = stock.ltp;
            const met = alert.operator === AlertOperator.GTE ? ltp >= alert.value
                      : alert.operator === AlertOperator.LTE ? ltp <= alert.value
                      : alert.operator === AlertOperator.GT  ? ltp >  alert.value
                      : alert.operator === AlertOperator.LT  ? ltp <  alert.value
                      : alert.operator === AlertOperator.EQ  ? ltp === alert.value
                      : false;
            if (met) triggered.push(alert);
        }
        if (triggered.length === 0) return;

        const ids = new Set(triggered.map(a => a.id));
        setPortfolio(prev => ({
            ...prev,
            alerts: prev.alerts.map(a => ids.has(a.id) ? { ...a, status: AlertStatus.TRIGGERED } : a),
        }));
        triggered.forEach(alert => {
            const dir = alert.operator === AlertOperator.GTE || alert.operator === AlertOperator.GT ? '≥' : '≤';
            showToast(`Alert: ${alert.symbol} ${dir} ₹${alert.value.toLocaleString('en-IN')} triggered`, 'info');
        });
    }, [marketData, showToast]);

    // ── Trade execution ───────────────────────────────────────────────────────
    const executeTrade = useCallback((order: Omit<Order, 'id' | 'timestamp' | 'status'>): boolean => {
        const stock = getStock(order.symbol, order.exchange);
        if (!stock) return false;

        // Risk guards — check before any other validation
        if (riskEngine.maxDrawdownState === 'breached') {
            showToast('Max drawdown breached — all trading is halted.', 'error');
            return false;
        }
        if (order.transactionType === TransactionType.BUY && riskEngine.dailyLossState === 'breached') {
            showToast('Daily loss limit reached — new positions blocked until tomorrow.', 'error');
            return false;
        }

        const price = order.orderType === OrderType.LIMIT && order.price ? order.price : stock.ltp;
        const tradeValue = order.quantity * price;

        if (order.transactionType === TransactionType.BUY) {
            if (portfolio.virtualBalance < tradeValue) {
                setShowRefillPrompt(true);
                return false;
            }
        } else {
            const existingPosition = portfolio.positions.find((p) => p.symbol === order.symbol && p.exchange === stock.exchange);
            if (!existingPosition || existingPosition.quantity < order.quantity) return false;
        }

        // Rule violation detection (informational — trade still executes)
        const todayStr = getTodayKey();
        const todayExec = portfolio.orderHistory.filter(
            o => o.status === 'EXECUTED' && new Date(o.timestamp).toISOString().slice(0, 10) === todayStr
        );
        const detected: Breach[] = [];

        if (todayExec.length >= 20) {
            detected.push({
                id: `breach_${Date.now()}_ot`,
                rule: 'Overtrading',
                description: `${todayExec.length + 1} orders placed today (prop firm limit: 20)`,
                timestamp: Date.now(),
                severity: 'warning',
            });
        }

        if (order.transactionType === TransactionType.BUY) {
            const existing = portfolio.positions.find(p => p.symbol === order.symbol && p.exchange === stock.exchange);
            if (existing) {
                const todayBuys = todayExec.filter(o => o.symbol === order.symbol && o.transactionType === TransactionType.BUY);
                if (todayBuys.length >= 1) {
                    detected.push({
                        id: `breach_${Date.now()}_stack`,
                        rule: 'Position Stacking',
                        description: `Adding to ${order.symbol} — ${todayBuys.length + 1}× buy on existing position in one day`,
                        timestamp: Date.now(),
                        severity: 'warning',
                    });
                }
                if (order.quantity >= existing.quantity) {
                    detected.push({
                        id: `breach_${Date.now()}_mg`,
                        rule: 'Martingale Pattern',
                        description: `New buy qty (${order.quantity}) ≥ existing position qty (${existing.quantity}) in ${order.symbol}`,
                        timestamp: Date.now(),
                        severity: 'warning',
                    });
                }
            }
            if (order.orderType === OrderType.MARKET) {
                const hasStop = portfolio.gttOrders.some(g =>
                    g.symbol === order.symbol && g.status === GTTStatus.ACTIVE && g.transactionType === TransactionType.SELL
                );
                if (!hasStop) {
                    detected.push({
                        id: `breach_${Date.now()}_sl`,
                        rule: 'No Stop Loss',
                        description: `Market BUY on ${order.symbol} placed without a GTT stop-loss`,
                        timestamp: Date.now(),
                        severity: 'info',
                    });
                }
            }
        }

        if (detected.length > 0) {
            setBreaches(prev => [...prev, ...detected]);
            if (detected.some(b => b.severity === 'warning')) {
                showToast('Rule violation logged — check Orders → Violations', 'warning');
            }
        }

        // Record equity snapshot before the trade alters balances
        setEquityHistory(prev => [
            ...prev,
            { time: Date.now(), value: portfolio.virtualBalance + portfolio.totalCurrentValue },
        ]);

        // Optimistic local update
        const optimisticId = `ord_${Date.now()}`;
        setPortfolio((prev) => {
            const newPortfolio = { ...prev };
            let positions = [...newPortfolio.positions];
            const existingIndex = positions.findIndex((p) => p.symbol === order.symbol && p.exchange === stock.exchange);

            if (order.transactionType === TransactionType.BUY) {
                newPortfolio.virtualBalance -= tradeValue;
                if (existingIndex > -1) {
                    const ep = positions[existingIndex];
                    const totalQty = ep.quantity + order.quantity;
                    positions[existingIndex] = { ...ep, quantity: totalQty, avgPrice: (ep.avgPrice * ep.quantity + tradeValue) / totalQty };
                } else {
                    positions.push({ symbol: order.symbol, exchange: stock.exchange, quantity: order.quantity, avgPrice: price, ltp: stock.ltp, pnl: 0, investedValue: tradeValue, currentValue: tradeValue });
                }
            } else {
                newPortfolio.virtualBalance += tradeValue;
                if (positions[existingIndex].quantity === order.quantity) {
                    positions.splice(existingIndex, 1);
                } else {
                    positions[existingIndex] = { ...positions[existingIndex], quantity: positions[existingIndex].quantity - order.quantity };
                }
            }

            const executedOrder: Order = {
                ...order, exchange: stock.exchange, id: optimisticId,
                timestamp: Date.now(), status: 'EXECUTED', price,
            };
            newPortfolio.positions = positions;
            newPortfolio.orderHistory = [executedOrder, ...newPortfolio.orderHistory];
            return newPortfolio;
        });

        // Background API sync
        if (apiAvailable.current) {
            tradeApi.placeOrder({
                symbol: order.symbol,
                exchange: stock.exchange,
                quantity: order.quantity,
                price,
                orderType: order.orderType as 'MARKET' | 'LIMIT' | 'SL' | 'SLM',
                transactionType: order.transactionType as 'BUY' | 'SELL',
                variety: order.variety,
                validity: order.validity,
                stopLoss: order.stopLoss,
                takeProfit: order.takeProfit,
                triggerPrice: order.triggerPrice,
            }).then((result) => {
                // Patch optimistic order with real server ID
                setPortfolio((prev) => ({
                    ...prev,
                    virtualBalance: result.newBalance,
                    orderHistory: prev.orderHistory.map((o) =>
                        o.id === optimisticId ? { ...o, id: result.order.id } : o
                    ),
                }));
            }).catch(() => {
                showToast('Trade sync failed — refreshing portfolio.', 'error');
                refetchPortfolio();
            });
        }

        return true;
    }, [getStock, portfolio.virtualBalance, portfolio.positions, portfolio.orderHistory, portfolio.gttOrders, riskEngine, setShowRefillPrompt, refetchPortfolio, showToast]);

    const executeBracketOrder = useCallback((
        mainOrder: Omit<Order, 'id' | 'timestamp' | 'status'>,
        _stopLossPrice: number,
        _takeProfitPrice: number,
    ): boolean => executeTrade(mainOrder), [executeTrade]);

    // ── GTT ───────────────────────────────────────────────────────────────────
    const createGTT = useCallback((gttData: Omit<GTTOrder, 'id' | 'createdAt' | 'expiresAt' | 'status'>) => {
        const optimisticId = `gtt_${Date.now()}`;
        const newGTT: GTTOrder = {
            ...gttData, id: optimisticId,
            createdAt: Date.now(), expiresAt: Date.now() + 31536000000, status: GTTStatus.ACTIVE,
        };
        setPortfolio((p) => ({ ...p, gttOrders: [newGTT, ...p.gttOrders] }));

        if (apiAvailable.current) {
            portfolioApi.createGttOrder({
                symbol: gttData.symbol,
                exchange: gttData.exchange ?? null,
                transaction_type: gttData.transactionType,
                trigger_type: gttData.triggerType,
                quantity: gttData.quantity,
                trigger_price: gttData.triggerPrice ?? null,
                limit_price: gttData.limitPrice ?? null,
                stoploss_trigger_price: gttData.stoplossTriggerPrice ?? null,
                stoploss_limit_price: gttData.stoplossLimitPrice ?? null,
                target_trigger_price: gttData.targetTriggerPrice ?? null,
                target_limit_price: gttData.targetLimitPrice ?? null,
            }).then((saved) => {
                setPortfolio((p) => ({
                    ...p,
                    gttOrders: p.gttOrders.map((g) => g.id === optimisticId ? { ...g, id: saved.id } : g),
                }));
            }).catch(() => { /* silently keep local */ });
        }
    }, []);

    const deleteGTT = useCallback((gttId: string) => {
        setPortfolio((p) => ({ ...p, gttOrders: p.gttOrders.filter((g) => g.id !== gttId) }));
        if (apiAvailable.current) {
            portfolioApi.deleteGttOrder(gttId).catch(() => { /* already removed locally */ });
        }
    }, []);

    // ── Alerts ────────────────────────────────────────────────────────────────
    const createAlert = useCallback((alertData: Omit<Alert, 'id' | 'createdAt' | 'expiresAt' | 'status'>) => {
        const optimisticId = `alert_${Date.now()}`;
        const newAlert: Alert = {
            ...alertData, id: optimisticId,
            createdAt: Date.now(), expiresAt: Date.now() + 31536000000, status: AlertStatus.ACTIVE,
        };
        setPortfolio((p) => ({ ...p, alerts: [newAlert, ...p.alerts] }));

        if (apiAvailable.current) {
            portfolioApi.createAlert({
                symbol: alertData.symbol,
                exchange: alertData.exchange ?? null,
                property: alertData.property,
                operator: alertData.operator,
                value: alertData.value,
                type: alertData.type,
            }).then((saved) => {
                setPortfolio((p) => ({
                    ...p,
                    alerts: p.alerts.map((a) => a.id === optimisticId ? { ...a, id: saved.id } : a),
                }));
            }).catch(() => { /* silently keep local */ });
        }
    }, []);

    const deleteAlert = useCallback((alertId: string) => {
        setPortfolio((p) => ({ ...p, alerts: p.alerts.filter((a) => a.id !== alertId) }));
        if (apiAvailable.current) {
            portfolioApi.deleteAlert(alertId).catch(() => { /* already removed locally */ });
        }
    }, []);

    // ── Wallet ────────────────────────────────────────────────────────────────
    const addInr = useCallback((amount: number) => {
        if (amount <= 0) return;
        setPortfolio((p) => ({
            ...p, inrBalance: p.inrBalance + amount,
            transactionHistory: [
                { id: `txn_${Date.now()}`, type: 'DEPOSIT_INR', description: 'Added funds to wallet', amount: `+ ${formatCurrency(amount)}`, timestamp: Date.now() },
                ...p.transactionHistory,
            ],
        }));
        if (apiAvailable.current) {
            fundsApi.addInr(amount)
                .then((res) => setPortfolio((p) => ({ ...p, inrBalance: res.inrBalance })))
                .catch(() => { /* keep optimistic */ });
        }
    }, []);

    const buyNfino = useCallback((inrAmount: number): boolean => {
        if (inrAmount <= 0 || portfolio.inrBalance < inrAmount) return false;
        setPortfolio((p) => ({
            ...p, inrBalance: p.inrBalance - inrAmount, nxoBalance: p.nxoBalance + inrAmount,
            transactionHistory: [
                { id: `txn_${Date.now()}`, type: 'BUY_NXO', description: `Purchased ${inrAmount} NXO`, amount: `- ${formatCurrency(inrAmount)}`, timestamp: Date.now() },
                ...p.transactionHistory,
            ],
        }));
        if (apiAvailable.current) {
            fundsApi.buyNxo(inrAmount)
                .then((res) => setPortfolio((p) => ({ ...p, inrBalance: res.inr_balance, nxoBalance: res.nxo_balance })))
                .catch(() => { /* keep optimistic */ });
        }
        return true;
    }, [portfolio.inrBalance]);

    const convertNfinoToVirtual = useCallback((nxoAmount: number): boolean => {
        if (nxoAmount <= 0 || portfolio.nxoBalance < nxoAmount) return false;
        const virtualGain = nxoAmount * 1000;
        setPortfolio((p) => ({
            ...p, nxoBalance: p.nxoBalance - nxoAmount, virtualBalance: p.virtualBalance + virtualGain,
            transactionHistory: [
                { id: `txn_${Date.now()}`, type: 'CONVERT_NXO', description: `Converted ${nxoAmount} NXO`, amount: `+ ${formatCurrency(virtualGain)} Virtual`, timestamp: Date.now() },
                ...p.transactionHistory,
            ],
        }));
        if (apiAvailable.current) {
            fundsApi.convertNxoToVirtual(nxoAmount)
                .then((res) => setPortfolio((p) => ({ ...p, nxoBalance: res.nxo_balance, virtualBalance: res.virtual_balance })))
                .catch(() => { /* keep optimistic */ });
        }
        return true;
    }, [portfolio.nxoBalance]);

    const claimDailyBonus = useCallback((): boolean => {
        if (portfolio.dailyBonusClaimed) return false;
        const BONUS = 10;
        setPortfolio((p) => ({
            ...p, nxoBalance: p.nxoBalance + BONUS, dailyBonusClaimed: true,
            transactionHistory: [
                { id: `txn_${Date.now()}`, type: 'REWARD_NXO', description: 'Daily Login Bonus', amount: `+ ${BONUS} NXO`, timestamp: Date.now() },
                ...p.transactionHistory,
            ],
        }));
        if (apiAvailable.current) {
            portfolioApi.claimDailyBonus().catch(() => { /* already applied locally */ });
        }
        return true;
    }, [portfolio.dailyBonusClaimed]);

    const addReward = useCallback((amount: number, description: string) => {
        setPortfolio((p) => ({
            ...p, nxoBalance: p.nxoBalance + amount,
            transactionHistory: [
                { id: `txn_${Date.now()}`, type: 'REWARD_NXO', description, amount: `+ ${amount} NXO`, timestamp: Date.now() },
                ...p.transactionHistory,
            ],
        }));
    }, []);

    // Keep alertsRef in sync with latest portfolio.alerts every render
    alertsRef.current = portfolio.alerts;

    const sessionPnl = sessionStartBalance > 0
        ? (portfolio.virtualBalance + portfolio.totalCurrentValue) - sessionStartBalance
        : 0;

    return (
        <PortfolioContext.Provider value={{
            portfolio, riskEngine, sessionPnl, equityHistory, breaches, consistencyScore,
            executeTrade, executeBracketOrder, createGTT, deleteGTT,
            createAlert, deleteAlert, getStock, marketData, marketStatus,
            loading: loading || marketLoading, addInstruments, addInr, buyNfino, convertNfinoToVirtual,
            claimDailyBonus, addReward,
        }}>
            {children}
        </PortfolioContext.Provider>
    );
};

export const usePortfolio = () => {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
};
