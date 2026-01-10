import { useRef, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import { useUI } from '../context/UIContext';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';
import FontCardHeader from './FontCardHeader';
import FontCardTabs from './FontCardTabs';
import FontCardSettings from './FontCardSettings';

const FontCardContent = ({
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

    fontScales,
    lineHeight,

    setActiveFont,
    consolidatedIds = null,

    // NEW PROPS
    scope,
    onSetScope,
    isReference = false,
    highlitLanguageId
}) => {
    const { primaryFontOverrides, fallbackFontOverrides, letterSpacing, setLetterSpacing, primaryLanguages, updateLanguageSpecificSetting, linkFontToLanguage, fonts, baseRem: contextBaseRem, setBaseRem, toggleFontVisibility, clearPrimaryFontOverride, clearFallbackFontOverride, addLanguageSpecificFont, addLanguageSpecificPrimaryFont, mapLanguageToFont, unmapLanguage } = useTypo();
    const { activeConfigTab, setActiveConfigTab } = useUI();
    const baseRem = contextBaseRem || 16;
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const [tagsLimit, setTagsLimit] = useState(11);
    const tagsContainerRef = useRef(null);


    // Use passed scope if available, or manage internally (default to ALL)
    // This supports both controlled and uncontrolled usage
    const [internalScope, setInternalScope] = useState('ALL');

    // Sync internal state with activeConfigTab if uncontrolled or hybrid
    useEffect(() => {
        if (!activeConfigTab || activeConfigTab === 'ALL') {
            if (onSetScope) onSetScope('ALL');
            setInternalScope('ALL');
        }
        // Additional sync logic handled by parent or activeConfigTab effect below
    }, [activeConfigTab, onSetScope]);

    const editScope = scope !== undefined ? scope : internalScope;
    const setEditScope = onSetScope || setInternalScope;



    const idsToCheck = consolidatedIds || [font.id];

    const languageTags = useMemo(() => {
        const tags = [];

        idsToCheck.forEach(checkId => {
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
                if (fontId === checkId) tags.push(langId);
            });
            // Fallback overrides
            Object.entries(fallbackFontOverrides || {}).forEach(([langId, val]) => {
                if (typeof val === 'string') {
                    if (val === checkId) tags.push(langId);
                } else if (val && typeof val === 'object') {
                    if (val[checkId] || Object.values(val).includes(checkId)) {
                        tags.push(langId);
                    }
                }
            });
        });

        return [...new Set(tags)].filter(t => t && t !== 'undefined');
    }, [font.id, primaryFontOverrides, fallbackFontOverrides, font.type, font.isPrimaryOverride, primaryLanguages, consolidatedIds]);

    // Helper to determine if a language has an active override on this card
    const getOverrideState = (langId) => {
        // Resolve Target Font Logic
        const isPrimaryCard = font.type === 'primary' || font.isPrimaryOverride;
        const pId = primaryFontOverrides?.[langId];
        const fOverrides = fallbackFontOverrides?.[langId];

        let fId = null;
        if (typeof fOverrides === 'object' && fOverrides !== null) {
            const matchedBaseId = idsToCheck.find(id => fOverrides[id]);
            if (matchedBaseId) fId = fOverrides[matchedBaseId];
            else fId = idsToCheck.find(id => Object.values(fOverrides).includes(id));
        } else if (typeof fOverrides === 'string') {
            fId = fOverrides;
        }

        const targetId = isPrimaryCard ? pId : fId;
        const targetFont = targetId ? fonts.find(f => f.id === targetId) : null;

        if (!targetId) return false;

        // FAIL-SAFE: If mapped to the card's own base ID, it's NOT an override.
        // This ensures "Clean Mapping" never shows a dot.
        // EXCEPTION: If the card ITSELF is a clone (specialized view), then matching ID implies override relative to global base.
        if (targetId === font.id && !font.isClone && !font.isLangSpecific) return false;

        if (!targetFont) return false;

        // 2. It IS an override if:
        // a) It's a language-specific clone
        if (targetFont.isLangSpecific || targetFont.isClone) {
            // NEW CHECK: Validating that it ACTUALLY has override values
            // For clones, we check if any relevant property is set defined/differently from base
            const overrideProps = [
                'weightOverride',
                'scale',
                'lineHeight',
                'letterSpacing',
                'lineGapOverride',
                'ascentOverride',
                'descentOverride',
                'fontSizeAdjust'
            ];

            // RESOLVE BASE FONT for comparison
            // If mapped to a clone, the "base" is its parent.
            // If mapped to a primary/base font, the base is itself (but then isClone check above handles it).
            const baseFontForComparison = targetFont.parentId
                ? fonts.find(f => f.id === targetFont.parentId)
                : (targetFont.isClone ? null : targetFont);

            // Fallback to provided 'font' if parent resolution fails (unlikely) or if self is base.
            const comparisonBase = baseFontForComparison || font;

            const hasActualChange = overrideProps.some(prop => {
                let val = targetFont[prop];
                let baseVal = comparisonBase[prop];

                // Normalization for comparisons
                // 1. Scale: 
                // If override is undefined/null, it means INHERIT. We should NOT force it to 1.
                // If base is undefined/null, it implies default 1. We SHOULD force it to 1 for comparison against explicit override.
                if (prop === 'scale') {
                    // if (val === undefined || val === null) val = 1; // <--- REMOVED (Caused Regression)
                    if (baseVal === undefined || baseVal === null) baseVal = 1;
                }

                // If value is undefined/null (after potential normalization), it's inheriting.
                // If inheriting, it matches base by definition. Return false for this prop.
                if (val === undefined || val === null) return false;

                // If value is defined, we check if it is DIFFERENT from base.
                return val !== baseVal;
            });

            if (hasActualChange) return true;

            // Color check: strictly speaking color is an override, but sometimes it just inherits.
            if (targetFont.color && targetFont.color !== comparisonBase.color) return true;

            // If it's a clone/lang-specific but has NO properties set, it's just a "soft mapping"
            // (maybe waiting for user input, or just isolated for potential future input).
            // In this case, we do NOT show the dot.
            return false;
        }

        // b) It's mapped to a different global font than the one(s) this card represents
        // Only if targetId is NOT a clone (clones handled above).
        if (targetFont.isClone || targetFont.isLangSpecific) return false;

        return !idsToCheck.includes(targetId);
    };

    const singleLang = languageTags.length === 1 ? languageTags[0] : null;
    const singleLangHasOverride = singleLang ? getOverrideState(singleLang) : false;
    // Show merged view if there is exactly one language AND it has no active override
    const showMergedView = singleLang && !singleLangHasOverride;

    // Sync editScope with activeConfigTab (Global Selection)
    useEffect(() => {
        if (!activeConfigTab || activeConfigTab === 'ALL') {
            onSetScope('ALL');
            return;
        }

        if (activeConfigTab === 'primary') {
            // Find if this card has a tag for the specifically highlighted primary language
            if (highlitLanguageId && languageTags.includes(highlitLanguageId)) {
                if (showMergedView && highlitLanguageId === singleLang) {
                    onSetScope('ALL');
                } else {
                    onSetScope(highlitLanguageId);
                }
            } else {
                // Otherwise find the first primary language tag this card has
                const firstPrimary = languageTags.find(tag => primaryLanguages.includes(tag));
                if (firstPrimary) {
                    if (showMergedView && firstPrimary === singleLang) {
                        onSetScope('ALL');
                    } else {
                        onSetScope(firstPrimary);
                    }
                } else {
                    onSetScope('ALL');
                }
            }
            return;
        }

        // If a specific language is active, check if this card has a tab for it
        if (languageTags.includes(activeConfigTab)) {
            if (showMergedView && activeConfigTab === singleLang) {
                onSetScope('ALL');
            } else {
                onSetScope(activeConfigTab);
            }
        } else {
            // Default to ALL if no match
            onSetScope('ALL');
        }
    }, [activeConfigTab, highlitLanguageId, languageTags, primaryLanguages, onSetScope, showMergedView, singleLang]);

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

    // Handle Scoped Updates
    const handleScopedUpdate = (property, value) => {
        if (editScope === 'ALL') {
            // Global Update
            if (property === 'lineHeight') {
                if (font.isPrimaryOverride) updateFallbackFontOverride(font.id, 'lineHeight', value);
                else setGlobalLineHeight?.(value);
            } else if (property === 'letterSpacing') {
                if (font.type === 'primary' && !font.isPrimaryOverride) setLetterSpacing(value);
                else updateFallbackFontOverride(font.id, 'letterSpacing', value);
            } else if (property === 'weight') {
                updateFontWeight(value);
            } else if (property === 'baseFontSize') {
                setBaseRem?.(value);
            } else {
                updateFallbackFontOverride(font.id, property, value);
            }
        } else {
            // Scoped Update (Specific Language)
            if (property === 'weight') property = 'weightOverride';
            if (property === 'scale') property = 'scale';

            // Check against current scoped value (Safe to keep or remove? Let's remove to be consistent with ALL scope)
            // const currentScopedValue = scopeFontSettings?.[property];
            // if (currentScopedValue === value) return;

            updateLanguageSpecificSetting(font.id, editScope, property, value);
        }
    };


    // Derived state to check if the current edited scope is inheriting from the shared font
    // If true, we show the "Inherited" overlay
    const isScopeInherited = editScope !== 'ALL' && scopeFontId === font.id && !font.isClone && !font.isLangSpecific;

    const handleSplit = () => {
        if (editScope === 'ALL') return;

        if (font.type === 'primary' && !font.isPrimaryOverride) {
            addLanguageSpecificPrimaryFont(editScope);
        } else {
            addLanguageSpecificFont(font.id, editScope);
        }
    };

    const isPrimary = font.type === 'primary' || (fonts && fonts.length > 0 && fonts[0].id === font.id);
    const opacity = font.hidden ? 0.4 : 1;

    // Use scopeFont for reading settings!
    const scopeFontSettings = getEffectiveFontSettings(scopeFontId);

    const effectiveWeight = scopeFontSettings?.weight ?? 400;
    const weightOptions = buildWeightSelectOptions(scopeFont);
    const resolvedWeight = resolveWeightToAvailableOption(scopeFont, effectiveWeight);



    // Determine available tabs
    const showTabs = languageTags && languageTags.length > 0;

    // Sort tabs: Put currently selected scope first if possible, or just alphabetical?
    // User requested "All" then others.
    // "ALL" is always the first tab.

    return (
        <div
            style={{ opacity }}
            className={`
                bg-white rounded-xl border transition-all duration-300 relative
                ${isPrimary ? 'ring-1 ring-slate-200' : 'cursor-pointer'}
                ${isActive && !isPrimary && !isReference
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg'
                    : 'border-gray-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)]'
                }
                ${isReference ? 'bg-slate-50/50 border-dashed border-slate-300 pointer-events-none select-none' : ''}
            `}
        >


            {/* Content Area */}
            <div className={`p-3 relative`}>

                {/* Reference Header */}
                {isReference && (
                    <div className="absolute top-2 left-2 right-2 text-center pointer-events-none z-10">
                        <span className="text-[9px] font-black uppercase text-slate-400 bg-white/50 px-2 py-0.5 rounded tracking-widest border border-slate-100">
                            Global Reference
                        </span>
                    </div>
                )}
                {/* Inherited Overlay */}
                {(isInherited || isScopeInherited) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] transition-all gap-3 rounded-xl m-[1px]">
                        <span className="text-indigo-900/40 text-[10px] font-bold uppercase tracking-widest mb-1">
                            Inherited from Global
                        </span>
                        {(onOverride || isScopeInherited) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isScopeInherited) handleSplit();
                                    else onOverride?.();
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide"
                            >
                                OVERRIDE STYLE
                            </button>
                        )}
                        {onMap && !isScopeInherited && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMap?.(font.id); }}
                                className="bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-[10px] font-bold px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide flex items-center gap-2"
                            >
                                MAP TO
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

                <FontCardHeader
                    font={font}
                    isPrimary={isPrimary}
                    onResetOverride={onResetOverride}
                    getFontColor={getFontColor}
                    updateFontColor={updateFontColor}
                    isInherited={isInherited}
                    readOnly={readOnly}
                />

                <FontCardTabs
                    languageTags={languageTags}
                    showMergedView={showMergedView}
                    editScope={editScope}
                    onSetScope={onSetScope}
                    setActiveConfigTab={setActiveConfigTab}
                    setHighlitLanguageId={setHighlitLanguageId}
                    singleLang={singleLang}
                    primaryLanguages={primaryLanguages}
                    idsToCheck={idsToCheck}
                    primaryFontOverrides={primaryFontOverrides}
                    fallbackFontOverrides={fallbackFontOverrides}
                    fonts={fonts}
                    getOverrideState={getOverrideState}
                    mapLanguageToFont={mapLanguageToFont}
                    font={font}
                    onMap={onMap}
                    activeTab={activeTab}
                />

                <div className={`mt-2 pt-2 border-t border-slate-100 space-y-3 ${(isInherited || isScopeInherited) ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''}`} onClick={e => e.stopPropagation()}>
                    <FontCardSettings
                        isPrimary={isPrimary}
                        font={font}
                        editScope={editScope}
                        baseRem={baseRem}
                        setBaseRem={setBaseRem}
                        readOnly={readOnly}
                        scopeFont={scopeFont}
                        scopeFontId={scopeFontId}
                        globalLineHeight={globalLineHeight}
                        handleScopedUpdate={handleScopedUpdate}
                        getEffectiveFontSettings={getEffectiveFontSettings}
                        weightOptions={weightOptions}
                        resolvedWeight={resolvedWeight}
                        isInherited={isInherited}
                        scopeFontSettings={scopeFontSettings}
                        isReference={isReference}
                        toggleFontVisibility={toggleFontVisibility}
                        showAdvanced={showAdvanced}
                        setShowAdvanced={setShowAdvanced}
                    />
                </div>
            </div>
        </div >
    );
};

