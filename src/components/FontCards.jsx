import { useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import FallbackFontAdder from './FallbackFontAdder';
import LanguageSingleSelectModal from './LanguageSingleSelectModal';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';
import { createFontUrl, parseFontFile } from '../services/FontLoader';

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
    isInherited = false,
    onOverride,
    onResetOverride,
    onAssign,
    readOnly = false
}) => {
    const { primaryFontOverrides, fallbackFontOverrides, letterSpacing, setLetterSpacing } = useTypo();
    const [isHovered, setIsHovered] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const languageTags = useMemo(() => {
        const tags = [];
        // Primary overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (fontId === font.id) tags.push(langId);
        });
        // Fallback overrides
        Object.entries(fallbackFontOverrides || {}).forEach(([langId, val]) => {
            if (typeof val === 'string') {
                if (val === font.id) tags.push(langId);
            } else if (val && typeof val === 'object') {
                // Check if this font (font.id) is key in the override object for this language
                if (val[font.id]) tags.push(langId);
            }
        });
        return [...new Set(tags)];
    }, [font.id, primaryFontOverrides, fallbackFontOverrides]);

    const replacePrimaryInputRef = useRef(null);

    const isPrimary = font.type === 'primary';
    const opacity = font.hidden ? 0.4 : 1;

    const effectiveWeight = getEffectiveFontSettings(font.id)?.weight ?? 400;
    const weightOptions = buildWeightSelectOptions(font);
    const resolvedWeight = resolveWeightToAvailableOption(font, effectiveWeight);

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

    const hasFooterContent = font.fontObject || (languageTags && languageTags.length > 0) || onAssign;

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
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Inherited Overlay */}

            {/* Inherited Overlay */}
            {isInherited && (
                <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between group/inherit transition-all">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Inherited from Primary
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOverride?.(); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
                    >
                        Override Styling
                    </button>
                </div>
            )}
            {isPrimary && (
                <>
                    <input
                        ref={replacePrimaryInputRef}
                        type="file"
                        className="hidden"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                                await parseFontFile(file);
                                createFontUrl(file);
                                // Note: loadFont is expected in TypoContext
                            } catch (err) {
                                console.error('Error loading font:', err);
                            } finally {
                                e.target.value = '';
                            }
                        }}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); replacePrimaryInputRef.current?.click(); }}
                        className="absolute top-4 right-4 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="Replace main font"
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a1.875 1.875 0 112.652 2.652L8.25 17.403a4.5 4.5 0 01-1.897 1.13l-2.685.895.895-2.685a4.5 4.5 0 011.13-1.897L16.862 3.487z" />
                        </svg>
                    </button>
                </>
            )}

            {(!isPrimary || font.isPrimaryOverride) && (
                <div className="absolute right-4 top-4 flex gap-2 items-center">
                    {onResetOverride && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onResetOverride(font.id); }}
                            className="text-slate-400 hover:text-indigo-600 transition-all p-1"
                            title="Reset to Inherited"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                        </button>
                    )}


                </div>
            )}

            <div className="flex gap-3 items-start">
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
                                    onChange={(e) => updateFontColor(font.id, e.target.value)}
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



            {/* Controls Section - Always Visible */}
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
                {/* Visual Settings Group */}
                <div className="space-y-2">

                    {/* Weight Control */}
                    {(isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Weight</span>
                                <span className="text-indigo-600 font-mono">{effectiveWeight}</span>
                            </div>
                            <select
                                value={resolvedWeight}
                                onChange={(e) => updateFontWeight(font.id, parseInt(e.target.value))}
                                disabled={isInherited || readOnly}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium ${isInherited || readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {weightOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Scale Control - Hidden for Primary Font */}
                    {(!isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>{font.isPrimaryOverride ? 'Rem' : 'Scale'}</span>
                                <span className="text-indigo-600 font-mono">
                                    {font.isPrimaryOverride
                                        ? (font.h1Rem || 3.75).toFixed(2)
                                        : (getEffectiveFontSettings(font.id).scale || 100) + '%'
                                    }
                                </span>
                            </div>
                            <input
                                type="range"
                                min={font.isPrimaryOverride ? 1 : 25}
                                max={font.isPrimaryOverride ? 12 : 300}
                                step={font.isPrimaryOverride ? 0.05 : 5}
                                value={font.isPrimaryOverride
                                    ? (font.h1Rem || 3.75)
                                    : (getEffectiveFontSettings(font.id).scale || 100)
                                }
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (font.isPrimaryOverride) {
                                        updateFallbackFontOverride(font.id, 'h1Rem', val);
                                    } else {
                                        updateFallbackFontOverride(font.id, 'scale', val);
                                    }
                                }}
                                disabled={isInherited || readOnly}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {/* Line Height Control - Only for Primary */}
                    {isPrimary && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Line Height</span>
                                <span className="text-indigo-600 font-mono">
                                    {globalLineHeight === 'normal' ? 'Normal' : Math.round(globalLineHeight * 100) + '%'}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="300"
                                step="5"
                                value={globalLineHeight === 'normal' ? 120 : globalLineHeight * 100}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) / 100;
                                    setGlobalLineHeight?.(val);
                                }}
                                disabled={isInherited}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {/* Letter Spacing Control - Only for Primary */}
                    {isPrimary && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Letter Spacing</span>
                                <span className="text-indigo-600 font-mono">
                                    {(isPrimary && !font.isPrimaryOverride ? (letterSpacing || 0) : (font.letterSpacing || 0)).toFixed(2)}em
                                </span>
                            </div>
                            <input
                                type="range"
                                min="-0.1"
                                max="0.5"
                                step="0.01"
                                value={isPrimary && !font.isPrimaryOverride ? (letterSpacing || 0) : (font.letterSpacing || 0)}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (isPrimary && !font.isPrimaryOverride) {
                                        setLetterSpacing(val);
                                    } else {
                                        updateFallbackFontOverride(font.id, 'letterSpacing', val);
                                    }
                                }}
                                disabled={isInherited}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}
                </div>

                {hasFooterContent && (
                    <div className="pt-1.5 flex items-center justify-between">
                        {font.fontObject && (
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.1em] hover:text-indigo-600 transition-colors"
                            >
                                <span>Advanced Settings</span>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        {/* Spacer for alignment if button is missing */}
                        {!font.fontObject && <div></div>}

                        {languageTags && languageTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 justify-end">
                                {languageTags.map(langId => (
                                    <div key={langId} className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{langId}</span>
                                        {onRemoveOverride && (
                                            <button onClick={(e) => { e.stopPropagation(); onRemoveOverride(font.id, langId); }} className="text-indigo-300 hover:text-indigo-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            onAssign && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAssign(font.id); }}
                                    className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-indigo-600 transition-all uppercase tracking-wider"
                                    title="Assign to Language"
                                    type="button"
                                >
                                    <span>ASSIGN</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                                    </svg>
                                </button>
                            )
                        )}
                    </div>
                )}
                {showAdvanced && (
                    <div className="mt-4 grid grid-cols-1 gap-4 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {['ascentOverride', 'descentOverride', 'lineGapOverride'].map((field) => (
                            <div key={field} className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                    <span>{field.replace('Override', '').replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-mono text-slate-600">{Math.round((font[field] || 0) * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="5"
                                    value={(font[field] || 0) * 100}
                                    onChange={(e) => updateFallbackFontOverride(font.id, field, parseInt(e.target.value) / 100)}
                                    disabled={isInherited || readOnly}
                                    className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-slate-400`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
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
    isInherited: PropTypes.bool,
    onOverride: PropTypes.func,
    onResetOverride: PropTypes.func,
    onAssign: PropTypes.func,
    readOnly: PropTypes.bool
};

const FontCards = ({ activeTab, readOnly = false }) => {
    const {
        fonts,
        activeFont,
        setActiveFont,
        updateFontWeight,
        toggleFontVisibility,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        removeFallbackFont,
        colors,
        setColors,
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
        setLineHeight
    } = useTypo();

    const [showAdder, setShowAdder] = useState(false);
    const [fallbackFontType, setFallbackFontType] = useState('sans-serif');
    const [assigningFontId, setAssigningFontId] = useState(null);

    const getFontDisplayName = (fontId) => {
        const font = fonts.find(f => f.id === fontId);
        if (!font) return 'Unknown Font';
        return font.name || font.fileName || 'Unknown Font';
    };

    const handleAssignLanguage = (fontId) => {
        setAssigningFontId(fontId);
    };

    const handleLanguageSelected = (langId) => {
        if (assigningFontId && langId) {
            addLanguageSpecificFont(assigningFontId, langId);
        }
        setAssigningFontId(null);
    };


    const isAllTab = activeTab === 'ALL';
    // 'primary' is the English/Global tab. It should be editable by default and show no inheritance overlay.
    const isLanguageSpecificView = !isAllTab;
    const {
        primary,
        globalPrimary,
        fontListToRender,
        unassignedFonts,
        systemFonts,
        isInheritedPrimary,
        isLanguageSpecificList
    } = useMemo(() => {
        const p = fonts.find(f => f.type === 'primary' && !f.isPrimaryOverride);
        const sFonts = fonts.filter(f => !f.fontObject);

        // Calculate Global Fallbacks (Unassigned/Inheritable)
        const validFallbacks = fonts.filter(f =>
            f.type === 'fallback' &&
            !f.isPrimaryOverride &&
            f.fontObject &&
            !f.isClone
        );

        // Get all font IDs that are assigned to any language (as overrides)
        const assignedFontIds = new Set();
        // Add fallback overrides
        Object.values(fallbackFontOverrides || {}).forEach(val => {
            if (typeof val === 'string') {
                assignedFontIds.add(val);
            } else if (val && typeof val === 'object') {
                // Add keys (Original Global Font IDs) so they appear as Targeted
                Object.keys(val).forEach(id => assignedFontIds.add(id));
                // Add values (Cloned Font IDs) - technical correctness
                Object.values(val).forEach(id => assignedFontIds.add(id));
            }
        });
        // Add primary overrides
        Object.values(primaryFontOverrides || {}).forEach(fontId => {
            if (fontId) assignedFontIds.add(fontId);
        });

        if (isAllTab) {
            // "ALL" Tab: Targeted are those assigned to ANY language
            const targeted = validFallbacks.filter(f => assignedFontIds.has(f.id));
            const unassigned = validFallbacks.filter(f => !assignedFontIds.has(f.id));

            return {
                primary: p,
                globalPrimary: p,
                fontListToRender: targeted, // "Targeted" list
                unassignedFonts: unassigned, // "Unassigned" list
                systemFonts: sFonts,
                isInheritedPrimary: false,
                isLanguageSpecificList: false
            };
        }

        // Language specific view (includes 'primary'/English)
        const overrideFontId = primaryFontOverrides[activeTab];
        const overrideFont = fonts.find(f => f.id === overrideFontId);

        // Get fonts strictly assigned to this language
        const rawOverrides = fallbackFontOverrides[activeTab] || {};

        const languageSpecificFonts = [];
        const overriddenOriginalIds = new Set();

        if (typeof rawOverrides === 'string') {
            // Handle single font override (Legacy or Direct Assignment)
            const f = fonts.find(font => font.id === rawOverrides);
            if (f) {
                languageSpecificFonts.push(f);
            }
        } else {
            // Handle object map (Cloning/Granular Assignment)
            const languageOverrides = rawOverrides;
            Object.entries(languageOverrides).forEach(([origId, overrideId]) => {
                const f = fonts.find(font => font.id === overrideId);
                if (f) {
                    languageSpecificFonts.push(f);
                    overriddenOriginalIds.add(origId);
                }
            });
        }

        // Inherited Global Fallbacks: Valid globals that are NOT overridden in this language AND NOT targeted elsewhere
        const inheritedFallbacks = validFallbacks.filter(f => !overriddenOriginalIds.has(f.id) && !assignedFontIds.has(f.id));

        return {
            primary: overrideFont || p,
            globalPrimary: p,
            isInheritedPrimary: !overrideFont && activeTab !== 'primary',
            systemFonts: sFonts,
            fontListToRender: languageSpecificFonts,
            unassignedFonts: inheritedFallbacks, // Show inherited global fallbacks
            isLanguageSpecificList: true
        };
    }, [fonts, activeTab, isAllTab, primaryFontOverrides, fallbackFontOverrides]);

    return (
        <div className="pb-6 space-y-4">
            {/* Primary Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Primary Font
                    </span>
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
                        onResetOverride={(isLanguageSpecificView && primary.id !== globalPrimary.id) ? () => removeFallbackFont(primary.id) : null}
                        readOnly={readOnly}
                    />
                )}

                {/* All Fallback Scale Adjust - only show on ALL tab */}
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
                const fallbackSection = unassignedFonts && unassignedFonts.length > 0 && (
                    <div className="space-y-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                FALLBACK FONTS
                            </span>
                            <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        {unassignedFonts.map((font) => (
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
                                onAssign={handleAssignLanguage}
                                onResetOverride={null}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                );

                const targetedSection = (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {isAllTab ? 'Targeted Fonts' : 'Targeted Font'}
                            </span>
                        </div>
                        <div className="h-px bg-slate-100 mb-3"></div>

                        {fontListToRender.length === 0 && isAllTab && (
                            <div className="text-xs text-slate-400 italic px-2 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                No fonts have been targeted yet.
                            </div>
                        )}

                        {fontListToRender.map((font) => {
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
                                    isInherited={false}
                                    onOverride={null}
                                    onAssign={handleAssignLanguage}
                                    onResetOverride={null}
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
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Fonts</span>
                    <div className="relative w-3.5 h-3.5 rounded-full border border-slate-200 shadow-sm overflow-hidden">
                        <div className="absolute inset-0" style={{ backgroundColor: colors.missing }}></div>
                        <input
                            type="color"
                            value={colors.missing}
                            onChange={(e) => setColors(prev => ({ ...prev, missing: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                {systemFonts && systemFonts.length > 0 && (
                    <div className="space-y-3">
                        {systemFonts.map((font) => (
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
                            />
                        ))}
                    </div>
                )}

                {isAllTab && (
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => setFallbackFontType('sans-serif')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${fallbackFontType === 'sans-serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Sans-serif
                        </button>
                        <button
                            onClick={() => setFallbackFontType('serif')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${fallbackFontType === 'serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Serif
                        </button>
                    </div>
                )}
            </div>

            {
                isAllTab && !readOnly && (
                    <>
                        <button
                            onClick={() => setShowAdder(!showAdder)}
                            className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl p-3 text-xs font-bold text-indigo-600 transition-all flex items-center justify-center gap-2 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-300 ${showAdder ? 'rotate-45' : ''}`}>
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            <span>{showAdder ? 'Cancel' : 'Add Fallback Font'}</span>
                        </button>

                        {showAdder && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <FallbackFontAdder onClose={() => setShowAdder(false)} onAdd={() => setShowAdder(false)} />
                            </div>
                        )}
                    </>
                )
            }

            {
                assigningFontId && (
                    <LanguageSingleSelectModal
                        title="Assign Font to Language"
                        subtitle={<span>Assigning: <strong>{getFontDisplayName(assigningFontId)}</strong></span>}
                        currentId={null}
                        onSelect={handleLanguageSelected}
                        onClose={() => setAssigningFontId(null)}
                    />
                )
            }
        </div >
    );
};

FontCards.propTypes = {
    activeTab: PropTypes.string.isRequired,
    readOnly: PropTypes.bool
};

export default FontCards;
