
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { settingsApi } from '../apiClient/settings.api';
import { securityApi, TwoFaStatus, TwoFaSetupResult } from '../apiClient/security.api';
import { SUPPORTED_LANGUAGES, setLanguage, LangCode } from '../i18n';

const SETTINGS_KEY = 'travirt_settings';

interface AppSettings {
    animations: boolean;
    compactMode: boolean;
    confirmOrders: boolean;
    defaultOrderType: 'MARKET' | 'LIMIT';
    notifyOrderFills: boolean;
    notifyPriceAlerts: boolean;
    notifyDailyBonus: boolean;
    showPnlPercent: boolean;
    priceDecimals: 2 | 4;
}

const DEFAULT_SETTINGS: AppSettings = {
    animations: true,
    compactMode: false,
    confirmOrders: true,
    defaultOrderType: 'LIMIT',
    notifyOrderFills: true,
    notifyPriceAlerts: true,
    notifyDailyBonus: true,
    showPnlPercent: false,
    priceDecimals: 2,
};

const loadSettings = (): AppSettings => {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
    <button
        role="switch"
        aria-checked={value}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${value ? 'bg-primary' : 'bg-overlay'}`}
    >
        <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ${
            value ? 'translate-x-5' : 'translate-x-0.5'
        }`}></span>
    </button>
);

