
import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';
import type { Order } from '../types';
import { portfolioApi } from '../api/portfolio.api';
import { gttApi, GttOrder } from '../api/gtt.api';
import { alertApi, AlertRecord } from '../api/alert.api';
import { tradeApi, PendingOrder } from '../api/trade.api';

const ORDER_HISTORY_ITEM_H = 82; // px: p-3 (24px padding) + 2 text lines (~40px) + gap

const OrderHistoryRow = React.memo(({ index, style, data }: ListChildComponentProps<Order[]>) => {
    const order = data[index];
    return (
        <div style={style} className="pr-2 pb-3">
            <div className="grid grid-cols-3 items-center text-sm p-3 rounded-md bg-overlay gap-2">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs py-0.5 px-1.5 rounded ${order.status === 'EXECUTED' ? 'bg-green-500/20 text-success' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {order.status}
                        </span>
                        <span className={`font-bold ${order.transactionType === 'BUY' ? 'text-success' : 'text-danger'}`}>
                            {order.transactionType}
                        </span>
                        <span className="font-semibold text-text-primary">{order.symbol}</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                        {order.quantity} shares @ {order.orderType.replace('_MARKET', '')}
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-text-primary">{formatCurrency(order.price!)}</p>
                    <p className="text-xs text-muted">{new Date(order.timestamp).toLocaleTimeString()}</p>
                </div>
            </div>
        </div>
    );
});

const GTTList: React.FC<{ onCountChange: (n: number) => void }> = ({ onCountChange }) => {
    const { showToast } = useToast();
    const [gtts, setGtts] = useState<GttOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await gttApi.list();
            setGtts(data);
            onCountChange(data.filter(g => g.status === 'ACTIVE').length);
        } catch {
            showToast('Failed to load GTT orders.', 'error');
        } finally {
            setLoading(false);
        }
    }, [onCountChange, showToast]);

    useEffect(() => { load(); }, [load]);

    const handleCancel = async (id: string) => {
        try {
            await gttApi.cancel(id);
            showToast('GTT order cancelled.', 'info');
            load();
        } catch {
            showToast('Failed to cancel GTT.', 'error');
        }
    };

    const TriggerPrice: React.FC<{ order: GttOrder }> = ({ order }) => {
        if (order.trigger_type === 'SINGLE') {
            return <>{formatCurrency(order.trigger_price!)}</>;
        }
        return <>{formatCurrency(order.stoploss_trigger_price!)} / {formatCurrency(order.target_trigger_price!)}</>;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-32 text-muted">
                <i className="fas fa-spinner animate-spin mr-2"></i> Loading…
            </div>
        );
    }

    const activeGtts = gtts.filter(g => g.status === 'ACTIVE');

    return (
        <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-text-secondary">
                    <thead className="text-xs text-text-secondary uppercase bg-overlay">
                        <tr>
                            <th scope="col" className="p-3">Created at</th>
                            <th scope="col" className="p-3">Instrument</th>
                            <th scope="col" className="p-3">Type</th>
                            <th scope="col" className="p-3">Trigger</th>
                            <th scope="col" className="p-3">Status</th>
                            <th scope="col" className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeGtts.length > 0 ? (
                            activeGtts.map(order => (
                                <tr key={order.id} className="border-b border-overlay last:border-b-0 hover:bg-overlay/50">
                                    <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 font-semibold text-text-primary">{order.symbol}</td>
                                    <td className="p-3">
                                        <span className={`font-bold text-xs py-1 px-2 rounded ${order.transaction_type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                            {order.trigger_type} - {order.transaction_type}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono"><TriggerPrice order={order} /></td>
                                    <td className="p-3">
                                        <span className="font-bold text-xs py-0.5 px-1.5 rounded bg-blue-500/20 text-blue-400">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleCancel(order.id)}
                                            className="text-muted hover:text-danger text-lg px-2"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-muted">
                                    You have no active GTTs.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AlertList: React.FC<{ onCountChange: (n: number) => void }> = ({ onCountChange }) => {
    const { showToast } = useToast();
    const [alerts, setAlerts] = useState<AlertRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await alertApi.list();
            setAlerts(data);
            onCountChange(data.filter(a => a.status === 'ACTIVE').length);
        } catch {
            showToast('Failed to load alerts.', 'error');
        } finally {
            setLoading(false);
        }
    }, [onCountChange, showToast]);

    useEffect(() => { load(); }, [load]);

    const handleCancel = async (id: string) => {
        try {
            await alertApi.cancel(id);
            showToast('Alert cancelled.', 'info');
            load();
        } catch {
            showToast('Failed to cancel alert.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-32 text-muted">
                <i className="fas fa-spinner animate-spin mr-2"></i> Loading…
            </div>
        );
    }

    const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');

    return (
        <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-text-secondary">
                    <thead className="text-xs text-text-secondary uppercase bg-overlay">
                        <tr>
                            <th scope="col" className="p-3">Created at</th>
                            <th scope="col" className="p-3">Instrument</th>
                            <th scope="col" className="p-3">Condition</th>
                            <th scope="col" className="p-3">Status</th>
                            <th scope="col" className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeAlerts.length > 0 ? (
                            activeAlerts.map(alert => (
                                <tr key={alert.id} className="border-b border-overlay last:border-b-0 hover:bg-overlay/50">
                                    <td className="p-3">{new Date(alert.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 font-semibold text-text-primary">{alert.symbol}</td>
                                    <td className="p-3 font-mono">{`${alert.property} ${alert.operator} ${formatCurrency(alert.value)}`}</td>
                                    <td className="p-3">
                                        <span className="font-bold text-xs py-0.5 px-1.5 rounded bg-blue-500/20 text-blue-400">
                                            {alert.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleCancel(alert.id)}
                                            className="text-muted hover:text-danger text-lg px-2"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-muted">
                                    You have no active alerts.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const PendingOrdersPanel: React.FC = () => {
    const { showToast } = useToast();
    const [orders, setOrders] = useState<PendingOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setOrders(await tradeApi.getPendingOrders());
        } catch {
            /* non-fatal */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCancel = async (id: string) => {
        try {
            await tradeApi.cancelPendingOrder(id);
            showToast('Order cancelled.', 'info');
            load();
        } catch {
            showToast('Failed to cancel order.', 'error');
        }
    };

    if (loading || orders.length === 0) return null;

    return (
        <div className="bg-surface rounded-lg shadow-lg overflow-hidden mb-4">
            <div className="px-6 py-3 border-b border-overlay flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-yellow-400 tracking-wider">Pending Orders</span>
                <span className="text-xs bg-yellow-400/20 text-yellow-400 rounded px-1.5 py-0.5 font-semibold">{orders.length}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-text-secondary">
                    <thead className="text-xs uppercase bg-overlay">
                        <tr>
                            <th className="p-3">Instrument</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Qty</th>
                            <th className="p-3">Limit Price</th>
                            <th className="p-3">Trigger</th>
                            <th className="p-3">Expires</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(o => (
                            <tr key={o.id} className="border-b border-overlay last:border-b-0 hover:bg-overlay/50">
                                <td className="p-3 font-semibold text-text-primary">{o.symbol}</td>
                                <td className="p-3">
                                    <span className={`font-bold text-xs py-0.5 px-1.5 rounded ${o.transaction_type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {o.order_type} {o.transaction_type}
                                    </span>
                                </td>
                                <td className="p-3 font-mono">{o.quantity}</td>
                                <td className="p-3 font-mono">{formatCurrency(o.limit_price)}</td>
                                <td className="p-3 font-mono">{o.trigger_price != null ? formatCurrency(o.trigger_price) : '—'}</td>
                                <td className="p-3 text-xs text-muted">{new Date(o.expires_at).toLocaleString()}</td>
                                <td className="p-3 text-center">
                                    <button onClick={() => handleCancel(o.id)} className="text-muted hover:text-danger text-lg px-2">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ExportButton: React.FC<{ type: 'orders' | 'transactions'; label: string }> = ({ type, label }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            await portfolioApi.downloadExport(type);
        } catch {
            showToast('Export failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-overlay text-text-secondary hover:text-text-primary hover:bg-overlay/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <i className={`fas ${loading ? 'fa-spinner animate-spin' : 'fa-download'} text-[11px]`}></i>
            {loading ? 'Exporting…' : label}
        </button>
    );
};

const OrdersScreen: React.FC = () => {
    const { portfolio } = usePortfolio();
    const [activeTab, setActiveTab] = useState<'orders' | 'gtt' | 'alerts'>('orders');
    const [gttCount, setGttCount] = useState(0);
    const [alertCount, setAlertCount] = useState(0);
    const [orderListHeight, setOrderListHeight] = useState(() => Math.max(300, window.innerHeight - 250));

    useEffect(() => {
        const onResize = () => setOrderListHeight(Math.max(300, window.innerHeight - 250));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const TabButton: React.FC<{ tabName: 'orders' | 'gtt' | 'alerts', label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'bg-surface text-text-primary' : 'bg-transparent text-muted hover:bg-surface/50'}`}>
            {label}
        </button>
    );

    return (
        <main className="animate-fade-in p-6">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-text-primary">Orders</h2>
                    <ExportButton type="transactions" label="Export Ledger CSV" />
                </div>

                <div className="border-b border-overlay">
                    <TabButton tabName="orders" label="Orders" />
                    <TabButton tabName="gtt" label={`GTT (${gttCount})`} />
                    <TabButton tabName="alerts" label={`Alerts (${alertCount})`} />
                </div>

                {activeTab === 'orders' && (
                    <>
                        <PendingOrdersPanel />
                        <div className="bg-surface rounded-lg shadow-lg">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-text-primary">Order History</h3>
                                    <ExportButton type="orders" label="Export CSV" />
                                </div>
                                {portfolio.orderHistory.length > 0 ? (
                                    <FixedSizeList
                                        height={orderListHeight}
                                        width="100%"
                                        itemCount={portfolio.orderHistory.length}
                                        itemSize={ORDER_HISTORY_ITEM_H}
                                        itemData={portfolio.orderHistory}
                                        className="custom-scrollbar"
                                    >
                                        {OrderHistoryRow}
                                    </FixedSizeList>
                                ) : (
                                    <div className="text-center py-10 text-muted">
                                        <i className="fas fa-file-alt text-4xl mb-4"></i>
                                        <h4 className="text-lg font-semibold text-text-primary">No Orders Yet</h4>
                                        <p>Your executed and pending orders will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                {activeTab === 'gtt' && <GTTList onCountChange={setGttCount} />}
                {activeTab === 'alerts' && <AlertList onCountChange={setAlertCount} />}
            </div>
        </main>
    );
};

export default OrdersScreen;
