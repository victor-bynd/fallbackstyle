import { useTypo } from '../context/TypoContext';
import languages from '../data/languages.json';

const OverridesManager = () => {
    const {
        fonts,
        lineHeightOverrides,
        fallbackFontOverrides,
        resetAllLineHeightOverrides,
        resetAllFallbackFontOverrides,
        resetFallbackFontOverrides,
        clearFallbackFontOverride,
        updateLineHeightOverride,
        fontScales,
        setFontScales
    } = useTypo();

    const resetLineHeightOverride = (langId) => {
        updateLineHeightOverride(langId, null);
    };

    const resetGlobalFallbackScale = () => {
        setFontScales(prev => ({ ...prev, fallback: 100 }));
    };

    // Collect all overrides
    const fontLevelOverrides = fonts
        .filter(f => f.type === 'fallback' && (f.scale !== undefined || f.lineHeight !== undefined))
        .map(f => ({
            type: 'font-level',
            fontId: f.id,
            fontName: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
            overrides: {
                scale: f.scale !== undefined,
                lineHeight: f.lineHeight !== undefined
            }
        }));

    const languageLevelOverrides = Object.entries(fallbackFontOverrides).map(([langId, fontId]) => {
        const language = languages.find(l => l.id === langId);
        const font = fonts.find(f => f.id === fontId);
        return {
            type: 'language-level',
            langId,
            languageName: language?.name || 'Unknown',
            fontName: font?.fileName?.replace(/\.[^/.]+$/, '') || font?.name || 'Unknown Font'
        };
    });

    const lineHeightOverridesList = Object.entries(lineHeightOverrides).map(([langId, value]) => {
        const language = languages.find(l => l.id === langId);
        return {
            type: 'line-height',
            langId,
            languageName: language?.name || 'Unknown',
            value
        };
    });

    // Check if global fallback scale is modified
    const hasGlobalFallbackScale = fontScales.fallback !== 100;

    const totalOverrides = fontLevelOverrides.length + languageLevelOverrides.length + lineHeightOverridesList.length + (hasGlobalFallbackScale ? 1 : 0);

    if (totalOverrides === 0) return null;

    return (
        <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                Active Overrides ({totalOverrides})
            </label>
            <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                {/* Global fallback scale override */}
                {hasGlobalFallbackScale && (
                    <div className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">Global Fallback Size Adjust</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                • {fontScales.fallback}%
                            </div>
                        </div>
                        <button
                            onClick={resetGlobalFallbackScale}
                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            title="Reset to 100%"
                        >
                            Reset
                        </button>
                    </div>
                )}

                {/* Font-level overrides */}
                {fontLevelOverrides.map(override => (
                    <div key={override.fontId} className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">{override.fontName}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                {override.overrides.scale && <span className="mr-2">• Size Adjust</span>}
                                {override.overrides.lineHeight && <span>• Line Height</span>}
                            </div>
                        </div>
                        <button
                            onClick={() => resetFallbackFontOverrides(override.fontId)}
                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            title="Reset font overrides"
                        >
                            Reset
                        </button>
                    </div>
                ))}

                {/* Language-level fallback font overrides */}
                {languageLevelOverrides.map(override => (
                    <div key={override.langId} className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">{override.languageName}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                • Fallback: {override.fontName}
                            </div>
                        </div>
                        <button
                            onClick={() => clearFallbackFontOverride(override.langId)}
                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            title="Reset language override"
                        >
                            Reset
                        </button>
                    </div>
                ))}

                {/* Line height overrides */}
                {lineHeightOverridesList.map(override => (
                    <div key={override.langId} className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">{override.languageName}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                • Line Height: {override.value}
                            </div>
                        </div>
                        <button
                            onClick={() => resetLineHeightOverride(override.langId)}
                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            title="Reset line height override"
                        >
                            Reset
                        </button>
                    </div>
                ))}

                {/* Reset All button */}
                <div className="p-3 bg-slate-100">
                    <button
                        onClick={() => {
                            if (confirm('Reset all overrides? This cannot be undone.')) {
                                // Reset global fallback scale
                                if (hasGlobalFallbackScale) resetGlobalFallbackScale();
                                // Reset all font-level overrides
                                fontLevelOverrides.forEach(o => resetFallbackFontOverrides(o.fontId));
                                // Reset all language fallback overrides
                                resetAllFallbackFontOverrides();
                                // Reset all line height overrides
                                resetAllLineHeightOverrides();
                            }
                        }}
                        className="w-full py-2 text-[10px] font-bold text-rose-600 border border-rose-300 rounded hover:bg-rose-50 transition-colors"
                    >
                        Reset All Overrides
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OverridesManager;
