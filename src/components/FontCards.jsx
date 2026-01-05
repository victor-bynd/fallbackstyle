import { useRef, useState, useMemo, useLayoutEffect, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';

import LanguageSingleSelectModal from './LanguageSingleSelectModal';
import LanguageMultiSelectModal from './LanguageMultiSelectModal';
import FontSelectionModal from './FontSelectionModal';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';
import { createFontUrl, parseFontFile } from '../services/FontLoader';
import InfoTooltip from './InfoTooltip';
import { getLanguageGroup } from '../utils/languageUtils';
import languagesData from '../data/languages.json';

export const FontCard = ({
    font,
    isActive,
    globalLineHeight,
    setGlobalLineHeight,
    getFontColor,
    updateFontColor,
    getEffectiveFontSettings,
    updateFallbackFontOverride,
    updateFontWeight,
    onRemoveOverride,
    onSelectLanguage,
    activeTab,
    isInherited = false,
    onOverride,
    onResetOverride,
    onMap,
    setHighlitLanguageId,
    readOnly = false,
    setActiveFont
}) => {
    const { primaryFontOverrides, fallbackFontOverrides, letterSpacing, setLetterSpacing, primaryLanguages, updateLanguageSpecificSetting, linkFontToLanguage, fonts, baseRem, setBaseRem, toggleFontVisibility } = useTypo();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const [tagsLimit, setTagsLimit] = useState(11);
    const tagsContainerRef = useRef(null);

    // Scoped Editing State
    // 'ALL' = Global updates (inherited by linked).
    // 'langId' = Specific update (overrides/clones).
    const [editScope, setEditScope] = useState('ALL');

    // Sync editScope with activeTab (Global Selection)
    useEffect(() => {
        if (activeTab === 'ALL') {
            setEditScope('ALL');
        } else if (activeTab === 'primary') {
            // If primary tab is active, we generally defaulted to ALL or 'primary' depending on context
            // but here we keep it as ALL for general fonts unless they have specific logic
            setEditScope('ALL');
        } else {
            // For specific language tabs, set scope to that language
            setEditScope(activeTab);
        }
    }, [activeTab]);

    const languageTags = useMemo(() => {
        const tags = [];
        // Show primary language tags on the main primary font card (if not overridden)
        if (font.type === 'primary' && !font.isPrimaryOverride && primaryLanguages) {
            primaryLanguages.forEach(langId => {
                if (!primaryFontOverrides?.[langId]) {
                    tags.push(langId);
                }
            });
        }
        // Primary overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (fontId === font.id) tags.push(langId);
        });
        // Fallback overrides
        Object.entries(fallbackFontOverrides || {}).forEach(([langId, val]) => {
            if (typeof val === 'string') {
                if (val === font.id) tags.push(langId);
            } else if (val && typeof val === 'object') {
                if (val[font.id] || Object.values(val).includes(font.id)) {
                    tags.push(langId);
                }
            }
        });
        return [...new Set(tags)];
    }, [font.id, primaryFontOverrides, fallbackFontOverrides, font.type, font.isPrimaryOverride, primaryLanguages]);

    useLayoutEffect(() => {
        const calculateLimit = () => {
            if (!tagsContainerRef.current) return;
            const container = tagsContainerRef.current;
            const width = container.offsetWidth;
            if (width === 0) return;
            // Approximate width of a tag
            const ESTIMATED_ITEM_WIDTH = 55;
            const itemsPerRow = Math.floor(width / ESTIMATED_ITEM_WIDTH);
            const calculatedLimit = Math.max(1, (itemsPerRow * 2) - 1);
            setTagsLimit(calculatedLimit);
        };
        calculateLimit();
        const observer = new ResizeObserver(calculateLimit);
        if (tagsContainerRef.current) observer.observe(tagsContainerRef.current);
        return () => observer.disconnect();
    }, [showAllTags, languageTags]);

    // Handle Scoped Updates
    const handleScopedUpdate = (property, value) => {
        if (editScope === 'ALL') {
            // Global Update
            // Dispatch to standard handlers
            if (property === 'lineHeight') {
                if (font.isPrimaryOverride) updateFallbackFontOverride(font.id, 'lineHeight', value);
                else setGlobalLineHeight?.(value);
            } else if (property === 'letterSpacing') {
                if (font.type === 'primary' && !font.isPrimaryOverride) setLetterSpacing(value);
                else updateFallbackFontOverride(font.id, 'letterSpacing', value);
            } else if (property === 'weight') {
                updateFontWeight(value);
            } else {
                updateFallbackFontOverride(font.id, property, value);
            }
        } else {
            // Scoped Update (Specific Language)
            if (property === 'weight') property = 'weightOverride';
            if (property === 'scale') property = 'scale';
            updateLanguageSpecificSetting(font.id, editScope, property, value);
        }
    };



    const scopeFontId = useMemo(() => {
        if (editScope === 'ALL') return font.id;

        if (font.type === 'primary') {
            return primaryFontOverrides?.[editScope] || font.id;
        } else {
            const val = fallbackFontOverrides?.[editScope];
            if (typeof val === 'string') return val;
            if (val && typeof val === 'object') {
                return val[font.id] || font.id;
            }
            return font.id;
        }
    }, [editScope, font.id, font.type, primaryFontOverrides, fallbackFontOverrides]);

    const scopeFont = useMemo(() => {
        if (scopeFontId === font.id) return font;
        return fonts?.find(f => f.id === scopeFontId) || font;
    }, [scopeFontId, font, fonts]);

    const isPrimary = font.type === 'primary';
    const opacity = font.hidden ? 0.4 : 1;

    // Use scopeFont for reading settings!
    const effectiveWeight = getEffectiveFontSettings(scopeFontId)?.weight ?? 400;
    const weightOptions = buildWeightSelectOptions(scopeFont);
    const resolvedWeight = resolveWeightToAvailableOption(scopeFont, effectiveWeight);

    const rawName = font.fileName || font.name || 'No font uploaded';
    let displayName = rawName;
    let extension = '';

    if (rawName && rawName.lastIndexOf('.') !== -1) {
        const lastDot = rawName.lastIndexOf('.');
        if (lastDot > 0) {
            displayName = rawName.substring(0, lastDot);
            extension = rawName.substring(lastDot + 1);
        }
    }

    const hasFooterContent = font.fontObject || (languageTags && languageTags.length > 0) || onMap;

    return (
        <div
            style={{ opacity }}
            className={`
                bg-white rounded-xl border transition-all duration-300 relative p-3
                ${isPrimary ? 'ring-1 ring-slate-200' : 'cursor-pointer'}
                ${isActive && !isPrimary
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg'
                    : 'border-gray-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)]'
                }
            `}
        >
            {/* Inherited Overlay */}
            {isInherited && editScope !== 'ALL' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 rounded-xl backdrop-blur-[1px] transition-all gap-3">
                    <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-1">
                        Inherited from Global
                    </span>
                    {onOverride && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOverride?.(); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide"
                        >
                            OVERRIDE STYLE
                        </button>
                    )}
                    {onMap && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMap?.(font.id); }}
                            className="bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-[10px] font-bold px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            MAP TO LANGUAGE
                        </button>
                    )}
                </div>
            )}

            {isPrimary && !isInherited && (
                <>
                </>
            )}

            {(!isPrimary || font.isPrimaryOverride) && (
                <div className="absolute right-2 top-2 flex gap-2 items-center z-30">
                    {onResetOverride && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onResetOverride(font.id); }}
                            className="text-slate-400 hover:text-rose-500 transition-all p-1"
                            title="Unmap font"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            <div className={`flex gap-3 items-start ${isInherited && editScope !== 'ALL' ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''}`}>
                <div className={`flex-1 min-w-0 ${(onResetOverride || isPrimary) ? 'pr-8' : ''}`}>
                    <div className="font-mono text-[13px] font-bold text-slate-800 truncate mb-1">
                        {displayName}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        {(!(!font.fontObject && !font.fileName)) && (
                            <div className="relative w-3.5 h-3.5 flex-shrink-0 rounded-full overflow-hidden border border-slate-200">
                                <div className="absolute inset-0" style={{ backgroundColor: getFontColor(font.id) }} />
                                <input
                                    type="color"
                                    value={getFontColor(font.id)}
                                    onInput={(e) => updateFontColor(font.id, e.target.value)}
                                    disabled={isInherited || readOnly}
                                    className={`absolute inset-0 w-full h-full opacity-0 ${isInherited || readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                />
                            </div>
                        )}
                        {font.fontObject && <span>{font.fontObject.numGlyphs} glyphs</span>}
                        {extension && <span className="uppercase font-bold text-slate-400 bg-slate-100 px-1 rounded">{extension}</span>}
                    </div>
                </div>
            </div>

            {hasFooterContent && (
                <div className="pt-2 flex flex-col gap-2.5 mb-2">
                    {/* Combined Scope Selector */}
                    <div ref={tagsContainerRef} className="flex flex-wrap gap-1.5 items-center">
                        {/* ALL Tag - Only show if NOT Primary AND has > 1 language mapping */}
                        {(activeTab === 'ALL' || activeTab === 'primary') && languageTags.length > 1 && !isPrimary && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditScope('ALL');
                                    if (onSelectLanguage) onSelectLanguage('ALL');
                                }}
                                className={`
                                    flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer border text-[10px] font-bold uppercase tracking-wide
                                    ${editScope === 'ALL'
                                        ? 'bg-slate-800 text-white border-slate-800' // Distinct style for ALL
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }
                                `}
                            >
                                ALL
                            </button>
                        )}
                        {(() => {
                            // Show ALL tags regardless of activeTab to keep visibility persistent
                            const availableTags = languageTags;
                            const totalTags = availableTags.length;
                            const shouldCollapse = totalTags > tagsLimit;
                            const visibleTags = (shouldCollapse && !showAllTags)
                                ? availableTags.slice(0, tagsLimit)
                                : availableTags;

                            const elements = visibleTags.map(langId => {
                                const isSelected = editScope === langId;
                                const fontColor = getFontColor(font.id) || '#4f46e5';

                                let isOverridden = false;
                                if (font.type === 'primary') {
                                    // Primary logic if needed
                                } else {
                                    const val = fallbackFontOverrides && fallbackFontOverrides[langId];
                                    let overrideId = val;
                                    if (val && typeof val === 'object') {
                                        overrideId = val[font.id];
                                    }

                                    if (overrideId && overrideId !== font.id) {
                                        isOverridden = true;
                                    }
                                }

                                return (
                                    <button
                                        key={langId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditScope(isSelected ? 'ALL' : langId);
                                            if (onSelectLanguage) onSelectLanguage(langId);
                                        }}
                                        style={isSelected ? {
                                            backgroundColor: fontColor,
                                            borderColor: fontColor,
                                            color: '#ffffff'
                                        } : {
                                            backgroundColor: `${fontColor}1a`,
                                            borderColor: `${fontColor}33`,
                                            color: fontColor
                                        }}
                                        className={`
                                            group flex items-center gap-1.5 px-1.5 py-0.5 rounded-full transition-all cursor-pointer border
                                            ${!isSelected ? 'hover:brightness-95' : ''}
                                            ${isOverridden ? 'pr-1' : ''}
                                        `}
                                    >
                                        <span className="text-[10px] font-bold uppercase">{langId}</span>
                                        {isOverridden && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    linkFontToLanguage(font.id, langId);
                                                }}
                                                className="p-0.5 rounded-full hover:bg-white/20 text-current opacity-60 hover:opacity-100 transition-opacity"
                                                title="Reset to Global (All)"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            });

                            if (shouldCollapse) {
                                if (!showAllTags) {
                                    elements.push(
                                        <button
                                            key="show-more"
                                            onClick={(e) => { e.stopPropagation(); setShowAllTags(true); }}
                                            className="px-1.5 py-0.5 rounded-full border border-slate-200 bg-white text-slate-400 text-[10px] font-bold hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                        >
                                            +{availableTags.length - tagsLimit}
                                        </button>
                                    );
                                } else {
                                    elements.push(
                                        <button
                                            key="show-less"
                                            onClick={(e) => { e.stopPropagation(); setShowAllTags(false); }}
                                            className="px-1.5 py-0.5 rounded-full border border-slate-200 bg-white text-slate-400 text-[10px] font-bold hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                            title="Show Less"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path fillRule="evenodd" d="M3.25 10a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    );
                                }
                            }

                            return elements;

                        })()}

                        {onMap && ((!languageTags || languageTags.length === 0) || (activeTab && activeTab !== 'ALL' && activeTab !== 'primary')) && (
                            <div className="flex justify-start">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMap(font.id); }}
                                    className={`
                                      flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer border text-[10px] font-bold uppercase tracking-wide
                                      ${(activeTab && activeTab !== 'ALL' && activeTab !== 'primary')
                                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'}
                                  `}
                                    title="Map to Language"
                                    type="button"
                                >
                                    <span>{(activeTab && activeTab !== 'ALL' && activeTab !== 'primary') ? ('MAP ' + activeTab) : 'MAP'}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`mt-2 pt-2 border-t border-slate-100 space-y-3 ${isInherited && editScope !== 'ALL' ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="space-y-2">
                    {isPrimary && !font.isPrimaryOverride && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Size (Base REM)</span>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={baseRem}
                                            onChange={(e) => setBaseRem?.(parseInt(e.target.value))}
                                            className="w-8 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                        />
                                        <span className="text-[9px]">px</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.125"
                                            value={baseRem / 16}
                                            onChange={(e) => setBaseRem?.(Math.round(parseFloat(e.target.value) * 16))}
                                            className="w-8 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                        />
                                        <span className="text-[9px]">rem</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="32"
                                step="1"
                                value={baseRem}
                                onChange={(e) => setBaseRem?.(parseInt(e.target.value))}
                                disabled={readOnly}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {(isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Line Height</span>
                                <div className="flex gap-2 items-center">
                                    {(() => {
                                        const lh = scopeFont.isPrimaryOverride
                                            ? (scopeFont.lineHeight !== undefined && scopeFont.lineHeight !== null ? scopeFont.lineHeight : globalLineHeight)
                                            : globalLineHeight;
                                        const isNormal = lh === 'normal';

                                        if (!isNormal) {
                                            return (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleScopedUpdate('lineHeight', 'normal');
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                                                    title="Reset to Normal"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            );
                                        }
                                        return null;
                                    })()}
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="1"
                                            value={(() => {
                                                const lh = scopeFont.isPrimaryOverride
                                                    ? (scopeFont.lineHeight !== undefined && scopeFont.lineHeight !== null ? scopeFont.lineHeight : globalLineHeight)
                                                    : globalLineHeight;
                                                // Convert multiplier to px (based on baseRem)
                                                // If 'normal', use 1.2 as valid numeric fallback for calculation
                                                const val = lh === 'normal' ? 1.2 : lh;
                                                return Math.round(val * baseRem);
                                            })()}
                                            onChange={(e) => {
                                                const px = parseFloat(e.target.value);
                                                handleScopedUpdate('lineHeight', px / baseRem);
                                            }}
                                            className="w-8 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                        />
                                        <span className="text-[9px]">px</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="5"
                                            value={(() => {
                                                const lh = scopeFont.isPrimaryOverride
                                                    ? (scopeFont.lineHeight !== undefined && scopeFont.lineHeight !== null ? scopeFont.lineHeight : globalLineHeight)
                                                    : globalLineHeight;
                                                return lh === 'normal' ? 120 : Math.round(lh * 100);
                                            })()}
                                            onChange={(e) => handleScopedUpdate('lineHeight', parseFloat(e.target.value) / 100)}
                                            className="w-8 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                        />
                                        <span className="text-[9px]">%</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="300"
                                step="5"
                                value={(() => {
                                    const lh = scopeFont.isPrimaryOverride
                                        ? (scopeFont.lineHeight !== undefined && scopeFont.lineHeight !== null ? scopeFont.lineHeight : globalLineHeight)
                                        : globalLineHeight;
                                    return lh === 'normal' ? 120 : lh * 100;
                                })()}
                                onChange={(e) => handleScopedUpdate('lineHeight', parseFloat(e.target.value) / 100)}
                                disabled={isInherited && editScope !== 'ALL'}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {(isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Letter Spacing</span>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={(() => {
                                                const ls = scopeFont.isPrimaryOverride
                                                    ? (scopeFont.letterSpacing !== undefined && scopeFont.letterSpacing !== null ? scopeFont.letterSpacing : letterSpacing)
                                                    : letterSpacing;
                                                return Math.round((ls || 0) * baseRem * 10) / 10;
                                            })()}
                                            onChange={(e) => handleScopedUpdate('letterSpacing', parseFloat(e.target.value) / baseRem)}
                                            className="w-8 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                        />
                                        <span className="text-[9px]">px</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={(() => {
                                                const ls = scopeFont.isPrimaryOverride
                                                    ? (scopeFont.letterSpacing !== undefined && scopeFont.letterSpacing !== null ? scopeFont.letterSpacing : letterSpacing)
                                                    : letterSpacing;
                                                return ls || 0;
                                            })()}
                                            onChange={(e) => handleScopedUpdate('letterSpacing', parseFloat(e.target.value))}
                                            className="w-8 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                        />
                                        <span className="text-[9px]">em</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="-0.1"
                                max="0.5"
                                step="0.01"
                                value={(() => {
                                    const ls = scopeFont.isPrimaryOverride
                                        ? (scopeFont.letterSpacing !== undefined && scopeFont.letterSpacing !== null ? scopeFont.letterSpacing : letterSpacing)
                                        : letterSpacing;
                                    return ls || 0;
                                })()}
                                onChange={(e) => handleScopedUpdate('letterSpacing', parseFloat(e.target.value))}
                                disabled={isInherited && editScope !== 'ALL' || readOnly}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {(isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider h-6">
                                <span>Weight</span>
                                <div className="relative">
                                    <select
                                        value={resolvedWeight}
                                        onChange={(e) => handleScopedUpdate('weight', parseInt(e.target.value))}
                                        disabled={isInherited && editScope !== 'ALL' || readOnly}
                                        className={`bg-transparent text-right outline-none text-indigo-600 font-mono text-[11px] appearance-none pr-3 cursor-pointer ${isInherited && editScope !== 'ALL' || readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        style={{ backgroundImage: 'none' }}
                                    >
                                        {weightOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    {!readOnly && (!isInherited || editScope === 'ALL') && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {(!isPrimary && !font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Size-Adjust</span>
                                <div className="flex items-center">
                                    {/* Reset Button for Size-Adjust */}
                                    {Math.abs((getEffectiveFontSettings(scopeFontId).scale || 100) - 100) > 0.01 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleScopedUpdate('scale', 100);
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                                            title="Reset to 100%"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                    <span className="text-indigo-600 font-mono">
                                        {(getEffectiveFontSettings(scopeFontId).scale || 100) + '%'}
                                    </span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="25"
                                max="300"
                                step="5"
                                value={(getEffectiveFontSettings(scopeFontId).scale || 100)}
                                onChange={(e) => handleScopedUpdate('scale', parseFloat(e.target.value))}
                                disabled={isInherited && editScope !== 'ALL' || readOnly}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {/* Toggle Visibility Button */}
                    {!isPrimary && !font.isPrimaryOverride && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFontVisibility(font.id);
                            }}
                            className={`absolute bottom-3 right-3 p-1 rounded-md transition-colors ${font.hidden
                                ? 'text-red-500 hover:text-red-700 bg-red-50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                }`}
                            title={font.hidden ? "Show Font" : "Hide Font"}
                        >
                            {font.hidden ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                                    <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>

                {font.fontObject && (
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.1em] hover:text-indigo-600 transition-colors whitespace-nowrap"
                    >
                        <span>Advanced Settings</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}

                {showAdvanced && (
                    <div className="mt-2 grid grid-cols-1 gap-2 pt-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {['ascentOverride', 'descentOverride', 'lineGapOverride'].map((field) => (
                            <div key={field} className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>{field.replace('Override', '').replace(/([A-Z])/g, ' $1')}</span>
                                    <div className="flex items-center">
                                        {/* Reset Button for Advanced Settings */}
                                        {Math.abs((scopeFont[field] || 0)) > 0.001 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleScopedUpdate(field, 0);
                                                }}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                                                title="Reset to 0%"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                        <span className="font-mono text-slate-600">{Math.round((scopeFont[field] || 0) * 100)}%</span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="5"
                                    value={(scopeFont[field] || 0) * 100}
                                    onChange={(e) => handleScopedUpdate(field, parseInt(e.target.value) / 100)}
                                    disabled={isInherited && editScope !== 'ALL' || readOnly}
                                    className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-slate-400`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};

FontCard.propTypes = {
    font: PropTypes.shape({
        id: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        fontObject: PropTypes.object,
        fileName: PropTypes.string,
        name: PropTypes.string,
        scale: PropTypes.number,
        lineHeight: PropTypes.number,
        axes: PropTypes.object,
        isVariable: PropTypes.bool,
        weightOverride: PropTypes.number,
        staticWeight: PropTypes.number,
        fontSizeAdjust: PropTypes.number,
        lineGapOverride: PropTypes.number,
        ascentOverride: PropTypes.number,
        descentOverride: PropTypes.number,
        h1Rem: PropTypes.number,
        isPrimaryOverride: PropTypes.bool,
        hidden: PropTypes.bool,
        letterSpacing: PropTypes.number
    }).isRequired,
    isActive: PropTypes.bool.isRequired,
    globalWeight: PropTypes.number,
    globalLineHeight: PropTypes.any,
    globalLetterSpacing: PropTypes.number,
    setGlobalLineHeight: PropTypes.func,
    setGlobalLetterSpacing: PropTypes.func,
    hasLineHeightOverrides: PropTypes.bool,
    lineHeightOverrideCount: PropTypes.number,
    resetAllLineHeightOverrides: PropTypes.func,
    toggleFallbackLineHeightAuto: PropTypes.func,
    getFontColor: PropTypes.func.isRequired,
    updateFontColor: PropTypes.func.isRequired,
    getEffectiveFontSettings: PropTypes.func.isRequired,
    fontScales: PropTypes.object.isRequired,
    lineHeight: PropTypes.number.isRequired,
    updateFallbackFontOverride: PropTypes.func.isRequired,
    resetFallbackFontOverrides: PropTypes.func.isRequired,
    setActiveFont: PropTypes.func.isRequired,
    updateFontWeight: PropTypes.func.isRequired,
    toggleFontVisibility: PropTypes.func.isRequired,
    languageTags: PropTypes.arrayOf(PropTypes.string),
    onRemoveOverride: PropTypes.func,
    onSelectLanguage: PropTypes.func,
    setHighlitLanguageId: PropTypes.func,
    activeTab: PropTypes.string,
    isInherited: PropTypes.bool,
    onOverride: PropTypes.func,
    onResetOverride: PropTypes.func,
    onAssign: PropTypes.func,
    readOnly: PropTypes.bool
};
const FontCards = ({ activeTab, selectedGroup, setHighlitLanguageId, readOnly = false }) => {
    const {
        fonts,
        activeFont,
        setActiveFont,
        updateFontWeight,
        toggleFontVisibility,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        addFallbackFonts,
        addStrictlyMappedFonts,
        unmapFont,

        weight,
        fontScales,
        lineHeight,
        getFontColor,
        updateFontColor,
        getEffectiveFontSettings,
        fallbackFontOverrides,
        primaryFontOverrides,
        addLanguageSpecificPrimaryFont,
        addLanguageSpecificFont,
        setFontScales,
        setIsFallbackLinked,
        setLineHeight,
        setActiveConfigTab,
        fallbackFont,
        setFallbackFont,
        systemFallbackOverrides,
        updateSystemFallbackOverride,
        resetSystemFallbackOverride,
        missingColor,
        setMissingColor,

        normalizeFontName,
        primaryLanguages,
        setFallbackFontOverride,
        linkFontToLanguage,
        updateLanguageSpecificSetting
    } = useTypo();


    const [mappingFontId, setMappingFontId] = useState(null);

    const langOverrides = activeTab !== 'primary' && activeTab !== 'ALL' ? (systemFallbackOverrides[activeTab] || {}) : {};
    const isInheritedSystemGroup = activeTab !== 'primary' && activeTab !== 'ALL' && Object.keys(langOverrides).length === 0;

    const effectiveFallbackFont = langOverrides.type || fallbackFont;
    const effectiveMissingColor = langOverrides.missingColor || missingColor;

    const handleSystemFallbackChange = (type) => {
        if (activeTab === 'primary' || activeTab === 'ALL') {
            setFallbackFont(type);
        } else {
            updateSystemFallbackOverride(activeTab, 'type', type);
        }
    };

    const handleMissingColorChange = (color) => {
        if (activeTab === 'primary' || activeTab === 'ALL') {
            setMissingColor(color);
        } else {
            updateSystemFallbackOverride(activeTab, 'missingColor', color);
        }
    };

    // Add Font State
    const [showFontSelector, setShowFontSelector] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const fileInputRef = useRef(null);

    const handleExistingFontSelect = (fontId) => {
        if (fontId === 'legacy') {
            // Handle legacy if needed, or just ignore for now as it's targeted
            // Actually addLanguageSpecificFont supports handling specific IDs.
        }
        addLanguageSpecificFont(fontId, activeTab);
        setShowFontSelector(false);
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check for duplicates
        const existingFontNames = new Set(
            (fonts || []).map(f => normalizeFontName(f.fileName || f.name))
        );

        const uniqueFiles = [];
        let duplicateCount = 0;

        Array.from(files).forEach(file => {
            const normalizedName = normalizeFontName(file.name);
            if (existingFontNames.has(normalizedName)) {
                duplicateCount++;
                console.warn(`Skipping duplicate file: ${file.name} `);
            } else {
                uniqueFiles.push(file);
            }
        });

        if (duplicateCount > 0) {
            alert(`Skipped ${duplicateCount} duplicate font(s).`);
        }

        if (uniqueFiles.length === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            const promises = uniqueFiles.map(async (file) => {
                try {
                    const { font, metadata } = await parseFontFile(file);
                    const url = createFontUrl(file);
                    const fontId = `fallback - ${Date.now()} -${Math.random().toString(36).substr(2, 9)} `;

                    return {
                        id: fontId,
                        type: 'fallback',
                        fontObject: font,
                        fontUrl: url,
                        fileName: file.name,
                        name: file.name,
                        axes: metadata.axes,
                        isVariable: metadata.isVariable,
                        staticWeight: metadata.staticWeight ?? null
                    };
                } catch (err) {
                    console.error(`Error parsing font ${file.name}: `, err);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            const validFonts = results.filter(f => f !== null);

            if (validFonts.length > 0) {
                if (isLanguageSpecificView && activeTab !== 'primary') {
                    // Directly add to language targeted fonts without adding to global list first
                    addStrictlyMappedFonts(validFonts, activeTab);
                } else {
                    addFallbackFonts(validFonts);
                    // If in global view, we assume user adds to global stack, so no auto-assignment to specific language logic needed here
                    // unless we wanted to auto-assign it to activeTab if it was not ALL/primary, but here we handle that in the if-block.
                }
            }
        } catch (err) {
            console.error('Error uploading fonts:', err);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };



    const handleMapLanguage = (fontId) => {
        setMappingFontId(fontId);
    };

    const handleLanguageSelected = (langId) => {
        if (mappingFontId && langId) {
            // Check if this is an existing font that should just be linked
            // (like system fonts or existing fallbacks)
            const existingFont = fonts.find(f => f.id === mappingFontId);

            if (existingFont) {
                // If it's a primary font being mapped -> Create a Primary Override
                if (existingFont.type === 'primary') {
                    addLanguageSpecificPrimaryFont(langId);
                }
                // If it's a system font -> Use fallback override
                else if (!existingFont.fontObject) {
                    setFallbackFontOverride(langId, mappingFontId);
                } else {
                    // It's a loaded fallback font - LINK IT (Map to itself)
                    // This enables inheritance until manually overridden
                    linkFontToLanguage(mappingFontId, langId);
                }
            } else {
                // Fallback for unknown ID?
                addLanguageSpecificFont(mappingFontId, langId);
            }
        }
        // setMappingFontId(null); // Managed by caller now for multi-select
    };


    const isAllTab = activeTab === 'ALL';
    // 'primary' is the English/Global tab. It should be editable by default and show no inheritance overlay.
    const isLanguageSpecificView = !isAllTab;
    const {
        primary,
        globalPrimary,
        fontListToRender,
        unmappedFonts,
        systemFonts,
        isInheritedPrimary,
        overriddenOriginalIds
    } = useMemo(() => {
        const p = fonts.find(f => f && f.type === 'primary' && !f.isPrimaryOverride);
        const sFonts = fonts.filter(f => f && !f.fontObject && !f.isLangSpecific && !f.isClone);

        // Calculate Global Fallbacks (Unassigned/Inheritable)
        const validFallbacks = fonts.filter(f =>
            f.type === 'fallback' &&
            f.fontObject &&
            !f.isClone
        );

        // Get all font IDs that are mapped to any language (as overrides)
        const mappedFontIds = new Set();
        // Add fallback overrides
        Object.values(fallbackFontOverrides || {}).forEach(val => {
            if (typeof val === 'string') {
                mappedFontIds.add(val);
            } else if (val && typeof val === 'object') {
                // Add keys (Original Global Font IDs) so they appear as Mapped
                Object.keys(val).forEach(id => mappedFontIds.add(id));
                // Add values (Cloned Font IDs) - technical correctness
                Object.values(val).forEach(id => mappedFontIds.add(id));
            }
        });
        // Add primary overrides
        Object.values(primaryFontOverrides || {}).forEach(fontId => {
            if (fontId) mappedFontIds.add(fontId);
        });

        if (isAllTab) {
            // "ALL" Tab: Mapped are those mapped to ANY language
            let targeted = validFallbacks.filter(f => mappedFontIds.has(f.id));

            // NEW: Filter Primary Font out of Mapped list (prevent Primary from appearing in Mapped section)
            if (p) {
                const pName = (p.fileName || p.name || "").toLowerCase();
                targeted = targeted.filter(f => {
                    // Check ID match (unlikely if types differ, but safe)
                    if (f.id === p.id) return false;

                    // If it is a Primary Override, we WANT to show it in Mapped List
                    if (f.isPrimaryOverride) return true;

                    // Check Name match
                    const fName = (f.fileName || f.name || "").toLowerCase();
                    if (fName === pName) return false;
                    return true;
                });
            }

            // NEW: Filter targeted fonts by selectedGroup if not ALL
            if (selectedGroup !== 'ALL' && selectedGroup !== 'MAPPED') {
                targeted = targeted.filter(f => {
                    // Check if this font is mapped to any language in the selected group
                    const fontLangs = [];
                    Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
                        if (fontId === f.id) fontLangs.push(langId);
                    });
                    Object.entries(fallbackFontOverrides || {}).forEach(([langId, val]) => {
                        if (typeof val === 'string') {
                            if (val === f.id) fontLangs.push(langId);
                        } else if (val && typeof val === 'object') {
                            if (val[f.id]) fontLangs.push(langId);
                        }
                    });

                    return fontLangs.some(langId => {
                        const langData = languagesData.find(l => l.id === langId);
                        return getLanguageGroup(langData) === selectedGroup;
                    });
                });
            }

            // Show as unmapped/general ONLY if not mapped
            // FIX: Allow fonts that are GLOBAL (!isLangSpecific) to appear here even if they are mapped to specific languages
            let unmapped = validFallbacks.filter(f => !mappedFontIds.has(f.id) || !f.isLangSpecific);

            // NEW: Deduplicate Mapped Fonts Grouping (Visual Only)
            // Group 'targeted' fonts by filename, and consolidate their IDs.
            // This prevents duplicate cards for the "same" font (clones/strict mappings)
            // while allowing the single card to show tags for ALL its IDs.
            const uniqueTargeted = [];
            const targetedNames = new Map(); // Name -> Representative Font
            const consolidatedIdsMap = {}; // RepFontID -> [ID, ID...]

            targeted.forEach(f => {
                const name = (f.fileName || f.name || "").toLowerCase();
                if (targetedNames.has(name)) {
                    // Duplicate found -> add ID to existing Rep
                    const rep = targetedNames.get(name);

                    if (!consolidatedIdsMap[rep.id]) {
                        consolidatedIdsMap[rep.id] = [rep.id];
                    }
                    // Ensure no duplicates in array
                    if (!consolidatedIdsMap[rep.id].includes(f.id)) {
                        consolidatedIdsMap[rep.id].push(f.id);
                    }

                } else {
                    // New Unique Font
                    uniqueTargeted.push(f);
                    targetedNames.set(name, f);
                    // Initialize map
                    consolidatedIdsMap[f.id] = [f.id];
                }
            });


            // Restoration: Deduplicate Unmapped Fonts
            // 1. Remove if filename matches any MAPPED font (prevent "Ghost" duplicates) unless it's Global
            // 2. Remove duplicates within unmapped list (keep first)
            // 3. Remove if filename matches Primary Font

            // Re-calculate targeted names set for checking unmapped collisions
            // We can use targetedNames Map keys from above

            const seenUnmappedNames = new Set();
            const primaryName = p ? (p.fileName || p.name || "").toLowerCase() : null;

            unmapped = unmapped.filter(f => {
                const name = (f.fileName || f.name || "").toLowerCase();

                // Filter out if matches Primary Font
                if (primaryName && name === primaryName) return false;

                // If it is Global, we ALLOW it to appear even if it's in the Mapped list
                // But we check if it is in the Mapped list using targetedNames
                if (targetedNames.has(name) && f.isLangSpecific) return false;

                if (seenUnmappedNames.has(name)) return false;
                seenUnmappedNames.add(name);
                return true;
            });

            return {
                primary: p,
                globalPrimary: p,
                fontListToRender: uniqueTargeted, // Use deduplicated list
                unmappedFonts: unmapped,
                systemFonts: sFonts,
                isInheritedPrimary: false,
                isLanguageSpecificList: false,
                consolidatedIdsMap // Pass map to be used in render
            };
        }

        // --- NEW DEDUPLICATION LOGIC ---
        // Moved inside the useMemo result calculation? No, the return was above.
        // We need to modify the 'targeted' list BEFORE returning in the if(isAllTab) block above.
        // Let's rewrite the return block of isAllTab to include deduplication.


        // Language specific view (includes 'primary'/English)
        let overrideFontId = primaryFontOverrides[activeTab];

        // Fix: Mapped Languages store Primary Font overrides in `fallbackFontOverrides` (keyed by original Primary ID)
        if (!overrideFontId && p && fallbackFontOverrides[activeTab] && typeof fallbackFontOverrides[activeTab] === 'object') {
            overrideFontId = fallbackFontOverrides[activeTab][p.id];
        }

        const overrideFont = fonts.find(f => f.id === overrideFontId);

        // UNIFIED LIST GENERATION
        // We want to render the "Global Stack" order, but swapping in overrides where they exist.
        // This ensures the list doesn't jump around or separate into "Mapped" vs "Inherited",
        // keeping the UI stable (and Slider working).

        // 1. Identification of Base Global Fonts (The "Slots")
        // These are effectively all valid global fallbacks + defaults.
        const baseGlobalFonts = validFallbacks; // validFallbacks excludes clones and has fontObject
        // System fonts are also "Base" but they are usually separated.
        // Wait, validFallbacks excludes system fonts (f.fontObject check).
        // System fonts are separate in sFonts.

        // So we focus on the "Uploaded Fallbacks" stack first.

        // 2. Map Base Fonts to Effective Fonts (Global or Override)
        const rawOverrides = fallbackFontOverrides[activeTab] || {};
        const overriddenOriginalIds = new Set(); // Re-introduced definition

        const unifiedUploadedFonts = baseGlobalFonts.map(baseFont => {
            // Check for override
            let overrideId = null;
            if (typeof rawOverrides === 'string') {
                if (rawOverrides === baseFont.id) overrideId = rawOverrides; // Legacy/Direct
            } else {
                overrideId = rawOverrides[baseFont.id] || null;
            }

            if (overrideId) {
                const override = fonts.find(f => f.id === overrideId);
                if (override) {
                    overriddenOriginalIds.add(baseFont.id); // Track it
                    return override;
                }
            }
            return baseFont;
        });

        // 3a. Explicitly add overridden system fonts to overriddenOriginalIds
        // AND collect the override fonts themselves if they weren't part of the baseGlobalFonts loop
        const extraMappedFonts = [];

        if (typeof rawOverrides === 'object') {
            Object.entries(rawOverrides).forEach(([originalId, overrideId]) => {
                const originalFont = fonts.find(f => f.id === originalId);

                // If it's a System Font (not in baseGlobalFonts) that is overridden
                if (originalFont && !originalFont.fontObject) {
                    overriddenOriginalIds.add(originalId);

                    // We need to show the OVERRIDE font in the list
                    const overrideFont = fonts.find(f => f.id === overrideId);
                    if (overrideFont) {
                        extraMappedFonts.push(overrideFont);
                    }
                }
            });
        } else if (typeof rawOverrides === 'string') {
            // Handle single legacy mapping if it happens to be a system font override?
            // Usually legacy mapping is 'lang' -> 'fontID'.
            // If the fontID is a system font, it's just a mapping, not an override of a base.
            // But if it's a strictly mapped font that isn't in baseGlobalFonts (e.g. system font mapped to lang),
            // we should likely include it.
            const f = fonts.find(font => font.id === rawOverrides);
            if (f && !f.fontObject) {
                // It's a system font mapped directly.
                extraMappedFonts.push(f);
            }
        }

        const fullUnifiedList = [...unifiedUploadedFonts, ...extraMappedFonts];

        // Inherited Global Fallbacks: Valid globals that are NOT overridden in this language AND (NOT mapped elsewhere OR are Global)
        // Also apply deduplication to inherited fallbacks to be safe
        let inheritedFallbacks = validFallbacks.filter(f =>
            !overriddenOriginalIds.has(f.id) &&
            (!mappedFontIds.has(f.id) || !f.isLangSpecific)
        );

        // Exclude fonts that are already in the "Targeted" list for this language
        // This handles cases where a font is manually mapped (thus in fullUnifiedList)
        // AND it exists in the global fallback list. We don't want to show it again as "Auto".
        const targetedNames = new Set(fullUnifiedList.map(f => (f.fileName || f.name || "").toLowerCase()));

        // Get Primary Font Name (normalized)
        const primaryName = p ? (p.fileName || p.name || "").toLowerCase() : null;

        const seenInheritedNames = new Set();
        inheritedFallbacks = inheritedFallbacks.filter(f => {
            const name = (f.fileName || f.name || "").toLowerCase();

            // Filter out if matches Primary Font
            if (primaryName && name === primaryName) return false;

            // Check against specific targeted fonts for this language
            if (targetedNames.has(name)) return false;

            if (seenInheritedNames.has(name)) return false;
            seenInheritedNames.add(name);
            return true;
        });

        // Filter out mapped fonts that are effectively the primary font (redundant display)
        const effectivePrimary = overrideFont || p;
        const effectivePrimaryName = effectivePrimary ? (effectivePrimary.fileName || effectivePrimary.name) : null;

        const filteredLanguageSpecificFonts = fullUnifiedList.filter(f => {
            // If explicit legacy "Primary Map" flag
            if (f.isPrimaryMap) return false;

            // If it is the exact same ID as what is shown in Primary Card
            if (effectivePrimary && f.id === effectivePrimary.id) return false;

            // If it is a clone of the effective primary
            if (effectivePrimaryName && (f.isClone || f.type === 'primary')) {
                const fName = f.fileName || f.name;
                if (fName === effectivePrimaryName) return false;
            }

            return true;
        });

        return {
            primary: overrideFont || p,
            globalPrimary: p,
            isInheritedPrimary: !overrideFont && activeTab !== 'primary',
            systemFonts: sFonts,
            fontListToRender: filteredLanguageSpecificFonts,
            unmappedFonts: inheritedFallbacks, // Show inherited global fallbacks
            overriddenOriginalIds,
            isLanguageSpecificList: true
        };
    }, [fonts, activeTab, isAllTab, primaryFontOverrides, fallbackFontOverrides, selectedGroup]);





    return (
        <div className="pb-6 space-y-4">
            {/* Primary Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Primary Font
                    </span>
                    {!isAllTab && activeTab !== 'primary' && (
                        <InfoTooltip
                            content={
                                <span>
                                    <strong className="block mb-2 text-indigo-300">Styling Overrides</strong>
                                    Overriding the primary font here changes the default styling but enables cascading controls (like line-height and letter-spacing) for specific language fonts, bypassing standard inheritance limitations.
                                </span>
                            }
                        />
                    )}
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                {primary && (
                    <FontCard
                        font={primary}
                        isActive={activeFont === primary.id}
                        globalWeight={weight}
                        globalLineHeight={lineHeight}
                        setGlobalLineHeight={setLineHeight}
                        getFontColor={getFontColor}
                        updateFontColor={updateFontColor}
                        getEffectiveFontSettings={getEffectiveFontSettings}
                        fontScales={fontScales}
                        lineHeight={lineHeight}
                        updateFallbackFontOverride={updateFallbackFontOverride}
                        resetFallbackFontOverrides={resetFallbackFontOverrides}
                        setActiveFont={setActiveFont}
                        updateFontWeight={updateFontWeight}
                        toggleFontVisibility={toggleFontVisibility}
                        isInherited={isInheritedPrimary}
                        onOverride={() => addLanguageSpecificPrimaryFont(activeTab)}
                        onResetOverride={(isLanguageSpecificView && primary.id !== globalPrimary.id) ? () => unmapFont(primary.id) : null}
                        onSelectLanguage={setActiveConfigTab}
                        setHighlitLanguageId={setHighlitLanguageId}
                        activeTab={activeTab}
                        readOnly={readOnly}
                        onMap={null}
                    />
                )}

                {isAllTab && (
                    <div className="px-1 pb-2 pt-1 mt-1">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Fallback Size Adjust</span>
                            <div className="flex items-center gap-3">
                                {fontScales.fallback !== 100 && (
                                    <button
                                        onClick={() => {
                                            setFontScales(prev => ({ ...prev, fallback: 100 }));
                                            setIsFallbackLinked(false);
                                        }}
                                        className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors font-bold"
                                        title="Reset fallback scale"
                                    >
                                        <span>RESET</span>
                                        <span className="text-xs">↺</span>
                                    </button>
                                )}
                                <span className="text-indigo-600 font-mono text-xs font-bold">{fontScales.fallback}%</span>
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
                                setFontScales(prev => ({ ...prev, fallback: val }));
                                setIsFallbackLinked(false);
                            }}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                )}
            </div>

            {(() => {
                const fallbackSection = unmappedFonts && unmappedFonts.length > 0 && (
                    <div className="space-y-3 pb-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                GENERAL FALLBACK FONTS
                            </span>
                            <InfoTooltip
                                content={
                                    <span>
                                        <strong className="block mb-2 text-indigo-300">Detargeting Fonts</strong>
                                        Properties like `line - height` and `letter - spacing` apply to the entire element, meaning primary and fallback fonts share them. To style scripts independently, you must override the primary font or use separate elements (e.g., spans).
                                        <br /><br />
                                        <strong className="block mb-2 text-indigo-300">Browser Compatibility</strong>
                                        Advanced `@font-face` metrics like `ascent - override`, `descent - override`, and `line - gap - override` are currently not supported in **Safari**. Use these with caution if your target audience uses macOS or iOS.
                                    </span>
                                }
                            />
                            <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        {unmappedFonts.map((font) => (
                            <FontCard
                                key={font.id}
                                font={font}
                                isActive={activeFont === font.id}
                                getFontColor={getFontColor}
                                updateFontColor={updateFontColor}
                                getEffectiveFontSettings={getEffectiveFontSettings}
                                fontScales={fontScales}
                                lineHeight={lineHeight}
                                updateFallbackFontOverride={updateFallbackFontOverride}
                                resetFallbackFontOverrides={resetFallbackFontOverrides}
                                setActiveFont={setActiveFont}
                                updateFontWeight={updateFontWeight}
                                toggleFontVisibility={toggleFontVisibility}
                                isInherited={false}
                                onOverride={null}
                                onMap={(!isAllTab && activeTab !== 'primary') ? (fid) => addLanguageSpecificFont(fid, activeTab) : handleMapLanguage}
                                onResetOverride={null}
                                onSelectLanguage={setActiveConfigTab}
                                setHighlitLanguageId={setHighlitLanguageId}
                                activeTab={activeTab}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                );

                const targetedSection = (
                    <div className="space-y-3">
                        {(activeTab !== 'primary' || fontListToRender.length > 0) && (
                            <>
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {isAllTab ? 'Mapped Fonts' : 'Mapped Font'}
                                    </span>
                                    <InfoTooltip
                                        content={
                                            <span>
                                                <strong className="block mb-2 text-indigo-300">Styling Limitations</strong>
                                                Properties like `line - height` and `letter - spacing` apply to the entire element, meaning primary and fallback fonts share them. To style scripts independently, you must use separate elements (e.g., spans).
                                                <br /><br />
                                                <strong className="block mb-2 text-indigo-300">Browser Compatibility</strong>
                                                Advanced `@font-face` metrics like `ascent - override`, `descent - override`, and `line - gap - override` are currently not supported in **Safari**. Use these with caution if your target audience uses macOS or iOS.
                                            </span>
                                        }
                                    />
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                            </>
                        )}

                        {fontListToRender.length === 0 && isAllTab && (
                            <div className="text-xs text-slate-400 italic px-2 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                No fonts have been targeted yet.
                            </div>
                        )}

                        {fontListToRender.length === 0 && !isAllTab && activeTab !== 'primary' && (
                            <div className="relative group text-xs text-slate-400 italic px-2 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col gap-3 items-center justify-center hover:bg-slate-100/50 transition-colors">
                                <span>No font mapped</span>

                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAddMenu(!showAddMenu);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-slate-600 font-semibold hover:text-indigo-600 hover:border-indigo-200 transition-all text-[11px]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                        </svg>
                                        Add Font
                                    </button>

                                    {showAddMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowAddMenu(false)}
                                            />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAddMenu(false);
                                                        setShowFontSelector(true);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                                    </svg>
                                                    Select Existing
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAddMenu(false);
                                                        fileInputRef.current?.click();
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                    </svg>
                                                    Upload New
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {fontListToRender.map((font) => {
                            const isPrimaryClone = globalPrimary &&
                                font.isClone &&
                                (font.fileName === globalPrimary.fileName) &&
                                (font.name === globalPrimary.name);

                            if (font.type === 'primary' || font.isPrimaryMap || isPrimaryClone) {
                                return (
                                    <div key={font.id} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between gap-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">
                                                    Using primary font
                                                </div>
                                            </div>
                                        </div>
                                        {(!isAllTab && activeTab !== 'primary') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    unmapFont(font.id);
                                                }}
                                                className="text-slate-400 hover:text-rose-500 transition-all p-1"
                                                title="Unmap font"
                                                type="button"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-4 h-4">
                                                    <path d="M198.63,57.37a32,32,0,0,0-45.19-.06L141.79,69.52a8,8,0,0,1-11.58-11l11.72-12.29a1.59,1.59,0,0,1,.13-.13,48,48,0,0,1,67.88,67.88,1.59,1.59,0,0,1-.13.13l-12.29,11.72a8,8,0,0,1-11-11.58l12.21-11.65A32,32,0,0,0,198.63,57.37ZM114.21,186.48l-11.65,12.21a32,32,0,0,1-45.25-45.25l12.21-11.65a8,8,0,0,0-11-11.58L46.19,141.93a1.59,1.59,0,0,0-.13.13,48,48,0,0,0,67.88,67.88,1.59,1.59,0,0,0,.13-.13l11.72-12.29a8,8,0,1,0-11.58-11ZM216,152H192a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16ZM40,104H64a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm120,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V192A8,8,0,0,0,160,184ZM96,72a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V64A8,8,0,0,0,96,72Z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            }

                            // Detect if this font is physically 'linked' to the global stock (inherited)
                            // A font is inherited if it is NOT a clone (isLangSpecific is false)
                            // But it appears in this list because it was mapped (via linkFontToLanguage self-reference)
                            const isInheritedMapped = !font.isLangSpecific && !isAllTab;

                            return (
                                <FontCard
                                    key={font.id}
                                    font={font}
                                    isActive={false} // Force unselected look as requested
                                    getFontColor={getFontColor}
                                    updateFontColor={updateFontColor}
                                    getEffectiveFontSettings={getEffectiveFontSettings}
                                    fontScales={fontScales}
                                    lineHeight={lineHeight}
                                    updateFallbackFontOverride={updateFallbackFontOverride}
                                    resetFallbackFontOverrides={resetFallbackFontOverrides}
                                    setActiveFont={setActiveFont}
                                    updateFontWeight={updateFontWeight}
                                    toggleFontVisibility={toggleFontVisibility}
                                    isInherited={isInheritedMapped}
                                    onOverride={isInheritedMapped ? () => addLanguageSpecificFont(font.id, activeTab) : null}
                                    onMap={null} // Remove Map button
                                    // Enable deletion (unmap/remove clone) in language-specific view
                                    onResetOverride={(!isAllTab && activeTab !== 'primary') ? unmapFont : null}
                                    onSelectLanguage={setActiveConfigTab}
                                    setHighlitLanguageId={setHighlitLanguageId}
                                    activeTab={activeTab}
                                    readOnly={readOnly}
                                />
                            );
                        })}
                    </div>
                );

                if (isAllTab) {
                    return (
                        <>
                            {fallbackSection}
                            {targetedSection}
                        </>
                    );
                } else {
                    return (
                        <>
                            {targetedSection}
                            {fallbackSection}
                        </>
                    );
                }
            })()}

            {/* System Default */}
            <div className="relative group/system p-1 -m-1 rounded-xl transition-all">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Fonts</span>
                        <div className="relative w-3.5 h-3.5 rounded-full border border-slate-200 shadow-sm overflow-hidden">
                            <div className="absolute inset-0" style={{ backgroundColor: effectiveMissingColor }}></div>
                            <input
                                type="color"
                                value={effectiveMissingColor}
                                onChange={(e) => handleMissingColorChange(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={readOnly}
                            />
                        </div>
                        <div className="h-px flex-1 bg-slate-100"></div>

                        {!isAllTab && activeTab !== 'primary' && !isInheritedSystemGroup && !readOnly && (
                            <button
                                onClick={(e) => { e.stopPropagation(); resetSystemFallbackOverride(activeTab); }}
                                className="text-slate-400 hover:text-rose-500 transition-all p-1"
                                title="Reset section to inherited settings"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-4 h-4">
                                    <path d="M198.63,57.37a32,32,0,0,0-45.19-.06L141.79,69.52a8,8,0,0,1-11.58-11l11.72-12.29a1.59,1.59,0,0,1,.13-.13,48,48,0,0,1,67.88,67.88,1.59,1.59,0,0,1-.13.13l-12.29,11.72a8,8,0,0,1-11-11.58l12.21-11.65A32,32,0,0,0,198.63,57.37ZM114.21,186.48l-11.65,12.21a32,32,0,0,1-45.25-45.25l12.21-11.65a8,8,0,0,0-11-11.58L46.19,141.93a1.59,1.59,0,0,0-.13.13,48,48,0,0,0,67.88,67.88,1.59,1.59,0,0,0,.13-.13l11.72-12.29a8,8,0,1,0-11.58-11ZM216,152H192a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16ZM40,104H64a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm120,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V192A8,8,0,0,0,160,184ZM96,72a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V64A8,8,0,0,0,96,72Z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {systemFonts && systemFonts.length > 0 && (
                        <div className="space-y-3">
                            {systemFonts.map((font) => {
                                const isOverridden = overriddenOriginalIds?.has(font.id);
                                if (!isAllTab && isOverridden) return null;

                                return (
                                    <FontCard
                                        key={font.id}
                                        font={font}
                                        isActive={activeFont === font.id}
                                        getFontColor={getFontColor}
                                        updateFontColor={updateFontColor}
                                        getEffectiveFontSettings={getEffectiveFontSettings}
                                        fontScales={fontScales}
                                        lineHeight={lineHeight}
                                        updateFallbackFontOverride={updateFallbackFontOverride}
                                        resetFallbackFontOverrides={resetFallbackFontOverrides}
                                        setActiveFont={setActiveFont}
                                        updateFontWeight={updateFontWeight}
                                        toggleFontVisibility={toggleFontVisibility}
                                        onSelectLanguage={setActiveConfigTab}
                                        activeTab={activeTab}
                                        isInherited={!isAllTab && activeTab !== 'primary' && !readOnly && !isOverridden}
                                        onOverride={() => addLanguageSpecificFont(font.id, activeTab)}
                                        onResetOverride={(!isAllTab && activeTab !== 'primary') ? unmapFont : null}
                                        setHighlitLanguageId={setHighlitLanguageId}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => handleSystemFallbackChange('sans-serif')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${effectiveFallbackFont === 'sans-serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Sans-serif
                        </button>
                        <button
                            onClick={() => handleSystemFallbackChange('serif')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${effectiveFallbackFont === 'serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Serif
                        </button>
                    </div>
                </div>

                {isInheritedSystemGroup && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 rounded-xl backdrop-blur-[1px] transition-all">
                        <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-3">
                            Inherited from Global
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); updateSystemFallbackOverride(activeTab, 'type', fallbackFont); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide"
                        >
                            OVERRIDE STYLE
                        </button>
                    </div>
                )}
            </div>

            {
                mappingFontId && (
                    <LanguageMultiSelectModal
                        onClose={() => setMappingFontId(null)}
                        onConfirm={(selectedLangIds) => {
                            selectedLangIds.forEach(langId => handleLanguageSelected(langId));
                            setMappingFontId(null);
                        }}
                        title={(() => {
                            const font = fonts.find(f => f.id === mappingFontId);
                            const name = font ? (font.name || font.fileName || 'Font') : 'Font';
                            return `Map ${name} to Languages`;
                        })()}
                        confirmLabel="Map"
                    />
                )
            }

            {
                showFontSelector && (
                    <FontSelectionModal
                        title={`Select Font for ${activeTab}`}
                        onClose={() => setShowFontSelector(false)}
                        onSelect={handleExistingFontSelect}
                        fontOptions={fonts.map(f => ({
                            id: f.id,
                            label: f.name || f.fileName || 'Untitled',
                            fileName: f.fileName
                        }))}
                        currentFontId={null}
                    />
                )
            }
            <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                multiple
                onChange={handleFileUpload}
            />
        </div >
    );
};

FontCards.propTypes = {
    activeTab: PropTypes.string.isRequired,
    selectedGroup: PropTypes.string,
    setHighlitLanguageId: PropTypes.func,
    readOnly: PropTypes.bool
};

export default FontCards;