const SectionCard: React.FC<{ icon: string; title: string; description?: string; children: React.ReactNode }> = ({ icon, title, description, children }) => (
    <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
        <div className="px-5 py-4 border-b border-overlay flex items-center gap-3">
            <i className={`fas ${icon} text-primary text-sm w-5 text-center`}></i>
            <div>
                <h3 className="font-bold text-text-primary text-sm">{title}</h3>
                {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="divide-y divide-overlay/50">{children}</div>
    </div>
);

const SettingRow: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <div className="min-w-0">
            <p className="text-sm text-text-primary font-medium">{label}</p>
            {description && <p className="text-[11px] text-muted mt-0.5 leading-snug">{description}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

const SettingsScreen: React.FC = () => {
    const { showToast } = useToast();
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = useState<AppSettings>(loadSettings);
    const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load from API on mount (API wins over localStorage)
    useEffect(() => {
        settingsApi.get()
            .then((remote) => {
                if (remote && Object.keys(remote).length > 0) {
                    const merged = { ...DEFAULT_SETTINGS, ...remote } as AppSettings;
                    setSettings(merged);
                    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)); } catch {}
                }
            })
            .catch(() => { /* offline — use local */ });
    }, []);

    const persist = (next: AppSettings) => {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
        // Debounce API sync — fire 800ms after last change
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
            settingsApi.save(next as unknown as Record<string, unknown>).catch(() => {});
        }, 800);
    };

    const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        persist(next);
        showToast('Setting saved.', 'success');
    };

    const resetAll = () => {
        setSettings(DEFAULT_SETTINGS);
        persist(DEFAULT_SETTINGS);
        showToast('Settings reset to defaults.', 'info');
    };

    return (
        <main className="animate-fade-in p-6 text-text-primary">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <i className="fas fa-cog text-primary"></i>
                        Settings
                    </h1>
                    <p className="text-muted text-sm mt-1">Preferences are saved automatically and persist across sessions.</p>
                </div>
                <button
                    onClick={resetAll}
                    className="flex items-center gap-2 border border-overlay hover:border-danger/50 hover:text-danger text-muted text-sm font-semibold py-2 px-4 rounded-lg transition-colors mt-1 shrink-0"
                >
                    <i className="fas fa-undo text-xs"></i>
                    Reset to Defaults
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">

                {/* Appearance */}
                <SectionCard icon="fa-paint-brush" title="Appearance">
                    <SettingRow
                        label="Interface animations"
                        description="Fade-in and transition effects across the platform."
                    >
                        <Toggle value={settings.animations} onChange={v => update('animations', v)} />
                    </SettingRow>
                    <SettingRow
                        label="Compact mode"
                        description="Reduce padding and font sizes in lists and tables."
                    >
                        <Toggle value={settings.compactMode} onChange={v => update('compactMode', v)} />
                    </SettingRow>
                </SectionCard>

                {/* Trading Preferences */}
                <SectionCard
                    icon="fa-exchange-alt"
                    title="Trading Preferences"
                    description="These defaults apply when opening new order forms."
                >
                    <SettingRow label="Confirm before placing order" description="Shows a review dialog before submitting.">
                        <Toggle value={settings.confirmOrders} onChange={v => update('confirmOrders', v)} />
                    </SettingRow>
                    <SettingRow label="Default order type">
                        <div className="flex rounded-lg border border-overlay overflow-hidden text-xs font-bold">
                            {(['MARKET', 'LIMIT'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => update('defaultOrderType', type)}
                                    className={`px-4 py-1.5 transition-colors ${
                                        settings.defaultOrderType === type
                                            ? 'bg-primary text-white'
                                            : 'bg-surface text-muted hover:text-text-primary'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </SettingRow>
                </SectionCard>

                {/* Notifications */}
                <SectionCard
                    icon="fa-bell"
                    title="Notifications"
                    description="Controls what triggers in-app notifications."
                >
                    <SettingRow label="Order fill alerts" description="Notify when a buy or sell order is executed.">
                        <Toggle value={settings.notifyOrderFills} onChange={v => update('notifyOrderFills', v)} />
                    </SettingRow>
                    <SettingRow label="Price alert triggers" description="Notify when a price alert threshold is crossed.">
                        <Toggle value={settings.notifyPriceAlerts} onChange={v => update('notifyPriceAlerts', v)} />
                    </SettingRow>
                    <SettingRow label="Daily bonus reminder" description="Remind when an unclaimed daily bonus is available.">
                        <Toggle value={settings.notifyDailyBonus} onChange={v => update('notifyDailyBonus', v)} />
                    </SettingRow>
                </SectionCard>

                {/* Display */}
                <SectionCard icon="fa-eye" title="Display" description="Controls how numbers are shown across the platform.">
                    <SettingRow label="Show P&L as percentage" description="Displays portfolio P&L as % instead of ₹ value.">
                        <Toggle value={settings.showPnlPercent} onChange={v => update('showPnlPercent', v)} />
                    </SettingRow>
                    <SettingRow label="Price decimal places">
                        <div className="flex rounded-lg border border-overlay overflow-hidden text-xs font-bold">
                            {([2, 4] as const).map(d => (
                                <button
                                    key={d}
                                    onClick={() => update('priceDecimals', d)}
                                    className={`px-4 py-1.5 transition-colors ${
                                        settings.priceDecimals === d
                                            ? 'bg-primary text-white'
                                            : 'bg-surface text-muted hover:text-text-primary'
                                    }`}
                                >
                                    {d} dp
                                </button>
                            ))}
                        </div>
                    </SettingRow>
                </SectionCard>

                {/* Two-Factor Authentication */}
                <TwoFaSection />

                {/* Language */}
                <SectionCard icon="fa-language" title={t('settings.language')} description={t('settings.languageDesc')}>
                    <SettingRow label={t('settings.language')}>
                        <div className="flex rounded-lg border border-overlay overflow-hidden text-xs font-bold">
                            {SUPPORTED_LANGUAGES.map(({ code, label }) => (
                                <button
                                    key={code}
                                    onClick={() => {
                                        setLanguage(code as LangCode);
                                        showToast(t('settings.languageSaved'), 'success');
                                    }}
                                    className={`px-4 py-1.5 transition-colors ${
                                        i18n.language === code
                                            ? 'bg-primary text-white'
                                            : 'bg-surface text-muted hover:text-text-primary'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </SettingRow>
                </SectionCard>

                {/* About */}
                <div className="bg-surface rounded-xl border border-overlay p-5 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                        <i className="fas fa-info-circle text-primary text-sm w-5 text-center"></i>
                        <h3 className="font-bold text-text-primary text-sm">About TraVirt</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        {[
                            { label: 'Version', value: '9.0.0' },
                            { label: 'Build', value: 'stable' },
                            { label: 'Data', value: 'Simulated' },
                            { label: 'Platform', value: 'Web' },
                        ].map(item => (
                            <div key={item.label} className="bg-base rounded-lg p-3 border border-overlay/50">
                                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{item.label}</p>
                                <p className="font-bold text-text-primary">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-muted mt-4">
                        TraVirt is a virtual trading simulator for educational purposes. All orders, positions, and funds are entirely simulated.
                        No real money is involved.
                    </p>
                </div>
            </div>
        </main>
    );
};

const TwoFaSection: React.FC = () => {
    const { showToast } = useToast();
    const [status,    setStatus]    = useState<TwoFaStatus | null>(null);
    const [setup,     setSetup]     = useState<TwoFaSetupResult | null>(null);
    const [phase,     setPhase]     = useState<'idle' | 'setup' | 'confirm' | 'disable'>('idle');
    const [code,      setCode]      = useState('');
    const [loading,   setLoading]   = useState(false);
    const [showCodes, setShowCodes] = useState(false);

    const loadStatus = useCallback(async () => {
        try { setStatus(await securityApi.get2faStatus()); } catch { /* unauthenticated — skip */ }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const handleSetup = async () => {
        setLoading(true);
        try {
            const result = await securityApi.setup2fa();
            setSetup(result);
            setShowCodes(true);
            setPhase('setup');
        } catch { showToast('Could not start 2FA setup', 'error'); }
        finally { setLoading(false); }
    };

    const handleEnable = async () => {
        if (!/^\d{6}$/.test(code)) { showToast('Enter a 6-digit code', 'error'); return; }
        setLoading(true);
        try {
            await securityApi.enable2fa(code);
            showToast('Two-factor authentication enabled', 'success');
            setPhase('idle'); setSetup(null); setCode('');
            await loadStatus();
        } catch { showToast('Invalid code — check your authenticator app', 'error'); }
        finally { setLoading(false); }
    };

    const handleDisable = async () => {
        if (!code) { showToast('Enter your authenticator code', 'error'); return; }
        setLoading(true);
        try {
            await securityApi.disable2fa(code);
            showToast('Two-factor authentication disabled', 'info');
            setPhase('idle'); setCode('');
            await loadStatus();
        } catch { showToast('Invalid code', 'error'); }
        finally { setLoading(false); }
    };

    if (!status) return null;

    return (
        <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
            <div className="px-5 py-4 border-b border-overlay flex items-center gap-3">
                <i className="fas fa-shield-alt text-primary text-sm w-5 text-center" />
                <div>
                    <h3 className="font-bold text-text-primary text-sm">Two-Factor Authentication</h3>
                    <p className="text-[11px] text-muted mt-0.5">Add a second layer of security to your account.</p>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">Status</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        status.enabled ? 'bg-success/20 text-success' : 'bg-overlay text-muted'
                    }`}>
                        {status.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>

                {status.enabled && (
                    <p className="text-xs text-muted">
                        Recovery codes remaining: <strong className="text-text-primary">{status.remainingRecoveryCodes}</strong>
                        {status.remainingRecoveryCodes <= 2 && (
                            <span className="text-amber-500 ml-1">— generate new codes from setup</span>
                        )}
                    </p>
                )}

                {/* Setup flow */}
                {phase === 'idle' && !status.enabled && (
                    <button onClick={handleSetup} disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-focus text-white text-sm font-semibold transition disabled:opacity-60">
                        {loading ? 'Generating…' : 'Set up 2FA'}
                    </button>
                )}

                {phase === 'setup' && setup && (
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">
                            1. Scan this QR code with <strong>Google Authenticator</strong>, Authy, or any TOTP app.
                        </p>
                        <div className="flex justify-center">
                            <img src={setup.qrDataUrl} alt="2FA QR code" className="w-48 h-48 rounded-lg border border-overlay" />
                        </div>
                        <div className="bg-base rounded-lg p-3 border border-overlay text-center">
                            <p className="text-[10px] text-muted mb-1">Manual entry key</p>
                            <code className="text-xs font-mono text-text-primary tracking-widest break-all">{setup.secret}</code>
                        </div>

                        {showCodes && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                                <p className="text-xs font-bold text-amber-500 mb-2">
                                    <i className="fas fa-exclamation-triangle mr-1" />
                                    Save these recovery codes — they won't be shown again
                                </p>
                                <div className="grid grid-cols-2 gap-1">
                                    {setup.recoveryCodes.map(c => (
                                        <code key={c} className="text-xs font-mono bg-base rounded px-2 py-1 text-center text-text-primary">{c}</code>
                                    ))}
                                </div>
                                <button onClick={() => setShowCodes(false)}
                                    className="mt-2 text-xs text-muted hover:text-text-primary underline">
                                    I've saved them
                                </button>
                            </div>
                        )}

                        {!showCodes && (
                            <div className="space-y-2">
                                <p className="text-sm text-text-secondary">2. Enter the 6-digit code from your app to confirm:</p>
                                <input type="tel" value={code} maxLength={6}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full p-3 bg-overlay border border-overlay rounded-md text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                                <div className="flex gap-2">
                                    <button onClick={() => { setPhase('idle'); setSetup(null); setCode(''); }}
                                        className="flex-1 py-2.5 rounded-lg border border-overlay text-sm text-muted hover:text-text-primary transition">
                                        Cancel
                                    </button>
                                    <button onClick={handleEnable} disabled={loading || code.length !== 6}
                                        className="flex-1 py-2.5 rounded-lg bg-success hover:bg-success/80 text-white text-sm font-semibold transition disabled:opacity-60">
                                        {loading ? 'Enabling…' : 'Enable 2FA'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Disable flow */}
                {status.enabled && phase === 'idle' && (
                    <button onClick={() => setPhase('disable')}
                        className="w-full py-2.5 rounded-lg border border-danger/50 text-danger hover:bg-danger/10 text-sm font-semibold transition">
                        Disable 2FA
                    </button>
                )}

                {phase === 'disable' && (
                    <div className="space-y-2">
                        <p className="text-sm text-text-secondary">Enter your authenticator code (or a recovery code) to disable 2FA:</p>
                        <input type="text" value={code}
                            onChange={e => setCode(e.target.value.replace(/[^0-9A-Fa-f-]/g, '').toUpperCase())}
                            placeholder="000000 or XXXXX-XXXXX"
                            className="w-full p-3 bg-overlay border border-overlay rounded-md text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-danger font-mono" />
                        <div className="flex gap-2">
                            <button onClick={() => { setPhase('idle'); setCode(''); }}
                                className="flex-1 py-2.5 rounded-lg border border-overlay text-sm text-muted hover:text-text-primary transition">
                                Cancel
                            </button>
                            <button onClick={handleDisable} disabled={loading || !code}
                                className="flex-1 py-2.5 rounded-lg bg-danger hover:bg-danger/80 text-white text-sm font-semibold transition disabled:opacity-60">
                                {loading ? 'Disabling…' : 'Confirm Disable'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsScreen;
