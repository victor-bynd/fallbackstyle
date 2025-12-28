import React, { useState } from 'react';

const InfoTooltip = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
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

            {isVisible && (
                <div className="absolute top-0 right-6 w-64 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-xl z-50 animate-fade-in pointer-events-none">
                    <div className="absolute top-2 right-[-4px] w-2 h-2 bg-slate-800 rotate-45"></div>
                    {content}
                </div>
            )}
        </div>
    );
};

export default InfoTooltip;
