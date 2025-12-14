import { useTypo } from '../context/useTypo';

const OverridesManager = () => {
    const {
        languages,
        visibleLanguageIds,
        fontStyles,
        getFontsForStyle,
        resetFallbackFontOverridesForStyle,
        resetGlobalFallbackScaleForStyle,
        resetAllFallbackFontOverridesForStyle,
        resetAllLineHeightOverridesForStyle,
        clearFallbackFontOverrideForStyle,
        updateLineHeightOverrideForStyle
    } = useTypo();

    // Collect all overrides
    const visibleSet = new Set(visibleLanguageIds);

    const getStyleOverrides = (styleId) => {
        const style = fontStyles?.[styleId];
        if (!style) {
            return {
                hasGlobalFallbackScale: false,
                fontLevelOverrides: [],
                languageLevelOverrides: [],
                lineHeightOverridesList: []
            };
        }

        const fonts = getFontsForStyle(styleId);

        const fontLevelOverrides = fonts
            .filter(f => f.type === 'fallback' && (f.scale !== undefined || f.lineHeight !== undefined || f.weightOverride !== undefined))
            .map(f => ({
                type: 'font-level',
                fontId: f.id,
                fontName: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
                overrides: {
                    scale: f.scale !== undefined,
                    lineHeight: f.lineHeight !== undefined,
                    weight: f.weightOverride !== undefined
                }
            }));

        const languageLevelOverrides = Object.entries(style.fallbackFontOverrides || {})
            .filter(([langId]) => visibleSet.has(langId))
            .map(([langId, fontId]) => {
                const language = languages.find(l => l.id === langId);
                const font = fonts.find(f => f.id === fontId);
                return {
                    type: 'language-level',
                    langId,
                    languageName: language?.name || 'Unknown',
                    fontName: font?.fileName?.replace(/\.[^/.]+$/, '') || font?.name || 'Unknown Font'
                };
            });

        const lineHeightOverridesList = Object.entries(style.lineHeightOverrides || {})
            .filter(([langId]) => visibleSet.has(langId))
            .map(([langId, value]) => {
                const language = languages.find(l => l.id === langId);
                return {
                    type: 'line-height',
                    langId,
                    languageName: language?.name || 'Unknown',
                    value
                };
            });

        const hasGlobalFallbackScale = (style.fontScales?.fallback ?? 100) !== 100;

        return { hasGlobalFallbackScale, fontLevelOverrides, languageLevelOverrides, lineHeightOverridesList };
    };

    const primary = getStyleOverrides('primary');
    const secondary = getStyleOverrides('secondary');

    const totalOverrides =
        (primary.hasGlobalFallbackScale ? 1 : 0) +
        primary.fontLevelOverrides.length +
        primary.languageLevelOverrides.length +
        primary.lineHeightOverridesList.length +
        (secondary.hasGlobalFallbackScale ? 1 : 0) +
        secondary.fontLevelOverrides.length +
        secondary.languageLevelOverrides.length +
        secondary.lineHeightOverridesList.length;

    if (totalOverrides === 0) return null;

    return (
        <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                Active Overrides ({totalOverrides})
            </label>
            <div className="space-y-3">
                {(['primary', 'secondary']).map(styleId => {
                    const group = styleId === 'primary' ? primary : secondary;
                    const styleLabel = styleId === 'primary' ? 'Primary' : 'Secondary';
                    const style = fontStyles?.[styleId];
                    const groupTotal = (group.hasGlobalFallbackScale ? 1 : 0)
                        + group.fontLevelOverrides.length
                        + group.languageLevelOverrides.length
                        + group.lineHeightOverridesList.length;

                    if (!style || groupTotal === 0) return null;

                    return (
                        <div key={styleId} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                    {styleLabel} ({groupTotal})
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm(`Reset all ${styleLabel} overrides? This cannot be undone.`)) {
                                            if (group.hasGlobalFallbackScale) resetGlobalFallbackScaleForStyle(styleId);
                                            group.fontLevelOverrides.forEach(o => resetFallbackFontOverridesForStyle(styleId, o.fontId));
                                            resetAllFallbackFontOverridesForStyle(styleId);
                                            resetAllLineHeightOverridesForStyle(styleId);
                                        }
                                    }}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                    title={`Reset all ${styleLabel} overrides`}
                                    type="button"
                                >
                                    Reset {styleLabel}
                                </button>
                            </div>

                            <div className="divide-y divide-slate-200">
                                {group.hasGlobalFallbackScale && (
                                    <div className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">Global Fallback Size Adjust</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                • {style.fontScales.fallback}%
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => resetGlobalFallbackScaleForStyle(styleId)}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                            title="Reset to 100%"
                                            type="button"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                )}

                                {group.fontLevelOverrides.map(override => (
                                    <div key={override.fontId} className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">{override.fontName}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                                                {override.overrides.scale && <span>• Size Adjust</span>}
                                                {override.overrides.lineHeight && <span>• Line Height</span>}
                                                {override.overrides.weight && <span>• Weight</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => resetFallbackFontOverridesForStyle(styleId, override.fontId)}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                            title="Reset font overrides"
                                            type="button"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                ))}

                                {group.languageLevelOverrides.map(override => (
                                    <div key={override.langId} className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">{override.languageName}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                • Fallback: {override.fontName}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => clearFallbackFontOverrideForStyle(styleId, override.langId)}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                            title="Reset language override"
                                            type="button"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                ))}

                                {group.lineHeightOverridesList.map(override => (
                                    <div key={override.langId} className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">{override.languageName}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                • Line Height: {override.value}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateLineHeightOverrideForStyle(styleId, override.langId, null)}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                            title="Reset line height override"
                                            type="button"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <div className="p-3 bg-slate-100">
                        <button
                            onClick={() => {
                                if (confirm('Reset all overrides for Primary and Secondary? This cannot be undone.')) {
                                    ['primary', 'secondary'].forEach(styleId => {
                                        const group = styleId === 'primary' ? primary : secondary;
                                        if (group.hasGlobalFallbackScale) resetGlobalFallbackScaleForStyle(styleId);
                                        group.fontLevelOverrides.forEach(o => resetFallbackFontOverridesForStyle(styleId, o.fontId));
                                        resetAllFallbackFontOverridesForStyle(styleId);
                                        resetAllLineHeightOverridesForStyle(styleId);
                                    });
                                }
                            }}
                            className="w-full py-2 text-[10px] font-bold text-rose-600 border border-rose-300 rounded hover:bg-rose-50 transition-colors"
                            type="button"
                        >
                            Reset All Overrides (Both Styles)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverridesManager;
