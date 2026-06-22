
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

const ICONS: Record<ToastType, string> = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
};

const COLORS: Record<ToastType, string> = {
    success: 'text-success',
    error: 'text-danger',
    info: 'text-primary',
    warning: 'text-yellow-400',
};

const BORDERS: Record<ToastType, string> = {
    success: 'border-l-success',
    error: 'border-l-danger',
    info: 'border-l-primary',
    warning: 'border-l-yellow-400',
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => (
    <div
        className={`flex items-start gap-3 bg-surface border border-overlay border-l-4 ${BORDERS[toast.type]} rounded-lg shadow-2xl p-4 min-w-[280px] max-w-xs animate-fade-in`}
        onClick={() => onDismiss(toast.id)}
    >
        <i className={`fas ${ICONS[toast.type]} ${COLORS[toast.type]} text-lg mt-0.5 shrink-0`}></i>
        <p className="text-sm text-text-primary leading-snug">{toast.message}</p>
    </div>
);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {createPortal(
                <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 items-end pointer-events-none">
                    {toasts.map(t => (
                        <div key={t.id} className="pointer-events-auto cursor-pointer">
                            <ToastItem toast={t} onDismiss={dismiss} />
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
