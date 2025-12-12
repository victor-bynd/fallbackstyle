import { useTypo } from '../context/TypoContext';
import { useState } from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontTabs from './FontTabs';
import CSSExporter from './CSSExporter';

const Controller = () => {
    const {
        fontObject,
        lineHeight,
        setLineHeight,
        lineHeightOverrides,
        resetAllLineHeightOverrides,
        fallbackFontOverrides,
        resetAllFallbackFontOverrides,
        setIsFallbackLinked,
        baseFontSize,
        fontScales,
        setFontScales,
        setHeaderStyles
    } = useTypo();

    const [sidebarMode, setSidebarMode] = useState('main'); // 'main' | 'headers'
    const [showCSSExporter, setShowCSSExporter] = useState(false);

    if (!fontObject) return null;

    const hasOverrides = Object.keys(lineHeightOverrides).length > 0;
    const hasFallbackFontOverrides = Object.keys(fallbackFontOverrides).length > 0;



    return (
        <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
            {sidebarMode === 'main' && (
                <>
                    {/* Static Header */}
                    <div>
                        <h2 className="text-2xl font-bold mb-1 text-slate-800 tracking-tight">Beautify Your Fallbacks</h2>
                    </div>

                    {/* Global Typography Settings */}
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Global Typography Settings
                        </label>
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>Fallback Size Adjust</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-[10px]">{Math.round(baseFontSize * (fontScales.fallback / 100))}px</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="25"
                                                max="300"
                                                step="5"
                                                value={fontScales.fallback}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 25;
                                                    setFontScales(prev => ({
                                                        ...prev,
                                                        fallback: Math.max(25, Math.min(300, val))
                                                    }));
                                                    setIsFallbackLinked(false);
                                                }}
                                                className="w-12 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                                            />
                                            <span className="text-xs">%</span>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="25"
                                    max="300"
                                    step="5"
                                    value={fontScales.fallback}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFontScales(prev => ({
                                            ...prev,
                                            fallback: val
                                        }));
                                        setIsFallbackLinked(false);
                                    }}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>Line Height</span>
                                    <span>{lineHeight}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.8"
                                    max="3.0"
                                    step="0.1"
                                    value={lineHeight}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLineHeight(val);
                                        // Update all header line heights
                                        setHeaderStyles(prev => {
                                            const updated = {};
                                            Object.keys(prev).forEach(tag => {
                                                updated[tag] = { ...prev[tag], lineHeight: val };
                                            });
                                            return updated;
                                        });
                                    }}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                {hasOverrides && (
                                    <button
                                        onClick={resetAllLineHeightOverrides}
                                        className="w-full mt-2 py-1 text-[10px] font-bold text-rose-500 border border-rose-200 rounded hover:bg-rose-50 transition-colors"
                                    >
                                        Reset {Object.keys(lineHeightOverrides).length} Overrides
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setSidebarMode('headers')}
                                className="w-full mt-2 bg-white border border-gray-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <span className="text-sm font-serif italic">Aa</span>
                                <span>Edit Header Styles</span>
                            </button>
                        </div>
                    </div>

                    {/* Font Tabs */}
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Font Stack
                        </label>
                        <FontTabs />
                    </div>

                    {/* Reset All Overrides Section */}
                    {(hasOverrides || hasFallbackFontOverrides) && (
                        <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                Reset Overrides
                            </label>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                                {hasOverrides && (
                                    <button
                                        onClick={resetAllLineHeightOverrides}
                                        className="w-full py-2 text-[10px] font-bold text-rose-500 border border-rose-200 rounded hover:bg-rose-50 transition-colors"
                                    >
                                        Reset {Object.keys(lineHeightOverrides).length} Line Height Override{Object.keys(lineHeightOverrides).length !== 1 ? 's' : ''}
                                    </button>
                                )}
                                {hasFallbackFontOverrides && (
                                    <button
                                        onClick={resetAllFallbackFontOverrides}
                                        className="w-full py-2 text-[10px] font-bold text-rose-500 border border-rose-200 rounded hover:bg-rose-50 transition-colors"
                                    >
                                        Reset {Object.keys(fallbackFontOverrides).length} Fallback Font Override{Object.keys(fallbackFontOverrides).length !== 1 ? 's' : ''}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1"></div>

                    {/* Export CSS Button - Bottom of Sidebar */}
                    <button
                        onClick={() => setShowCSSExporter(true)}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        <span>Export CSS</span>
                    </button>
                </>
            )}

            {/* Header Editor - Full Replacement */}
            {sidebarMode === 'headers' && (
                <SidebarHeaderConfig onBack={() => setSidebarMode('main')} />
            )}

            {/* CSS Exporter Modal */}
            {showCSSExporter && (
                <CSSExporter onClose={() => setShowCSSExporter(false)} />
            )}
        </div>
    );
};

export default Controller;
