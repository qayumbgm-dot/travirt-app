
import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { supportApi } from '../apiClient/support.api';

const FAQS: { q: string; a: string }[] = [
    {
        q: 'What is TraVirt?',
        a: 'TraVirt is a virtual stock trading simulator designed for learning and practice. You trade with simulated virtual funds in real market conditions, so there is zero financial risk while you build skills and confidence.',
    },
    {
        q: 'Is TraVirt connected to live market data?',
        a: 'TraVirt uses a mix of real-time data (when available) and high-fidelity simulated price feeds to reflect realistic market behaviour. Orders you place are executed virtually — no real exchange is involved.',
    },
    {
        q: 'How is my P&L calculated?',
        a: 'Unrealised P&L is the difference between your average buy price and the current LTP for open positions. Realised P&L is locked in when you exit a position. Both are displayed in the Portfolio screen.',
    },
    {
        q: 'What are NXO tokens?',
        a: 'NXO are TraVirt\'s in-platform reward tokens. You earn them by completing milestones: first trade, profile completion, daily login bonus, and more. They can be viewed in the Earn Tokens section.',
    },
    {
        q: 'How do I add a stock to my watchlist?',
        a: 'Use the search bar at the top of the Watchlist sidebar. Type a company name or NSE symbol, then click the + icon next to the result. You can also add instruments directly from the Option Chain or Trade screens.',
    },
    {
        q: 'Why is my order stuck in PENDING?',
        a: 'LIMIT orders wait until the market price reaches your specified limit price. MARKET orders execute immediately at the best available simulated price. If a limit order is not filling, the current price may not have crossed your target.',
    },
    {
        q: 'How do GTT orders work?',
        a: 'Good Till Triggered (GTT) orders remain active until the trigger price is hit. Once the price crosses the trigger, a LIMIT order is placed automatically at your target price. GTTs are great for setting up conditional entries and exits without monitoring the screen.',
    },
    {
        q: 'Can I trade Options and Futures on TraVirt?',
        a: 'Yes. TraVirt supports Equity, Futures, and Options instruments. You can view live option chains for major indices and stocks via the Option Chain sidebar tab or the dedicated panel in the Trade screen.',
    },
];

const SHORTCUTS: { keys: string[]; action: string }[] = [
    { keys: ['B'], action: 'Open Buy order form for selected stock' },
    { keys: ['S'], action: 'Open Sell order form for selected stock' },
    { keys: ['D'], action: 'Navigate to Dashboard' },
    { keys: ['P'], action: 'Navigate to Portfolio' },
    { keys: ['O'], action: 'Navigate to Orders' },
    { keys: ['F'], action: 'Navigate to Funds' },
    { keys: ['Esc'], action: 'Close modal / order panel' },
    { keys: ['Ctrl', 'K'], action: 'Focus watchlist search (when sidebar is open)' },
];

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 bg-overlay rounded-md border border-overlay text-xs font-mono font-bold text-text-secondary shadow-sm">
        {children}
    </kbd>
);

