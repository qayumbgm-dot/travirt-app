
import React from 'react';

interface HowItWorksScreenProps {
    onBack: () => void;
}

const StepCard: React.FC<{ num: string; title: string; desc: string; icon: string }> = ({ num, title, desc, icon }) => (
    <div className="relative p-6 bg-surface border border-overlay rounded-xl text-center group hover:border-primary transition-all duration-300">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg">
            {num}
        </div>
        <div className="mt-4 mb-4 text-primary text-4xl group-hover:scale-110 transition-transform duration-300">
            <i className={`fas ${icon}`}></i>
        </div>
        <h3 className="text-xl font-bold mb-2 text-text-primary">{title}</h3>
        <p className="text-muted text-sm">{desc}</p>
    </div>
);

const FeatureGridItem: React.FC<{ title: string; desc: string; color: string }> = ({ title, desc, color }) => (
    <div className="p-6 bg-surface rounded-xl border-l-4 shadow-lg hover:shadow-glow-blue transition-all" style={{ borderColor: color }}>
        <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
        <p className="text-sm text-muted">{desc}</p>
    </div>
);

const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({ onBack }) => {
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
                <h1 className="text-4xl lg:text-6xl font-bold mb-6">How It <span className="text-success">Works</span></h1>
                <p className="text-xl text-muted max-w-2xl mx-auto">
                    Simple, interactive, and intelligent platform where you can trade equities, futures, options in real-time with virtual money.
                </p>
            </header>

            {/* Steps */}
            <section className="container mx-auto px-6 mb-20">
                <div className="grid md:grid-cols-4 gap-8">
                    <StepCard num="1" title="Register Free" desc="Registration is absolutely free and takes less than 1 minute." icon="fa-user-plus" />
                    <StepCard num="2" title="Login" desc="Login using your mobile number and access pin." icon="fa-sign-in-alt" />
                    <StepCard num="3" title="Search Instruments" desc="Search equities, Futures, or Options." icon="fa-search" />
                    <StepCard num="4" title="Start Trading" desc="Trade exactly like real trading with full margins." icon="fa-chart-line" />
                </div>
            </section>

            {/* Detailed Features Grid */}
            <section className="bg-overlay/20 py-20">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureGridItem 
                            title="Choose Instruments"
                            desc="Search for equities/futures/options of your choice and add them to your watchlist. View charts and initiate buy/sell trade with a click."
                            color="#60A5FA"
                        />
                        <FeatureGridItem 
                            title="Placing Orders"
                            desc="Click Buy/Sell, make selection, and hit trade. Preferences are saved. Set stop-loss and target profit easily."
                            color="#F472B6"
                        />
                        <FeatureGridItem 
                            title="Invest Amount"
                            desc="No lot-size calculators required. Just enter the amount or percentage of capital to invest."
                            color="#34D399"
                        />
                        <FeatureGridItem 
                            title="Auto Calculation"
                            desc="Calculation of quantity is time-consuming. Select auto calculate quantity and TraVirt does it for you."
                            color="#FBBF24"
                        />
                        <FeatureGridItem 
                            title="Real-time Execution"
                            desc="System reads the order book in real-time and executes the order (virtually) as per the actual bid/offer prices."
                            color="#A78BFA"
                        />
                        <FeatureGridItem 
                            title="Trade Triggers"
                            desc="With innovative stop-limit orders, set trigger to enter trades by tracking instrument or parent price."
                            color="#F87171"
                        />
                    </div>
                </div>
            </section>

            {/* Video Section Placeholder */}
            <section className="py-20 px-6 container mx-auto text-center">
                <div className="bg-surface p-8 rounded-2xl border border-overlay max-w-4xl mx-auto shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6">Become a Professional Trader</h2>
                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative group cursor-pointer overflow-hidden">
                        <img src="https://via.placeholder.com/800x450/111/333?text=Video+Thumbnail" alt="Video" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <i className="fas fa-play text-primary ml-1 text-2xl"></i>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HowItWorksScreen;
