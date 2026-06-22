import React, { useState } from 'react';
import Logo from '../../components/auth/Logo';
import { useToast } from '../../contexts/ToastContext';
import { authApi } from '../../apiClient/auth.api';

interface WebResetPasswordScreenProps {
    token:     string;
    onSuccess: () => void;
}

const WebResetPasswordScreen: React.FC<WebResetPasswordScreenProps> = ({ token, onSuccess }) => {
    const { showToast } = useToast();
    const [password, setPassword]   = useState('');
    const [confirm, setConfirm]     = useState('');
    const [showPw, setShowPw]       = useState(false);
    const [done, setDone]           = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;
    const canSubmit = password.length >= 8 && password === confirm && !isLoading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setIsLoading(true);
        try {
            await authApi.resetPassword(token, password);
            setDone(true);
        } catch (err: unknown) {
            showToast(authApi.extractMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (done) {
        return (
            <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm border border-overlay text-center animate-fade-in">
                <i className="fas fa-circle-check text-5xl text-success mb-4" />
                <h2 className="text-xl font-semibold text-text-primary mb-2">Password Updated</h2>
                <p className="text-sm text-muted mb-6">
                    Your password has been reset. All existing sessions have been signed out for your security.
                </p>
                <button
                    onClick={onSuccess}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-md hover:bg-primary-focus transition"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm border border-overlay animate-fade-in">
            <div className="text-center mb-8">
                <div className="inline-block"><Logo /></div>
                <h1 className="text-2xl font-semibold text-text-primary mt-4">Set New Password</h1>
                <p className="text-sm text-muted mt-1">Choose a strong password for your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New password (min 8 characters)"
                        autoComplete="new-password"
                        autoFocus
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-overlay border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-primary"
                        tabIndex={-1}
                    >
                        <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                </div>

                <div>
                    <input
                        type={showPw ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className={`w-full px-4 py-3 bg-overlay border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 ${
                            mismatch ? 'border-error' : 'border-gray-600'
                        }`}
                    />
                    {mismatch && (
                        <p className="text-xs text-error mt-1">Passwords do not match</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-md hover:bg-primary-focus transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading && <i className="fas fa-spinner animate-spin text-sm" />}
                    {isLoading ? 'Updating…' : 'Set New Password'}
                </button>
            </form>
        </div>
    );
};

export default WebResetPasswordScreen;
