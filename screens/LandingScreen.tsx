
import React, { useState } from 'react';
import Logo from '../components/auth/Logo';

interface LandingScreenProps {
    onGetStarted: () => void;
    onSignUp: () => void;
    onNavigate: (view: 'landing' | 'courses' | 'features' | 'how-it-works') => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onGetStarted, onSignUp, onNavigate }) => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const stats = [
        { icon: 'fa-university', title: 'Authorized Partners', desc: 'For IITs, IIMs and Premier Colleges' },
        { icon: 'fa-bolt', title: '15 Million+', desc: 'Orders Processed everyday' },
        { icon: 'fa-trophy', title: '1000+', desc: 'Contests hosted for Educational Institutions' },
        { icon: 'fa-video', title: '5000+', desc: 'Videos on Youtube made by our users' },
    ];

    const whyFeatures = [
        { title: 'Master the Mechanics', desc: 'Familiarize yourself with the interface, order types, and charting tools.' },
        { title: 'Discipline Your Emotions', desc: 'Conquer FOMO and learn to analyze the situation rationally without risk.' },
        { title: 'Fine-Tune Techniques', desc: 'Backtest strategies and practice risk management with stop-loss orders.' },
        { title: 'Build Confidence', desc: 'Track your progress and develop a winning mindset before going live.' },
    ];

    const faqs = [
        { q: "Is TraVirt free to use?", a: "Yes, TraVirt is absolutely free to use and practice with virtual currency." },
        { q: "Is this 100% virtual money?", a: "Yes. You get virtual money at registration to practice without financial risk." },
        { q: "Is data feed real?", a: "Yes, the data feed mimics real-time market movements for a realistic experience." },
        { q: "Can I trade Options & Futures?", a: "Yes, all equities, futures, and options are available for trading in the simulator." },
    ];

    return (
        <div className="min-h-screen bg-base text-text-primary font-sans overflow-y-auto custom-scrollbar">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur border-b border-overlay px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
                    <Logo />
                    <span className="text-xl font-bold tracking-wider">TraVirt</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
                    <button onClick={() => onNavigate('landing')} className="hover:text-primary transition-colors">Home</button>
                    <button onClick={() => onNavigate('courses')} className="hover:text-primary transition-colors">Courses</button>
                    <button onClick={() => onNavigate('features')} className="hover:text-primary transition-colors">Features</button>
                    <button onClick={() => onNavigate('how-it-works')} className="hover:text-primary transition-colors">How it Works</button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onGetStarted} className="text-sm font-semibold text-text-primary hover:text-primary transition-colors">Sign In</button>
                    <button onClick={onSignUp} className="bg-success hover:bg-green-600 text-white px-5 py-2 rounded-md text-sm font-bold transition-all shadow-lg shadow-success/20">Sign Up</button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="container mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 text-center lg:text-left">
                    <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                        <span className="text-success">Paper Trading Platform</span><br />
                        with AI Analytics
                    </h1>
                    <h2 className="text-2xl text-text-secondary font-light">Master the Art of Trading!</h2>
                    <p className="text-xl text-muted">
                        Experience the Thrill of <span className="text-danger font-bold">Live Trading with Zero Risk</span>!
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                        <div className="flex-1 max-w-xs relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">+91</span>
                            <input type="text" placeholder="Enter Mobile Number" className="w-full bg-surface border border-overlay rounded-md py-3 pl-12 pr-4 focus:ring-2 focus:ring-success outline-none" />
                        </div>
                        <button onClick={onSignUp} className="bg-primary hover:bg-primary-focus text-white px-8 py-3 rounded-md font-bold text-lg transition-all shadow-glow-blue">
                            Start Trading
                        </button>
                    </div>
                    <p className="text-xs text-muted italic">It's Free. Solely for educational purposes.</p>
                </div>

                {/* Promo Card (Course) */}
                <div className="bg-surface border border-overlay rounded-xl p-6 shadow-2xl relative overflow-hidden group hover:border-primary transition-colors duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                    <div className="badge bg-white text-danger px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 mb-4 shadow-sm">
                        <i className="fas fa-bolt"></i> New Course Alert
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Trade Like the Top 1%</h3>
                    <p className="text-muted mb-6 text-sm">
                        Tired of trading based on guesswork? We've launched a <span className="text-text-primary font-semibold">data-backed stock market course</span> built from analyzing over 1 million+ real trades.
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="text-center p-2 bg-base rounded border border-overlay">
                            <i className="fas fa-book-open text-primary mb-1"></i>
                            <div className="text-xs font-semibold">Modules</div>
                        </div>
                        <div className="text-center p-2 bg-base rounded border border-overlay">
                            <i className="fas fa-lightbulb text-yellow-400 mb-1"></i>
                            <div className="text-xs font-semibold">Strategies</div>
                        </div>
                        <div className="text-center p-2 bg-base rounded border border-overlay">
                            <i className="fas fa-infinity text-accent mb-1"></i>
                            <div className="text-xs font-semibold">Lifetime</div>
                        </div>
                    </div>

                    <button onClick={() => onNavigate('courses')} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 transition-opacity">
                        Explore the Course <i className="fas fa-arrow-right"></i>
                    </button>
                </div>
            </header>

            {/* Stats Bar */}
            <section className="bg-surface/50 border-y border-overlay py-8">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-lg hover:bg-overlay/30 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl shrink-0">
                                    <i className={`fas ${stat.icon}`}></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{stat.title}</h4>
                                    <p className="text-xs text-muted">{stat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Paper Trading */}
            <section id="features" className="container mx-auto px-6 py-20">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl font-bold mb-4">Why Paper Trading Should Be Your First Step</h2>
                    <p className="text-muted">
                        Before risking your hard-earned cash, put your skills to the test in a risk-free virtual trading environment. 
                        Think of it as a training ground where you can learn, experiment, and build confidence.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {whyFeatures.map((feat, idx) => (
                        <div key={idx} className="bg-surface p-6 rounded-lg border border-overlay hover:shadow-glow-blue transition-shadow duration-300">
                            <div className="w-10 h-10 bg-overlay rounded-lg flex items-center justify-center text-accent mb-4">
                                <span className="font-bold text-lg">{idx + 1}</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                            <p className="text-sm text-muted">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-blue-900 to-indigo-900 py-20 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">See TraVirt In Action</h2>
                    <p className="text-blue-200 mb-8 max-w-2xl mx-auto">
                        Extremely easy to use with real time tracking of Profit/Loss. Excellent features to help you trade easily in any segment you like.
                    </p>
                    <button onClick={onSignUp} className="bg-white text-primary px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl">
                        Get Started Now
                    </button>
                </div>
            </section>

            {/* FAQ */}
            <section className="container mx-auto px-6 py-20 max-w-3xl">
                <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-surface rounded-lg border border-overlay overflow-hidden">
                            <button 
                                onClick={() => toggleFaq(idx)}
                                className="w-full flex justify-between items-center p-4 text-left font-semibold hover:bg-overlay/50 transition-colors"
                            >
                                {faq.q}
                                <i className={`fas fa-chevron-down transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}></i>
                            </button>
                            <div className={`px-4 text-muted text-sm transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-40 py-4 opacity-100' : 'max-h-0 py-0 opacity-0 overflow-hidden'}`}>
                                {faq.a}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-surface border-t border-overlay pt-12 pb-6">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Logo />
                                <span className="font-bold text-lg">TraVirt</span>
                            </div>
                            <p className="text-sm text-muted">
                                India's only paper trading platform with Tick by Tick feed and virtual money. All stocks, options and futures available.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-muted">
                                <li><a href="#" className="hover:text-primary">About Us</a></li>
                                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
                                <li><a href="#" className="hover:text-primary">Blog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted">
                                <li><a href="#" className="hover:text-primary">Features</a></li>
                                <li><a href="#" className="hover:text-primary">Pricing</a></li>
                                <li><a href="#" className="hover:text-primary">How it Works</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted">
                                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-primary">Terms & Conditions</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-overlay pt-6 text-center text-sm text-muted">
                        <p>© Copyright <strong>TraVirt</strong>. All Rights Reserved. Made with <i className="fas fa-heart text-danger mx-1"></i> in India.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingScreen;
