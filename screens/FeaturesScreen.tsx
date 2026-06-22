
import React from 'react';

interface FeaturesScreenProps {
    onBack: () => void;
}

const FeatureRow: React.FC<{ title: string; desc: string; icon: string; reverse?: boolean }> = ({ title, desc, icon, reverse }) => (
    <div className={`flex flex-col md:flex-row items-center gap-12 py-16 ${reverse ? 'md:flex-row-reverse' : ''}`}>
        <div className="flex-1 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-2xl mb-4">
                <i className={`fas ${icon}`}></i>
            </div>
            <h3 className="text-3xl font-bold text-text-primary">{title}</h3>
            <p className="text-lg text-muted leading-relaxed">{desc}</p>
        </div>
        <div className="flex-1 w-full">
            <div className="bg-surface border border-overlay rounded-xl p-8 aspect-video flex items-center justify-center shadow-2xl">
                {/* Placeholder for feature visualization */}
                <i className={`fas ${icon} text-6xl text-overlay`}></i>
            </div>
        </div>
    </div>
);

const FeaturesScreen: React.FC<FeaturesScreenProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-base text-text-primary font-sans overflow-y-auto custom-scrollbar">
            <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur border-b border-overlay px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <span className="text-xl font-bold tracking-wider">TraVirt</span>
                </div>
                <button onClick={onBack} className="text-sm font-semibold text-text-secondary hover:text-white transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Back to Home
                </button>
            </nav>

            <header className="py-20 px-6 text-center container mx-auto">
                <h1 className="text-4xl lg:text-6xl font-bold mb-6">Our Excellent <span className="text-primary">Features</span></h1>
                <p className="text-xl text-muted max-w-2xl mx-auto">
                    Designed by stock trading veterans to help you analyze markets, gain insights, and trade faster for profitable trading.
                </p>
            </header>

            <div className="container mx-auto px-6 pb-20">
                <FeatureRow 
                    title="Real-Time Market Feed"
                    desc="The market feed is real (second by second). It is because of this all the P/L, taxes, and fees are displayed in real-time while the trades are active. No other platform shows these."
                    icon="fa-bolt"
                />
                <FeatureRow 
                    title="Auto-Limit Orders"
                    desc="A unique feature where you can set the target price (in percentage) and the time you want to wait. For e.g. you can create a limit order by setting the entry price 1% below the current running LTP and wait for 10 minutes."
                    icon="fa-stopwatch"
                    reverse
                />
                <FeatureRow 
                    title="AI Based Options Trader"
                    desc="If you are trading in options, finding the best options in terms of their volume or spread is a daunting task. With Options trader, you just buy/sell and the rest will be done by the AI working in the background."
                    icon="fa-robot"
                />
                <FeatureRow 
                    title="Powerful Options Analyzer"
                    desc="If you are trading in options, the Options analyzer will give you the real-time market movement of options of the selected index/equity."
                    icon="fa-chart-pie"
                    reverse
                />
                <FeatureRow 
                    title="Dashboard & Analytics"
                    desc="Real-time display of dashboard containing the number of trades, taxes, fee, gross and net profit. View current day summary in real-time to help you analyze your performance."
                    icon="fa-tachometer-alt"
                />
            </div>
        </div>
    );
};

export default FeaturesScreen;
