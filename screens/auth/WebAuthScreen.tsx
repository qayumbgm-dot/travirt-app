
import React, { useState, useEffect } from 'react';
import WebLoginScreen from './WebLoginScreen';
import WebTfaScreen from './WebTfaScreen';
import WebSignUpScreen from './WebSignUpScreen';
import WebForgotPasswordScreen from './WebForgotPasswordScreen';
import WebResetPasswordScreen from './WebResetPasswordScreen';

interface WebAuthScreenProps {
    onLoginSuccess: (userId: string) => void;
    initialView?: 'login' | 'signup';
    onBack?: () => void;
}

type AuthView = 'login' | 'signup' | 'tfa' | 'forgot' | 'reset';

const getInitialState = (): { view: AuthView; resetToken: string } => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('reset_token') ?? '';
    return { view: token ? 'reset' : 'login', resetToken: token };
};

const WebAuthScreen: React.FC<WebAuthScreenProps> = ({ onLoginSuccess, initialView = 'login', onBack }) => {
    const [{ view: _initView, resetToken: _initToken }] = useState(getInitialState);
    const [view, setView]           = useState<AuthView>(_initView !== 'login' ? _initView : initialView);
    const [userId, setUserId]       = useState('');
    const [tempToken, setTempToken] = useState('');
    const [resetToken, setResetToken] = useState(_initToken);

    // Clean the reset_token out of the URL so it isn't reused on a manual refresh
    useEffect(() => {
        if (resetToken) {
            const url = new URL(window.location.href);
            url.searchParams.delete('reset_token');
            window.history.replaceState({}, '', url.toString());
        }
    }, [resetToken]);

    const handleLoginDirect = (id: string) => onLoginSuccess(id);

    const handleNeedsTfa = (token: string, id: string) => {
        setTempToken(token);
        setUserId(id);
        setView('tfa');
    };

    const handleResetSuccess = () => {
        setResetToken('');
        setView('login');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-base p-4 font-sans text-text-primary">
            {view === 'login' && (
                <WebLoginScreen
                    onLoginDirect={handleLoginDirect}
                    onNeedsTfa={handleNeedsTfa}
                    onBack={onBack}
                    onSignUpClick={() => setView('signup')}
                    onForgotClick={() => setView('forgot')}
                />
            )}
            {view === 'signup' && (
                <WebSignUpScreen
                    onLoginSuccess={onLoginSuccess}
                    onLoginClick={() => setView('login')}
                />
            )}
            {view === 'tfa' && (
                <WebTfaScreen
                    userId={userId}
                    tempToken={tempToken}
                    onVerify={onLoginSuccess}
                    onBack={() => setView('login')}
                />
            )}
            {view === 'forgot' && (
                <WebForgotPasswordScreen onBack={() => setView('login')} />
            )}
            {view === 'reset' && (
                <WebResetPasswordScreen token={resetToken} onSuccess={handleResetSuccess} />
            )}
        </div>
    );
};

export default WebAuthScreen;
