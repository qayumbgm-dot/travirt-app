
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useToast } from '../contexts/ToastContext';
import { referralApi, ReferralStats } from '../apiClient/referral.api';
import { userApi, UserProfile } from '../apiClient/user.api';

const toFormState = (p: UserProfile | null, email: string) => ({
    firstName:     p?.first_name     ?? '',
    lastName:      p?.last_name      ?? '',
    gender:        (p?.gender as 'Male' | 'Female' | 'Other') ?? 'Other',
    address:       p?.address        ?? '',
    city:          p?.city           ?? '',
    pincode:       p?.pincode        ?? '',
    state:         p?.state          ?? '',
    country:       p?.country        ?? 'India',
    bankName:      p?.bank_name      ?? '',
    accountHolder: p?.account_holder ?? '',
    accountNumber: p?.account_number ?? '',
    ifsc:          p?.ifsc           ?? '',
    pan:           p?.pan            ?? '',
    email,
    isBonusClaimed: false,
});

type ProfileData = ReturnType<typeof toFormState>;

// ---------------------------------------------------------------------------

const ChangeEmailModal: React.FC<{ onClose: () => void; onUpdate: (email: string) => void }> = ({ onClose, onUpdate }) => {
    const [email, setEmail] = useState('');
    const { showToast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && email.includes('@')) {
            onUpdate(email);
            onClose();
        } else {
            showToast('Please enter a valid email address.', 'error');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-surface w-full max-w-lg rounded-lg shadow-2xl overflow-hidden border border-overlay" onClick={e => e.stopPropagation()}>
                <div className="bg-success px-4 py-3 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">Change Email Address</h3>
                    <button onClick={onClose} className="hover:bg-white/20 rounded w-8 h-8 flex items-center justify-center transition-colors">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm text-text-secondary mb-2">Enter your new email address:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white text-black border border-gray-300 rounded px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-success font-medium"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-center gap-4 pt-2">
                        <button type="submit" className="bg-success hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded transition-colors shadow-lg">Update Email</button>
                        <button type="button" onClick={onClose} className="bg-success hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded transition-colors shadow-lg opacity-90">Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const ChangePasswordModal: React.FC<{ onClose: () => void; onUpdate: () => void }> = ({ onClose, onUpdate }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newPassword || !confirmPassword) { setError('Please fill in all fields.'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
        onUpdate();
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-surface w-full max-w-lg rounded-lg shadow-2xl overflow-hidden border border-overlay" onClick={e => e.stopPropagation()}>
                <div className="bg-success px-4 py-3 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">Change Password</h3>
                    <button onClick={onClose} className="hover:bg-white/20 rounded w-8 h-8 flex items-center justify-center transition-colors">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm text-text-secondary mb-2">* Enter new password:</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white text-black border border-gray-300 rounded px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-success font-medium" autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm text-text-secondary mb-2">* Re-Enter new password:</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white text-black border border-gray-300 rounded px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-success font-medium" />
                    </div>
                    {error && <p className="text-danger text-sm font-semibold">{error}</p>}
                    <div className="flex justify-center gap-4 pt-2">
                        <button type="submit" className="bg-success hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded transition-colors shadow-lg">Update Password</button>
                        <button type="button" onClick={onClose} className="bg-success hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded transition-colors shadow-lg opacity-90">Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

// ---------------------------------------------------------------------------

const ReferralPanel: React.FC = () => {
    const { showToast } = useToast();
    const [stats, setStats]         = useState<ReferralStats | null>(null);
    const [loading, setLoading]     = useState(true);
    const [codeInput, setCodeInput] = useState('');
    const [applying, setApplying]   = useState(false);

    const BASE_URL = (import.meta as any).env?.VITE_APP_URL ?? window.location.origin;

    useEffect(() => {
        referralApi.getStats()
            .then(setStats)
            .catch(() => { /* silently skip if not authed */ })
            .finally(() => setLoading(false));
    }, []);

    const handleCopyCode = () => {
        if (!stats) return;
        navigator.clipboard.writeText(stats.code).then(() => showToast('Referral code copied!', 'success'));
    };

    const handleCopyLink = () => {
        if (!stats) return;
        const link = `${BASE_URL}?ref=${stats.code}`;
        navigator.clipboard.writeText(link).then(() => showToast('Invite link copied!', 'success'));
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codeInput.trim()) return;
        setApplying(true);
        try {
            const res = await referralApi.applyCode(codeInput.trim());
            showToast(res.message, 'success');
            const updated = await referralApi.getStats();
            setStats(updated);
            setCodeInput('');
        } catch (err: any) {
            const msg = err?.response?.data?.error ?? 'Failed to apply code';
            showToast(msg, 'error');
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="mt-6">
            <div className="bg-surface border border-overlay px-4 py-2 mb-3">
                <div className="text-sm font-bold text-text-secondary flex items-center gap-2">
                    <i className="fas fa-gift text-primary"></i>
                    Invite Friends &amp; Earn NXO
                </div>
                <p className="text-xs text-muted italic mt-0.5">
                    Share your referral code. You earn <span className="text-success font-semibold">+100 NXO</span> when a friend places their first trade. They get <span className="text-success font-semibold">+50 NXO</span> instantly on signup.
                </p>
            </div>

            {loading ? (
                <div className="h-24 rounded-lg bg-overlay animate-pulse" />
            ) : stats ? (
                <div className="space-y-4">
                    {/* Code + copy */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <label className="text-xs text-muted w-32 sm:text-right shrink-0">Your Code:</label>
                        <div className="flex gap-2 flex-wrap">
                            <span className="font-mono text-xl font-bold tracking-widest text-text-primary bg-overlay px-4 py-2 rounded border border-overlay select-all">
                                {stats.code}
                            </span>
                            <button onClick={handleCopyCode} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-overlay hover:bg-overlay/80 rounded text-text-secondary hover:text-text-primary transition-colors border border-overlay">
                                <i className="fas fa-copy"></i> Copy Code
                            </button>
                            <button onClick={handleCopyLink} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary/20 hover:bg-primary/30 rounded text-primary transition-colors border border-primary/30">
                                <i className="fas fa-link"></i> Copy Invite Link
                            </button>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <span className="text-xs text-muted w-32 sm:text-right shrink-0">Stats:</span>
                        <div className="flex gap-4 flex-wrap text-sm">
                            <div className="bg-overlay rounded px-3 py-1.5 border border-overlay text-center min-w-[80px]">
                                <p className="text-lg font-bold text-text-primary">{stats.totalUses}</p>
                                <p className="text-[10px] text-muted uppercase tracking-wider">Invited</p>
                            </div>
                            <div className="bg-overlay rounded px-3 py-1.5 border border-overlay text-center min-w-[80px]">
                                <p className="text-lg font-bold text-success">+{stats.nxoEarned}</p>
                                <p className="text-[10px] text-muted uppercase tracking-wider">NXO Earned</p>
                            </div>
                            {stats.pendingRewards > 0 && (
                                <div className="bg-overlay rounded px-3 py-1.5 border border-overlay text-center min-w-[80px]">
                                    <p className="text-lg font-bold text-yellow-400">{stats.pendingRewards}</p>
                                    <p className="text-[10px] text-muted uppercase tracking-wider">Pending</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Apply code */}
                    {stats.hasAppliedCode ? (
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <span className="text-xs text-muted w-32 sm:text-right shrink-0">Applied Code:</span>
                            <span className="font-mono text-sm text-success font-semibold bg-success/10 px-3 py-1 rounded border border-success/30">
                                {stats.appliedCode} <i className="fas fa-check-circle ml-1"></i>
                            </span>
                        </div>
                    ) : (
                        <form onSubmit={handleApply} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <label className="text-xs text-muted w-32 sm:text-right shrink-0">Apply Code:</label>
                            <div className="flex gap-2 flex-wrap">
                                <input
                                    type="text"
                                    value={codeInput}
                                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                                    maxLength={8}
                                    placeholder="XXXXXXXX"
                                    className="font-mono w-36 bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none tracking-widest uppercase"
                                />
                                <button
                                    type="submit"
                                    disabled={applying || codeInput.length < 6}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-focus transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {applying ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check"></i>}
                                    {applying ? 'Applying…' : 'Apply'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            ) : (
                <p className="text-muted text-sm">Log in to see your referral code.</p>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------

const ProfileScreen: React.FC = () => {
    const { addReward } = usePortfolio();
    const { showToast } = useToast();

    const [profile, setProfile] = useState<ProfileData>(() => toFormState(null, ''));
    const [isSaving, setIsSaving] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Load from API on mount
    useEffect(() => {
        Promise.all([userApi.getMe(), userApi.getProfile()])
            .then(([me, prof]) => setProfile(toFormState(prof, me.email)))
            .catch(() => {}); // offline — stay with blank defaults
    }, []);

    const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
        setProfile(prev => ({ ...prev, [key]: value }));

    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await userApi.updateProfile({
                first_name:     profile.firstName     || null,
                last_name:      profile.lastName      || null,
                gender:         profile.gender        || null,
                address:        profile.address       || null,
                city:           profile.city          || null,
                state:          profile.state         || null,
                pincode:        profile.pincode       || null,
                country:        profile.country       || null,
                bank_name:      profile.bankName      || null,
                account_holder: profile.accountHolder || null,
                account_number: profile.accountNumber || null,
                ifsc:           profile.ifsc          || null,
                pan:            profile.pan           || null,
            });
            if (!profile.isBonusClaimed && profile.firstName && profile.lastName) {
                showToast('Profile updated! You earned 50 NXO tokens.', 'success');
                addReward(50, 'Profile Completion Bonus');
                setProfile(prev => ({ ...prev, isBonusClaimed: true }));
            } else {
                showToast('Profile updated successfully.', 'success');
            }
        } catch {
            showToast('Failed to save profile. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEmailUpdate = (newEmail: string) => {
        setProfile(prev => ({ ...prev, email: newEmail }));
        showToast(`Verification link sent to ${newEmail}.`, 'info');
    };

    const handlePasswordUpdate = () => {
        showToast('Password changed successfully.', 'success');
    };

    return (
        <div className="flex flex-col h-full bg-base animate-fade-in relative overflow-y-auto custom-scrollbar">
            {/* Header Section */}
            <div className="bg-success text-white p-3 px-4 shadow-md shrink-0 flex justify-between items-center">
                <h2 className="text-lg font-bold uppercase tracking-wide">Your Profile</h2>
                <p className="text-xs italic opacity-90 font-medium hidden sm:block">
                    You can change password, email address or mobile numbers here.
                </p>
            </div>

            <div className="p-4 space-y-4 max-w-5xl mx-auto w-full">

                {/* Personal Info Section */}
                <div className="space-y-4">
                    {/* Row 1: Email */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <label className="text-xs text-muted w-32 sm:text-right">Email Address:</label>
                        <div className="flex-1 flex gap-2 w-full">
                            <input type="text" disabled value={profile.email} className="flex-1 bg-surface border border-overlay rounded px-3 py-1.5 text-sm text-muted cursor-not-allowed" />
                            <button onClick={() => setIsEmailModalOpen(true)} className="text-primary hover:text-primary-focus text-sm font-semibold transition-colors">Change</button>
                        </div>
                    </div>

                    {/* Row 2: Mobile */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <label className="text-xs text-muted w-32 sm:text-right">Mobile Number:</label>
                        <div className="flex-1 w-full">
                            <input type="text" disabled value="9743732494" className="w-full bg-surface border border-overlay rounded px-3 py-1.5 text-sm text-muted cursor-not-allowed" />
                        </div>
                    </div>

                    {/* Row 3: Password */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <label className="text-xs text-muted w-32 sm:text-right">Password:</label>
                        <div className="flex-1 flex gap-2 w-full">
                            <input type="password" disabled value="********" className="flex-1 bg-surface border border-overlay rounded px-3 py-1.5 text-sm text-muted cursor-not-allowed" />
                            <button onClick={() => setIsPasswordModalOpen(true)} className="text-primary hover:text-primary-focus text-sm font-semibold">Change</button>
                        </div>
                    </div>

                    {/* Row 4: Name */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                            <label className="text-xs text-muted w-32 sm:text-right">* First Name:</label>
                            <input type="text" value={profile.firstName} onChange={e => set('firstName', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                        </div>
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                            <label className="text-xs text-muted w-32 sm:text-right">* Last Name:</label>
                            <input type="text" value={profile.lastName} onChange={e => set('lastName', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                        </div>
                    </div>

                    {/* Row 5: Gender */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center pt-2">
                        <label className="text-xs text-muted w-32 sm:text-right">Gender:</label>
                        <div className="flex-1 flex gap-8 w-full">
                            {(['Male', 'Female', 'Other'] as const).map((g, i) => (
                                <label key={g} className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gender"
                                        checked={profile.gender === g}
                                        onChange={() => set('gender', g)}
                                        className={`w-4 h-4 bg-base border-gray-500 ${i < 2 ? 'text-primary focus:ring-primary' : 'text-success focus:ring-success'}`}
                                    />
                                    <span className="ml-2 text-sm text-text-secondary">{g === 'Other' ? 'Do Not Prefer' : g}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div className="mt-6">
                    <div className="bg-surface border border-overlay px-4 py-2 text-sm font-bold text-text-secondary mb-3">
                        Your Address (Optional)
                    </div>
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <label className="text-xs text-muted w-32 sm:text-right pt-2">Address:</label>
                            <textarea rows={3} value={profile.address} onChange={e => set('address', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none resize-none"></textarea>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">City:</label>
                                <input type="text" value={profile.city} onChange={e => set('city', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">Pincode:</label>
                                <input type="text" value={profile.pincode} onChange={e => set('pincode', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">State:</label>
                                <input type="text" value={profile.state} onChange={e => set('state', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">Country:</label>
                                <input type="text" value={profile.country} onChange={e => set('country', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bank Details Section */}
                <div className="mt-6">
                    <div className="bg-surface border border-overlay px-4 py-2 mb-3">
                        <div className="text-sm font-bold text-text-secondary">Your Bank Details (Optional)</div>
                        <p className="text-xs text-muted italic mt-0.5">
                            If you have users registered under your referral link, your monthly recurring income will be disbursed on 1st of every month. For this we require your bank details. You can fill up later as well.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">Bank Name:</label>
                                <select value={profile.bankName} onChange={e => set('bankName', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none appearance-none">
                                    <option value="">--Select Bank Name--</option>
                                    <option value="HDFC">HDFC Bank</option>
                                    <option value="SBI">SBI</option>
                                    <option value="ICICI">ICICI Bank</option>
                                    <option value="Kotak">Kotak Mahindra Bank</option>
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-36 sm:text-right">Bank A/C Holder Name:</label>
                                <input type="text" value={profile.accountHolder} onChange={e => set('accountHolder', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">Bank A/C Number:</label>
                                <input type="text" value={profile.accountNumber} onChange={e => set('accountNumber', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center invisible md:visible"></div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 pb-4">
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-32 sm:text-right">Bank IFSC Code:</label>
                                <input type="text" value={profile.ifsc} onChange={e => set('ifsc', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <label className="text-xs text-muted w-36 sm:text-right">IT PAN:</label>
                                <input type="text" value={profile.pan} onChange={e => set('pan', e.target.value)} className="flex-1 w-full bg-surface border border-gray-600 rounded px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Referral */}
                <ReferralPanel />

                {/* Footer Action */}
                <div className="pt-2 pb-8">
                    <button
                        onClick={handleUpdate}
                        disabled={isSaving}
                        className="bg-success hover:bg-green-600 text-white font-bold py-2 px-6 rounded transition-colors shadow-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving && <i className="fas fa-spinner animate-spin text-xs"></i>}
                        {isSaving ? 'Saving…' : 'Update'}
                    </button>
                </div>
            </div>

            {/* Modals */}
            {isEmailModalOpen && <ChangeEmailModal onClose={() => setIsEmailModalOpen(false)} onUpdate={handleEmailUpdate} />}
            {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} onUpdate={handlePasswordUpdate} />}
        </div>
    );
};

export default ProfileScreen;
