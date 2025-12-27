import React, { useState } from 'react';
import { useTypo } from '../context/useTypo';

const OverridesManager = () => {
    const [isOpen, setIsOpen] = useState(false);
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
        updateLineHeightOverrideForStyle,
        headerOverrides,
        DEFAULT_HEADER_STYLES,
        resetHeaderStyle,
        resetAllHeaderStyles
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
            .filter(f => f.type === 'fallback' && (f.scale !== undefined || f.lineHeight !== undefined || f.letterSpacing !== undefined || f.weightOverride !== undefined))
            .map(f => ({
                type: 'font-level',
                fontId: f.id,
                fontName: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
                overrides: {
                    scale: f.scale !== undefined,
                    lineHeight: f.lineHeight !== undefined,
                    letterSpacing: f.letterSpacing !== undefined,
                    weight: f.weightOverride !== undefined
                }
            }));

        const languageLevelOverrides = Object.entries(style.fallbackFontOverrides || {})
            .filter(([langId]) => visibleSet.has(langId))
            .map(([langId, fontId]) => {
                const language = languages.find(l => l.id === langId);
                const font = fonts.find(f => f.id === fontId);
                const resolvedFontName = fontId === 'legacy'
                    ? 'System'
                    : (font?.fileName?.replace(/\.[^/.]+$/, '') || font?.name || 'Unknown Font');
                return {
                    type: 'language-level',
                    langId,
                    languageName: language?.name || 'Unknown',
                    fontName: resolvedFontName
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

    // Header overrides are tracked explicitly in context (only manual changes appear here)
    const headerOverrideList = Object.entries(headerOverrides || {}).map(([tag, props]) => {
        const changed = [];
        if (props.scale) changed.push('Font Size');
        if (props.lineHeight) changed.push('Line Height');
        if (props.letterSpacing) changed.push('Letter Spacing');

        if (changed.length === 0) return null;
        return { tag, changed };
    }).filter(Boolean);

    const totalOverrides =
        (primary.hasGlobalFallbackScale ? 1 : 0) +
        primary.fontLevelOverrides.length +
        primary.languageLevelOverrides.length +
        primary.lineHeightOverridesList.length;

    const totalWithHeader = totalOverrides + headerOverrideList.length;

    if (totalWithHeader === 0) return null;

    return (
        <div className="pb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2 group cursor-pointer"
            >
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider cursor-pointer group-hover:text-slate-600 transition-colors">
                    Active Overrides ({totalWithHeader})
                </label>
                <svg
                    className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="space-y-3 pt-1">
                    {headerOverrideList.length > 0 && (
                        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Header Styles ({headerOverrideList.length})</div>
                                <button
                                    onClick={() => {
                                        if (confirm('Reset all header style overrides? This cannot be undone.')) {
                                            resetAllHeaderStyles();
                                        }
                                    }}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                    title={`Reset all header overrides`}
                                    type="button"
                                >
                                    Reset Headers
                                </button>
                            </div>

                            <div className="divide-y divide-slate-200">
                                {headerOverrideList.map(h => (
                                    <div key={h.tag} className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">{h.tag.toUpperCase()}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{h.changed.map(c => `• ${c}`).join(' ')}</div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                resetHeaderStyle(h.tag);
                                            }}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                            title="Reset header overrides"
                                            type="button"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {['primary'].map(styleId => {
                        const group = primary;
                        const styleLabel = 'Primary';
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
                                                <div className="text-xs font-semibold text-slate-700 truncate">Main Fallback Size Adjust</div>
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
                                                    {override.overrides.letterSpacing && <span>• Letter Spacing</span>}
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
                                    if (confirm('Reset all overrides for all styles? This cannot be undone.')) {
                                        ['primary'].forEach(styleId => {
                                            const group = primary;
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
                                Reset All Overrides
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverridesManager;
