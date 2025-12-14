import { useTypo } from '../context/useTypo';
import { useState } from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontTabs from './FontTabs';
import CSSExporter from './CSSExporter';
import OverridesManager from './OverridesManager';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';

const Controller = () => {
    const {
        activeFontStyleId,
        setActiveFontStyleId,
        fontObject,
        lineHeight,
        setLineHeight,
        letterSpacing,
        setLetterSpacing,
        lineHeightOverrides,
        resetAllLineHeightOverrides,
        setIsFallbackLinked,
        baseFontSize,
        fontScales,
        setFontScales,

        setHeaderStyles,
        headerFontStyleMap,
        fontStyles,
        loadFont,
        weight,
        setWeight,
        getPrimaryFont,
        updateFontWeight
    } = useTypo();

    const isSecondaryEmpty = activeFontStyleId === 'secondary' && (!fontStyles?.secondary?.fonts || fontStyles.secondary.fonts.length === 0);

    const [sidebarMode, setSidebarMode] = useState('main'); // 'main' | 'headers'
    const [showCSSExporter, setShowCSSExporter] = useState(false);
    const [lhInput, setLhInput] = useState(() => Math.round(lineHeight * 100).toString());
    const [isEditingLh, setIsEditingLh] = useState(false);

    const lhInputValue = isEditingLh ? lhInput : Math.round(lineHeight * 100).toString();

    if (!fontObject) return null;

    const primary = getPrimaryFont();
    const weightOptions = buildWeightSelectOptions(primary);
    const resolvedWeight = resolveWeightToAvailableOption(primary, weight);

    const hasOverrides = Object.keys(lineHeightOverrides).length > 0;
    return (
        <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
            {sidebarMode === 'main' && (
                <>
                    {/* Static Header */}
                    <div>
                        <h2 className="text-2xl font-bold mb-1 text-slate-800 tracking-tight">Beautify Your Fallbacks</h2>
                    </div>




                    <button
                        onClick={() => setSidebarMode('headers')}
                        className="w-full bg-white border border-gray-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <span className="text-sm font-serif italic">Aa</span>
                        <span>Edit Header Styles</span>
                    </button>

                    {/* Font Style Switcher */}
                    <div>
                        <div className="bg-slate-100 p-1 rounded-t-lg border border-slate-200 border-b-0 flex">
                            <button
                                onClick={() => setActiveFontStyleId('primary')}
                                className={`flex-1 px-3 py-2 text-xs font-bold rounded-md transition-all ${activeFontStyleId === 'primary'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Primary
                            </button>
                            <button
                                onClick={() => setActiveFontStyleId('secondary')}
                                className={`flex-1 px-3 py-2 text-xs font-bold rounded-md transition-all ${activeFontStyleId === 'secondary'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Secondary
                            </button>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-b-lg border border-slate-200">
                            {isSecondaryEmpty ? (
                                <label className="flex items-center justify-center w-full py-2 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 cursor-pointer transition-colors bg-white">
                                    Add Secondary Font
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".ttf,.otf,.woff,.woff2"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            try {
                                                const { font, metadata } = await parseFontFile(file);
                                                const url = createFontUrl(file);
                                                loadFont(font, url, file.name, metadata);
                                                e.target.value = '';
                                            } catch (err) {
                                                console.error('Error loading font:', err);
                                                alert('Failed to load font file.');
                                            }
                                        }}
                                    />
                                </label>
                            ) : (
                                <div className="space-y-4">
                                    {/* Global Weight Control */}
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <span>Global Weight</span>
                                            <span className="text-slate-400 font-mono text-[10px]">{weight}</span>
                                        </div>
                                        <select
                                            value={resolvedWeight}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (primary) {
                                                    updateFontWeight(primary.id, val);
                                                } else {
                                                    setWeight(val);
                                                }
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                        >
                                            {weightOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="50"
                                                    max="300"
                                                    step="5"
                                                    value={lhInputValue}
                                                    onFocus={() => setIsEditingLh(true)}
                                                    onBlur={() => {
                                                        setIsEditingLh(false);
                                                        let val = parseInt(lhInputValue);
                                                        if (isNaN(val)) val = 100;
                                                        const constrainedVal = Math.max(50, Math.min(300, val));
                                                        setLhInput(constrainedVal.toString());
                                                        setLineHeight(constrainedVal / 100);
                                                        setHeaderStyles(prev => {
                                                            const updated = { ...prev };
                                                            Object.keys(prev).forEach(tag => {
                                                                const assignedStyle = headerFontStyleMap[tag] || 'primary';
                                                                if (assignedStyle === activeFontStyleId) {
                                                                    updated[tag] = { ...prev[tag], lineHeight: constrainedVal / 100 };
                                                                }
                                                            });
                                                            return updated;
                                                        });
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setLhInput(val);

                                                        if (val === '') return;

                                                        const parsed = parseInt(val);
                                                        if (!isNaN(parsed) && parsed >= 50 && parsed <= 300) {
                                                            setLineHeight(parsed / 100);
                                                            setHeaderStyles(prev => {
                                                                const updated = { ...prev };
                                                                Object.keys(prev).forEach(tag => {
                                                                    const assignedStyle = headerFontStyleMap[tag] || 'primary';
                                                                    if (assignedStyle === activeFontStyleId) {
                                                                        updated[tag] = { ...prev[tag], lineHeight: parsed / 100 };
                                                                    }
                                                                });
                                                                return updated;
                                                            });
                                                        }
                                                    }}
                                                    className="w-12 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                                                />
                                                <span className="text-xs">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="300"
                                            step="5"
                                            value={Math.round(lineHeight * 100)}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) / 100;
                                                setLineHeight(val);
                                                setHeaderStyles(prev => {
                                                    const updated = { ...prev };
                                                    Object.keys(prev).forEach(tag => {
                                                        const assignedStyle = headerFontStyleMap[tag] || 'primary';
                                                        if (assignedStyle === activeFontStyleId) {
                                                            updated[tag] = { ...prev[tag], lineHeight: val };
                                                        }
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

                                    {/* Letter Spacing */}
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <span>Letter Spacing</span>
                                            <span>{letterSpacing}em</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-0.1"
                                            max="0.5"
                                            step="0.01"
                                            value={letterSpacing}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setLetterSpacing(val);
                                                setHeaderStyles(prev => {
                                                    const updated = { ...prev };
                                                    Object.keys(prev).forEach(tag => {
                                                        const assignedStyle = headerFontStyleMap[tag] || 'primary';
                                                        if (assignedStyle === activeFontStyleId) {
                                                            updated[tag] = { ...prev[tag], letterSpacing: val };
                                                        }
                                                    });
                                                    return updated;
                                                });
                                            }}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>





                    {/* Font Tabs */}
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Font Stack
                        </label>
                        <FontTabs />
                    </div>

                    {/* Overrides Manager */}
                    <OverridesManager />

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
