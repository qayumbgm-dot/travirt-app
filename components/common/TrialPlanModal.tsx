
import React, { useEffect, useState } from 'react';

interface TrialPlanModalProps {
    onClose: () => void;
}

const TrialPlanModal: React.FC<TrialPlanModalProps> = ({ onClose }) => {
    // Calculate 1 year from now for expiry date
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const dateString = expiryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });

    // Confetti effect state
    const [confetti, setConfetti] = useState<{id: number, left: string, animationDuration: string, color: string}[]>([]);

    useEffect(() => {
        const colors = ['#10B981', '#3B82F6', '#8A2BE2', '#F59E0B'];
        const newConfetti = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
        setConfetti(newConfetti);
    }, []);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-fade-in"></div>
            
            {/* Confetti Container */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {confetti.map((c) => (
                    <div 
                        key={c.id}
                        className="absolute top-0 w-2 h-2 rounded-full animate-confetti opacity-0"
                        style={{
                            left: c.left,
                            backgroundColor: c.color,
                            animation: `fall ${c.animationDuration} linear infinite`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
            
            {/* Modal Content - Matched to Deep Navy Theme */}
            <div className="relative bg-base w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in border-2 border-primary/30 transform transition-all">
                {/* Decorative Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none"></div>

                <div className="relative p-8 text-center">
                    <div className="flex justify-center items-center gap-4 mb-6">
                        <div className="text-6xl animate-bounce">👋</div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Aboard!</h2>
                    <p className="text-primary font-medium mb-8 uppercase tracking-widest text-xs">Premium Access Unlocked</p>
                    
                    <div className="bg-surface border border-overlay rounded-xl p-6 mb-8 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent"></div>
                        
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            Full Trial Plan Activated
                        </h3>
                        <p className="text-muted text-sm mb-4">
                            You now have unlimited access to all analytics, real-time feeds, and trading simulators.
                        </p>
                        
                        <div className="inline-flex items-center gap-2 bg-base px-4 py-2 rounded-lg border border-overlay shadow-inner">
                            <i className="fas fa-calendar-alt text-primary"></i>
                            <span className="text-sm text-muted">Valid until:</span>
                            <span className="text-sm font-bold text-white">{dateString}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white text-lg px-8 py-3.5 rounded-xl font-bold transition-all shadow-glow-purple flex items-center justify-center gap-2 group"
                    >
                        Start Trading Now <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrialPlanModal;
