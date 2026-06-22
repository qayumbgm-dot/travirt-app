import React from 'react';

interface DisclaimerModalProps {
    onClose: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"></div>
            
            {/* Modal Content */}
            <div className="relative bg-surface w-full max-w-lg rounded-lg shadow-2xl overflow-hidden animate-fade-in border border-overlay">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-accent px-6 py-4 flex justify-between items-center border-b border-white/10">
                    <h3 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                        <i className="fas fa-shield-alt"></i> Important!
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                
                {/* Body */}
                <div className="p-8 text-center">
                    <div className="text-red-500 font-bold text-base mb-6 bg-red-500/10 py-2 px-4 rounded-full inline-block border border-red-500/20">
                        <i className="fas fa-hand-paper mr-2 text-red-500"></i> PLEASE READ CAREFULLY
                    </div>
                    
                    <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
                        <p>
                            <span className="text-text-primary font-semibold">TraVirt</span> is a paper trading platform solely for educational purposes.
                            We do <span className="text-danger font-bold">not</span> provide investment advice or solicit actual investments.
                        </p>
                        
                        <p className="bg-base p-4 rounded-lg border border-overlay text-left flex gap-3">
                            <i className="fas fa-exclamation-triangle text-orange-500 mt-1 shrink-0"></i>
                            <span>
                                If anyone approaches you for investment using the TraVirt name, we are not responsible. Please report immediately to <span className="text-primary hover:underline cursor-pointer">support@travirt.com</span>.
                            </span>
                        </p>
                        
                        <p className="italic text-muted border-t border-overlay pt-4">
                            कृपया ध्यान दें, हम अपने users से किसी भी प्रकार की investment नहीं मांगते। अगर आप से कोई TraVirt का नाम ले कर investment मांग रहा है तो ना दें। अगर आप फिर भी ऐसे व्यक्ति को पैसा देते हैं तो TraVirt की कोई ज़िम्मेदारी नहीं है।
                        </p>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-overlay bg-base/50 flex justify-center">
                    <button 
                        onClick={onClose} 
                        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white text-lg px-8 py-3.5 rounded-xl font-bold transition-all shadow-glow-purple flex items-center justify-center gap-2 group"
                    >
                        I Understand, Proceed
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DisclaimerModal;