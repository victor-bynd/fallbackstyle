import { useTypo } from '../context/TypoContext';
import { useState } from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontTabs from './FontTabs';

const Controller = () => {
    const {
        fontObject,
        fileName,
        fallbackFont,
        setFallbackFont,
        colors,
        setColors,
        lineHeight,
        setLineHeight,
        lineHeightOverrides,
        resetAllLineHeightOverrides,
        fallbackOptions,
        isFallbackLinked,
        setIsFallbackLinked,
        baseFontSize,
        setBaseFontSize,
        fontScales,
        setFontScales
    } = useTypo();

    const [sidebarMode, setSidebarMode] = useState('main'); // 'main' | 'headers'

    if (!fontObject) return null;

    const hasOverrides = Object.keys(lineHeightOverrides).length > 0;

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
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Primary Font</div>
                        <div className="font-mono text-sm break-all text-slate-700 font-medium">{fileName}</div>
                        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            {fontObject.numGlyphs} glyphs
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Fallback Font
                        </label>
                        <select
                            value={fallbackFont}
                            onChange={(e) => setFallbackFont(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                        >
                            {fallbackOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={fallbackFont}
                            onChange={(e) => setFallbackFont(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-slate-700 mt-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                            placeholder="Custom font stack..."
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Typography Sizing
                        </label>
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            {/* Base Font Size Input */}
                            <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>H1</span>
                                    <span className="font-bold text-indigo-600">{baseFontSize}px</span>
                                </div>
                                <input
                                    type="number"
                                    min="10"
                                    max="200"
                                    value={baseFontSize}
                                    onChange={(e) => setBaseFontSize(parseInt(e.target.value) || 16)}
                                    className="w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>Primary Size %</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-[10px]">{Math.round(baseFontSize * (fontScales.active / 100))}px</span>
                                        <span>{fontScales.active}%</span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="25"
                                    max="300"
                                    step="5"
                                    value={fontScales.active}
                                    onChange={(e) => {
                                        const newVal = parseInt(e.target.value);
                                        setFontScales(prev => ({
                                            active: newVal,
                                            fallback: isFallbackLinked ? newVal : prev.fallback
                                        }));
                                    }}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>Fallback Scale %</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-mono text-[10px]">{Math.round(baseFontSize * (fontScales.fallback / 100))}px</span>
                                            <span>{fontScales.fallback}%</span>
                                        </div>
                                        {!isFallbackLinked && (
                                            <button
                                                onClick={() => {
                                                    setIsFallbackLinked(true);
                                                    setFontScales(prev => ({ ...prev, fallback: prev.active }));
                                                }}
                                                className="text-[10px] text-indigo-500 font-bold hover:underline"
                                                title="Sync with Active Scale"
                                            >
                                                Link
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="25"
                                    max="300"
                                    step="5"
                                    value={fontScales.fallback}
                                    onChange={(e) => {
                                        setIsFallbackLinked(false);
                                        setFontScales(prev => ({ ...prev, fallback: parseInt(e.target.value) }));
                                    }}
                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isFallbackLinked ? 'bg-indigo-100 accent-indigo-300' : 'bg-gray-200 accent-indigo-600'}`}
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

                            <button
                                onClick={() => setSidebarMode('headers')}
                                className="w-full mt-2 bg-white border border-gray-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <span className="text-sm font-serif italic">Aa</span>
                                <span>Edit Header Styles</span>
                            </button>
                        </div>
                    </div>

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
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 font-medium">Missing Glyph Bg</span>
                                <div className="p-1 bg-white rounded border border-gray-200 shadow-sm cursor-pointer hover:border-gray-300">
                                    <input
                                        type="color"
                                        value={colors.missingBg}
                                        onChange={(e) => setColors(prev => ({ ...prev, missingBg: e.target.value }))}
                                        className="block w-6 h-6 cursor-pointer"
                                        title="Choose missing glyph background"
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
