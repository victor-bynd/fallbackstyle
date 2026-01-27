import { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useFontManagement } from '../../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../../shared/context/useLanguageMapping';
import { useTypography } from '../../../shared/context/useTypography';
import { useUI } from '../../../shared/context/UIContext';
import { useFontStack } from '../../../shared/hooks/useFontStack';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../../../shared/utils/weightUtils';
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
    // duplicate removed
    // unused onRemoveOverride removed
    // unused onSelectLanguage removed
    activeTab,
    isInherited = false,
    onOverride,
    onResetOverride,
    onMap,
    setHighlitLanguageId,
    readOnly = false,
    // unused fontScales removed
    // duplicate removed
    // unused lineHeight removed

    // unused setActiveFont removed
    consolidatedIds = null,

    // NEW PROPS
    scope,
    onSetScope,
    isReference = false,
    highlitLanguageId,
    suppressInheritedOverlay = false
}) => {
    // Font Management Context
    const {
        fonts,
        toggleFontVisibility,
        addLanguageSpecificFont,
        updateFontProperty,
        updateLanguageSpecificSetting,
    } = useFontManagement();

    // Language Mapping Context
    const {
        primaryLanguages,
        primaryFontOverrides,
        fallbackFontOverrides,
        mapLanguageToFont,
        addLanguageSpecificPrimaryFont,
    } = useLanguageMapping();

    // Typography Context
    const {
        setLetterSpacing,
        setBaseFontSize,
        setBaseRem,
        setWeight,
        baseRem: contextBaseRem,
    } = useTypography();

    const { activeConfigTab, setActiveConfigTab } = useUI();
    const { buildFallbackFontStackForStyle } = useFontStack();
    const baseRem = contextBaseRem || 16;
    const [showAdvanced, setShowAdvanced] = useState(false);
    // unused state removed


    // Internal state management removed as component is controlled
    useEffect(() => {
        if (!activeConfigTab || activeConfigTab === 'ALL') {
            if (onSetScope) onSetScope('ALL');
        }
        // Additional sync logic handled by parent or activeConfigTab effect below
    }, [activeConfigTab, onSetScope]);

    const editScope = scope !== undefined ? scope : 'ALL';
    // unused setEditScope removed



    const idsToCheck = useMemo(() => consolidatedIds || [font.id], [consolidatedIds, font.id]);

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
    }, [idsToCheck, primaryFontOverrides, fallbackFontOverrides, font.type, font.isPrimaryOverride, primaryLanguages]);

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
                'fontSizeAdjust',
                'baseFontSize'
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

    // MERGED VIEW REMOVED - We now always want to see "GLOBAL" if any language is mapped.

    // Sync editScope with activeConfigTab (Global Selection)
    useEffect(() => {
        if (!activeConfigTab || activeConfigTab === 'ALL') {
            onSetScope('ALL');
            return;
        }

        if (activeConfigTab === 'primary') {
            // Find if this card has a tag for the specifically highlighted primary language
            if (highlitLanguageId && languageTags.includes(highlitLanguageId)) {
                onSetScope(highlitLanguageId);
            } else {
                // Otherwise find the first primary language tag this card has
                const firstPrimary = languageTags.find(tag => primaryLanguages.includes(tag));
                if (firstPrimary) {
                    onSetScope(firstPrimary);
                } else {
                    onSetScope('ALL');
                }
            }
            return;
        }

        // If a specific language is active
        if (languageTags.includes(activeConfigTab)) {
            // Explicit match (Override already exists or Primary Language explicit tag)
            onSetScope(activeConfigTab);
        } else {
            // Implicit Scope Detection:
            // If the active tab/language uses this font implicitly (inheritance), we allow setting the scope to it.
            // This enables "Write-on-Modify" (Forking) for the Primary Font.

            let isImplicitlyLinked = false;

            // Check if this is the Global Primary Font
            // We allow scoping to the active language regardless of whether an override ALREADY exists or not.
            // This ensures that:
            // 1. If no override exists, we fork/clone (Implicit).
            // 2. If override WAS just created (during drag), we STAY scoped to it (don't revert to ALL).
            if (font.type === 'primary' && !font.isPrimaryOverride) {
                isImplicitlyLinked = true;
            }

            if (isImplicitlyLinked) {
                onSetScope(activeConfigTab);
            } else {
                onSetScope('ALL');
            }
        }
    }, [activeConfigTab, highlitLanguageId, languageTags, primaryLanguages, onSetScope, font.type, font.isPrimaryOverride, primaryFontOverrides, font.isClone]);

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
        // Map UI property names to font object property names if needed
        let targetProperty = property;
        if (property === 'weight') targetProperty = 'weightOverride';

        if (editScope === 'ALL') {
            // Global Update: Update the font object directly in FontManagementContext
            updateFontProperty(font.id, targetProperty, value);

            // SYNC: Also update global Typography settings for primary font if applicable
            if (font.type === 'primary' && !font.isPrimaryOverride) {
                if (property === 'lineHeight') {
                    setGlobalLineHeight?.(value);
                } else if (property === 'letterSpacing') {
                    setLetterSpacing?.(value);
                } else if (property === 'baseFontSize') {
                    setBaseFontSize?.(value);
                    setBaseRem?.(value);
                } else if (property === 'weight') {
                    setWeight?.(value);
                }
            }
        } else {
            // Scoped Update (Specific Language)
            // Use updateLanguageSpecificSetting which find the clone for this font and language
            updateLanguageSpecificSetting(font.id, editScope, targetProperty, value);
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
    const isLineHeightLocked = useMemo(() => {
        if (editScope === 'ALL') return false;

        // Check if any fallback font for this scope (language) has metric overrides
        // We use 'primary' style as the default context context for checking fallbacks relative to the primary font card
        const stack = buildFallbackFontStackForStyle('primary', editScope);

        return stack.some(f => {
            const s = f.settings;
            return s && (
                (s.lineGapOverride !== undefined && s.lineGapOverride !== '') ||
                (s.ascentOverride !== undefined && s.ascentOverride !== '') ||
                (s.descentOverride !== undefined && s.descentOverride !== '')
            );
        });
    }, [editScope, buildFallbackFontStackForStyle]);
    const effectiveReadOnly = readOnly && !isLineHeightLocked;



    // Determine available tabs
    // unused showTabs removed

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
                {(isInherited || isScopeInherited) && !isLineHeightLocked && !suppressInheritedOverlay && (
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

                {/* Top Right Controls (Hide/Unmap) */}
                <div className="absolute right-2 top-2 flex gap-2 items-center z-30">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFontVisibility(font.id);
                        }}
                        className={`p-1 rounded-md transition-colors ${font.hidden
                            ? 'text-red-500 hover:text-red-700 bg-red-50'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                        title={font.hidden ? "Show Font" : "Hide Font"}
                        type="button"
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

                    {/* Unmap / Reset Override Button */}
                    {(!isPrimary || font.isPrimaryOverride) && onResetOverride && (
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

                <FontCardHeader
                    font={font}
                    isPrimary={isPrimary}
                    onResetOverride={onResetOverride}
                    getFontColor={getFontColor}
                    updateFontColor={updateFontColor}
                    isInherited={isInherited}
                    isLineHeightLocked={isLineHeightLocked}
                    readOnly={effectiveReadOnly}
                />

                <FontCardTabs
                    languageTags={languageTags}
                    editScope={editScope}
                    onSetScope={onSetScope}
                    setActiveConfigTab={setActiveConfigTab}
                    setHighlitLanguageId={setHighlitLanguageId}
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

                <div className={`mt-2 pt-2 border-t border-slate-100 space-y-3 ${((isInherited || isScopeInherited) && !isLineHeightLocked) ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''}`} onClick={e => e.stopPropagation()}>
                    <FontCardSettings
                        isPrimary={isPrimary}
                        font={font}
                        editScope={editScope}
                        baseRem={baseRem}
                        setBaseRem={setBaseRem}
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
                        showAdvanced={showAdvanced}
                        setShowAdvanced={setShowAdvanced}
                        isLineHeightLocked={isLineHeightLocked}
                        readOnly={effectiveReadOnly}
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

    return <FontCardContent {...props} scope={editScope} onSetScope={setEditScope} isReference={false} highlitLanguageId={props.highlitLanguageId} suppressInheritedOverlay={props.suppressInheritedOverlay} />;
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
