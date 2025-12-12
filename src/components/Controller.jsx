import { useTypo } from '../context/TypoContext';
import { useState } from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontTabs from './FontTabs';

const Controller = () => {
    const {
        fontObject,
        colors,
        setColors,
        lineHeight,
        setLineHeight,
        lineHeightOverrides,
        resetAllLineHeightOverrides,
        fallbackFontOverrides,
        resetAllFallbackFontOverrides,
        isFallbackLinked,
        setIsFallbackLinked,
        baseFontSize,
        setBaseFontSize,
        fontScales,
        setFontScales,
        activeFont,
        getActiveFont,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        getEffectiveFontSettings
    } = useTypo();

    const [sidebarMode, setSidebarMode] = useState('main'); // 'main' | 'headers'

    if (!fontObject) return null;

    const hasOverrides = Object.keys(lineHeightOverrides).length > 0;
    const hasFallbackFontOverrides = Object.keys(fallbackFontOverrides).length > 0;
    const activeFontObj = getActiveFont();
    const isPrimary = activeFont === 'primary';
    const effectiveSettings = getEffectiveFontSettings(activeFont);
    
    // Check if fallback font has any overrides
    const hasFallbackOverrides = !isPrimary && activeFontObj && (
        activeFontObj.baseFontSize !== undefined ||
        activeFontObj.scale !== undefined ||
        activeFontObj.lineHeight !== undefined
    );

    return (
        <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
            {/* Static Header - Always Visible */}
            <div>
                <h2 className="text-2xl font-bold mb-1 text-slate-800 tracking-tight">Localize Type</h2>
                <p className="text-slate-500 text-sm font-medium">Stress-test your fonts</p>
            </div>

            {/* Font Tabs */}
            <FontTabs />

            {/* Dynamic Content Area */}
            {sidebarMode === 'headers' ? (
                <SidebarHeaderConfig onBack={() => setSidebarMode('main')} />
            ) : (
                <>
                    {/* Fallback Overrides Section - Only shown when viewing fallback font */}
                    {!isPrimary && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    FALLBACK OVERRIDES
                                </label>
                                {hasFallbackOverrides && (
                                    <button
                                        onClick={() => resetFallbackFontOverrides(activeFont)}
                                        className="text-[9px] text-rose-500 font-bold hover:text-rose-700 hover:underline"
                                        title="Reset to global settings"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Font Scale %</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-mono text-[10px]">{Math.round((effectiveSettings?.baseFontSize || baseFontSize) * ((effectiveSettings?.scale || fontScales.active) / 100))}px</span>
                                            <span>{effectiveSettings?.scale || fontScales.active}%</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="25"
                                        max="300"
                                        step="5"
                                        value={effectiveSettings?.scale || fontScales.active}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            updateFallbackFontOverride(activeFont, 'scale', val);
                                        }}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1">Global: {fontScales.active}%</p>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Line Height</span>
                                        <span>{effectiveSettings?.lineHeight || lineHeight}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.8"
                                        max="3.0"
                                        step="0.1"
                                        value={effectiveSettings?.lineHeight || lineHeight}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateFallbackFontOverride(activeFont, 'lineHeight', val);
                                        }}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1">Global: {lineHeight}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Global Typography Settings - Always visible */}
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Global Typography Settings
                        </label>
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            {isPrimary ? (
                                <>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <span>H1 Font Size</span>
                                            <span className="font-bold text-indigo-600">{baseFontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="20"
                                            max="200"
                                            step="1"
                                            value={baseFontSize}
                                            onChange={(e) => setBaseFontSize(parseInt(e.target.value) || 20)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <span>Fallback Scale %</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 font-mono text-[10px]">{Math.round(baseFontSize * (fontScales.fallback / 100))}px</span>
                                                <span>{fontScales.fallback}%</span>
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
                                            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
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
                                </>
                            ) : (
                                <>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <span>H1 Font Size</span>
                                            <span className="font-bold text-slate-400">{baseFontSize}px</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-lg opacity-50 cursor-not-allowed"></div>
                                        <p className="text-[9px] text-slate-400 mt-1">Global setting (read-only)</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <span>Line Height</span>
                                            <span className="text-slate-400">{lineHeight}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-lg opacity-50 cursor-not-allowed"></div>
                                        <p className="text-[9px] text-slate-400 mt-1">Global setting (read-only)</p>
                                    </div>
                                </>
                            )}

                            <button
                                onClick={() => setSidebarMode('headers')}
                                className="w-full mt-2 bg-white border border-gray-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <span className="text-sm font-serif italic">Aa</span>
                                <span>Edit Header Styles</span>
                            </button>
                        </div>
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

                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Colors
                        </label>
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 font-medium">Text Color</span>
                                <div className="p-1 bg-white rounded border border-gray-200 shadow-sm cursor-pointer hover:border-gray-300">
                                    <input
                                        type="color"
                                        value={colors.primary}
                                        onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                                        className="block w-6 h-6 cursor-pointer"
                                        title="Choose text color"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 font-medium">Missing Glyph Text</span>
                                <div className="p-1 bg-white rounded border border-gray-200 shadow-sm cursor-pointer hover:border-gray-300">
                                    <input
                                        type="color"
                                        value={colors.missing}
                                        onChange={(e) => setColors(prev => ({ ...prev, missing: e.target.value }))}
                                        className="block w-6 h-6 cursor-pointer"
                                        title="Choose missing glyph color"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Controller;
