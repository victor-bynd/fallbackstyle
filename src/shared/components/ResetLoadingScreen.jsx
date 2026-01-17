import React from 'react';
import { createPortal } from 'react-dom';

const ResetLoadingScreen = () => {
    return createPortal(
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center">
                {/* Premium Loader */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-2 border-4 border-rose-400 rounded-full border-b-transparent animate-spin duration-700"></div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">
                        Resetting Application
                    </h2>
                    <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                        Clearing your configurations and local data.
                        This will take a moment.
                    </p>
                </div>

                {/* Micro-interaction: Progress feel */}
                <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-rose-400 animate-shimmer" style={{ width: '60%', backgroundSize: '200% 100%' }}></div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite linear;
                }
            `}} />
        </div>,
        document.body
    );
};

export default ResetLoadingScreen;
