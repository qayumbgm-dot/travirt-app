
import React, { useState } from 'react';
import { MOCK_STOCKS } from '../constants';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import UpgradePrompt from '../components/billing/UpgradePrompt';

interface Props {
    onUpgrade?: () => void;
}

const SellingPressureScreen: React.FC<Props> = ({ onUpgrade }) => {
    const { features, isLoading: subLoading } = useSubscription();
    if (!subLoading && !features.propFirmReports) {
        return <UpgradePrompt feature="Selling Pressure" requiredPlan="Pro" onUpgrade={onUpgrade} />;
    }
    const { showToast } = useToast();
    const [showPreviousDay, setShowPreviousDay] = useState(false);

    // Filter some mock stocks to display as "Previous Day" data
    const previousDayStocks = MOCK_STOCKS.filter(s => s.change < 0).slice(0, 5);

    return (
        <div className="flex flex-col h-full bg-base animate-fade-in relative">
            {/* Header Section - Matches Screenshot Green Color */}
            <div className="bg-success text-white p-4 shadow-md shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        <h2 className="text-lg font-bold">Stocks with Selling Pressure</h2>
                        <p className="text-xs md:text-sm mt-1 opacity-90 font-medium">
                            This screener uses volume, traded quantity in stocks resulting in the downward price movement. Using the AI, it computes the stocks with high probability of selling pressure.
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[10px] md:text-xs font-bold bg-white/20 px-2 py-1 rounded inline-block italic">
                            Calculation is done at 9:30 am once in a day
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
                
                {/* Disclaimer - Matches Screenshot Red Text */}
                <div className="w-full max-w-5xl text-center mb-12">
                    <p className="text-danger italic text-xs md:text-sm leading-relaxed">
                        * Please note: This is a screener purely based on technical indicators and <strong className="font-bold">not a recommendation to buy or sell stocks</strong>. We use the last traded volume, it's effect on the price movement and compute it using our Artificial Intelligence Models to gauge the probability of selling pressure in a stock. <strong className="font-bold">It is purely for the educational purpose.</strong>
                    </p>
                </div>

                {!showPreviousDay ? (
                    /* Initial View: 9:30 AM Message */
                    <div className="flex flex-col items-center justify-center text-center space-y-8 animate-fade-in max-w-3xl">
                        <div className="space-y-3">
                            <h3 className="text-xl md:text-2xl font-medium text-text-primary">
                                The calculation is done at 9:30 am once in a day.
                            </h3>
                            <h3 className="text-xl md:text-2xl font-medium text-text-primary">
                                You are seeing this message because, you are looking at this screener before 9:30am.
                            </h3>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            <button 
                                onClick={() => setShowPreviousDay(true)}
                                className="bg-success hover:bg-green-600 text-white px-6 py-2.5 rounded shadow-lg transition-all font-semibold text-sm transform hover:scale-105"
                            >
                                Previous Day Stocks
                            </button>
                            <button 
                                onClick={() => showToast('Reminder set! We will notify you at 9:30 AM.', 'success')}
                                className="bg-success hover:bg-green-600 text-white px-6 py-2.5 rounded shadow-lg transition-all font-semibold text-sm transform hover:scale-105"
                            >
                                Remind me when Stocks are available to See
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Previous Day Stocks List View */
                    <div className="w-full max-w-5xl animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-text-primary">Previous Day Results</h3>
                            <button onClick={() => setShowPreviousDay(false)} className="text-primary hover:underline text-sm font-semibold">
                                &larr; Back
                            </button>
                        </div>
                        
                        <div className="bg-surface rounded-lg shadow-lg overflow-hidden border border-overlay">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-overlay text-muted uppercase text-xs">
                                    <tr>
                                        <th className="p-4 font-semibold">Symbol</th>
                                        <th className="p-4 font-semibold text-right">Close Price</th>
                                        <th className="p-4 font-semibold text-right">Change</th>
                                        <th className="p-4 font-semibold text-right">Volume</th>
                                        <th className="p-4 font-semibold text-right">Pressure Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previousDayStocks.map((stock, index) => (
                                        <tr key={stock.symbol} className="border-b border-overlay last:border-b-0 hover:bg-overlay/30 transition-colors">
                                            <td className="p-4 font-bold text-text-primary">{stock.symbol}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(stock.ltp)}</td>
                                            <td className="p-4 text-right text-danger font-bold">
                                                {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                                            </td>
                                            <td className="p-4 text-right text-muted">
                                                {(stock.volume || 0).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="bg-danger/20 text-danger px-2 py-1 rounded text-xs font-bold">
                                                    HIGH {(90 - index * 5)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellingPressureScreen;
