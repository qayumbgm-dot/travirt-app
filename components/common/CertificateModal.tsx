
import React from 'react';
import { createPortal } from 'react-dom';

interface CertificateModalProps {
    startDate: string;
    profitPct: number;
    consistencyScore: number;
    tradingDays: number;
    onClose: () => void;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
    startDate, profitPct, consistencyScore, tradingDays, onClose,
}) => {
    const passDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const startDateFmt = new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const handlePrint = () => {
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>TraVirt Performance Certificate</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#f0f4ff;padding:60px;color:#0a1628}
.cert{background:#fff;border:3px solid #2563eb;border-radius:16px;padding:60px;max-width:800px;margin:0 auto;text-align:center}
.logo{font-size:20px;font-weight:bold;color:#2563eb;letter-spacing:.05em;margin-bottom:4px}
.title{font-size:34px;font-weight:bold;color:#1d4ed8;margin:8px 0}
.subtitle{font-size:15px;color:#64748b;margin-bottom:36px}
.stamp{font-size:52px;margin:20px 0}
.preamble{font-size:13px;color:#64748b;margin-bottom:8px}
.name{font-size:26px;font-weight:bold;color:#0f172a;border-bottom:2px solid #2563eb;display:inline-block;padding-bottom:6px;margin-bottom:16px}
.desc{font-size:13px;color:#475569;line-height:1.7;margin-bottom:28px}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:0 auto 28px;max-width:480px}
.metric{background:#f8fafc;border-radius:8px;padding:16px 8px;border:1px solid #e2e8f0}
.metric-val{font-size:26px;font-weight:bold;color:#2563eb}
.metric-lbl{font-size:10px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.08em}
.dates{font-size:12px;color:#64748b;margin-bottom:28px}
.divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
.footer{font-size:11px;color:#94a3b8}
</style></head><body><div class="cert">
<div class="logo">TRAVIRT</div>
<div class="title">Certificate of Achievement</div>
<div class="subtitle">30-Day Consistency Challenge</div>
<div class="stamp">&#127942;</div>
<p class="preamble">This certifies that</p>
<div class="name">TraVirt Trader</div>
<p class="desc">has successfully completed the TraVirt 30-Day Consistency Challenge,<br>
demonstrating disciplined risk management and consistent trading performance<br>
that meets prop firm evaluation standards.</p>
<div class="metrics">
<div class="metric"><div class="metric-val">${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}%</div><div class="metric-lbl">Profit Achieved</div></div>
<div class="metric"><div class="metric-val">${tradingDays}</div><div class="metric-lbl">Trading Days</div></div>
<div class="metric"><div class="metric-val">${consistencyScore.toFixed(0)}/100</div><div class="metric-lbl">Consistency Score</div></div>
</div>
<p class="dates">Challenge started: ${startDateFmt} &nbsp;&middot;&nbsp; Certified: ${passDate}</p>
<hr class="divider">
<p class="footer">TraVirt Virtual Trading Platform &nbsp;&middot;&nbsp; Informational certificate for educational purposes only.<br>Does not represent real trading performance or constitute a financial qualification.</p>
</div></body></html>`);
        w.document.close();
        w.print();
        w.close();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl border-2 border-primary/40 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-overlay bg-gradient-to-r from-primary/10 to-success/10">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-certificate text-yellow-400 text-2xl"></i>
                        <div>
                            <p className="font-bold text-text-primary">Certificate of Achievement</p>
                            <p className="text-xs text-muted">30-Day Consistency Challenge</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text-primary p-1 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Certificate body */}
                <div className="p-8 text-center">
                    <div className="text-5xl mb-4">&#127942;</div>

                    <p className="text-muted text-sm mb-2">This certifies that</p>
                    <p className="text-2xl font-bold text-text-primary border-b-2 border-primary/40 inline-block pb-2 mb-4">
                        TraVirt Trader
                    </p>

                    <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-md mx-auto">
                        has successfully completed the TraVirt 30-Day Consistency Challenge, demonstrating
                        disciplined risk management and consistent trading performance that meets prop firm evaluation standards.
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
                        <div className="bg-base rounded-lg p-4 border border-overlay">
                            <p className="text-2xl font-bold text-success">{profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%</p>
                            <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">Profit</p>
                        </div>
                        <div className="bg-base rounded-lg p-4 border border-overlay">
                            <p className="text-2xl font-bold text-primary">{tradingDays}</p>
                            <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">Trading Days</p>
                        </div>
                        <div className="bg-base rounded-lg p-4 border border-overlay">
                            <p className="text-2xl font-bold text-yellow-400">{consistencyScore.toFixed(0)}/100</p>
                            <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">Consistency</p>
                        </div>
                    </div>

                    <p className="text-xs text-muted mb-6">
                        Started: {startDateFmt} &nbsp;&middot;&nbsp; Certified: {passDate}
                    </p>

                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="bg-primary hover:bg-primary-focus text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-print"></i>
                            Print Certificate
                        </button>
                        <button
                            onClick={onClose}
                            className="border border-overlay text-muted hover:text-text-primary font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-overlay text-center">
                    <p className="text-[10px] text-muted">
                        TraVirt Virtual Trading Platform &nbsp;&middot;&nbsp; Informational certificate for educational purposes only.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CertificateModal;
