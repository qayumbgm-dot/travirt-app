/* v2 */
import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

type OuterTab = 'partners' | 'charges' | 'calculator';

// ─── Brokerage Screen ────────────────────────────────────────────────────────

const BrokerageScreen: React.FC = () => {
    const [outerTab, setOuterTab] = useState<OuterTab>('partners');

    const TabBtn: React.FC<{ id: OuterTab; icon: string; label: string }> = ({ id, icon, label }) => (
        <button
            onClick={() => setOuterTab(id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                outerTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-text-primary hover:bg-overlay/20'
            }`}
        >
            <i className={`fas ${icon}`} />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-base animate-fade-in overflow-y-auto custom-scrollbar">
            {/* Outer tab bar */}
            <div className="flex border-b border-overlay bg-surface shrink-0 sticky top-0 z-10">
                <TabBtn id="partners"   icon="fa-handshake"  label="Open Account" />
                <TabBtn id="charges"    icon="fa-tags"       label="Charges" />
                <TabBtn id="calculator" icon="fa-calculator" label="Brokerage Calculator" />
            </div>

            {outerTab === 'partners'   && <PartnerBrokersSection />}
            {outerTab === 'charges'    && <ChargesTab />}
            {outerTab === 'calculator' && <CalculatorTab />}
        </div>
    );
};

// ─── Charges Tab (formerly PricingScreen) ────────────────────────────────────

type ChargeSegment = 'Equity' | 'Currency' | 'Commodity';

const ChargesTab: React.FC = () => {
    const [segment, setSegment] = useState<ChargeSegment>('Equity');

    const SegBtn: React.FC<{ name: ChargeSegment }> = ({ name }) => (
        <button
            onClick={() => setSegment(name)}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                segment === name
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-text-primary hover:bg-overlay/30'
            }`}
        >
            {name}
        </button>
    );

    return (
        <>
            {/* Hero */}
            <div className="text-center py-10 px-6">
                <h1 className="text-4xl font-bold text-text-primary mb-3">Brokerage &amp; Charges</h1>
                <p className="text-muted text-lg max-w-3xl mx-auto">
                    TraVirt offers a virtual trading experience. To prepare you for the real world,
                    we simulate the standard industry fee structure. Below is the breakdown of charges
                    you would incur in a real trading account.
                </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 max-w-6xl mx-auto mb-12">
                <div className="bg-surface p-6 rounded-xl border border-overlay text-center hover:border-success transition-all duration-300 group">
                    <div className="w-16 h-16 bg-success/20 group-hover:bg-success/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <span className="text-3xl font-bold text-success">₹0</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-text-primary">Free Equity Delivery</h3>
                    <p className="text-muted text-sm">All equity delivery investments (NSE, BSE) are absolutely free — ₹0 brokerage.</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-overlay text-center hover:border-primary transition-all duration-300 group">
                    <div className="w-16 h-16 bg-primary/20 group-hover:bg-primary/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <span className="text-3xl font-bold text-primary">₹20</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-text-primary">Intraday &amp; F&amp;O</h3>
                    <p className="text-muted text-sm">Flat ₹20 or 0.03% (whichever is lower) per executed order on intraday trades across equity, currency, and commodity.</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-overlay text-center hover:border-success transition-all duration-300 group">
                    <div className="w-16 h-16 bg-success/20 group-hover:bg-success/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <span className="text-3xl font-bold text-success">₹0</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-text-primary">Free Direct MF</h3>
                    <p className="text-muted text-sm">All direct mutual fund investments are absolutely free — ₹0 commissions &amp; DP charges.</p>
                </div>
            </div>

            {/* Segment Tabs + Table */}
            <div className="px-6 max-w-6xl mx-auto w-full mb-12">
                <div className="bg-surface rounded-lg border border-overlay shadow-lg overflow-hidden">
                    <div className="flex border-b border-overlay bg-base/50">
                        <SegBtn name="Equity" />
                        <SegBtn name="Currency" />
                        <SegBtn name="Commodity" />
                    </div>
                    <div className="overflow-x-auto">
                        {segment === 'Equity' && (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-overlay/50 text-text-secondary uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 w-1/5">Charge Head</th>
                                        <th className="p-4 w-1/5">Equity Delivery</th>
                                        <th className="p-4 w-1/5">Equity Intraday</th>
                                        <th className="p-4 w-1/5">F&amp;O Futures</th>
                                        <th className="p-4 w-1/5">F&amp;O Options</th>
                                    </tr>
                                </thead>
                                <tbody className="text-text-primary divide-y divide-overlay">
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Brokerage</td><td className="p-4">Zero</td><td className="p-4">0.03% or ₹20/order</td><td className="p-4">0.03% or ₹20/order</td><td className="p-4">Flat ₹20/order</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">STT/CTT</td><td className="p-4">0.1% on buy &amp; sell</td><td className="p-4">0.025% on sell side</td><td className="p-4">0.02% on sell side</td><td className="p-4 text-xs"><div className="mb-1">• 0.125% of intrinsic value on buy (exercised)</div><div>• 0.1% on sell side (on premium)</div></td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Transaction Charges</td><td className="p-4">NSE: 0.00297%<br/>BSE: 0.00375%</td><td className="p-4">NSE: 0.00297%<br/>BSE: 0.00375%</td><td className="p-4">NSE: 0.00173%<br/>BSE: 0</td><td className="p-4">NSE: 0.03503% (prem)<br/>BSE: 0.0325% (prem)</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">GST</td><td className="p-4" colSpan={4}>18% on (Brokerage + SEBI charges + Transaction charges)</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">SEBI Charges</td><td className="p-4" colSpan={4}>₹10 / crore + GST</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Stamp Charges</td><td className="p-4">0.015% or ₹1500/cr (buy)</td><td className="p-4">0.003% or ₹300/cr (buy)</td><td className="p-4">0.002% or ₹200/cr (buy)</td><td className="p-4">0.003% or ₹300/cr (buy)</td></tr>
                                </tbody>
                            </table>
                        )}
                        {segment === 'Currency' && (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-overlay/50 text-text-secondary uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 w-1/4">Charge Head</th>
                                        <th className="p-4 w-1/3">Currency Futures</th>
                                        <th className="p-4 w-1/3">Currency Options</th>
                                    </tr>
                                </thead>
                                <tbody className="text-text-primary divide-y divide-overlay">
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Brokerage</td><td className="p-4">0.03% or ₹20/executed order</td><td className="p-4">₹20/executed order</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">STT/CTT</td><td className="p-4">No STT</td><td className="p-4">No STT</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Transaction Charges</td><td className="p-4">NSE: 0.00035%<br/>BSE: 0.00045%</td><td className="p-4">NSE: 0.0311%<br/>BSE: 0.001%</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">GST</td><td className="p-4" colSpan={2}>18% on (Brokerage + SEBI charges + Transaction charges)</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">SEBI Charges</td><td className="p-4" colSpan={2}>₹10 / crore + GST</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Stamp Charges</td><td className="p-4">0.0001% or ₹10/cr (buy)</td><td className="p-4">0.0001% or ₹10/cr (buy)</td></tr>
                                </tbody>
                            </table>
                        )}
                        {segment === 'Commodity' && (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-overlay/50 text-text-secondary uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 w-1/4">Charge Head</th>
                                        <th className="p-4 w-1/3">Commodity Futures</th>
                                        <th className="p-4 w-1/3">Commodity Options</th>
                                    </tr>
                                </thead>
                                <tbody className="text-text-primary divide-y divide-overlay">
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Brokerage</td><td className="p-4">0.03% or ₹20/executed order</td><td className="p-4">₹20/executed order</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">STT/CTT</td><td className="p-4">0.01% on sell side (Non-Agri)</td><td className="p-4">0.05% on sell side</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Transaction Charges</td><td className="p-4">MCX: 0.0021%<br/>NSE: 0.0001%</td><td className="p-4">MCX: 0.0418%<br/>NSE: 0.001%</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">GST</td><td className="p-4" colSpan={2}>18% on (Brokerage + SEBI charges + Transaction charges)</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">SEBI Charges</td><td className="p-4">Agri: ₹1/cr<br/>Non-agri: ₹10/cr</td><td className="p-4">₹10 / crore</td></tr>
                                    <tr className="hover:bg-overlay/10"><td className="p-4 font-semibold text-muted">Stamp Charges</td><td className="p-4">0.002% or ₹200/cr (buy)</td><td className="p-4">0.003% or ₹300/cr (buy)</td></tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Charges Explained + Example */}
            <div className="px-6 max-w-6xl mx-auto w-full mb-16 grid lg:grid-cols-2 gap-12">
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-text-primary flex items-center">
                        <span className="w-1 h-8 bg-primary rounded-full mr-3"></span>
                        Charges Explained
                    </h2>
                    <ul className="space-y-4 text-sm">
                        {[
                            { title: 'STT/CTT', body: 'Tax by the government when transacting on the exchanges. Charged on both buy and sell sides for equity delivery. Charged only on sell side for intraday and F&O.' },
                            { title: 'Transaction / Turnover Charges', body: 'Charged by exchanges (NSE, BSE, MCX) on the value of your transactions.' },
                            { title: 'GST', body: '18% of (brokerage + transaction charges + SEBI charges).' },
                            { title: 'SEBI Charges', body: '₹10 per crore + GST levied by SEBI for market regulation.' },
                            { title: 'Stamp Charges', body: 'Charged by the Government of India under the Indian Stamp Act of 1899 on buy-side transactions.' },
                        ].map(({ title, body }) => (
                            <li key={title} className="bg-surface p-4 rounded-lg border border-overlay/50 shadow-md">
                                <strong className="block text-sm font-bold text-white mb-2 border-b border-overlay pb-2">{title}</strong>
                                <span className="text-gray-200 leading-relaxed">{body}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-6 text-text-primary flex items-center">
                        <span className="w-1 h-8 bg-success rounded-full mr-3"></span>
                        Margin &amp; Profit Calculation
                    </h2>
                    <div className="bg-surface p-6 rounded-xl border border-overlay shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <i className="fas fa-calculator text-9xl"></i>
                        </div>
                        <p className="text-sm text-text-secondary mb-6 leading-relaxed relative z-10">
                            On TraVirt you see "Gross Profit". In the real world your "Net Profit" is what remains after all charges are deducted.
                        </p>
                        <div className="bg-base rounded-lg p-4 border border-overlay relative z-10">
                            <h4 className="text-sm font-bold text-white mb-3 border-b border-overlay pb-2">Example: Intraday Equity Trade</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-muted">Buy 100 shares @ ₹1000</span><span className="text-text-primary">₹1,00,000</span></div>
                                <div className="flex justify-between"><span className="text-muted">Sell 100 shares @ ₹1010</span><span className="text-text-primary">₹1,01,000</span></div>
                                <div className="flex justify-between border-t border-dashed border-gray-600 pt-2 mt-2"><span className="font-bold text-success">Gross Profit</span><span className="font-bold text-success">₹1,000.00</span></div>
                                <div className="flex justify-between text-danger pt-1"><span>Brokerage × 2</span><span>- ₹40.00</span></div>
                                <div className="flex justify-between text-danger"><span>STT (0.025% on sell)</span><span>- ₹25.25</span></div>
                                <div className="flex justify-between text-danger"><span>Txn Charges (~0.003%)</span><span>- ₹6.00</span></div>
                                <div className="flex justify-between text-danger"><span>GST (18% on charges)</span><span>- ₹8.28</span></div>
                                <div className="flex justify-between text-danger"><span>Other (Stamp/SEBI)</span><span>- ₹3.20</span></div>
                                <div className="flex justify-between border-t-2 border-white pt-2 mt-2 text-sm"><span className="font-bold text-white">Net Realized Profit</span><span className="font-bold text-white">₹917.27</span></div>
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-muted italic flex items-center gap-2">
                            <i className="fas fa-info-circle"></i> Approximation for educational purposes.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── Partner Brokers ─────────────────────────────────────────────────────────

const ALICE_ANT_URL = 'https://ant.aliceblueonline.com/?appcode=lHLymQPeZV';

const BROKER_PARTNERS = [
    {
        name:      'Zerodha',
        tagline:   "India's largest discount broker",
        features:  [
            '₹0 equity delivery brokerage',
            'Flat ₹20 per order — intraday & F&O',
            'Kite — award-winning trading platform',
            'Coin for direct mutual funds',
        ],
        borderCls: 'border-blue-500',
        textCls:   'text-blue-400',
        url:       'https://zerodha.com/?c=ZS2944&s=CONSOLE',
        liveUrl:   null as string | null,
        badge:     null as string | null,
    },
    {
        name:      'Alice Blue',
        tagline:   'ANT Web platform · Integrated with TraVirt live feed',
        features:  [
            '₹0 equity delivery brokerage',
            'Flat ₹15 per order — intraday & F&O',
            'ANT Web & ANT Mobi platforms',
            'Live market data on TraVirt',
        ],
        borderCls: 'border-violet-500',
        textCls:   'text-violet-400',
        url:       'https://ekyc.aliceblueonline.com/?source=456512',
        liveUrl:   ALICE_ANT_URL,
        badge:     'TraVirt Integrated' as string | null,
    },
] as const;

const PartnerBrokersSection: React.FC = () => (
    <div className="flex flex-col items-center w-full py-10 px-6">
        {/* Hero */}
        <div className="text-center mb-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold px-3 py-1 rounded-full mb-4">
                <i className="fas fa-rocket text-xs" />
                Level up from virtual to real markets
            </div>
            <h1 className="text-4xl font-bold text-text-primary mb-3">Open a Real Trading Account</h1>
            <p className="text-muted text-base leading-relaxed">
                You've mastered virtual trading on TraVirt. Now take the next step — open a demat account with one of our trusted broker partners and trade with real money using the same strategies.
            </p>
        </div>

        {/* Broker Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-8">
            {BROKER_PARTNERS.map((b) => (
                <div
                    key={b.name}
                    className={`relative bg-surface rounded-xl border-2 ${b.borderCls} p-6 flex flex-col gap-5 hover:shadow-xl transition-all duration-300`}
                >
                    {b.badge && (
                        <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                            {b.badge}
                        </span>
                    )}
                    <div>
                        <h3 className={`text-2xl font-bold mb-1 ${b.textCls}`}>{b.name}</h3>
                        <p className="text-muted text-xs">{b.tagline}</p>
                    </div>
                    <ul className="space-y-2 flex-1">
                        {b.features.map((f) => (
                            <li key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                                <i className="fas fa-check-circle text-success text-xs flex-shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col gap-2 mt-1">
                        <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-center py-3 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-white transition-colors flex items-center justify-center gap-2"
                        >
                            Open Account Free
                            <i className="fas fa-external-link-alt text-xs" />
                        </a>
                        {b.liveUrl && (
                            <a
                                href={b.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full text-center py-2.5 rounded-lg font-semibold text-sm border border-violet-500 text-violet-400 hover:bg-violet-500/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-plug text-xs" />
                                Connect Live Feed (Existing Account)
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Info strip */}
        <div className="w-full max-w-3xl bg-surface border border-overlay rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <i className="fas fa-shield-alt text-success" />
            </div>
            <div className="flex-1 text-sm text-text-secondary leading-relaxed">
                Both brokers are <strong className="text-text-primary">SEBI-registered</strong> and offer <strong className="text-text-primary">₹0 equity delivery brokerage</strong> — the same fee structure simulated on TraVirt. Your account opening is completely free.
            </div>
        </div>

        <p className="text-center text-xs text-muted/50 mt-6 italic">
            TraVirt earns a referral commission when you open via these links — at no extra cost to you.
        </p>
    </div>
);

// ─── Calculator Tab (formerly BrokerageCalculatorScreen) ─────────────────────

type CalcTab = 'Equities' | 'Currency' | 'Commodities' | 'MTF';
type SubCategory = 'Intraday Equity' | 'Delivery Equity' | 'F&O Futures' | 'F&O Options' | 'Currency Futures' | 'Currency Options' | 'Commodity Futures' | 'Commodity Options';

interface CalcState {
    buy: number;
    sell: number;
    qty: number;
    exchange: 'NSE' | 'BSE' | 'MCX';
}

const CalculatorTab: React.FC = () => {
    const [activeTab, setActiveTab] = useState<CalcTab>('Equities');

    const CalcTabBtn: React.FC<{ name: CalcTab }> = ({ name }) => (
        <button
            onClick={() => setActiveTab(name)}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === name
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-text-primary hover:bg-overlay/30'
            }`}
        >
            {name}
        </button>
    );

    return (
        <>
            <div className="text-center py-8 px-6">
                <h1 className="text-3xl font-bold text-text-primary mb-2">Brokerage Calculator</h1>
                <p className="text-muted text-sm max-w-2xl mx-auto">
                    Calculate exactly how much brokerage, STT, and tax you'd pay on your trades.
                </p>
            </div>

            <div className="px-6 max-w-7xl mx-auto w-full mb-12">
                <div className="bg-surface rounded-lg border border-overlay shadow-lg overflow-hidden">
                    <div className="flex border-b border-overlay bg-base/50">
                        <CalcTabBtn name="Equities" />
                        <CalcTabBtn name="Currency" />
                        <CalcTabBtn name="Commodities" />
                        <CalcTabBtn name="MTF" />
                    </div>

                    <div className="p-6 overflow-x-auto">
                        <div className="flex gap-6 min-w-max pb-4 justify-center w-full">
                            {activeTab === 'Equities' && (
                                <>
                                    <CalculatorCard title="Intraday Equity"  type="Intraday Equity"  defaultBuy={1000}   defaultSell={1100}   defaultQty={400} />
                                    <CalculatorCard title="Delivery Equity"  type="Delivery Equity"  defaultBuy={1000}   defaultSell={1100}   defaultQty={400} />
                                    <CalculatorCard title="F&O — Futures"    type="F&O Futures"      defaultBuy={1000}   defaultSell={1100}   defaultQty={400} />
                                    <CalculatorCard title="F&O — Options"    type="F&O Options"      defaultBuy={100}    defaultSell={110}    defaultQty={400} />
                                </>
                            )}
                            {activeTab === 'Currency' && (
                                <>
                                    <CalculatorCard title="Currency Futures"  type="Currency Futures"  defaultBuy={88.33}  defaultSell={88.3525} defaultQty={1} lotSize={1000} />
                                    <CalculatorCard title="Currency Options"  type="Currency Options"  defaultBuy={0.25}   defaultSell={0.35}    defaultQty={1} lotSize={1000} />
                                </>
                            )}
                            {activeTab === 'Commodities' && (
                                <>
                                    <CalculatorCard title="Commodity Futures" type="Commodity Futures" defaultBuy={5800}   defaultSell={5820}   defaultQty={1} exchangeOverride="MCX" lotSize={100} />
                                    <CalculatorCard title="Commodity Options" type="Commodity Options" defaultBuy={100}    defaultSell={110}    defaultQty={1} exchangeOverride="MCX" lotSize={100} />
                                </>
                            )}
                            {activeTab === 'MTF' && (
                                <div className="w-full max-w-3xl">
                                    <MTFCalculatorCard />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── Standard Calculator Card ─────────────────────────────────────────────────

interface CalculatorCardProps {
    title: string;
    type: SubCategory;
    defaultBuy: number;
    defaultSell: number;
    defaultQty: number;
    exchangeOverride?: 'MCX';
    lotSize?: number;
}

const CalculatorCard: React.FC<CalculatorCardProps> = ({ title, type, defaultBuy, defaultSell, defaultQty, exchangeOverride, lotSize = 1 }) => {
    const [state, setState] = useState<CalcState>({ buy: defaultBuy, sell: defaultSell, qty: defaultQty, exchange: exchangeOverride ?? 'NSE' });

    const [results, setResults] = useState({ turnover: 0, brokerage: 0, stt: 0, exchangeTxn: 0, gst: 0, sebi: 0, stamp: 0, totalTax: 0, breakeven: 0, pnl: 0 });

    useEffect(() => { calculate(); }, [state]);

    const calculate = () => {
        const { buy, sell, qty, exchange } = state;
        const effectiveQty = qty * lotSize;
        const turnover = (buy + sell) * effectiveQty;
        let brokerage = 0, stt = 0, exchangeTxn = 0, stamp = 0;

        if (type === 'Intraday Equity') {
            brokerage   = Math.min(buy * effectiveQty * 0.0003, 20) + Math.min(sell * effectiveQty * 0.0003, 20);
            stt         = sell * effectiveQty * 0.00025;
            exchangeTxn = turnover * (exchange === 'NSE' ? 0.0000297 : 0.0000375);
            stamp       = buy * effectiveQty * 0.00003;
        } else if (type === 'Delivery Equity') {
            brokerage   = 0;
            stt         = turnover * 0.001;
            exchangeTxn = turnover * (exchange === 'NSE' ? 0.0000297 : 0.0000375);
            stamp       = buy * effectiveQty * 0.00015;
        } else if (type === 'F&O Futures') {
            brokerage   = Math.min(buy * effectiveQty * 0.0003, 20) + Math.min(sell * effectiveQty * 0.0003, 20);
            stt         = sell * effectiveQty * 0.0002;
            exchangeTxn = exchange === 'NSE' ? turnover * 0.0000173 : 0;
            stamp       = buy * effectiveQty * 0.00002;
        } else if (type === 'F&O Options') {
            brokerage   = 40;
            stt         = sell * effectiveQty * 0.001;
            exchangeTxn = turnover * (exchange === 'NSE' ? 0.0003503 : 0.000325);
            stamp       = buy * effectiveQty * 0.00003;
        } else if (type === 'Currency Futures') {
            brokerage   = Math.min(buy * effectiveQty * 0.0003, 20) + Math.min(sell * effectiveQty * 0.0003, 20);
            stt         = 0;
            exchangeTxn = turnover * (exchange === 'NSE' ? 0.0000035 : 0.0000045);
            stamp       = buy * effectiveQty * 0.000001;
        } else if (type === 'Currency Options') {
            brokerage   = 40;
            stt         = 0;
            exchangeTxn = turnover * (exchange === 'NSE' ? 0.000311 : 0.00001);
            stamp       = buy * effectiveQty * 0.000001;
        } else if (type === 'Commodity Futures') {
            brokerage   = Math.min(buy * effectiveQty * 0.0003, 20) + Math.min(sell * effectiveQty * 0.0003, 20);
            stt         = sell * effectiveQty * 0.0001;
            exchangeTxn = turnover * 0.000021;
            stamp       = buy * effectiveQty * 0.00002;
        } else if (type === 'Commodity Options') {
            brokerage   = 40;
            stt         = sell * effectiveQty * 0.0005;
            exchangeTxn = turnover * 0.000418;
            stamp       = buy * effectiveQty * 0.00003;
        }

        const sebi     = turnover * 0.000001;
        const gst      = (brokerage + sebi + exchangeTxn) * 0.18;
        const totalTax = brokerage + stt + exchangeTxn + gst + sebi + stamp;
        const netPnl   = (sell - buy) * effectiveQty - totalTax;
        const breakeven = effectiveQty > 0 ? totalTax / effectiveQty : 0;

        setResults({ turnover, brokerage, stt, exchangeTxn, gst, sebi, stamp, totalTax, breakeven, pnl: netPnl });
    };

    const InputRow = ({ label, val, setter }: { label: string; val: number; setter: (v: number) => void }) => (
        <div className="flex-1">
            <label className="block text-[10px] font-bold text-muted mb-1 uppercase">{label}</label>
            <input type="number" value={val} onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                className="w-full bg-base border border-overlay rounded p-2 text-sm text-text-primary focus:border-primary outline-none transition-colors" />
        </div>
    );

    const ResultRow = ({ label, value, isTotal }: { label: string; value: string; isTotal?: boolean }) => (
        <div className={`flex justify-between py-1.5 text-xs border-b border-overlay last:border-0 ${isTotal ? 'font-bold bg-overlay/20 px-2 rounded mt-2' : ''}`}>
            <span className={isTotal ? 'text-text-primary' : 'text-muted'}>{label}</span>
            <span className={isTotal ? 'text-text-primary' : 'text-text-secondary'}>{value}</span>
        </div>
    );

    return (
        <div className="bg-surface border border-overlay rounded-xl w-[380px] shrink-0 flex flex-col shadow-xl">
            <div className="p-4 border-b border-overlay bg-base/30 rounded-t-xl">
                <h3 className="font-bold text-text-primary text-center">{title}</h3>
                {lotSize > 1 && <p className="text-[10px] text-muted text-center mt-1">(Lot Size: {lotSize})</p>}
            </div>

            <div className="p-4 space-y-4">
                <div className="flex gap-3">
                    <InputRow label="Buy Price"  val={state.buy}  setter={(v) => setState({ ...state, buy: v })} />
                    <InputRow label="Sell Price" val={state.sell} setter={(v) => setState({ ...state, sell: v })} />
                    <InputRow label="Qty (Lots)" val={state.qty}  setter={(v) => setState({ ...state, qty: v })} />
                </div>

                {!exchangeOverride && (
                    <div className="flex justify-center gap-6 py-1">
                        {(['NSE', 'BSE'] as const).map(ex => (
                            <label key={ex} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={state.exchange === ex} onChange={() => setState({ ...state, exchange: ex })} className="accent-primary" />
                                <span className="text-xs font-bold text-text-secondary">{ex}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="space-y-1 pt-2">
                    <ResultRow label="Turnover"              value={formatCurrency(results.turnover)} />
                    <div className="text-[10px] text-muted text-center pt-2 pb-1 uppercase font-bold tracking-wider">Tax &amp; Charges</div>
                    <ResultRow label="Brokerage"             value={formatCurrency(results.brokerage)} />
                    <ResultRow label="STT/CTT"               value={formatCurrency(results.stt)} />
                    <ResultRow label="Exchange Txn Charge"   value={formatCurrency(results.exchangeTxn)} />
                    <ResultRow label="GST"                   value={formatCurrency(results.gst)} />
                    <ResultRow label="SEBI Charges"          value={formatCurrency(results.sebi)} />
                    <ResultRow label="Stamp Duty"            value={formatCurrency(results.stamp)} />
                    <ResultRow label="Total Tax &amp; Charges" value={formatCurrency(results.totalTax)} isTotal />
                    <ResultRow label="Points to Breakeven"   value={results.breakeven.toFixed(4)} />
                </div>

                <div className="bg-base border border-overlay rounded-lg p-3 text-center mt-4">
                    <span className="text-xs text-muted font-bold uppercase block mb-1">Net P&amp;L</span>
                    <span className={`text-xl font-bold ${results.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {results.pnl >= 0 ? '+' : ''}{formatCurrency(results.pnl)}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── MTF Calculator Card ──────────────────────────────────────────────────────

const MTFCalculatorCard: React.FC = () => {
    const [investedAmount, setInvestedAmount] = useState(10000);
    const [daysHeld,       setDaysHeld]       = useState(10);
    const [expectedReturn, setExpectedReturn] = useState(10);

    const INTEREST_RATE = 0.0004; // 0.04% per day
    const GST_RATE      = 0.18;
    const PLEDGE_CHARGE = 15;

    const fundedAmount   = investedAmount;
    const totalBuyValue  = investedAmount + fundedAmount;
    const sellValue      = totalBuyValue * (1 + expectedReturn / 100);

    const interestCost    = fundedAmount * INTEREST_RATE * daysHeld;
    const brokerageBuy    = Math.min(totalBuyValue * 0.003, 20);
    const brokerageSell   = Math.min(sellValue * 0.003, 20);
    const totalBrokerage  = brokerageBuy + brokerageSell;
    const pledgeCharges   = (PLEDGE_CHARGE + PLEDGE_CHARGE * GST_RATE) * 2;
    const totalCharges    = totalBrokerage + pledgeCharges + interestCost;

    const grossProfit = sellValue - totalBuyValue;
    const netPnl      = grossProfit - totalCharges;
    const pnlPercent  = (netPnl / investedAmount) * 100;

    const SliderInput = ({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) => (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-text-primary text-sm">{label}</label>
                <div className="bg-base border border-overlay rounded px-3 py-1 text-sm font-mono text-primary w-32 text-right">
                    {suffix === '₹' ? formatCurrency(value).replace('₹', '') : value} <span className="text-muted text-xs">{suffix}</span>
                </div>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-overlay rounded-lg appearance-none cursor-pointer accent-primary" />
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row gap-6 text-sm">
            <div className="flex-1 bg-surface p-6 rounded-lg border border-overlay shadow-lg">
                <SliderInput label="Invested Amount" value={investedAmount} min={1000}  max={1000000} step={1000} suffix="₹"    onChange={setInvestedAmount} />
                <SliderInput label="Days held"        value={daysHeld}       min={1}     max={365}     step={1}    suffix="Days"  onChange={setDaysHeld} />
                <SliderInput label="Expected Return"  value={expectedReturn} min={-50}   max={100}     step={1}    suffix="%"    onChange={setExpectedReturn} />

                <div className="mt-6 p-4 bg-overlay/30 rounded-lg">
                    <h4 className="font-bold text-text-primary mb-3">Breakdown</h4>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-muted"><span>Interest (0.04%/day)</span><span>{formatCurrency(interestCost)}</span></div>
                        <div className="flex justify-between text-muted"><span>Brokerage (Buy + Sell)</span><span>{formatCurrency(totalBrokerage)}</span></div>
                        <div className="flex justify-between text-muted"><span>Pledge Charges (est.)</span><span>{formatCurrency(pledgeCharges)}</span></div>
                        <div className="flex justify-between font-bold text-text-secondary border-t border-gray-600 pt-2 mt-2"><span>Total Charges</span><span>{formatCurrency(totalCharges)}</span></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-surface p-4 rounded-lg border border-overlay text-center"><p className="text-xs text-muted mb-1">Your Investment</p><p className="font-bold text-orange-500">{formatCurrency(investedAmount)}</p></div>
                    <div className="bg-surface p-4 rounded-lg border border-overlay text-center"><p className="text-xs text-muted mb-1">Funded by TraVirt</p><p className="font-bold text-primary">{formatCurrency(fundedAmount)}</p></div>
                    <div className="bg-surface p-4 rounded-lg border border-overlay text-center"><p className="text-xs text-muted mb-1">Total Buy Value</p><p className="font-bold text-text-primary">{formatCurrency(totalBuyValue)}</p></div>
                </div>

                <div className="bg-surface p-6 rounded-lg border border-overlay shadow-lg">
                    <h3 className="text-lg font-bold text-text-primary mb-6">Result</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-base rounded border border-overlay"><span className="text-muted">Applicable Interest</span><span className="font-bold text-text-primary">{formatCurrency(interestCost)}</span></div>
                        <div className="flex justify-between items-center p-3 bg-base rounded border border-overlay"><span className="text-muted">Brokerage + Charges</span><span className="font-bold text-text-primary">{formatCurrency(totalCharges - interestCost)}</span></div>
                        <div className="flex justify-between items-center p-4 bg-base rounded border border-overlay">
                            <span className="text-muted font-bold">Net Profit &amp; Loss</span>
                            <div className="text-right">
                                <p className={`text-xl font-bold ${netPnl >= 0 ? 'text-success' : 'text-danger'}`}>{netPnl >= 0 ? '+' : ''}{formatCurrency(netPnl)}</p>
                                <p className={`text-xs ${pnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>{pnlPercent >= 0 ? '▲' : '▼'} {pnlPercent.toFixed(2)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrokerageScreen;
