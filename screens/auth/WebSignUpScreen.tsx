
import React, { useState } from 'react';
import Logo from '../../components/auth/Logo';
import { useToast } from '../../contexts/ToastContext';
import { authApi } from '../../apiClient/auth.api';
import { referralApi } from '../../apiClient/referral.api';

interface WebSignUpScreenProps {
    onLoginSuccess: (userId: string) => void;
    onLoginClick: () => void;
}

const Field: React.FC<{
    label: string;
    hint?: string;
    children: React.ReactNode;
}> = ({ label, hint, children }) => (
    <div>
        <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
            {label}
        </label>
        {children}
        {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
);

const WebSignUpScreen: React.FC<WebSignUpScreenProps> = ({ onLoginSuccess, onLoginClick }) => {
    const { showToast } = useToast();

    const initialRef = new URLSearchParams(window.location.search).get('ref') ?? '';

    const [form, setForm] = useState({
        userId: '',
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        referralCode: initialRef.toUpperCase(),
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.userId.trim() || !form.email.trim() || !form.password) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        if (form.password !== form.confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }
        if (form.password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { user } = await authApi.register({
                userId: form.userId.trim(),
                email: form.email.trim(),
                password: form.password,
                displayName: form.displayName.trim() || undefined,
            });
            // Apply referral code after registration (best-effort — don't block signup on failure)
            if (form.referralCode.trim().length >= 6) {
                referralApi.applyCode(form.referralCode.trim()).catch(() => {});
            }
            showToast(`Welcome to TraVirt, ${user.userId}!`, 'success');
            onLoginSuccess(user.userId);
        } catch (err: unknown) {
            showToast(authApi.extractMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputCls =
        'w-full px-4 py-3 bg-overlay border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 text-sm';

    return (
        <div className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm border border-overlay relative animate-fade-in">
            <button
                onClick={onLoginClick}
                className="absolute top-4 left-4 text-muted hover:text-text-primary transition-colors text-sm"
            >
                <i className="fas fa-arrow-left mr-1"></i> Back to Login
            </button>

            <div className="text-center mb-6 mt-4">
                <div className="inline-block"><Logo /></div>
                <h1 className="text-xl font-bold text-text-primary mt-4">
                    Create your TraVirt account
                </h1>
                <p className="text-muted text-xs mt-1">
                    Trade stocks with virtual money · No real money required
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="User ID *" hint="Min 8 chars · 1 uppercase · 1 number · Any characters allowed">
                    <input
                        type="text"
                        value={form.userId}
                        onChange={set('userId')}
                        placeholder="e.g. TRDR001"
                        autoComplete="username"
                        disabled={isLoading}
                        className={inputCls}
                        maxLength={20}
                    />
                </Field>

                <Field label="Email address *">
                    <input
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={isLoading}
                        className={inputCls}
                    />
                </Field>

                <Field label="Display name (optional)">
                    <input
                        type="text"
                        value={form.displayName}
                        onChange={set('displayName')}
                        placeholder="Shown on leaderboard"
                        disabled={isLoading}
                        className={inputCls}
                        maxLength={50}
                    />
                </Field>

                <Field label="Password *" hint="Min 8 chars · 1 uppercase · 1 number">
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={set('password')}
                            placeholder="Create a strong password"
                            autoComplete="new-password"
                            disabled={isLoading}
                            className={inputCls}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-primary"
                        >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                </Field>

                <Field label="Confirm password *">
                    <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className={inputCls}
                    />
                </Field>

                <Field label="Referral code (optional)" hint="+50 NXO bonus for you on signup">
                    <input
                        type="text"
                        value={form.referralCode}
                        onChange={e => setForm(f => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
                        placeholder="e.g. ABCD1234"
                        disabled={isLoading}
                        className={`${inputCls} font-mono tracking-widest`}
                        maxLength={8}
                    />
                </Field>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-success hover:bg-green-600 text-white font-bold py-3 rounded-md transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                    {isLoading && <i className="fas fa-spinner animate-spin text-sm"></i>}
                    {isLoading ? 'Creating account…' : 'Create Account'}
                </button>
            </form>

            <p className="text-center text-sm text-muted mt-4">
                Already have an account?{' '}
                <button onClick={onLoginClick} className="text-primary font-bold hover:underline">
                    Sign In
                </button>
            </p>
        </div>
    );
};

export default WebSignUpScreen;
