
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PortfolioState, TransactionType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type NotifType = 'trade' | 'reward' | 'warning' | 'info';

interface NotificationItem {
    id: string;
    type: NotifType;
    icon: string;
    title: string;
    body: string;
    time: number;
}

const timeAgo = (ts: number): string => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const buildNotifications = (portfolio: PortfolioState): NotificationItem[] => {
    const items: NotificationItem[] = [];

    // Daily bonus reminder (if unclaimed)
    if (!portfolio.dailyBonusClaimed) {
        items.push({
            id: 'daily-bonus',
            type: 'info',
            icon: 'fas fa-gift',
            title: 'Daily Bonus Available',
            body: 'Claim your 10 NXO daily login reward from Earn Tokens.',
            time: Date.now() - 1000 * 60 * 2,
        });
    }

    // NXO reward transactions (last 3, most recent first)
    portfolio.transactionHistory
        .filter(t => t.type === 'REWARD_NXO')
        .slice(-3)
        .reverse()
        .forEach(t => {
            items.push({
                id: t.id,
                type: 'reward',
                icon: 'fas fa-coins',
                title: 'NXO Reward Earned',
                body: t.description,
                time: t.timestamp,
            });
        });

    // Recent orders (last 5, most recent first)
    portfolio.orderHistory
        .slice(-5)
        .reverse()
        .forEach(o => {
            const isBuy = o.transactionType === TransactionType.BUY;
            items.push({
                id: o.id,
                type: 'trade',
                icon: isBuy ? 'fas fa-arrow-circle-up' : 'fas fa-arrow-circle-down',
                title: `${isBuy ? 'Bought' : 'Sold'} ${o.symbol}`,
                body: `${o.quantity} qty · ${o.price ? formatCurrency(o.price) : 'Market price'}`,
                time: o.timestamp,
            });
        });

    // Risk notifications
    const accountSize = portfolio.virtualBalance + portfolio.totalInvested;
    if (accountSize > 0) {
        const dailyLossPct = (Math.max(0, -portfolio.todayPnl) / (accountSize * 0.05)) * 100;
        const drawdownPct  = (Math.max(0, -portfolio.totalPnl) / (accountSize * 0.10)) * 100;
        if (dailyLossPct >= 100 || drawdownPct >= 100) {
            items.push({
                id: 'risk-breach',
                type: 'warning',
                icon: 'fas fa-exclamation-triangle',
                title: 'Prop Firm Rule Breached',
                body: 'A risk limit has been violated. Review the Dashboard Risk Engine.',
                time: Date.now() - 1000 * 30,
            });
        } else if (dailyLossPct >= 70 || drawdownPct >= 70) {
            items.push({
                id: 'risk-warn',
                type: 'warning',
                icon: 'fas fa-shield-alt',
                title: 'Approaching Risk Limit',
                body: 'You are nearing a prop firm evaluation threshold. Check your Dashboard.',
                time: Date.now() - 1000 * 30,
            });
        }
    }

    // Account status (always present, oldest)
    items.push({
        id: 'account-active',
        type: 'info',
        icon: 'fas fa-check-circle',
        title: 'Account Active',
        body: `Virtual balance: ${formatCurrency(portfolio.virtualBalance)} · ${portfolio.nxoBalance.toLocaleString()} NXO`,
        time: Date.now() - 1000 * 60 * 60 * 24,
    });

    return items.sort((a, b) => b.time - a.time);
};

const ICON_COLOR: Record<NotifType, string> = {
    trade:   'text-primary',
    reward:  'text-yellow-400',
    warning: 'text-danger',
    info:    'text-success',
};

const ICON_BG: Record<NotifType, string> = {
    trade:   'bg-primary/10',
    reward:  'bg-yellow-400/10',
    warning: 'bg-danger/10',
    info:    'bg-success/10',
};

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    portfolio: PortfolioState;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
    isOpen, onClose, anchorEl, portfolio,
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState<React.CSSProperties>({});

    const notifications = buildNotifications(portfolio);

    useLayoutEffect(() => {
        if (isOpen && anchorEl && panelRef.current) {
            const rect = anchorEl.getBoundingClientRect();
            const panelWidth = 360;
            let left = rect.right - panelWidth;
            if (left < 8) left = 8;
            setStyle({
                position: 'fixed',
                top: `${rect.bottom + 8}px`,
                left: `${left}px`,
                width: `${panelWidth}px`,
                zIndex: 60,
            });
        }
    }, [isOpen, anchorEl]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                anchorEl && !anchorEl.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose, anchorEl]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={panelRef}
            style={style}
            className="bg-surface border border-overlay rounded-xl shadow-2xl animate-fade-in flex flex-col max-h-[480px]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-overlay shrink-0">
                <div className="flex items-center gap-2">
                    <i className="fas fa-bell text-primary text-sm"></i>
                    <span className="font-bold text-text-primary text-sm">Notifications</span>
                    <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {notifications.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-muted hover:text-text-primary transition-colors"
                    aria-label="Close notifications"
                >
                    <i className="fas fa-times text-sm"></i>
                </button>
            </div>

            {/* Notification list */}
            <ul className="overflow-y-auto custom-scrollbar flex-1 py-1">
                {notifications.map(n => (
                    <li
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-overlay/50 transition-colors border-b border-overlay/40 last:border-b-0"
                    >
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${ICON_BG[n.type]}`}>
                            <i className={`${n.icon} text-xs ${ICON_COLOR[n.type]}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary leading-tight">{n.title}</p>
                            <p className="text-xs text-muted mt-0.5 leading-snug">{n.body}</p>
                            <p className="text-[10px] text-muted/60 mt-1">{timeAgo(n.time)}</p>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-overlay shrink-0">
                <p className="text-[10px] text-muted text-center">
                    Notifications are derived from your live portfolio activity.
                </p>
            </div>
        </div>,
        document.body
    );
};
