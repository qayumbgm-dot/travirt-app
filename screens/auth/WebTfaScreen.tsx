
import React, { useState } from 'react';
import { authApi } from '../../apiClient/auth.api';
import { useToast } from '../../contexts/ToastContext';

interface WebTfaScreenProps {
    userId:    string;
    tempToken: string;
    onVerify:  (userId: string) => void;
    onBack:    () => void;
}

const WebTfaScreen: React.FC<WebTfaScreenProps> = ({ userId, tempToken, onVerify, onBack }) => {
    const [code, setCode]         = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast }           = useToast();

    const getInitials = (id: string) => {
        const matches = id.match(/[a-zA-Z]/g) || [];
        if (matches.length >= 2) {
            return (matches[0] + matches[matches.length - 1]).toUpperCase();
        }
        return id.substring(0, 2).toUpperCase();
    }

    return (
        <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm text-center border border-overlay text-text-primary">
            <div className="mx-auto w-24 h-24 bg-overlay text-primary rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl font-semibold">{getInitials(userId)}</span>
            </div>
            <p className="font-semibold text-text-primary mb-2">{userId}</p>
            <p className="text-sm text-muted mb-6">Enter the 6-digit app code to continue</p>


            <form onSubmit={async (e) => {
                e.preventDefault();
                if (code.length < 6) return;
                setIsLoading(true);
                try {
                    const { user } = await authApi.verify2fa(tempToken, code);
                    onVerify(user.userId);
                } catch (err: unknown) {
                    showToast((err as any)?.response?.data?.error ?? 'Invalid code. Try again.', 'error');
                    setCode('');
                } finally {
                    setIsLoading(false);
                }
            }}>
                <input
                    id="tfa-code"
                    type="tel"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                    autoFocus
                    autoComplete="one-time-code"
                    className="w-full p-3 bg-overlay border border-gray-600 rounded-md text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                />
                
                <button
                    type="submit"
                    disabled={code.length !== 6 || isLoading}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-md hover:bg-primary-focus transition disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading && <i className="fas fa-spinner animate-spin text-sm" />}
                    {isLoading ? 'Verifying…' : 'Continue'}
                </button>
            </form>

            <div className="text-sm mt-6">
                <button onClick={onBack} className="text-muted hover:underline">
                    &larr; Back to login
                </button>
            </div>
        </div>
    );
};

export default WebTfaScreen;