import React, { useState } from 'react';
import Logo from '../../components/auth/Logo';
import { useToast } from '../../contexts/ToastContext';
import { authApi } from '../../api/auth.api';

interface WebForgotPasswordScreenProps {
    onBack: () => void;
}

const WebForgotPasswordScreen: React.FC<WebForgotPasswordScreenProps> = ({ onBack }) => {
    const { showToast } = useToast();
    const [email, setEmail]       = useState('');
    const [sent, setSent]         = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authApi.forgotPassword(email.trim());
            setSent(true);
        } catch {
            showToast('Something went wrong. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm border border-overlay text-center animate-fade-in">
                <i className="fas fa-envelope text-5xl text-success mb-4" />
                <h2 className="text-xl font-semibold text-text-primary mb-2">Check your inbox</h2>
                <p className="text-sm text-muted mb-6">
                    If <strong className="text-text-primary">{email}</strong> is registered, you'll
                    receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.
                </p>
                <button onClick={onBack} className="text-sm text-primary hover:underline">
                    &larr; Back to login
                </button>
            </div>
        );
    }

    return (
        <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm border border-overlay animate-fade-in">
            <div className="text-center mb-8">
                <div className="inline-block"><Logo /></div>
                <h1 className="text-2xl font-semibold text-text-primary mt-4">Forgot Password</h1>
                <p className="text-sm text-muted mt-1">Enter your email and we'll send a reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    autoComplete="email"
                    autoFocus
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-overlay border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-md hover:bg-primary-focus transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading && <i className="fas fa-spinner animate-spin text-sm" />}
                    {isLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
            </form>

            <div className="text-center mt-6">
                <button onClick={onBack} className="text-sm text-muted hover:underline">
                    &larr; Back to login
                </button>
            </div>
        </div>
    );
};

export default WebForgotPasswordScreen;
