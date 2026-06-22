
import React, { useEffect, useId, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist } from '../../contexts/WatchlistContext';

interface WatchlistTabsProps {
    onManageClick: () => void;
}

const Tooltip: React.FC<{ children: React.ReactNode; title: string; shortcut?: string }> = ({ children, title, shortcut }) => {
    const tooltipId = useId();
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        pointerEvents: 'none',
    });
    
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const showTooltip = () => setVisible(true);
    const hideTooltip = () => setVisible(false);

    useLayoutEffect(() => {
        if (visible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipNode = tooltipRef.current;
            const tooltipRect = tooltipNode.getBoundingClientRect();
            
            const top = triggerRect.top - 8; // 8px padding

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${triggerRect.left + triggerRect.width / 2}px`,
                transform: 'translateX(-50%) translateY(-100%)',
                zIndex: 9999,
            });
        } else {
             setStyle({ opacity: 0, pointerEvents: 'none' });
        }
    }, [visible]);

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-block"
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                aria-describedby={tooltipId}
            >
                {children}
            </div>
            {mounted && createPortal(
                <div
                    ref={tooltipRef}
                    id={tooltipId}
                    role="tooltip"
                    className="fixed px-3 py-2 bg-overlay text-text-primary text-xs rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200"
                    style={{...style, opacity: visible ? 1 : 0}}
                >
                    <div className="font-bold text-sm">{title}</div>
                    {shortcut && <div className="text-xs text-muted mt-0.5">{shortcut}</div>}
                    <div 
                      className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-overlay"
                    ></div>
                </div>,
                document.body
            )}
        </>
    );
};

const WatchlistTabs: React.FC<WatchlistTabsProps> = ({ onManageClick }) => {
    const { watchlists, activeView, setActiveView, lastActiveStackView } = useWatchlist();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey) {
                if (event.code.startsWith('Digit')) {
                    const tabNumber = parseInt(event.code.slice(5), 10);
                    // Restrict shortcuts to tabs 1-7
                    if (tabNumber >= 1 && tabNumber <= 7) {
                        event.preventDefault();
                        const targetWatchlist = watchlists.find(w => w.id === tabNumber);
                        if (targetWatchlist) setActiveView({ type: 'watchlist', id: targetWatchlist.id });
                    }
                }
                
                if (event.key.toLowerCase() === 'k') {
                    event.preventDefault();
                    onManageClick();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [watchlists, setActiveView, onManageClick]);

    const defaultTabs = useMemo(() => watchlists.filter(w => w.id <= 7), [watchlists]);

    const isStackActive = useMemo(() => {
        return (activeView.type === 'watchlist' && activeView.id > 7) || activeView.type === 'discover';
    }, [activeView]);

    const stackTabName = useMemo(() => {
        const stackViewSource = isStackActive ? activeView : lastActiveStackView;

        if (!stackViewSource) return 'More lists';

        if (stackViewSource.type === 'watchlist') {
            return watchlists.find(w => w.id === stackViewSource.id)?.name || '...';
        }
        // This must be discover type
        return stackViewSource.list.name;
    }, [activeView, lastActiveStackView, watchlists, isStackActive]);
    
    const shouldShowStackTab = useMemo(() => {
        return watchlists.some(w => w.id > 7) || activeView.type === 'discover';
    }, [watchlists, activeView]);

    return (
        <div className="flex items-center justify-between border-t border-overlay px-2 py-1 text-sm bg-surface rounded-b-lg">
            <div className="flex items-center gap-1 overflow-x-auto">
                {defaultTabs.map(wl => (
                    <Tooltip key={wl.id} title={wl.name} shortcut={`Ctrl+Shift+${wl.id}`}>
                        <button
                            onClick={() => setActiveView({ type: 'watchlist', id: wl.id })}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                                activeView.type === 'watchlist' && activeView.id === wl.id
                                    ? 'bg-orange-600 text-white'
                                    : 'text-muted hover:bg-overlay hover:text-text-primary'
                            }`}
                        >
                            {wl.name}
                        </button>
                    </Tooltip>
                ))}

                {shouldShowStackTab && (
                    <>
                        <div className="h-5 w-px bg-overlay mx-1"></div>
                        <Tooltip title={stackTabName}>
                            <button
                                onClick={() => {
                                    if (lastActiveStackView) {
                                        setActiveView(lastActiveStackView);
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                                    isStackActive
                                        ? 'bg-orange-600 text-white'
                                        : 'text-muted hover:bg-overlay hover:text-text-primary'
                                }`}
                            >
                                <i className="fas fa-layer-group"></i>
                            </button>
                        </Tooltip>
                    </>
                )}
            </div>
            <div className="flex items-center pl-2">
                <Tooltip title="Create/Manage watchlists" shortcut="(Ctrl + Shift + K)">
                    <button onClick={onManageClick} className="relative w-8 h-8 flex items-center justify-center text-muted hover:text-text-primary transition-colors">
                        <i className="fas fa-layer-group text-lg"></i>
                        <i className="fas fa-plus absolute text-[10px] -top-0.5 -right-0.5 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-surface"></i>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default WatchlistTabs;