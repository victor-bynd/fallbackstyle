import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFontManagement } from '../../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../../shared/context/useLanguageMapping';
import { useTypography } from '../../../shared/context/useTypography';

const OverridesModal = ({ isOpen, onClose, groupedOverrides, headerOverrideList, totalCount, actions }) => {
    if (!isOpen) return null;

    const {
        resetAllHeaderStyles,
        resetHeaderStyle,
    } = actions;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Override Manager</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Audit active style and font modifications ({totalCount})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {/* Headers Section */}
                    {headerOverrideList.length > 0 && (
                        <div className="border-b-2 border-slate-100 last:border-0">
                            <div className="px-6 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-200/60">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">HTML Markers</h3>
                                <button
                                    onClick={() => confirm('Reset all header overrides?') && resetAllHeaderStyles()}
                                    className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase"
                                >
                                    Reset All
                                </button>
                            </div>
                            <table className="w-full text-left border-collapse table-fixed">
                                <tbody className="divide-y divide-slate-50">
                                    {headerOverrideList.map(h => {
                                        const size = h.details.find(d => d.label === 'Font Size')?.value;
                                        const lh = h.details.find(d => d.label === 'Line Height')?.value;
                                        const ls = h.details.find(d => d.label === 'L-Spacing')?.value;

                                        const values = [
                                            size && `Size: ${size}`,
                                            lh && `LH: ${lh}`,
                                            ls && `LS: ${ls}`
                                        ].filter(Boolean).join(' • ');

                                        return (
                                            <tr key={h.tag} className="group hover:bg-slate-50/40 transition-colors">
                                                <td className="pl-6 py-2 w-[160px] border-r border-slate-100/60 bg-slate-50/20 align-baseline">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">
                                                        {h.tag}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-xs font-bold text-slate-600 border-r border-slate-50 last:border-0 align-baseline uppercase">
                                                    {values}
                                                </td>
                                                <td className="pr-6 py-2 text-right w-[80px] align-baseline">
                                                    <button
                                                        onClick={() => resetHeaderStyle(h.tag)}
                                                        className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Reset
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Grouped Overrides Tables */}
                    {groupedOverrides.map(group => (
                        <div key={group.id} className="border-b-2 border-slate-100 last:border-0">
                            <div className="px-6 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-200/60">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{group.name}</h3>
                                <button
                                    onClick={() => confirm(`Reset all overrides for ${group.name}?`) && group.overrides.forEach(o => o.onReset && o.onReset())}
                                    className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase"
                                >
                                    Reset Group
                                </button>
                            </div>
                            <table className="w-full text-left border-collapse table-fixed">
                                <tbody className="divide-y divide-slate-50">
                                    {group.overrides.map(override => (
                                        <tr key={override.id} className="group hover:bg-slate-50/40 transition-colors">
                                            <td className="pl-6 py-2 align-baseline w-[160px] border-r border-slate-100/60 bg-slate-50/20">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-tight">{override.label}</span>
                                                    {override.isPrimary && (
                                                        <span className="shrink-0 px-[3px] text-[7px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 uppercase leading-none rounded-sm">
                                                            PRI
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 border-r border-slate-50 last:border-0 align-baseline">
                                                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                                    {Array.isArray(override.details) ? (
                                                        override.details.map((d, i) => (
                                                            <div key={i} className="flex items-baseline gap-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-tighter">{d.label}:</span>
                                                                <span className="text-xs font-bold text-slate-600">{d.value}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-600">{override.details}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="pr-6 py-2 text-right align-baseline w-[80px]">
                                                <button
                                                    onClick={override.onReset}
                                                    className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Reset
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
                    <button
                        onClick={() => confirm('Clear all session overrides?') && actions.resetAll()}
                        className="text-[10px] font-black tracking-widest uppercase text-rose-500 hover:text-rose-600 flex items-center gap-2"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Nuke All
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const OverridesManager = ({ iconMode = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Font Management
    const { fontStyles, getFontsForStyle, updateFontProperty } = useFontManagement();

    // Language Mapping
    const {
        supportedLanguages: languages,
        visibleLanguageIds,
        primaryFontOverrides,
        clearPrimaryFontOverride,
        systemFallbackOverrides,
        resetSystemFallbackOverride,
        clearFallbackFontOverrideForStyle,
        resetAllFallbackFontOverridesForStyle,
    } = useLanguageMapping();

    // Typography
    const {
        headerOverrides,
        headerStyles,
        resetHeaderStyle,
        resetAllHeaderStyles,
        resetGlobalFallbackScaleForStyle,
        resetAllLineHeightOverridesForStyle,
        resetLineHeightOverride,
    } = useTypography();

    const resetFontMetrics = (fontId) => {
        ['scale', 'lineHeight', 'letterSpacing', 'weightOverride', 'fontSizeAdjust',
         'ascentOverride', 'descentOverride', 'lineGapOverride'].forEach(prop => {
            updateFontProperty(fontId, prop, undefined);
        });
    };

    // 1. Grouping Logic
    const getGroupedOverrides = (styleId) => {
        const style = fontStyles?.[styleId];
        if (!style) return [];

        const visibleSet = new Set(visibleLanguageIds);
        const fonts = getFontsForStyle(styleId);

        const groups = {};

        const getGroup = (id, name) => {
            if (!groups[id]) {
                groups[id] = { id, name, overrides: [] };
            }
            return groups[id];
        };

        // --- GLOBAL SECTION ---
        if ((style.fontScales?.fallback ?? 100) !== 100) {
            getGroup('global', 'Global Systems').overrides.push({
                id: 'global-scale',
                label: 'Global Fallback Scale',
                details: `${style.fontScales.fallback}%`,
                onReset: () => resetGlobalFallbackScaleForStyle(styleId)
            });
        }

        fonts
            .filter(f => f.type === 'fallback' && !f.isLangSpecific && !f.isClone)
            .forEach(f => {
                const changes = [];
                if (f.scale !== undefined) changes.push({ label: 'Size', value: `${f.scale}%` });
                if (f.lineHeight !== undefined) changes.push({ label: 'L-Height', value: f.lineHeight });
                if (f.letterSpacing !== undefined) changes.push({ label: 'L-Spacing', value: `${f.letterSpacing}px` });
                if (f.weightOverride !== undefined) changes.push({ label: 'Weight', value: f.weightOverride });
                if (f.fontSizeAdjust !== undefined) changes.push({ label: 'F-Size', value: f.fontSizeAdjust });
                if (f.ascentOverride !== undefined) changes.push({ label: 'Ascent', value: `${f.ascentOverride}%` });
                if (f.descentOverride !== undefined) changes.push({ label: 'Descent', value: `${f.descentOverride}%` });
                if (f.lineGapOverride !== undefined) changes.push({ label: 'Line Gap', value: `${f.lineGapOverride}%` });

                if (changes.length > 0) {
                    getGroup('global', 'Global Systems').overrides.push({
                        id: `font-${f.id}`,
                        label: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
                        details: changes,
                        onReset: () => resetFontMetrics(f.id)
                    });
                }
            });


        // --- LANGUAGE SECTIONS ---
        Object.entries(style.primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';
            const font = fonts.find(f => f && f.id === fontId);
            const fontName = font?.fileName?.replace(/\.[^/.]+$/, '') || font?.name || 'Unknown Font';

            getGroup(langId, langName).overrides.push({
                id: `primary-${langId}`,
                label: 'Primary Font Swap',
                details: fontName,
                isPrimary: true,
                onReset: () => clearPrimaryFontOverride(langId)
            });

            if (font) {
                const changes = [];
                if (font.baseFontSize !== undefined) changes.push({ label: 'Base Size', value: `${font.baseFontSize}px` });
                if (font.weightOverride !== undefined) changes.push({ label: 'Weight', value: font.weightOverride });
                if (font.scale !== undefined) changes.push({ label: 'Scale', value: `${font.scale}%` });
                if (font.lineHeight !== undefined) changes.push({ label: 'L-Height', value: font.lineHeight });
                if (font.letterSpacing !== undefined) changes.push({ label: 'L-Spacing', value: `${font.letterSpacing}px` });
                if (font.fontSizeAdjust !== undefined) changes.push({ label: 'F-Size', value: font.fontSizeAdjust });
                if (font.ascentOverride !== undefined) changes.push({ label: 'Ascent', value: `${font.ascentOverride}%` });
                if (font.descentOverride !== undefined) changes.push({ label: 'Descent', value: `${font.descentOverride}%` });
                if (font.lineGapOverride !== undefined) changes.push({ label: 'Line Gap', value: `${font.lineGapOverride}%` });

                if (changes.length > 0) {
                    getGroup(langId, langName).overrides.push({
                        id: `primary-metrics-${font.id}`,
                        label: `Metrics: ${fontName}`,
                        details: changes,
                        onReset: () => resetFontMetrics(font.id)
                    });
                }
            }
        });

        Object.entries(style.fallbackFontOverrides || {}).forEach(([langId, val]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';

            const processMappedFont = (fontIdOrMap) => {
                let overrideIds = [];
                if (typeof fontIdOrMap === 'string') overrideIds.push(fontIdOrMap);
                else if (typeof fontIdOrMap === 'object') overrideIds = Object.values(fontIdOrMap);

                overrideIds.forEach(fId => {
                    const font = fonts.find(f => f && f.id === fId);
                    if (!font) return;

                    const fontName = font.fileName?.replace(/\.[^/.]+$/, '') || font.name || 'Unknown Font';
                    getGroup(langId, langName).overrides.push({
                        id: `fallback-${fId}`,
                        label: 'Fallback Mapping',
                        details: fontName,
                        onReset: () => clearFallbackFontOverrideForStyle(styleId, langId)
                    });

                    const changes = [];
                    if (font.baseFontSize !== undefined) changes.push({ label: 'Base Size', value: `${font.baseFontSize}px` });
                    if (font.scale !== undefined) changes.push({ label: 'Size', value: `${font.scale}%` });
                    if (font.lineHeight !== undefined) changes.push({ label: 'L-Height', value: font.lineHeight });
                    if (font.letterSpacing !== undefined) changes.push({ label: 'L-Spacing', value: `${font.letterSpacing}px` });
                    if (font.weightOverride !== undefined) changes.push({ label: 'Weight', value: font.weightOverride });
                    if (font.fontSizeAdjust !== undefined) changes.push({ label: 'F-Size', value: font.fontSizeAdjust });
                    if (font.ascentOverride !== undefined) changes.push({ label: 'Ascent', value: `${font.ascentOverride}%` });
                    if (font.descentOverride !== undefined) changes.push({ label: 'Descent', value: `${font.descentOverride}%` });
                    if (font.lineGapOverride !== undefined) changes.push({ label: 'Line Gap', value: `${font.lineGapOverride}%` });

                    if (changes.length > 0) {
                        getGroup(langId, langName).overrides.push({
                            id: `fallback-metrics-${fId}`,
                            label: `Metrics: ${fontName}`,
                            details: changes,
                            onReset: () => resetFontMetrics(fId)
                        });
                    }
                });
            };

            processMappedFont(val);
        });

        Object.entries(style.lineHeightOverrides || {}).forEach(([langId, value]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';

            getGroup(langId, langName).overrides.push({
                id: `lh-${langId}`,
                label: 'Custom Base L-Height',
                details: [{ label: 'Value', value }],
                onReset: () => resetLineHeightOverride(langId)
            });
        });

        Object.entries(systemFallbackOverrides || {}).forEach(([langId, overrides]) => {
            if (!visibleSet.has(langId)) return;
            const langName = languages.find(l => l.id === langId)?.name || 'Unknown';
            const details = Object.entries(overrides || {}).map(([key, val]) => ({
                label: key,
                value: val
            }));

            getGroup(langId, langName).overrides.push({
                id: `sys-${langId}`,
                label: 'System Fallback Stack',
                details,
                onReset: () => resetSystemFallbackOverride(langId)
            });
        });

        return Object.values(groups).sort((a, b) => {
            if (a.id === 'global') return -1;
            if (b.id === 'global') return 1;
            return a.name.localeCompare(b.name);
        });
    };

    const headerOverrideList = Object.entries(headerOverrides || {}).map(([tag, props]) => {
        const details = [];
        const current = headerStyles?.[tag] || {};

        if (props.scale) details.push({ label: 'Font Size', value: `${current.scale}x` });
        if (props.lineHeight) details.push({ label: 'Line Height', value: current.lineHeight });
        if (props.letterSpacing) details.push({ label: 'L-Spacing', value: `${current.letterSpacing}px` });

        if (details.length === 0) return null;
        return { tag, details };
    }).filter(Boolean);

    const groupedOverrides = getGroupedOverrides('primary');
    const totalCount = groupedOverrides.reduce((acc, g) => acc + g.overrides.length, 0) + headerOverrideList.length;

    if (totalCount === 0) return null;

    const resetAll = () => {
        resetGlobalFallbackScaleForStyle('primary');
        resetAllFallbackFontOverridesForStyle('primary');
        resetAllLineHeightOverridesForStyle('primary');
        resetAllHeaderStyles();
        Object.keys(primaryFontOverrides || {}).forEach(lid => clearPrimaryFontOverride(lid));
        Object.keys(systemFallbackOverrides || {}).forEach(lid => resetSystemFallbackOverride(lid));
    };

    return (
        <>
            {iconMode ? (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all active:scale-95 group"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </button>
            ) : (
                <div className="pb-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full h-10 px-4 flex items-center justify-between group bg-slate-50 hover:bg-white border-2 border-slate-100 hover:border-slate-300 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-black tracking-wider uppercase transition-colors">
                                Override Manager
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 group-hover:bg-slate-300 group-hover:text-white text-slate-600 text-[10px] font-black transition-colors">
                                {totalCount}
                            </span>
                        </div>
                        <svg
                            className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                </div>
            )}

            <OverridesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                groupedOverrides={groupedOverrides}
                headerOverrideList={headerOverrideList}
                totalCount={totalCount}
                actions={{
                    resetAllHeaderStyles,
                    resetHeaderStyle,
                    resetGlobalFallbackScaleForStyle,
                    resetAllFallbackFontOverridesForStyle,
                    resetAllLineHeightOverridesForStyle,
                    clearPrimaryFontOverride,
                    resetSystemFallbackOverride,
                    resetAll
                }}
            />
        </>
    );
};

export default OverridesManager;
