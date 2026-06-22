
import React, { useState } from 'react';
import Logo from '../../components/auth/Logo';
import { useToast } from '../../contexts/ToastContext';
import { authApi } from '../../api/auth.api';

interface WebLoginScreenProps {
    onLoginDirect: (userId: string) => void;
    onNeedsTfa:    (tempToken: string, userId: string) => void;
    onBack?: () => void;
    onSignUpClick: () => void;
    onForgotClick?: () => void;
}

const WebLoginScreen: React.FC<WebLoginScreenProps> = ({ onLoginDirect, onNeedsTfa, onBack, onSignUpClick, onForgotClick }) => {
    const { showToast } = useToast();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim() || !password) {
            showToast('Please enter your User ID (or email) and password.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const result = await authApi.login(identifier.trim(), password);
            if (result.requires2FA) {
                onNeedsTfa(result.tempToken, result.userId);
            } else {
                onLoginDirect(result.user.userId);
            }
        } catch (err: unknown) {
            showToast(authApi.extractMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm border border-overlay relative animate-fade-in">
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 text-muted hover:text-text-primary transition-colors text-sm"
                >
                    <i className="fas fa-arrow-left mr-1"></i> Home
                </button>
            )}
            <div className="text-center mb-8 mt-4">
                <div className="inline-block"><Logo /></div>
                <h1 className="text-2xl font-semibold text-text-primary mt-4">Login to TraVirt</h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="User ID or Email"
                        autoComplete="username"
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-overlay border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                </div>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-overlay border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-primary"
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-md hover:bg-primary-focus transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading && <i className="fas fa-spinner animate-spin text-sm"></i>}
                    {isLoading ? 'Signing in…' : 'Login'}
                </button>
            </form>

            <div className="text-center mt-6 space-y-2">
                <button
                    type="button"
                    onClick={onForgotClick}
                    className="block text-sm text-primary hover:underline w-full text-center"
                >
                    Forgot password?
                </button>
                <div className="text-sm text-muted">
                    Don't have an account?{' '}
                    <button onClick={onSignUpClick} className="text-success font-bold hover:underline">
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebLoginScreen;
