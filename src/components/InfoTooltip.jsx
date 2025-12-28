import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const InfoTooltip = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const updatePosition = () => {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top,
                    left: rect.right + 12 // 12px gap
                });
            };

            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex items-center group ml-2"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            <div className="cursor-help text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            </div>

            {isVisible && createPortal(
                <div
                    className="fixed w-64 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-xl z-[9999] animate-fade-in pointer-events-none"
                    style={{
                        top: coords.top,
                        left: coords.left
                    }}
                >
                    {/* Arrow on the left pointing left */}
                    <div className="absolute top-2 left-[-4px] w-2 h-2 bg-slate-800 rotate-45"></div>
                    {content}
                </div>,
                document.body
            )}
        </div>
    );
};

export default InfoTooltip;
