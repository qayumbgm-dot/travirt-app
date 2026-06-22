
import React, { useState, useId, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    children: React.ReactNode;
    title: string;
    shortcut?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, title, shortcut }) => {
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
            const viewportWidth = window.innerWidth;
            const PADDING = 8;

            const top = triggerRect.top - PADDING;
            let left = triggerRect.left + triggerRect.width / 2;
            let transform = 'translateX(-50%) translateY(-100%)';
            let arrowLeft = '50%';
            
            // Check left edge
            if ((left - tooltipRect.width / 2) < PADDING) {
                left = PADDING;
                transform = 'translateX(0) translateY(-100%)';
                arrowLeft = `${triggerRect.left + triggerRect.width / 2 - PADDING}px`;
            }
            // Check right edge
            else if ((left + tooltipRect.width / 2) > (viewportWidth - PADDING)) {
                left = viewportWidth - PADDING;
                transform = 'translateX(-100%) translateY(-100%)';
                const tooltipLeftEdge = viewportWidth - PADDING - tooltipRect.width;
                arrowLeft = `${triggerRect.left + triggerRect.width / 2 - tooltipLeftEdge}px`;
            }

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                transform,
                zIndex: 9999,
                '--arrow-left': arrowLeft,
            } as React.CSSProperties);
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
                      className="absolute top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-overlay"
                      style={{ 
                        left: 'var(--arrow-left, 50%)',
                        transform: 'translateX(-50%)'
                      }}
                    ></div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Tooltip;