const SupportScreen: React.FC = () => {
    const { showToast } = useToast();
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [form, setForm] = useState({ subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.message.trim()) {
            showToast('Please fill in both fields.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            await supportApi.submit(form.subject.trim(), form.message.trim());
            setSubmitted(true);
            showToast('Support request submitted successfully.', 'success');
        } catch {
            showToast('Failed to submit. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="animate-fade-in p-6 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <i className="fas fa-life-ring text-primary"></i>
                    Support
                </h1>
                <p className="text-muted text-sm mt-1">Find answers to common questions, keyboard shortcuts, and contact options.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* FAQ — spans 2 cols */}
                <div className="lg:col-span-2 space-y-5">

                    {/* FAQ Accordion */}
                    <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
                        <div className="px-5 py-4 border-b border-overlay flex items-center gap-3">
                            <i className="fas fa-question-circle text-primary text-sm w-5 text-center"></i>
                            <h3 className="font-bold text-text-primary text-sm">Frequently Asked Questions</h3>
                        </div>
                        <div className="divide-y divide-overlay/50">
                            {FAQS.map((faq, i) => (
                                <div key={i}>
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-overlay/30 transition-colors"
                                    >
                                        <span className="text-sm font-semibold text-text-primary">{faq.q}</span>
                                        <i className={`fas fa-chevron-down text-muted text-xs transition-transform duration-200 shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}></i>
                                    </button>
                                    {openFaq === i && (
                                        <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed animate-fade-in">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Keyboard Shortcuts */}
                    <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
                        <div className="px-5 py-4 border-b border-overlay flex items-center gap-3">
                            <i className="fas fa-keyboard text-primary text-sm w-5 text-center"></i>
                            <h3 className="font-bold text-text-primary text-sm">Keyboard Shortcuts</h3>
                        </div>
                        <div className="p-5">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-overlay/40">
                                    {SHORTCUTS.map((s, i) => (
                                        <tr key={i} className="py-2">
                                            <td className="py-2.5 pr-4 w-1/3">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {s.keys.map((k, ki) => (
                                                        <React.Fragment key={ki}>
                                                            <Kbd>{k}</Kbd>
                                                            {ki < s.keys.length - 1 && (
                                                                <span className="text-muted text-xs">+</span>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-2.5 text-text-secondary">{s.action}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right column: Contact + Status */}
                <div className="space-y-5">

                    {/* Contact card */}
                    <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
                        <div className="px-5 py-4 border-b border-overlay flex items-center gap-3">
                            <i className="fas fa-headset text-primary text-sm w-5 text-center"></i>
                            <h3 className="font-bold text-text-primary text-sm">Contact Us</h3>
                        </div>
                        <div className="p-5 space-y-3">
                            <a
                                href="mailto:support@travirt.com"
                                className="flex items-center gap-3 p-3 rounded-lg border border-overlay hover:border-primary/40 hover:bg-primary/5 transition-all group"
                            >
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <i className="fas fa-envelope text-primary text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-muted">Email support</p>
                                    <p className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                                        support@travirt.com
                                    </p>
                                </div>
                            </a>

                            <div className="flex items-center gap-3 p-3 rounded-lg border border-overlay">
                                <div className="w-9 h-9 rounded-full bg-overlay flex items-center justify-center shrink-0">
                                    <i className="fas fa-clock text-muted text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-muted">Response time</p>
                                    <p className="font-semibold text-sm text-text-primary">Within 24 hours</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit a request */}
                    <div className="bg-surface rounded-xl border border-overlay overflow-hidden">
                        <div className="px-5 py-4 border-b border-overlay flex items-center gap-3">
                            <i className="fas fa-paper-plane text-primary text-sm w-5 text-center"></i>
                            <h3 className="font-bold text-text-primary text-sm">Submit a Request</h3>
                        </div>
                        <div className="p-5">
                            {submitted ? (
                                <div className="text-center py-6">
                                    <i className="fas fa-check-circle text-success text-4xl mb-3"></i>
                                    <p className="font-bold text-text-primary">Request received!</p>
                                    <p className="text-sm text-muted mt-1">We'll get back to you within 24 hours.</p>
                                    <button
                                        onClick={() => { setSubmitted(false); setForm({ subject: '', message: '' }); }}
                                        className="mt-4 text-primary text-sm hover:underline"
                                    >
                                        Submit another
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-muted mb-1.5">Subject</label>
                                        <input
                                            type="text"
                                            value={form.subject}
                                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                            placeholder="Brief description of your issue"
                                            className="w-full bg-base border border-overlay rounded-lg px-3 py-2 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted mb-1.5">Message</label>
                                        <textarea
                                            rows={4}
                                            value={form.message}
                                            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                            placeholder="Describe your issue in detail…"
                                            className="w-full bg-base border border-overlay rounded-lg px-3 py-2 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-primary transition-colors resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-primary hover:bg-primary-focus text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting && <i className="fas fa-spinner animate-spin text-xs"></i>}
                                        {submitting ? 'Sending…' : 'Send Request'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Platform status */}
                    <div className="bg-surface rounded-xl border border-overlay p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <i className="fas fa-signal text-primary text-sm w-5 text-center"></i>
                            <h3 className="font-bold text-text-primary text-sm">Platform Status</h3>
                        </div>
                        <div className="space-y-2">
                            {[
                                { name: 'Trading Engine', ok: true },
                                { name: 'Market Data Feed', ok: true },
                                { name: 'Portfolio & P&L', ok: true },
                                { name: 'AI News Service', ok: true },
                            ].map(item => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">{item.name}</span>
                                    <span className={`flex items-center gap-1.5 text-xs font-bold ${item.ok ? 'text-success' : 'text-danger'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
                                        {item.ok ? 'Operational' : 'Degraded'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default SupportScreen;
