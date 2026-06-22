
import React from 'react';

interface CoursesScreenProps {
    onBack: () => void;
}

const CoursesScreen: React.FC<CoursesScreenProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-base text-text-primary font-sans overflow-y-auto custom-scrollbar">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur border-b border-overlay px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <span className="text-xl font-bold tracking-wider">TraVirt</span>
                </div>
                <button onClick={onBack} className="text-sm font-semibold text-text-secondary hover:text-white transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Back to Home
                </button>
            </nav>

            {/* Hero */}
            <section className="relative py-20 px-6 bg-surface overflow-hidden">
                <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
                            The Only Data-Backed Trading <span className="text-primary">Course</span> You'll Ever Need
                        </h1>
                        <p className="text-lg text-muted mb-8">
                            Built from <span className="text-white font-bold">1 Million+ Real Trades</span>. Learn smart entries, liquidity traps, and precision setups without risking a single rupee.
                        </p>
                        <button className="bg-success hover:bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-transform active:scale-95">
                            Buy This Course <i className="fas fa-angle-right ml-2"></i>
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                        <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl border border-overlay aspect-video flex items-center justify-center group cursor-pointer">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                                <i className="fas fa-play text-white text-2xl ml-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 border-y border-overlay bg-base">
                <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div className="text-4xl font-bold text-white mb-1">24</div>
                        <div className="text-muted text-sm uppercase tracking-wider">Video Modules</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-white mb-1">10+</div>
                        <div className="text-muted text-sm uppercase tracking-wider">Hours Content</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-white mb-1">1M+</div>
                        <div className="text-muted text-sm uppercase tracking-wider">Trades Analyzed</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-white mb-1">∞</div>
                        <div className="text-muted text-sm uppercase tracking-wider">Lifetime Access</div>
                    </div>
                </div>
            </section>

            {/* Curriculum */}
            <section className="py-20 px-6 container mx-auto">
                <h2 className="text-3xl font-bold text-center mb-16">What You'll <span className="text-primary">Learn</span> Inside</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { title: "Smart Money's Market Impact", desc: "Institutional moves drive trends, not retail patterns." },
                        { title: "Why Retail Patterns Fail", desc: "Most retail strategies lack depth; focus on institutional cues." },
                        { title: "Effective Fibonacci Entries", desc: "Use Fibonacci retracement for high-probability trades." },
                        { title: "Swing Highs/Lows & Zones", desc: "Identify premium/discount zones for optimal trade." },
                        { title: "Spotting Traps & Reversals", desc: "Watch for fake breakouts using vol & price action." },
                        { title: "Time-Based Liquidity", desc: "Trade during high-volume periods for better entries." }
                    ].map((item, i) => (
                        <div key={i} className="bg-surface p-6 rounded-xl border border-overlay hover:border-primary transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                                {i + 1}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                            <p className="text-muted">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sticky Pricing Footer (Mobile) / Card (Desktop) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-overlay md:hidden z-50">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-xs text-muted line-through">₹4,999</div>
                        <div className="text-xl font-bold text-white">₹2,499 <span className="text-xs font-normal text-success ml-1">50% OFF</span></div>
                    </div>
                    <button className="bg-success text-white px-6 py-2 rounded font-bold">Buy Now</button>
                </div>
            </div>
        </div>
    );
};

export default CoursesScreen;
