
import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';

const FundsScreen: React.FC = () => {
    const { portfolio, addInr, buyNfino, convertNfinoToVirtual, claimDailyBonus } = usePortfolio();
    const { showToast } = useToast();
    const [inrToAdd, setInrToAdd] = useState(1000);
    const [nxoToBuy, setNxoToBuy] = useState(100);
    const [nxoToConvert, setNxoToConvert] = useState(50);

    const handleAddInr = (e: React.FormEvent) => {
        e.preventDefault();
        addInr(inrToAdd);
        showToast(`${formatCurrency(inrToAdd)} added to your INR Wallet.`, 'success');
    };

    const handleBuyNfino = (e: React.FormEvent) => {
        e.preventDefault();
        if (buyNfino(nxoToBuy)) {
            showToast(`${nxoToBuy} NXO purchased successfully.`, 'success');
        } else {
            showToast('Insufficient INR balance to buy NXO.', 'error');
        }
    };

    const handleConvertNfino = (e: React.FormEvent) => {
        e.preventDefault();
        if (convertNfinoToVirtual(nxoToConvert)) {
            showToast(`${nxoToConvert} NXO converted to ${formatCurrency(nxoToConvert * 1000, 0)} virtual balance.`, 'success');
        } else {
            showToast('Insufficient NXO balance to convert.', 'error');
        }
    };

    const handleClaimBonus = () => {
        if (claimDailyBonus()) {
            showToast('50 NXO daily bonus claimed!', 'success');
        } else {
            showToast('Daily bonus already claimed. Come back tomorrow!', 'warning');
        }
    };

    const InfoCard: React.FC<{ title: string; value: string | number; icon: string; isVirtual?: boolean }> = ({ title, value, icon, isVirtual }) => (
        <div className="bg-surface rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-2">
                <i className={`fas ${icon} text-primary text-xl mr-4`}></i>
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            </div>
            <p className={`text-4xl font-bold ${isVirtual ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
        </div>
    );
    
    const ActionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="bg-surface rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-text-primary mb-4">{title}</h3>
            {children}
        </div>
    );

    return (
        <main className="animate-fade-in text-text-primary p-6">
            <header className="mb-8">
                <h1 className="text-4xl font-bold">Funds & Token Economy</h1>
                <p className="text-muted mt-2">Manage your funds, purchase NFINO (NXO) tokens, and convert them into virtual trading balance.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <InfoCard title="INR Wallet" value={formatCurrency(portfolio.inrBalance)} icon="fa-wallet" />
                <InfoCard title="NFINO Tokens (NXO)" value={portfolio.nxoBalance.toLocaleString()} icon="fa-coins" />
                <InfoCard title="Virtual Trading Balance" value={formatCurrency(portfolio.virtualBalance)} icon="fa-chart-line" isVirtual />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Actions */}
                <div className="space-y-6">
                    <ActionCard title="Earn NXO (Rewards)">
                        <p className="text-sm text-muted mb-4">Complete tasks to earn free NXO tokens.</p>
                        <div className="flex items-center justify-between p-4 bg-overlay rounded-lg">
                            <div>
                                <p className="font-semibold">Daily Login Bonus</p>
                                <p className="text-sm text-primary font-bold">+ 50 NXO</p>
                            </div>
                            <button 
                                onClick={handleClaimBonus}
                                disabled={portfolio.dailyBonusClaimed}
                                className="bg-yellow-500 text-yellow-900 font-bold py-2 px-4 rounded-md hover:bg-yellow-400 transition disabled:bg-gray-600 disabled:text-muted disabled:cursor-not-allowed"
                            >
                                {portfolio.dailyBonusClaimed ? 'Claimed' : 'Claim'}
                            </button>
                        </div>
                    </ActionCard>
                    <ActionCard title="Manage Funds & Tokens">
                        <div className="space-y-6">
                            {/* Add INR */}
                            <div>
                                <h4 className="font-semibold mb-2">Step 1: Add Funds (INR)</h4>
                                <form onSubmit={handleAddInr} className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
                                        <input type="number" value={inrToAdd} onChange={(e) => setInrToAdd(Number(e.target.value))} min="100" step="100" className="w-full bg-overlay border border-gray-600 rounded-md p-2 text-text-primary"/>
                                    </div>
                                    <button type="submit" className="bg-success text-white font-semibold py-2 px-4 rounded-md h-10">Add INR</button>
                                </form>
                            </div>
                            {/* Buy NXO */}
                            <div>
                                <h4 className="font-semibold mb-2">Step 2: Buy NXO <span className="text-xs text-muted">(₹1 = 1 NXO)</span></h4>
                                <form onSubmit={handleBuyNfino} className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-medium text-text-secondary mb-1">NXO to Buy</label>
                                        <input type="number" value={nxoToBuy} onChange={(e) => setNxoToBuy(Number(e.target.value))} min="1" className="w-full bg-overlay border border-gray-600 rounded-md p-2 text-text-primary"/>
                                    </div>
                                    <button type="submit" className="bg-primary text-white font-semibold py-2 px-4 rounded-md h-10">Buy NXO</button>
                                </form>
                            </div>
                            {/* Convert NXO */}
                             <div>
                                <h4 className="font-semibold mb-2">Step 3: Convert NXO <span className="text-xs text-muted">(1 NXO = 1,000 Virtual)</span></h4>
                                 <form onSubmit={handleConvertNfino} className="flex items-end gap-2">
                                     <div className="flex-grow">
                                        <label className="block text-xs font-medium text-text-secondary mb-1">NXO to Convert</label>
                                        <input type="number" value={nxoToConvert} onChange={(e) => setNxoToConvert(Number(e.target.value))} min="1" className="w-full bg-overlay border border-gray-600 rounded-md p-2 text-text-primary"/>
                                    </div>
                                    <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-md h-10">Convert</button>
                                </form>
                            </div>
                        </div>
                    </ActionCard>
                </div>

                {/* Right side: Transaction History */}
                <ActionCard title="Transaction History">
                    {portfolio.transactionHistory.length > 0 ? (
                        <ul className="space-y-2 max-h-[40rem] overflow-y-auto pr-2 custom-scrollbar">
                            {portfolio.transactionHistory.map(tx => (
                                <li key={tx.id} className="flex justify-between items-center p-3 bg-overlay rounded-md">
                                    <div>
                                        <p className="font-semibold">{tx.description}</p>
                                        <p className="text-xs text-muted">{new Date(tx.timestamp).toLocaleString()}</p>
                                    </div>
                                    <p className={`font-bold ${tx.amount.startsWith('+') ? 'text-success' : 'text-danger'}`}>{tx.amount}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center py-8 text-muted">No transactions yet.</p>
                    )}
                </ActionCard>
            </div>
        </main>
    );
};

export default FundsScreen;