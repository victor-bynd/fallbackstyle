import { useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import FallbackFontAdder from './FallbackFontAdder';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createFontUrl, parseFontFile } from '../services/FontLoader';
import { groupAndSortFonts } from '../utils/fontSortUtils';

export const SortableFontCard = ({
    font,
    isActive,
    globalWeight,
    globalLineHeight,
    globalLetterSpacing,
    setGlobalLineHeight,
    setGlobalLetterSpacing,
    hasLineHeightOverrides,
    lineHeightOverrideCount,
    resetAllLineHeightOverrides,
    toggleFallbackLineHeightAuto,
    getFontColor,
    updateFontColor,
    getEffectiveFontSettings,
    fontScales,
    lineHeight,
    updateFallbackFontOverride,
    resetFallbackFontOverrides,
    setActiveFont,
    handleRemove,
    updateFontWeight,
    toggleFontVisibility,
    isDraggable = true,
    onRemoveOverride,
    isInherited = false,
    onOverride
}) => {
    const { colors, baseFontSize, primaryFontOverrides, fallbackFontOverrides, setFontScales, letterSpacing, setLetterSpacing } = useTypo();
    const [isHovered, setIsHovered] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const languageTags = useMemo(() => {
        const tags = [];
        // Primary overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (fontId === font.id) tags.push(langId);
        });
        // Fallback overrides
        Object.entries(fallbackFontOverrides || {}).forEach(([langId, fontId]) => {
            if (fontId === font.id) tags.push(langId);
        });
        return [...new Set(tags)];
    }, [font.id, primaryFontOverrides, fallbackFontOverrides]);

    const replacePrimaryInputRef = useRef(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: font.id,
        disabled: !isDraggable
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : (font.hidden ? 0.4 : 1),
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };

    const isPrimary = font.type === 'primary';
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                bg-white rounded-xl border transition-all relative
                p-4 shadow-sm
                ${isPrimary ? 'ring-1 ring-slate-200' : 'cursor-pointer hover:shadow-md'}
                ${isActive && !isPrimary
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                }
            `}
        >
            {/* Inherited Overlay */}

            {isInherited && (
                <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center group/inherit">
                    <div className="flex flex-col items-center gap-2">
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Inherited from Primary
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onOverride?.(); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow-sm transition-all transform hover:scale-105"
                        >
                            Override Styling
                        </button>
                    </div>
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
                                const { font: parsedFont, metadata } = await parseFontFile(file);
                                const url = createFontUrl(file);
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

            {!isPrimary && (
                <button
                    onClick={(e) => handleRemove(e, font.id)}
                    className={`absolute right-4 text-slate-400 hover:text-rose-500 transition-all p-1 top-4
                        ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                    `}
                    title="Remove font"
                    type="button"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            )}

            <div className="flex gap-3 items-start">
                {isDraggable && (
                    <div
                        className="text-slate-300 cursor-move flex-shrink-0 hover:text-indigo-600 transition-colors p-0.5 mt-0.5"
                        {...attributes}
                        {...listeners}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M7 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z" />
                        </svg>
                    </div>
                )}
                <div className="flex-1 min-w-0 pr-8">
                    <div className="font-mono text-[13px] font-bold text-slate-800 truncate mb-1">
                        {displayName}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <div className="relative w-3.5 h-3.5 flex-shrink-0 rounded-full overflow-hidden border border-slate-200">
                            <div className="absolute inset-0" style={{ backgroundColor: getFontColor(font.id) }} />
                            <input
                                type="color"
                                value={getFontColor(font.id)}
                                onChange={(e) => updateFontColor(font.id, e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        {font.fontObject && <span>{font.fontObject.numGlyphs} glyphs</span>}
                        {extension && <span className="uppercase font-bold text-slate-400 bg-slate-100 px-1 rounded">{extension}</span>}
                    </div>
                </div>
            </div>

            {languageTags && languageTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
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
            )}

            {/* Controls Section - Always Visible */}
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
                {/* Visual Settings Group */}
                <div className="space-y-2">

                    {/* Weight Control */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Weight</span>
                            <span className="text-indigo-600 font-mono">{effectiveWeight}</span>
                        </div>
                        <select
                            value={resolvedWeight}
                            onChange={(e) => updateFontWeight(font.id, parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                        >
                            {weightOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

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
                                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    )}

                    {/* Line Height Control */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Line Height</span>
                            <span className="text-indigo-600 font-mono">
                                {isPrimary
                                    ? (globalLineHeight === 'normal' ? 'Normal' : Math.round(globalLineHeight * 100) + '%')
                                    : (font.lineHeight ? Math.round(font.lineHeight * 100) + '%' : 'Default')
                                }
                            </span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="300"
                            step="5"
                            value={isPrimary
                                ? (globalLineHeight === 'normal' ? 120 : globalLineHeight * 100)
                                : ((font.lineHeight || 1.2) * 100)}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) / 100;
                                if (isPrimary) setGlobalLineHeight?.(val);
                                else updateFallbackFontOverride(font.id, 'lineHeight', val);
                            }}
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    {/* Letter Spacing Control */}
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
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.1em] hover:text-indigo-600 transition-colors pt-2"
                    >
                        <span>Advanced Settings</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
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
                                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
};

SortableFontCard.propTypes = {
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
    handleRemove: PropTypes.func.isRequired,
    updateFontWeight: PropTypes.func.isRequired,
    toggleFontVisibility: PropTypes.func.isRequired,
    languageTags: PropTypes.arrayOf(PropTypes.string),
    isDraggable: PropTypes.bool,
    onRemoveOverride: PropTypes.func,
    isInherited: PropTypes.bool,
    onOverride: PropTypes.func
};

const FontTabs = ({ activeTab }) => {
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
        toggleGlobalLineHeightAuto,
        getFontColor,
        updateFontColor,
        getEffectiveFontSettings,
        fallbackFontOverrides,
        primaryFontOverrides,
        addLanguageSpecificPrimaryFont,
        setFontScales,
        setIsFallbackLinked,
        setLineHeight
    } = useTypo();

    const [showAdder, setShowAdder] = useState(false);
    const [fallbackFontType, setFallbackFontType] = useState('sans-serif');

    const handleRemove = (e, fontId) => {
        e.stopPropagation();
        if (confirm('Remove this font?')) {
            removeFallbackFont(fontId);
        }
    };

    const handleRemoveOverride = (fontId, langId) => {
        removeFallbackFont(fontId);
    };

    const isPrimaryTab = activeTab === 'primary';

    const {
        primary,
        globalFallbackFonts,
        systemFonts,
        languageOverride, // The specific override for activeTab if it's a language
        isInheritedPrimary
    } = useMemo(() => {
        const p = fonts.find(f => f.type === 'primary' && !f.isPrimaryOverride);
        const sFonts = fonts.filter(f => !f.fontObject);

        // Get all font IDs that are assigned to any language
        const assignedFontIds = new Set(Object.values(fallbackFontOverrides || {}));

        // Filter out fonts that are:
        // - Primary overrides
        // - System fonts (no fontObject)
        // - Language-specific (isLangSpecific flag)
        // - Assigned to any language (in fallbackFontOverrides map)
        const gFallbacks = fonts.filter(f =>
            f.type === 'fallback' &&
            !f.isPrimaryOverride &&
            f.fontObject &&
            !f.isLangSpecific &&
            !assignedFontIds.has(f.id)
        );

        if (isPrimaryTab) {
            return { primary: p, globalFallbackFonts: gFallbacks, systemFonts: sFonts };
        }

        // Language specific view
        const overrideFontId = primaryFontOverrides[activeTab];
        const overrideFont = fonts.find(f => f.id === overrideFontId);

        // Find language fallback if any
        const langFallbackId = fallbackFontOverrides[activeTab];
        const langFallback = fonts.find(f => f.id === langFallbackId);

        return {
            primary: overrideFont || p,
            isInheritedPrimary: !overrideFont,
            languageOverride: langFallback,
            systemFonts: sFonts,
            globalFallbackFonts: []
        };
    }, [fonts, activeTab, isPrimaryTab, primaryFontOverrides, fallbackFontOverrides]);

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
                    <SortableFontCard
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
                        handleRemove={handleRemove}
                        updateFontWeight={updateFontWeight}
                        toggleFontVisibility={toggleFontVisibility}
                        isDraggable={false}
                        isInherited={isInheritedPrimary}
                        onOverride={() => addLanguageSpecificPrimaryFont(activeTab)}
                    />
                )}
            </div>

            {/* Language Fallback Section */}
            {!isPrimaryTab && languageOverride && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language Fallback</span>
                        <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                    <SortableFontCard
                        font={languageOverride}
                        isActive={activeFont === languageOverride.id}
                        getFontColor={getFontColor}
                        updateFontColor={updateFontColor}
                        getEffectiveFontSettings={getEffectiveFontSettings}
                        fontScales={fontScales}
                        lineHeight={lineHeight}
                        updateFallbackFontOverride={updateFallbackFontOverride}
                        resetFallbackFontOverrides={resetFallbackFontOverrides}
                        setActiveFont={setActiveFont}
                        handleRemove={handleRemove}
                        updateFontWeight={updateFontWeight}
                        toggleFontVisibility={toggleFontVisibility}
                        isDraggable={false}
                    />
                </div>
            )}

            {/* Global Fallbacks Section (Only in Primary tab) */}
            {isPrimaryTab && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Fallbacks</span>
                        {(fontScales.fallback !== 100) && (
                            <button
                                onClick={() => {
                                    setFontScales(prev => ({ ...prev, fallback: 100 }));
                                    setIsFallbackLinked(false);
                                }}
                                className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                                title="Reset all global fallbacks"
                                type="button"
                            >
                                <span className="text-[10px] font-bold">RESET ALL</span>
                                <span className="text-xs">↺</span>
                            </button>
                        )}
                    </div>
                    <div className="h-px bg-slate-100 mb-3"></div>

                    {/* Global Fallback Size Adjust */}
                    <div className="px-1 pb-2">
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                            <span>Global Scale Adjust</span>
                            <span className="text-indigo-600 font-mono">{fontScales.fallback}%</span>
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
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-4"
                        />
                    </div>

                    {globalFallbackFonts.map((font) => (
                        <SortableFontCard
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
                            handleRemove={handleRemove}
                            updateFontWeight={updateFontWeight}
                            toggleFontVisibility={toggleFontVisibility}
                        />
                    ))}
                </div>
            )}

            {/* System Default */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <div className="relative w-3.5 h-3.5 rounded-full border border-slate-200 shadow-sm overflow-hidden">
                        <div className="absolute inset-0" style={{ backgroundColor: colors.missing }}></div>
                        <input
                            type="color"
                            value={colors.missing}
                            onChange={(e) => setColors(prev => ({ ...prev, missing: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                {systemFonts && systemFonts.length > 0 && (
                    <div className="space-y-3">
                        {systemFonts.map((font) => (
                            <SortableFontCard
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
                                handleRemove={handleRemove}
                                updateFontWeight={updateFontWeight}
                                toggleFontVisibility={toggleFontVisibility}
                                isDraggable={false}
                            />
                        ))}
                    </div>
                )}

                {isPrimaryTab && (
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

            {isPrimaryTab && (
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
            )}
        </div>
    );
};

FontTabs.propTypes = {
    activeTab: PropTypes.string.isRequired
};

export default FontTabs;
