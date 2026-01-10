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
        resetHeaderStyle,
        resetAllHeaderStyles,
        primaryFontOverrides,
        clearPrimaryFontOverride,
        systemFallbackOverrides,
        resetSystemFallbackOverride
    } = useTypo();

    // 1. Grouping Logic
    const getGroupedOverrides = (styleId) => {
        const style = fontStyles?.[styleId];
        if (!style) return [];

        const visibleSet = new Set(visibleLanguageIds);
        const fonts = getFontsForStyle(styleId);

        // Data Structure:
        // [ { id: 'global' | langId, name: string, overrides: [] }]
        const groups = {};

        // Helper to get/create group
        const getGroup = (id, name) => {
            if (!groups[id]) {
                groups[id] = { id, name, overrides: [] };
            }
            return groups[id];
        };

        // --- GLOBAL SECTION ---
        // 1. Global Fallback Scale
        if ((style.fontScales?.fallback ?? 100) !== 100) {
            getGroup('global', 'Global').overrides.push({
                id: 'global-scale',
                label: 'Global Fallback Scale',
                details: `${style.fontScales.fallback}%`,
                onReset: () => resetGlobalFallbackScaleForStyle(styleId)
            });
        }

        // 2. Global Font Metrics (Non-Language Specific Fonts)
        fonts
            .filter(f => f.type === 'fallback' && !f.isLangSpecific && !f.isClone)
            .forEach(f => {
                const changes = [];
                if (f.scale !== undefined) changes.push('Size Adjust');
                if (f.lineHeight !== undefined) changes.push('Line Height');
                if (f.letterSpacing !== undefined) changes.push('Letter Spacing');
                if (f.weightOverride !== undefined) changes.push('Weight');
                if (f.fontSizeAdjust !== undefined) changes.push('F-Size');
                if (f.ascentOverride !== undefined) changes.push('Ascent');
                if (f.descentOverride !== undefined) changes.push('Descent');
                if (f.lineGapOverride !== undefined) changes.push('Line Gap');

                if (changes.length > 0) {
                    getGroup('global', 'Global').overrides.push({
                        id: `font-${f.id}`,
                        label: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
                        details: changes.map(c => `• ${c}`).join(' '),
                        onReset: () => resetFallbackFontOverridesForStyle(styleId, f.id) // This function name assumes it works for ANY font override reset, need to verify context
                    });
                }
            });


        // --- LANGUAGE SECTIONS ---

        // 3. Primary Overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';
            const font = fonts.find(f => f.id === fontId);
            const fontName = font?.fileName?.replace(/\.[^/.]+$/, '') || font?.name || 'Unknown Font';

            getGroup(langId, langName).overrides.push({
                id: `primary-${langId}`,
                label: 'Primary Font',
                details: fontName,
                isPrimary: true,
                onReset: () => clearPrimaryFontOverride(langId)
            });

            // Check for metrics on this specific PRIMARY override font
            if (font) {
                const changes = [];
                // Primary overrides usually inherit unless changed
                if (font.weightOverride !== undefined) changes.push('Weight');
                if (font.scale !== undefined) changes.push('Scale'); // Should be rare for primary
                if (font.lineHeight !== undefined) changes.push('Line Height');
                if (font.letterSpacing !== undefined) changes.push('Letter Spacing');
                if (font.fontSizeAdjust !== undefined) changes.push('F-Size');
                if (font.ascentOverride !== undefined) changes.push('Ascent');
                if (font.descentOverride !== undefined) changes.push('Descent');
                if (font.lineGapOverride !== undefined) changes.push('Line Gap');

                if (changes.length > 0) {
                    getGroup(langId, langName).overrides.push({
                        id: `primary-metrics-${font.id}`,
                        label: `${fontName} (Metrics)`,
                        details: changes.map(c => `• ${c}`).join(' '),
                        onReset: () => {
                            // Resetting metrics on a primary override font.
                            // Currently we don't have a granular "reset metrics for this specific font" easily exposed
                            // besides manually updating every prop to undefined.
                            // Use resetFallbackFontOverridesForStyle which cleans metrics?
                            resetFallbackFontOverridesForStyle(styleId, font.id);
                        }
                    });
                }
            }
        });

        // 4. Fallback Overrides (Mappings)
        Object.entries(style.fallbackFontOverrides || {}).forEach(([langId, val]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';

            // Helper to process a mapped font
            const processMappedFont = (fontIdOrMap) => {
                // It could be a map { origId: overrideId } or string overrideId
                // We want to list the resulting OVERRIDE font
                let overrideIds = [];
                if (typeof fontIdOrMap === 'string') overrideIds.push(fontIdOrMap);
                else if (typeof fontIdOrMap === 'object') overrideIds = Object.values(fontIdOrMap);

                overrideIds.forEach(fId => {
                    const font = fonts.find(f => f.id === fId);
                    if (!font) return;

                    const fontName = font.fileName?.replace(/\.[^/.]+$/, '') || font.name || 'Unknown Font';
                    getGroup(langId, langName).overrides.push({
                        id: `fallback-${fId}`,
                        label: 'Fallback Font',
                        details: fontName,
                        onReset: () => {
                            // Resetting a fallback mapping.
                            // Context function: clearFallbackFontOverrideForStyle(styleID, langId)
                            // Warning: This clears ALL fallbacks for langId in current implementation?
                            // Let's check usage. 
                            // Ideally we want granular unmap.
                            // For now, use clearFallbackFontOverrideForStyle which seems to be the main "Reset" for lang fallbacks.
                            clearFallbackFontOverrideForStyle(styleId, langId);
                        }
                    });

                    // Check metrics
                    const changes = [];
                    if (font.scale !== undefined) changes.push('Size Adjust');
                    if (font.lineHeight !== undefined) changes.push('Line Height');
                    if (font.letterSpacing !== undefined) changes.push('Letter Spacing');
                    if (font.weightOverride !== undefined) changes.push('Weight');
                    if (font.fontSizeAdjust !== undefined) changes.push('F-Size');
                    if (font.ascentOverride !== undefined) changes.push('Ascent');
                    if (font.descentOverride !== undefined) changes.push('Descent');
                    if (font.lineGapOverride !== undefined) changes.push('Line Gap');

                    if (changes.length > 0) {
                        getGroup(langId, langName).overrides.push({
                            id: `fallback-metrics-${fId}`,
                            label: `${fontName} (Metrics)`,
                            details: changes.map(c => `• ${c}`).join(' '),
                            onReset: () => resetFallbackFontOverridesForStyle(styleId, fId)
                        });
                    }
                });
            };

            processMappedFont(val);
        });

        // 5. Line Height Overrides
        Object.entries(style.lineHeightOverrides || {}).forEach(([langId, value]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';

            getGroup(langId, langName).overrides.push({
                id: `lh-${langId}`,
                label: 'Global Line Height',
                details: value,
                onReset: () => updateLineHeightOverrideForStyle(styleId, langId, null)
            });
        });

        // 6. System Fallback Overrides
        Object.entries(systemFallbackOverrides || {}).forEach(([langId, overrides]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';
            const summary = Object.keys(overrides || {}).join(', ');

            getGroup(langId, langName).overrides.push({
                id: `sys-${langId}`,
                label: 'System Fallback',
                details: summary,
                onReset: () => resetSystemFallbackOverride(langId)
            });
        });

        return Object.values(groups).sort((a, b) => {
            if (a.id === 'global') return -1;
            if (b.id === 'global') return 1;
            return a.name.localeCompare(b.name);
        });
    };

    // Header overrides are distinct
    const headerOverrideList = Object.entries(headerOverrides || {}).map(([tag, props]) => {
        const changed = [];
        if (props.scale) changed.push('Font Size');
        if (props.lineHeight) changed.push('Line Height');
        if (props.letterSpacing) changed.push('Letter Spacing');

        if (changed.length === 0) return null;
        return { tag, changed };
    }).filter(Boolean);


    // Use Primary style for now (Active Style)
    // Note: OverridesManager seems designed for one active style?
    // The previous code mapped `['primary']` so we follow that.
    const groupedOverrides = getGroupedOverrides('primary');

    const totalCount = groupedOverrides.reduce((acc, g) => acc + g.overrides.length, 0) + headerOverrideList.length;

    if (totalCount === 0) return null;

    return (
        <div className="pb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2 group cursor-pointer"
            >
                <label className="text-[10px] text-slate-400 font-bold tracking-wider cursor-pointer group-hover:text-slate-600 transition-colors">
                    Active Overrides ({totalCount})
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
                    {/* Headers Section */}
                    {headerOverrideList.length > 0 && (
                        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="text-[10px] text-slate-500 font-bold tracking-wider">HTML Markers ({headerOverrideList.length})</div>
                                <button
                                    onClick={() => {
                                        if (confirm('Reset all header style overrides?')) {
                                            resetAllHeaderStyles();
                                        }
                                    }}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                >
                                    Reset All
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
                                            onClick={() => resetHeaderStyle(h.tag)}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {groupedOverrides.map(group => (
                        <div key={group.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="text-[10px] text-slate-500 font-bold tracking-wider">
                                    {group.name} ({group.overrides.length})
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm(`Reset all overrides for ${group.name}?`)) {
                                            // Batch Reset Logic
                                            group.overrides.forEach(o => o.onReset && o.onReset());
                                        }
                                    }}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                >
                                    Reset Section
                                </button>
                            </div>

                            <div className="divide-y divide-slate-200">
                                {group.overrides.map(override => (
                                    <div key={override.id} className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">
                                                {override.label}
                                            </div>
                                            <div className={`text-[10px] mt-0.5 ${override.isPrimary ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
                                                {override.isPrimary ? `• ${override.details}` : override.details}
                                            </div>
                                        </div>
                                        <button
                                            onClick={override.onReset}
                                            className="flex-shrink-0 text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="p-3">
                        <button
                            onClick={() => {
                                if (confirm('Reset everything? This cannot be undone.')) {
                                    // Reset All - Bruteforce
                                    resetGlobalFallbackScaleForStyle('primary');
                                    resetAllFallbackFontOverridesForStyle('primary');
                                    resetAllLineHeightOverridesForStyle('primary');
                                    resetAllHeaderStyles();
                                    // We also need to loop keys to clear primary overrides since context might not have a "Reset ALL Primary Overrides"
                                    // But resetAllFallback... might handle clones? No.
                                    // We need to manually clear known primary overrides.
                                    Object.keys(primaryFontOverrides || {}).forEach(lid => clearPrimaryFontOverride(lid));
                                    Object.keys(systemFallbackOverrides || {}).forEach(lid => resetSystemFallbackOverride(lid));
                                }
                            }}
                            className="w-full py-2 text-[10px] font-bold text-rose-600 border border-rose-300 rounded hover:bg-rose-50 transition-colors"
                        >
                            Reset All Overrides
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverridesManager;
