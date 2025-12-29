import { useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import FallbackFontAdder from './FallbackFontAdder';
import LanguageSingleSelectModal from './LanguageSingleSelectModal';
import FontSelectionModal from './FontSelectionModal';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';
import { createFontUrl, parseFontFile } from '../services/FontLoader';
import InfoTooltip from './InfoTooltip';

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
    onAssign,
    readOnly = false
}) => {
    const { primaryFontOverrides, fallbackFontOverrides, letterSpacing, setLetterSpacing } = useTypo();
    // const [isHovered, setIsHovered] = useState(false);
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
        >
            {/* Inherited Overlay */}

            {isInherited && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 rounded-xl backdrop-blur-[1px] transition-all">
                    <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-3">
                        Inherited from Primary
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOverride?.(); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide"
                    >
                        OVERRIDE STYLE
                    </button>
                </div>
            )}
            {isPrimary && !isInherited && (
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
                <div className="absolute right-2 top-2 flex gap-2 items-center">
                    {onResetOverride && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onResetOverride(font.id); }}
                            className="text-slate-400 hover:text-rose-500 transition-all p-1"
                            title="Detarget font"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-4 h-4">
                                <path d="M198.63,57.37a32,32,0,0,0-45.19-.06L141.79,69.52a8,8,0,0,1-11.58-11l11.72-12.29a1.59,1.59,0,0,1,.13-.13,48,48,0,0,1,67.88,67.88,1.59,1.59,0,0,1-.13.13l-12.29,11.72a8,8,0,0,1-11-11.58l12.21-11.65A32,32,0,0,0,198.63,57.37ZM114.21,186.48l-11.65,12.21a32,32,0,0,1-45.25-45.25l12.21-11.65a8,8,0,0,0-11-11.58L46.19,141.93a1.59,1.59,0,0,0-.13.13,48,48,0,0,0,67.88,67.88,1.59,1.59,0,0,0,.13-.13l11.72-12.29a8,8,0,1,0-11.58-11ZM216,152H192a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16ZM40,104H64a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm120,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V192A8,8,0,0,0,160,184ZM96,72a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V64A8,8,0,0,0,96,72Z" />
                            </svg>
                        </button>
                    )}


                </div>
            )}

            <div className={`flex gap-3 items-start ${isInherited ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''}`}>
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
            <div className={`mt-2 pt-2 border-t border-slate-100 space-y-3 ${isInherited ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''}`} onClick={e => e.stopPropagation()}>
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

                    {/* Scale Control - Hidden for Primary Font and Primary Overrides */}
                    {(!isPrimary && !font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Size-Adjust</span>
                                <span className="text-indigo-600 font-mono">
                                    {(getEffectiveFontSettings(font.id).scale || 100) + '%'}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="25"
                                max="300"
                                step="5"
                                value={(getEffectiveFontSettings(font.id).scale || 100)}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateFallbackFontOverride(font.id, 'scale', val);
                                }}
                                disabled={isInherited || readOnly}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {/* Line Height Control - For Primary and Primary Overrides */}
                    {(isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Line Height</span>
                                <div className="flex items-center gap-0.5">
                                    <div className="flex items-center mr-2 border-r border-slate-100 pr-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={(() => {
                                                const lh = font.isPrimaryOverride
                                                    ? (font.lineHeight !== undefined && font.lineHeight !== null ? font.lineHeight : globalLineHeight)
                                                    : globalLineHeight;
                                                // Convert 'normal' to 1.2 for calculation if needed, though usually 'normal' is handled. 
                                                // If 'normal' treat as 1.2 * baseFontSize
                                                const multiplier = lh === 'normal' ? 1.2 : lh;
                                                const baseSize = getEffectiveFontSettings(font.id)?.baseFontSize || 60;
                                                return Math.round(multiplier * baseSize);
                                            })()}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (isNaN(val)) return;
                                                const baseSize = getEffectiveFontSettings(font.id)?.baseFontSize || 60;
                                                const newLh = val / baseSize;
                                                // Safety clamp or check if needed?
                                                if (font.isPrimaryOverride) {
                                                    updateFallbackFontOverride(font.id, 'lineHeight', newLh);
                                                } else {
                                                    setGlobalLineHeight?.(newLh);
                                                }
                                            }}
                                            className="w-10 bg-transparent text-right text-indigo-600 font-mono text-[10px] outline-none focus:bg-indigo-50 rounded px-0.5 border-none p-0 appearance-none m-0"
                                        />
                                        <span className="text-indigo-400 font-mono text-[8px] ml-0.5">px</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="50"
                                        max="300"
                                        step="1"
                                        value={(() => {
                                            const lh = font.isPrimaryOverride
                                                ? (font.lineHeight !== undefined && font.lineHeight !== null ? font.lineHeight : globalLineHeight)
                                                : globalLineHeight;
                                            return lh === 'normal' ? 120 : Math.round(lh * 100);
                                        })()}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (isNaN(val)) return;
                                            const decimal = val / 100;
                                            if (font.isPrimaryOverride) {
                                                updateFallbackFontOverride(font.id, 'lineHeight', decimal);
                                            } else {
                                                setGlobalLineHeight?.(decimal);
                                            }
                                        }}
                                        className="w-8 bg-transparent text-right text-indigo-600 font-mono text-[10px] outline-none focus:bg-indigo-50 rounded px-0.5 border-none p-0 appearance-none m-0"
                                    />
                                    <span className="text-indigo-600 font-mono">%</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="300"
                                step="5"
                                value={(() => {
                                    const lh = font.isPrimaryOverride
                                        ? (font.lineHeight !== undefined && font.lineHeight !== null ? font.lineHeight : globalLineHeight)
                                        : globalLineHeight;
                                    return lh === 'normal' ? 120 : lh * 100;
                                })()}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) / 100;
                                    if (font.isPrimaryOverride) {
                                        updateFallbackFontOverride(font.id, 'lineHeight', val);
                                    } else {
                                        setGlobalLineHeight?.(val);
                                    }
                                }}
                                disabled={isInherited}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                            />
                        </div>
                    )}

                    {/* Letter Spacing Control - For Primary and Primary Overrides */}
                    {(isPrimary || font.isPrimaryOverride) && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Letter Spacing</span>
                                <div className="flex items-center gap-0.5">
                                    <div className="flex items-center mr-2 border-r border-slate-100 pr-2">
                                        <input
                                            type="number"
                                            step="1"
                                            value={(() => {
                                                const ls = isPrimary && !font.isPrimaryOverride ? (letterSpacing || 0) : (font.letterSpacing !== undefined ? font.letterSpacing : (letterSpacing || 0));
                                                const baseSize = getEffectiveFontSettings(font.id)?.baseFontSize || 60;
                                                return Math.round(ls * baseSize);
                                            })()}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (isNaN(val)) return;
                                                const baseSize = getEffectiveFontSettings(font.id)?.baseFontSize || 60;
                                                const newLs = val / baseSize;
                                                if (isPrimary && !font.isPrimaryOverride) {
                                                    setLetterSpacing(newLs);
                                                } else {
                                                    updateFallbackFontOverride(font.id, 'letterSpacing', newLs);
                                                }
                                            }}
                                            className="w-10 bg-transparent text-right text-indigo-600 font-mono text-[10px] outline-none focus:bg-indigo-50 rounded px-0.5 border-none p-0 appearance-none m-0"
                                        />
                                        <span className="text-indigo-400 font-mono text-[8px] ml-0.5">px</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="-0.1"
                                        max="0.5"
                                        step="0.01"
                                        value={isPrimary && !font.isPrimaryOverride ? (letterSpacing || 0) : (font.letterSpacing !== undefined ? font.letterSpacing : (letterSpacing || 0))}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (isNaN(val)) return;
                                            if (isPrimary && !font.isPrimaryOverride) {
                                                setLetterSpacing(val);
                                            } else {
                                                updateFallbackFontOverride(font.id, 'letterSpacing', val);
                                            }
                                        }}
                                        className="w-10 bg-transparent text-right text-indigo-600 font-mono text-[10px] outline-none focus:bg-indigo-50 rounded px-0.5 border-none p-0 appearance-none m-0"
                                    />
                                    <span className="text-indigo-600 font-mono">em</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="-0.1"
                                max="0.5"
                                step="0.01"
                                value={isPrimary && !font.isPrimaryOverride ? (letterSpacing || 0) : (font.letterSpacing !== undefined ? font.letterSpacing : (letterSpacing || 0))}
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
                    <div className="pt-2 flex flex-col gap-2.5">
                        {/* Language Tags (Top Row) */}
                        {languageTags && languageTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {languageTags.map(langId => {
                                    const isTagActive = langId === activeTab;
                                    return (
                                        <button
                                            key={langId}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectLanguage?.(langId);
                                            }}
                                            className={`
                                                flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer border
                                                ${isTagActive
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-500 hover:bg-indigo-100'
                                                }
                                            `}
                                        >
                                            <span className="text-[10px] font-bold uppercase">{langId}</span>
                                            {onRemoveOverride && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveOverride(font.id, langId);
                                                    }}
                                                    className={`p-0.5 transition-colors ${isTagActive ? 'text-indigo-200 hover:text-white' : 'text-indigo-300 hover:text-indigo-600'}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Controls Row (Bottom Row) */}
                        <div className="flex items-center justify-between gap-4">
                            {font.fontObject ? (
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.1em] hover:text-indigo-600 transition-colors whitespace-nowrap"
                                >
                                    <span>Advanced Settings</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            ) : <div></div>}

                            {(!languageTags || languageTags.length === 0) && onAssign && (
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
                            )}
                        </div>
                    </div>
                )}
                {showAdvanced && (
                    <div className="mt-2 grid grid-cols-1 gap-2 pt-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {['ascentOverride', 'descentOverride', 'lineGapOverride'].map((field) => (
                            <div key={field} className="space-y-1">
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
    onSelectLanguage: PropTypes.func,
    activeTab: PropTypes.string,
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
        addFallbackFonts,
        addStrictlyTargetedFonts,
        // removeFallbackFont, // Unused
        untargetFont,
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
        setLineHeight,
        setActiveConfigTab
    } = useTypo();

    const [showAdder, setShowAdder] = useState(false);
    const [fallbackFontType, setFallbackFontType] = useState('sans-serif');
    const [assigningFontId, setAssigningFontId] = useState(null);

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
            (fonts || []).map(f => (f.fileName || f.name || "").toLowerCase())
        );

        const uniqueFiles = [];
        let duplicateCount = 0;

        Array.from(files).forEach(file => {
            if (existingFontNames.has(file.name.toLowerCase())) {
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
                    addStrictlyTargetedFonts(validFonts, activeTab);
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
        // isLanguageSpecificList // Unused
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
            let unassigned = validFallbacks.filter(f => !assignedFontIds.has(f.id));

            // Deduplicate Unassigned Fonts:
            // 1. Remove if filename matches any TARGETED font (prevent "Ghost" duplicates)
            // 2. Remove duplicates within unassigned list (keep first)
            const targetedNames = new Set(targeted.map(f => (f.fileName || f.name || "").toLowerCase()));
            const seenUnassignedNames = new Set();

            unassigned = unassigned.filter(f => {
                const name = (f.fileName || f.name || "").toLowerCase();
                if (targetedNames.has(name)) return false;
                if (seenUnassignedNames.has(name)) return false;
                seenUnassignedNames.add(name);
                return true;
            });

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
        // Also apply deduplication to inherited fallbacks to be safe
        let inheritedFallbacks = validFallbacks.filter(f => !overriddenOriginalIds.has(f.id) && !assignedFontIds.has(f.id));

        // Exclude fonts that are already in the "Targeted" list for this language
        // This handles cases where a font is manually assigned (thus in languageSpecificFonts)
        // AND it exists in the global fallback list. We don't want to show it again as "Auto".
        const targetedNames = new Set(languageSpecificFonts.map(f => (f.fileName || f.name || "").toLowerCase()));

        const seenInheritedNames = new Set();
        inheritedFallbacks = inheritedFallbacks.filter(f => {
            const name = (f.fileName || f.name || "").toLowerCase();
            // Check against specific targeted fonts for this language
            if (targetedNames.has(name)) return false;

            if (seenInheritedNames.has(name)) return false;
            seenInheritedNames.add(name);
            return true;
        });

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
                        onResetOverride={(isLanguageSpecificView && primary.id !== globalPrimary.id) ? () => untargetFont(primary.id) : null}
                        onSelectLanguage={setActiveConfigTab}
                        activeTab={activeTab}
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
                    <div className="space-y-3 pb-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                FALLBACK FONTS
                            </span>
                            <InfoTooltip
                                content={
                                    <span>
                                        <strong className="block mb-2 text-indigo-300">Styling Limitations</strong>
                                        Properties like `line - height` and `letter - spacing` apply to the entire element, meaning primary and fallback fonts share them. To style scripts independently, you must override the primary font or use separate elements (e.g., spans).
                                        <br /><br />
                                        <strong className="block mb-2 text-indigo-300">Browser Compatibility</strong>
                                        Advanced `@font-face` metrics like `ascent - override`, `descent - override`, and `line - gap - override` are currently not supported in **Safari**. Use these with caution if your target audience uses macOS or iOS.
                                    </span>
                                }
                            />
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
                                onSelectLanguage={setActiveConfigTab}
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
                                        {isAllTab ? 'Targeted Fonts' : 'Targeted Font'}
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
                                <span>No font assigned</span>

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
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowAddMenu(false)}
                                            />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                                    // Enable deletion (unassign/remove clone) in language-specific view
                                    onResetOverride={(!isAllTab && activeTab !== 'primary') ? untargetFont : null}
                                    onSelectLanguage={setActiveConfigTab}
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
                                onSelectLanguage={setActiveConfigTab}
                                activeTab={activeTab}
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

            {showFontSelector && (
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
            )}
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
    readOnly: PropTypes.bool
};

export default FontCards;