export const FontCard = (props) => {
    // Wrapper to manage separation
    // Scoped Editing State
    // 'ALL' = Global updates (inherited by linked).
    // 'langId' = Specific update (overrides/clones).
    const [editScope, setEditScope] = useState('ALL');

    return <FontCardContent {...props} scope={editScope} onSetScope={setEditScope} isReference={false} highlitLanguageId={props.highlitLanguageId} />;
};

FontCard.propTypes = {
    font: PropTypes.object.isRequired,
    // Reuse implicit checking via forwarding, but minimal definition:
    isActive: PropTypes.bool,
    highlitLanguageId: PropTypes.string
    // ... or better, assign at end
};

FontCardContent.propTypes = {
    scope: PropTypes.string,
    onSetScope: PropTypes.func,
    isReference: PropTypes.bool,
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
        letterSpacing: PropTypes.number,
        color: PropTypes.string,
        parentId: PropTypes.string,
        isLangSpecific: PropTypes.bool,
        isClone: PropTypes.bool
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
    fontScales: PropTypes.object,
    lineHeight: PropTypes.number,
    updateFallbackFontOverride: PropTypes.func.isRequired,
    resetFallbackFontOverrides: PropTypes.func,
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
    readOnly: PropTypes.bool,
    highlitLanguageId: PropTypes.string,
    consolidatedIds: PropTypes.array,
    onMap: PropTypes.func // Added as it's used
};

export default FontCard;
