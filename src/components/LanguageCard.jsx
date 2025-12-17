import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import { languageCharacters } from '../data/languageCharacters';

const LanguageCard = ({ language }) => {
    const {
        fontObject,
        colors,
        headerFontStyleMap,
        headerStyles,
        textCase,
        viewMode,
        textOverrides,
        setTextOverride,
        resetTextOverride,
        getFontsForStyle,
        getPrimaryFontFromStyle,
        getFallbackFontOverrideForStyle,
        setFallbackFontOverrideForStyle,
        clearFallbackFontOverrideForStyle,
        getFallbackScaleOverrideForStyle,
        getEffectiveFontSettingsForStyle,
        getFontColorForStyle,
        fontStyles,
        activeFontStyleId,
        showFallbackColors,
        showAlignmentGuides,
        showBrowserGuides,
        baseRem
    } = useTypo();

    const getAlignmentGuideStyle = (primaryFont, effectiveLineHeight, finalSizePx) => {
        if (!showAlignmentGuides || !primaryFont?.fontObject) return {};

        const { fontObject } = primaryFont;
        const upm = fontObject.unitsPerEm;
        const ascender = fontObject.ascender;
        const descender = fontObject.descender;
        const xHeight = fontObject.tables?.os2?.sxHeight || 0;
        const capHeight = fontObject.tables?.os2?.sCapHeight || 0;

        const contentHeightUnits = ascender - descender;
        const totalHeightUnits = upm * effectiveLineHeight;
        const halfLeadingUnits = (totalHeightUnits - contentHeightUnits) / 2;

        const baselineYUnits = halfLeadingUnits + ascender;
        const xHeightYUnits = baselineYUnits - xHeight;
        const capHeightYUnits = baselineYUnits - capHeight;
        const descenderYUnits = baselineYUnits + Math.abs(descender);
        const ascenderYUnits = baselineYUnits - ascender;

        const guideLines = [
            { y: baselineYUnits },
            { y: xHeightYUnits },
            { y: ascenderYUnits },
            { y: descenderYUnits },
            { y: capHeightYUnits }
        ];

        // Improve visibility calculation
        // ViewBox is "totalHeightUnits" tall (thousands).
        // Rendered Height is "finalSizePx * effectiveLineHeight" px.
        // Scale Factor = ViewBoxHeight / RenderedHeight = upm / finalSizePx.
        const scaleFactor = upm / finalSizePx;

        // We want a 1px stroke.
        // Stroke width in User Units = 1px * scaleFactor.
        const strokeWidth = scaleFactor;

        // Dash pattern: 4px on, 3px off.
        const dashOn = 4 * scaleFactor;
        const dashOff = 3 * scaleFactor;
        const dashArray = `${dashOn} ${dashOff}`;

        const strokeColor = "rgba(0,0,0,0.5)"; // Updated to 50% transparent black per user request

        const paths = guideLines.map(line =>
            `<path d="M0 ${line.y} H${totalHeightUnits * 10}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" />`
        ).join('');

        // Use a wide viewBox width to ensure horizontal lines cover enough (though pattern repeats).
        // Actually, for a horizontal repeating pattern, we need the VIEWBOX WIDTH to match the repeat width?
        // No, we set backgroundRepeat. But we need the dash pattern to align? 
        // Simple horizontal line is fine.

        // SVG width 8 is arbitrary if we just draw horizontal lines.
        // But for dashArray to work, we need path length.
        // Let's use a width of 100 units?
        // Actually, if we use background-repeat, the SVG tiles.
        // If we want the dash pattern to be seamless, the SVG width must be a multiple of the pattern period (4+3=7px).
        // 7px * scaleFactor.
        const patternWidthUnits = (dashOn + dashOff);

        const svgString = `<svg xmlns='http://www.w3.org/2000/svg' width='${patternWidthUnits}' height='${totalHeightUnits}' viewBox='0 0 ${patternWidthUnits} ${totalHeightUnits}' preserveAspectRatio='none'>${paths}</svg>`;

        // Use Base64 to avoid encoding issues
        const base64Svg = btoa(svgString);
        const svgDataUri = `data:image/svg+xml;base64,${base64Svg}`;

        return {
            backgroundImage: `url("${svgDataUri}")`,
            backgroundSize: `${4 + 3}px ${effectiveLineHeight}em`, // Width matches pattern period in px
            backgroundRepeat: 'repeat'
        };
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    const getStyleIdForHeader = (tag) => {
        if (tag && headerFontStyleMap?.[tag]) return headerFontStyleMap[tag];
        return activeFontStyleId || 'primary';
    };

    const resolveStyleIdForHeader = (tag) => {
        const requested = getStyleIdForHeader(tag);
        const requestedPrimary = getPrimaryFontFromStyle(requested);
        if (requestedPrimary?.fontObject) return requested;
        return 'primary';
    };

    const getCurrentFallbackFontIdForStyle = (styleId) => {
        return getFallbackFontOverrideForStyle(styleId, language.id);
    };

    const buildFallbackFontStackForStyle = useCallback((styleId) => {
        const style = fontStyles?.[styleId];
        const fallbackFont = style?.fallbackFont || 'sans-serif';
        const baseFontSize = style?.baseFontSize ?? 60;
        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
        const lineHeight = style?.lineHeight ?? 1.2;

        const fonts = getFontsForStyle(styleId);
        const overrideFontId = getFallbackFontOverrideForStyle(styleId, language.id);

        if (overrideFontId) {
            if (overrideFontId === 'legacy') {
                return [{
                    fontFamily: fallbackFont,
                    fontId: 'legacy',
                    settings: { baseFontSize, scale: fontScales.fallback, lineHeight }
                }];
            }

            const overrideFont = fonts.find(f => f.id === overrideFontId);
            if (overrideFont) {
                if (overrideFont.fontUrl) {
                    return [{
                        fontFamily: `'FallbackFont-${styleId}-${overrideFont.id}'`,
                        fontId: overrideFont.id,
                        fontObject: overrideFont.fontObject,
                        settings: getEffectiveFontSettingsForStyle(styleId, overrideFont.id)
                    }];
                }
                if (overrideFont.name) {
                    return [{
                        fontFamily: overrideFont.name,
                        fontId: overrideFont.id,
                        fontObject: overrideFont.fontObject,
                        settings: getEffectiveFontSettingsForStyle(styleId, overrideFont.id)
                    }];
                }
            }
        }

        const fallbackFonts = fonts.filter(f => f.type === 'fallback');
        const fontStack = [];

        fallbackFonts.forEach(font => {
            if (font.fontUrl) {
                fontStack.push({
                    fontFamily: `'FallbackFont-${styleId}-${font.id}'`,
                    fontId: font.id,
                    fontObject: font.fontObject,
                    settings: getEffectiveFontSettingsForStyle(styleId, font.id)
                });
            } else if (font.name) {
                fontStack.push({
                    fontFamily: font.name,
                    fontId: font.id,
                    fontObject: font.fontObject,
                    settings: getEffectiveFontSettingsForStyle(styleId, font.id)
                });
            }
        });

        if (fallbackFont) {
            fontStack.push({
                fontFamily: fallbackFont,
                fontId: 'legacy',
                settings: { baseFontSize, scale: fontScales.fallback, lineHeight }
            });
        }

        return fontStack;
    }, [fontStyles, getEffectiveFontSettingsForStyle, getFallbackFontOverrideForStyle, getFontsForStyle, language.id]);

    // Determine the content to render: Override > Pangram
    const contentToRender = textOverrides[language.id] || language.pangram;

    // Handle entering edit mode
    const handleStartEdit = () => {
        setEditText(contentToRender);
        setIsEditing(true);
    };

    // Handle saving
    const handleSave = () => {
        if (editText.trim() === '' || editText === language.pangram) {
            resetTextOverride(language.id);
        } else {
            setTextOverride(language.id, editText);
        }
        setIsEditing(false);
    };

    // Handle cancel
    const handleCancel = () => {
        setIsEditing(false);
    };

    const renderedTextByStyleId = useMemo(() => {
        const result = {};
        (['primary', 'secondary']).forEach(styleId => {
            const primaryFont = getPrimaryFontFromStyle(styleId);
            const primaryFontObject = primaryFont?.fontObject;
            if (!primaryFontObject) return;

            const style = fontStyles?.[styleId];
            const baseFontSize = style?.baseFontSize ?? 60;
            const fontScales = style?.fontScales || { active: 100, fallback: 100 };
            const lineHeight = style?.lineHeight ?? 1.2;

            const primarySettings = getEffectiveFontSettingsForStyle(styleId, primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight };
            const primaryFontSize = primarySettings.baseFontSize * (primarySettings.scale / 100);

            const fallbackFontStack = buildFallbackFontStackForStyle(styleId);
            const fallbackFontStackString = fallbackFontStack.length > 0
                ? fallbackFontStack.map(f => f.fontFamily).join(', ')
                : 'sans-serif';

            const scaleMultiplier = ((getFallbackScaleOverrideForStyle(styleId, language.id) || 100) / 100);

            result[styleId] = contentToRender.split('').map((char, index) => {
                const glyphIndex = primaryFontObject.charToGlyphIndex(char);
                const isMissing = glyphIndex === 0;

                if (isMissing && fallbackFontStack.length > 0) {
                    let usedFallback = null;

                    for (const fallback of fallbackFontStack) {
                        if (fallback.fontObject) {
                            try {
                                const fallbackGlyphIndex = fallback.fontObject.charToGlyphIndex(char);
                                if (fallbackGlyphIndex !== 0) {
                                    usedFallback = fallback;
                                    break;
                                }
                            } catch {
                                // Ignore errors, continue to next
                            }
                        } else {
                            usedFallback = fallback;
                            break;
                        }
                    }

                    if (!usedFallback) {
                        usedFallback = fallbackFontStack[fallbackFontStack.length - 1];
                    }

                    const fallbackSettings = usedFallback.settings || { baseFontSize, scale: fontScales.fallback, lineHeight, weight: 400 };
                    const fallbackFontSize = fallbackSettings.baseFontSize * (fallbackSettings.scale / 100);

                    const fonts = getFontsForStyle(styleId);
                    const fontIndex = fonts.findIndex(f => f.id === usedFallback.fontId);
                    const fontObj = fonts[fontIndex];

                    // Check for explicit overrides on the raw font object
                    const hasLineHeightOverride = fontObj && (fontObj.lineHeight !== undefined && fontObj.lineHeight !== '' && fontObj.lineHeight !== null);
                    const hasLetterSpacingOverride = fontObj && (fontObj.letterSpacing !== undefined && fontObj.letterSpacing !== '' && fontObj.letterSpacing !== null);

                    // System fonts (no fontObject) use the 'missing/system' color because we can't verify 
                    // if they are truly used or if the browser fell back to the OS default.
                    const useAssignedColor = fontIndex >= 0 && usedFallback.fontObject;
                    const baseColor = useAssignedColor ? getFontColorForStyle(styleId, fontIndex) : colors.missing;
                    const fontColor = showFallbackColors
                        ? baseColor
                        : getFontColorForStyle(styleId, 0);

                    const isVariable = fontObj?.isVariable;
                    const weight = fallbackSettings.weight || 400;

                    const inlineBoxStyle = showBrowserGuides ? {
                        outline: '1px solid rgba(59, 130, 246, 0.5)', // Blue-500 @ 50%
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',   // Blue-500 @ 10%
                        borderRadius: '2px'
                    } : {};

                    return (
                        <span
                            key={index}
                            style={{
                                fontFamily: fallbackFontStackString,
                                color: fontColor,
                                fontSize: `${(fallbackFontSize / primaryFontSize) * scaleMultiplier}em`,
                                lineHeight: hasLineHeightOverride ? fallbackSettings.lineHeight : undefined,
                                letterSpacing: hasLetterSpacingOverride ? `${fallbackSettings.letterSpacing}em` : undefined,
                                fontWeight: weight,
                                fontVariationSettings: isVariable ? `'wght' ${weight}` : undefined,
                                ...inlineBoxStyle
                            }}
                        >
                            {char}
                        </span>
                    );
                }

                const inlineBoxStyle = showBrowserGuides ? {
                    outline: '1px solid rgba(59, 130, 246, 0.5)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '2px'
                } : {};

                return <span key={index} style={{ color: getFontColorForStyle(styleId, 0), ...inlineBoxStyle }}>{char}</span>;
            });
        });

        return result;
    }, [buildFallbackFontStackForStyle, contentToRender, colors.missing, fontStyles, getEffectiveFontSettingsForStyle, getFallbackScaleOverrideForStyle, getFontColorForStyle, getFontsForStyle, getPrimaryFontFromStyle, language.id, showFallbackColors, showBrowserGuides]);

    // Stats based on current content (moved check to end of render)

    // Stats based on current content
    // Stats based on current content

    const activeMetricsStyleId = resolveStyleIdForHeader(viewMode === 'all' ? 'h1' : viewMode);
    const metricsPrimaryFont = getPrimaryFontFromStyle(activeMetricsStyleId);
    const metricsPrimaryFontObject = metricsPrimaryFont?.fontObject;
    const metricsFallbackFontStack = buildFallbackFontStackForStyle(activeMetricsStyleId);

    const fallbackOverrideFontId = getFallbackFontOverrideForStyle(activeMetricsStyleId, language.id) || '';
    const fallbackOverrideOptions = useMemo(() => {
        const fonts = getFontsForStyle(activeMetricsStyleId) || [];
        return fonts
            .filter(f => f.type === 'fallback')
            .map(f => ({
                id: f.id,
                label: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font'
            }));
    }, [activeMetricsStyleId, getFontsForStyle]);

    const missingChars = useMemo(() => {
        const textToCheck = languageCharacters[language.id] || contentToRender;
        const charsToCheck = textToCheck.replace(/\s/g, '').split('');

        if (!metricsPrimaryFontObject && metricsFallbackFontStack.every(f => !f.fontObject)) {
            return 0; // Or handling for no fonts loaded
        }

        return charsToCheck.filter(char => {
            // Check primary
            if (metricsPrimaryFontObject && metricsPrimaryFontObject.charToGlyphIndex(char) !== 0) return false;

            // Check fallbacks
            for (const fallback of metricsFallbackFontStack) {
                if (fallback.fontObject) {
                    // Some fonts might throw on charToGlyphIndex
                    try {
                        if (fallback.fontObject.charToGlyphIndex(char) !== 0) return false;
                    } catch {
                        // ignore
                    }
                }
            }
            return true;
        }).length;
    }, [language.id, contentToRender, metricsPrimaryFontObject, metricsFallbackFontStack]);

    // We only show "Unknown Support" if we have NO verifiable font (neither primary nor fallback).
    // If we have uploaded fonts (primary or fallbacks with objects), we show the % supported by those fonts.
    const hasVerifiableFont = !!metricsPrimaryFontObject || metricsFallbackFontStack.some(f => !!f.fontObject);

    // Calculate metric based only on known verifiable fonts
    const totalCharsToCheck = (languageCharacters[language.id] || contentToRender).replace(/\s/g, '').length;
    const supportedPercent = totalCharsToCheck > 0 ? Math.round(((totalCharsToCheck - missingChars) / totalCharsToCheck) * 100) : 100;
    const isFullSupport = missingChars === 0;

    if (!fontObject) return null;

    return (
        <div className="bg-white border border-gray-200/60 rounded-xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] transition-shadow duration-300">
            <div className="bg-slate-50/50 px-5 py-3 border-b border-gray-100 flex flex-wrap gap-y-2 justify-between items-center backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-sm text-slate-800 tracking-tight truncate">{language.name}</h3>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-200/60 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {language.id}
                        </span>
                    </div>

                    <div
                        className={`text-[10px] font-mono border px-2 py-0.5 rounded-md whitespace-nowrap ${!hasVerifiableFont
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : isFullSupport
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                    >
                        {!hasVerifiableFont ? 'Unknown Support' : `${supportedPercent}% Supported`}
                    </div>

                    {textOverrides[language.id] && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Custom</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4">

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">FONT OVERRIDE</span>
                        <div className="relative">
                            <select
                                value={fallbackOverrideFontId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) {
                                        clearFallbackFontOverrideForStyle(activeMetricsStyleId, language.id);
                                    } else {
                                        setFallbackFontOverrideForStyle(activeMetricsStyleId, language.id, val);
                                    }
                                }}
                                className="bg-white border border-gray-200 rounded-md pl-2 pr-8 py-1 text-[11px] text-slate-700 font-medium focus:outline-none cursor-pointer appearance-none min-w-[120px]"
                                title="Fallback override"
                            >
                                <option value="">Auto</option>
                                <option value="legacy">System</option>
                                {fallbackOverrideOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Edit Toggle */}
                    <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Edit text"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                        Edit
                    </button>
                </div>
            </div>

            {/* Edit Mode Panel */}
            {isEditing && (
                <div className="p-4 bg-slate-50 border-b border-gray-100">
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none mb-3"
                        placeholder="Type something..."
                        dir={language.dir || 'ltr'}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setEditText(language.pangram);
                                setTextOverride(language.id, language.pangram); // Effectively reset but viewing default
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 mr-auto"
                        >
                            Reset to Default
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}





            {/* Set Base Font Size on Container */}
            {/* Set Base Font Size on Container */}
            <div className="p-4">
                {viewMode === 'all' && (
                    <div className="space-y-2">
                        {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => {
                            const headerStyle = headerStyles[tag];
                            const styleIdForTag = resolveStyleIdForHeader(tag);
                            const currentFallbackFontId = getCurrentFallbackFontIdForStyle(styleIdForTag);

                            // Calculate Base Size for this specific header's style
                            const fonts = getFontsForStyle(styleIdForTag);
                            const primaryFont = fonts.find(f => f.type === 'primary');
                            const style = fontStyles?.[styleIdForTag];
                            const baseFontSize = style?.baseFontSize ?? 60;
                            const fontScales = style?.fontScales || { active: 100, fallback: 100 };
                            const lineHeight = style?.lineHeight ?? 1.2;

                            const primarySettings = getEffectiveFontSettingsForStyle(styleIdForTag, primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight };
                            // Calculate Final Pixel Size
                            // PrimaryFontSize is irrelevant for the header container size now, which is purely REM-based.

                            const finalSizePx = headerStyle.scale * baseRem;

                            const forcedLineHeight = currentFallbackFontId && currentFallbackFontId !== 'cascade' && currentFallbackFontId !== 'legacy'
                                ? getEffectiveFontSettingsForStyle(styleIdForTag, currentFallbackFontId)?.lineHeight
                                : undefined;

                            const effectiveLineHeight = headerStyle.lineHeight ?? forcedLineHeight ?? lineHeight;
                            // Note: 'lineHeight' var comes from style default above

                            // Note: 'lineHeight' var comes from style default above

                            const alignmentStyle = getAlignmentGuideStyle(
                                primaryFont,
                                effectiveLineHeight,
                                finalSizePx
                            );

                            const browserGuideStyle = showBrowserGuides ? {
                                backgroundImage: `repeating-linear-gradient(
                                    to bottom,
                                    rgba(59, 130, 246, 0.05) 0em,
                                    rgba(59, 130, 246, 0.05) ${effectiveLineHeight - 0.05}em,
                                    rgba(59, 130, 246, 0.2) ${effectiveLineHeight - 0.05}em,
                                    rgba(59, 130, 246, 0.2) ${effectiveLineHeight}em
                                )`,
                                backgroundSize: `100% ${effectiveLineHeight}em`
                            } : {};

                            return (
                                <div key={tag}>
                                    <span className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">{tag}</span>
                                    <div
                                        dir={language.dir || 'ltr'}
                                        style={{
                                            fontFamily: `UploadedFont-${styleIdForTag}`,
                                            color: colors.primary,
                                            fontSize: `${finalSizePx}px`,
                                            fontWeight: primarySettings.weight || 400,
                                            fontVariationSettings: primaryFont?.isVariable ? `'wght' ${primarySettings.weight || 400}` : undefined,
                                            lineHeight: effectiveLineHeight,
                                            letterSpacing: `${headerStyle.letterSpacing || 0}em`,
                                            textTransform: textCase,
                                            position: 'relative',
                                            ...browserGuideStyle
                                        }}
                                    >
                                        {renderedTextByStyleId[styleIdForTag]}
                                        {alignmentStyle.backgroundImage && (
                                            <div
                                                aria-hidden="true"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    pointerEvents: 'none',
                                                    zIndex: 10,
                                                    ...alignmentStyle
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode.startsWith('h') && (
                    (() => {
                        const styleIdForTag = resolveStyleIdForHeader(viewMode);
                        const headerStyle = headerStyles[viewMode];
                        const currentFallbackFontId = getCurrentFallbackFontIdForStyle(styleIdForTag);

                        // Calculate Base Size
                        const fonts = getFontsForStyle(styleIdForTag);
                        const primaryFont = fonts.find(f => f.type === 'primary');
                        const style = fontStyles?.[styleIdForTag];
                        const baseFontSize = style?.baseFontSize ?? 60;
                        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
                        const lineHeight = style?.lineHeight ?? 1.2;

                        const primarySettings = getEffectiveFontSettingsForStyle(styleIdForTag, primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight, weight: 400 };
                        const weight = primarySettings.weight || 400;
                        const isVariable = primaryFont?.isVariable;

                        // Calculate Final Pixel Size
                        const finalSizePx = headerStyle.scale * baseRem;

                        const forcedLineHeight = currentFallbackFontId && currentFallbackFontId !== 'cascade' && currentFallbackFontId !== 'legacy'
                            ? getEffectiveFontSettingsForStyle(styleIdForTag, currentFallbackFontId)?.lineHeight
                            : undefined;

                        const effectiveLineHeight = headerStyle.lineHeight ?? forcedLineHeight ?? lineHeight;



                        const alignmentStyle = getAlignmentGuideStyle(
                            primaryFont,
                            effectiveLineHeight,
                            finalSizePx
                        );

                        // Browser Guide: Line Box Visualization
                        // Vertical repeating stripes matching effectiveLineHeight
                        const browserGuideStyle = showBrowserGuides ? {
                            backgroundImage: `repeating-linear-gradient(
                                to bottom,
                                rgba(59, 130, 246, 0.05) 0em,
                                rgba(59, 130, 246, 0.05) ${effectiveLineHeight - 0.05}em,
                                rgba(59, 130, 246, 0.2) ${effectiveLineHeight - 0.05}em,
                                rgba(59, 130, 246, 0.2) ${effectiveLineHeight}em
                            )`,
                            backgroundSize: `100% ${effectiveLineHeight}em`
                        } : {};

                        return (
                            <div
                                dir={language.dir || 'ltr'}
                                style={{
                                    fontFamily: `UploadedFont-${styleIdForTag}`,
                                    color: colors.primary,
                                    fontSize: `${finalSizePx}px`,
                                    fontWeight: weight,
                                    fontVariationSettings: isVariable ? `'wght' ${weight}` : undefined,
                                    lineHeight: effectiveLineHeight,
                                    letterSpacing: `${headerStyle.letterSpacing || 0}em`,
                                    textTransform: textCase,
                                    position: 'relative',
                                    ...browserGuideStyle
                                }}
                            >
                                {renderedTextByStyleId[styleIdForTag]}
                                {alignmentStyle.backgroundImage && (
                                    <div
                                        aria-hidden="true"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            pointerEvents: 'none',
                                            zIndex: 10,
                                            ...alignmentStyle
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })()
                )}
            </div>
        </div>
    );
};

LanguageCard.propTypes = {
    language: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        pangram: PropTypes.string.isRequired
    }).isRequired
};

export default LanguageCard;
