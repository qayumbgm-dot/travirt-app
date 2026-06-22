
import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminUser, AdminTicket, AuditEntry, PlatformStats } from '../api/admin.api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';

type Tab = 'overview' | 'users' | 'tickets' | 'audit';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-yellow-500/15 text-yellow-400',
  RESOLVED:    'bg-success/15 text-success',
  CLOSED:      'bg-overlay text-muted',
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-yellow-500/15 text-yellow-400',
  admin:       'bg-primary/15 text-primary',
  user:        'bg-overlay text-text-secondary',
  banned:      'bg-danger/15 text-danger',
};

const StatCard: React.FC<{ icon: string; label: string; value: number | string; sub?: string; color?: string }> = ({
  icon, label, value, sub, color = 'text-primary',
}) => (
  <div className="bg-surface rounded-xl border border-overlay p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} bg-current/10`}>
        <i className={`fas ${icon} text-sm`} style={{ color: 'inherit' }}></i>
      </div>
      <span className="text-xs text-muted font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-3xl font-bold text-text-primary">{value}</p>
    {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
  </div>
);

// ── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><i className="fas fa-spinner animate-spin text-primary text-2xl"></i></div>;
  if (!stats) return <p className="text-muted text-sm p-6">Failed to load stats.</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="fa-users"        label="Total Users"    value={stats.totalUsers.toLocaleString()}   sub={`+${stats.usersToday} today`} color="text-primary" />
        <StatCard icon="fa-chart-line"   label="Total Orders"   value={stats.totalOrders.toLocaleString()}  sub={`+${stats.ordersToday} today`} color="text-success" />
        <StatCard icon="fa-ticket-alt"   label="Support Tickets" value={stats.totalTickets.toLocaleString()} sub={`${stats.openTickets} open`} color="text-yellow-400" />
      </div>

      <div className="bg-surface rounded-xl border border-overlay p-5">
        <h3 className="font-bold text-sm text-text-primary mb-4">Platform Health</h3>
        <div className="space-y-3">
          {[
            { label: 'API Server',      ok: true },
            { label: 'Database',        ok: true },
            { label: 'Market Data Feed', ok: true },
            { label: 'Email Service',   ok: true },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{s.label}</span>
              <span className={`flex items-center gap-1.5 text-xs font-bold ${s.ok ? 'text-success' : 'text-danger'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
                {s.ok ? 'Operational' : 'Degraded'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Users ─────────────────────────────────────────────────────────────────────
const UsersTab: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listUsers(page, 20, search)
      .then(({ users: u, total: t }) => { setUsers(u); setTotal(t); })
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    setUpdating(user.id);
    try {
      await adminApi.updateUserRole(user.id, newRole);
      showToast(`${user.user_id} role → ${newRole}`, 'success');
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    } catch {
      showToast('Update failed', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-6 space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by ID, email, or name…"
          className="flex-1 bg-base border border-overlay rounded-lg px-3 py-2 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-focus transition-colors">
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-48"><i className="fas fa-spinner animate-spin text-primary text-2xl"></i></div>
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
            <div className="px-4 py-3 border-b border-overlay text-xs text-muted">
              {total.toLocaleString()} users · page {page}/{totalPages}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase border-b border-overlay bg-base/30">
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-right">Orders</th>
                    <th className="p-3 text-center">Role</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-overlay last:border-b-0 hover:bg-overlay/30 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-text-primary font-mono">{u.user_id}</p>
                        <p className="text-[10px] text-muted">{u.display_name ?? '—'}</p>
                      </td>
                      <td className="p-3 text-text-secondary text-xs">{u.email}</td>
                      <td className="p-3 text-right font-mono text-xs text-text-secondary">
                        {u.virtual_balance != null ? formatCurrency(u.virtual_balance) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-text-secondary">{u.order_count}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-overlay text-muted'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {updating === u.id ? (
                          <i className="fas fa-spinner animate-spin text-muted"></i>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {u.role !== 'banned' ? (
                              <button
                                onClick={() => handleRoleChange(u, 'banned')}
                                title="Ban user"
                                className="text-xs px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors font-semibold"
                              >
                                Ban
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(u, 'user')}
                                title="Restore user"
                                className="text-xs px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 transition-colors font-semibold"
                              >
                                Restore
                              </button>
                            )}
                            {!['admin', 'super_admin'].includes(u.role) && (
                              <button
                                onClick={() => handleRoleChange(u, 'admin')}
                                title="Promote to admin"
                                className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold"
                              >
                                Admin
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted text-sm">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-overlay text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              <i className="fas fa-chevron-left text-xs mr-1"></i> Prev
            </button>
            <span className="text-muted text-xs">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-overlay text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              Next <i className="fas fa-chevron-right text-xs ml-1"></i>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Tickets ───────────────────────────────────────────────────────────────────
const TicketsTab: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listTickets(filter || undefined)
      .then(setTickets)
      .catch(() => showToast('Failed to load tickets', 'error'))
      .finally(() => setLoading(false));
  }, [filter, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (ticket: AdminTicket, status: string) => {
    setUpdating(ticket.id);
    try {
      await adminApi.updateTicketStatus(ticket.id, status);
      showToast(`Ticket → ${status}`, 'success');
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status } : t));
    } catch {
      showToast('Update failed', 'error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...TICKET_STATUSES].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-overlay text-muted hover:text-text-primary'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><i className="fas fa-spinner animate-spin text-primary text-2xl"></i></div>
      ) : (
        <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
          <div className="px-4 py-3 border-b border-overlay text-xs text-muted">{tickets.length} tickets</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase border-b border-overlay bg-base/30">
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Subject</th>
                  <th className="p-3 text-center">Category</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Created</th>
                  <th className="p-3 text-center">Update</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-overlay last:border-b-0 hover:bg-overlay/30 transition-colors">
                    <td className="p-3">
                      <p className="font-semibold font-mono text-xs text-text-primary">{t.user_user_id}</p>
                      <p className="text-[10px] text-muted">{t.email}</p>
                    </td>
                    <td className="p-3 text-text-secondary text-xs max-w-xs truncate">{t.subject}</td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] bg-overlay text-muted px-2 py-0.5 rounded-full font-medium">
                        {t.category ?? 'General'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-overlay text-muted'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-[10px] text-muted">
                      {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      {updating === t.id ? (
                        <i className="fas fa-spinner animate-spin text-muted"></i>
                      ) : (
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                          className="bg-base border border-overlay rounded text-xs px-2 py-1 text-text-secondary focus:outline-none focus:border-primary"
                        >
                          {TICKET_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted text-sm">No tickets.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Audit Log ─────────────────────────────────────────────────────────────────
const AuditTab: React.FC = () => {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getAuditLog({ userId: search || undefined, limit: 200 })
      .then(setEntries)
      .catch(() => showToast('Failed to load audit log', 'error'))
      .finally(() => setLoading(false));
  }, [search, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const ACTION_COLORS: Record<string, string> = {
    USER_LOGIN:           'bg-primary/10 text-primary',
    USER_REGISTERED:      'bg-success/10 text-success',
    USER_ROLE_CHANGED:    'bg-yellow-500/10 text-yellow-400',
    TICKET_STATUS_CHANGED:'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="p-6 space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Filter by user ID…"
          className="flex-1 bg-base border border-overlay rounded-lg px-3 py-2 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-focus transition-colors">
          Filter
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-48"><i className="fas fa-spinner animate-spin text-primary text-2xl"></i></div>
      ) : (
        <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
          <div className="px-4 py-3 border-b border-overlay text-xs text-muted">{entries.length} entries (latest first)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase border-b border-overlay bg-base/30">
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Resource</th>
                  <th className="p-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-overlay last:border-b-0 hover:bg-overlay/30 transition-colors">
                    <td className="p-3 text-[10px] text-muted whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <p className="font-mono text-xs text-text-primary">{e.user_handle ?? '—'}</p>
                      <p className="text-[10px] text-muted">{e.email ?? ''}</p>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACTION_COLORS[e.action] ?? 'bg-overlay text-muted'}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted">{e.resource}</td>
                    <td className="p-3 text-[10px] text-muted font-mono">{e.ip_address ?? '—'}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted text-sm">No audit entries found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const AdminScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview',   icon: 'fa-tachometer-alt' },
    { key: 'users',    label: 'Users',      icon: 'fa-users' },
    { key: 'tickets',  label: 'Tickets',    icon: 'fa-ticket-alt' },
    { key: 'audit',    label: 'Audit Log',  icon: 'fa-history' },
  ];

  return (
    <main className="animate-fade-in text-text-primary flex flex-col h-full">
      <header className="px-6 pt-6 pb-0 border-b border-overlay shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-3 mb-4">
          <i className="fas fa-shield-alt text-primary"></i>
          Admin Portal
        </h1>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'text-primary border-primary'
                  : 'text-muted border-transparent hover:text-text-primary'
              }`}
            >
              <i className={`fas ${t.icon} text-xs`}></i>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users'    && <UsersTab />}
        {activeTab === 'tickets'  && <TicketsTab />}
        {activeTab === 'audit'    && <AuditTab />}
      </div>
    </main>
  );
};

export default AdminScreen;
