import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import { useFontStack } from '../hooks/useFontStack';
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

        fontStyles,
        activeFontStyleId,
        showFallbackColors,
        showAlignmentGuides,
        showBrowserGuides,
        baseRem,
        addLanguageSpecificFont,
        addLanguageSpecificPrimaryFont,
        primaryFontOverrides,
        getPrimaryFontOverrideForStyle,
        clearPrimaryFontOverride,
        metricGroups,
        addMetricGroup,
        assignFontToMetricGroup,
        removeFontFromMetricGroup
    } = useTypo();

    const { buildFallbackFontStackForStyle } = useFontStack();

    const getAlignmentGuideStyle = (primaryFont, effectiveLineHeight, finalSizePx) => {
        if (!showAlignmentGuides || !primaryFont?.fontObject) return {};

        const { fontObject } = primaryFont;
        const upm = fontObject.unitsPerEm;
        const ascender = fontObject.ascender;
        const descender = fontObject.descender;
        const xHeight = fontObject.tables?.os2?.sxHeight || 0;
        const capHeight = fontObject.tables?.os2?.sCapHeight || 0;

        const contentHeightUnits = ascender - descender;
        let numericLineHeight = effectiveLineHeight;
        if (effectiveLineHeight === 'normal' || isNaN(Number(effectiveLineHeight))) {
            const lineGap = fontObject.tables?.os2?.sTypoLineGap ?? fontObject.hhea?.lineGap ?? 0;
            // 'normal' is roughly (ascender + |descender| + lineGap) / upm
            numericLineHeight = (Math.abs(ascender) + Math.abs(descender) + lineGap) / upm;
        }

        const totalHeightUnits = upm * numericLineHeight;
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
            backgroundSize: `${4 + 3}px ${numericLineHeight}em`, // Width matches pattern period in px
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
        const id = getFallbackFontOverrideForStyle(styleId, language.id);
        if (!id || id === 'legacy') return id;
        const font = getFontsForStyle(styleId).find(f => f.id === id);
        return (font && font.hidden) ? null : id;
    };

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
        (['primary']).forEach(styleId => {
            const primaryOverrideId = getPrimaryFontOverrideForStyle(styleId, language.id);
            const allFonts = getFontsForStyle(styleId);
            let effectivePrimaryFont = primaryOverrideId
                ? allFonts.find(f => f.id === primaryOverrideId)
                : null;

            if (!effectivePrimaryFont) {
                effectivePrimaryFont = getPrimaryFontFromStyle(styleId);
            }

            const primaryFontObject = effectivePrimaryFont?.fontObject;
            if (!primaryFontObject) return;

            const style = fontStyles?.[styleId];
            const baseFontSize = style?.baseFontSize ?? 60;
            const fontScales = style?.fontScales || { active: 100, fallback: 100 };
            const lineHeight = style?.lineHeight ?? 1.2;
            const letterSpacing = style?.letterSpacing ?? 0;
            const fallbackLineHeight = style?.fallbackLineHeight ?? 'normal';
            const fallbackLetterSpacing = style?.fallbackLetterSpacing ?? 0;

            const primarySettings = getEffectiveFontSettingsForStyle(styleId, effectivePrimaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight };
            const primaryFontSize = primarySettings.baseFontSize * (primarySettings.scale / 100);

            const fallbackFontStack = buildFallbackFontStackForStyle(styleId, language.id);
            const fallbackFontStackString = fallbackFontStack.length > 0
                ? fallbackFontStack.map(f => f.fontFamily).join(', ')
                : 'sans-serif';

            result[styleId] = contentToRender.split('').map((char, index) => {
                const glyphIndex = primaryFontObject.charToGlyphIndex(char);
                const isMissing = glyphIndex === 0;
                const fonts = getFontsForStyle(styleId);

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

                    const fallbackSettings = usedFallback.settings || { baseFontSize, scale: fontScales.fallback, lineHeight: fallbackLineHeight, letterSpacing: fallbackLetterSpacing, weight: 400 };

                    const fontIndex = fonts.findIndex(f => f.id === usedFallback.fontId);
                    const fontObj = fonts[fontIndex];

                    // Removed local-only check: always apply fallback settings to ensure global fallback defaults take effect


                    // System fonts (no fontObject) use the 'missing/system' color because we can't verify 
                    // if they are truly used or if the browser fell back to the OS default.
                    const useAssignedColor = fontIndex >= 0 && usedFallback.fontObject;
                    const baseColor = useAssignedColor ? (fontObj?.color || colors.primary) : colors.missing;
                    const fontColor = showFallbackColors
                        ? baseColor
                        : (fonts[0]?.color || colors.primary);

                    const isVariable = fontObj?.isVariable;
                    const weight = fallbackSettings.weight || 400;

                    const inlineBoxStyle = showBrowserGuides ? {
                        outline: '1px solid rgba(59, 130, 246, 0.5)', // Blue-500 @ 50%
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',   // Blue-500 @ 10%
                        borderRadius: '2px'
                    } : {};


                    // Calculate font size ratio based on BASE sizes, ignoring scale (which is handled by CSS size-adjust)
                    // We must ensure primary base size is used as the reference since we are in a container likely sized by primary.
                    const fontSizeEm = fallbackSettings.baseFontSize / primarySettings.baseFontSize;

                    return (
                        <span
                            key={index}
                            style={{
                                fontFamily: fallbackFontStackString,
                                color: fontColor,
                                fontSize: `${fontSizeEm}em`,
                                lineHeight: (
                                    (fallbackSettings.lineGapOverride !== undefined && fallbackSettings.lineGapOverride !== '') ||
                                    (fallbackSettings.ascentOverride !== undefined && fallbackSettings.ascentOverride !== '') ||
                                    (fallbackSettings.descentOverride !== undefined && fallbackSettings.descentOverride !== '')
                                ) ? 'normal'
                                    : undefined,
                                letterSpacing: `${fallbackSettings.letterSpacing}em`,

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

                return <span key={index} style={{ color: fonts[0]?.color || colors.primary, ...inlineBoxStyle }}>{char}</span>;
            });
        });

        return result;
        return result;
    }, [buildFallbackFontStackForStyle, contentToRender, colors.missing, colors.primary, fontStyles, getEffectiveFontSettingsForStyle, getFallbackScaleOverrideForStyle, getFontsForStyle, getPrimaryFontFromStyle, language.id, showFallbackColors, showBrowserGuides, getPrimaryFontOverrideForStyle]);

    // Stats based on current content (moved check to end of render)

    // Stats based on current content
    // Stats based on current content

    const activeMetricsStyleId = resolveStyleIdForHeader(viewMode === 'all' ? 'h1' : viewMode);
    const metricsPrimaryFont = getPrimaryFontFromStyle(activeMetricsStyleId);
    const metricsPrimaryFontObject = metricsPrimaryFont?.fontObject;
    const metricsFallbackFontStack = buildFallbackFontStackForStyle(activeMetricsStyleId, language.id);

    const fallbackOverrideFontId = getFallbackFontOverrideForStyle(activeMetricsStyleId, language.id) || '';
    const fallbackOverrideFont = (getFontsForStyle(activeMetricsStyleId) || []).find(f => f.id === fallbackOverrideFontId);

    const fallbackOverrideOptions = useMemo(() => {
        const fonts = getFontsForStyle(activeMetricsStyleId) || [];
        return fonts
            .filter(f => f.type === 'fallback' && !f.isLangSpecific && !f.isPrimaryOverride)
            .map(f => ({
                id: f.id,
                label: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
                fileName: f.fileName,
                name: f.name
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

    const currentFallbackLabel = useMemo(() => {
        if (!fallbackOverrideFontId) return 'Auto';
        if (fallbackOverrideFontId === 'legacy') return 'System';
        const fonts = getFontsForStyle(activeMetricsStyleId) || [];
        const font = fonts.find(f => f.id === fallbackOverrideFontId);
        return font?.label || font?.fileName?.replace(/\.[^/.]+$/, '') || font?.name || 'Unknown';
    }, [fallbackOverrideFontId, activeMetricsStyleId, getFontsForStyle]);

    if (!fontObject) return null;

    const primaryFontLabel = metricsPrimaryFont?.fileName?.replace(/\.[^/.]+$/, '') || metricsPrimaryFont?.name || 'Default Primary';

    const [configDropdownOpen, setConfigDropdownOpen] = useState(false);

    return (
        <div
            className={`bg-white border border-gray-200/60 rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] transition-all duration-300 ${configDropdownOpen ? 'z-50 relative' : 'z-0'}`}
        >
            <div className="bg-slate-50/50 px-5 py-3 border-b border-gray-100 flex flex-wrap gap-y-2 justify-between items-center backdrop-blur-sm relative z-20 rounded-t-xl">
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LANG/FONT</span>
                        <FontConfigDropdown
                            language={language}
                            currentFallbackLabel={currentFallbackLabel}
                            fallbackOverrideFontId={fallbackOverrideFontId}
                            fallbackOverrideOptions={fallbackOverrideOptions}
                            hasPrimaryOverride={!!primaryFontOverrides?.[language.id]}
                            primaryOverrideFontId={primaryFontOverrides?.[language.id]}
                            primaryFont={metricsPrimaryFont} // Fallback for name if override not found? No, this is global primary.
                            // We need the ACTUAL override font object to check grouping
                            primaryOverrideFont={getFontsForStyle(activeMetricsStyleId).find(f => f.id === primaryFontOverrides?.[language.id])}
                            onTogglePrimary={() => {
                                if (primaryFontOverrides?.[language.id]) {
                                    clearPrimaryFontOverride(language.id);
                                } else {
                                    addLanguageSpecificPrimaryFont(language.id);
                                }
                            }}
                            onSelectFallback={(val) => {
                                if (!val) {
                                    clearFallbackFontOverrideForStyle(activeMetricsStyleId, language.id);
                                } else if (val === 'legacy') {
                                    setFallbackFontOverrideForStyle(activeMetricsStyleId, language.id, 'legacy');
                                } else {
                                    addLanguageSpecificFont(val, language.id);
                                }
                            }}
                            fallbackOverrideFont={fallbackOverrideFont}
                            primaryFontLabel={primaryFontLabel}

                            // Grouping Props
                            metricGroups={metricGroups}
                            addMetricGroup={addMetricGroup}
                            assignFontToMetricGroup={assignFontToMetricGroup}
                            removeFontFromMetricGroup={removeFontFromMetricGroup}
                            fontScales={fontStyles?.[activeMetricsStyleId]?.fontScales}
                            getEffectiveFontSettingsForStyle={(fid) => getEffectiveFontSettingsForStyle(activeMetricsStyleId, fid)}

                            // Visibility Control
                            isOpen={configDropdownOpen}
                            onToggle={() => setConfigDropdownOpen(!configDropdownOpen)}
                            onClose={() => setConfigDropdownOpen(false)}
                        />
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
                            const primaryOverrideId = getPrimaryFontOverrideForStyle(styleIdForTag, language.id);
                            let primaryFont = primaryOverrideId
                                ? fonts.find(f => f.id === primaryOverrideId)
                                : null;

                            if (!primaryFont) {
                                primaryFont = fonts.find(f => f.type === 'primary');
                            }

                            const style = fontStyles?.[styleIdForTag];
                            const baseFontSize = style?.baseFontSize ?? 60;
                            const fontScales = style?.fontScales || { active: 100, fallback: 100 };
                            const lineHeight = style?.lineHeight ?? 1.2;

                            const primarySettings = getEffectiveFontSettingsForStyle(styleIdForTag, primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight };
                            // Calculate Final Pixel Size
                            // PrimaryFontSize is irrelevant for the header container size now, which is purely REM-based.

                            let finalSizePx = headerStyle.scale * baseRem;
                            if (tag === 'h1' && primaryFont?.isPrimaryOverride && primarySettings?.h1Rem) {
                                finalSizePx = primarySettings.h1Rem * baseRem;
                            }

                            const activeGroup = primaryFont?.metricGroupId ? metricGroups?.[primaryFont.metricGroupId] : null;
                            const hasLineHeightOverride = primaryFont?.isPrimaryOverride && (
                                (activeGroup?.lineHeight !== undefined && activeGroup?.lineHeight !== '' && activeGroup?.lineHeight !== 'normal') ||
                                (primaryFont?.lineHeight !== undefined && primaryFont?.lineHeight !== '' && primaryFont?.lineHeight !== 'normal')
                            );

                            const primaryOverrideLineHeight = hasLineHeightOverride
                                ? primarySettings.lineHeight
                                : undefined;

                            const forcedLineHeight = currentFallbackFontId && currentFallbackFontId !== 'cascade' && currentFallbackFontId !== 'legacy'
                                ? getEffectiveFontSettingsForStyle(styleIdForTag, currentFallbackFontId)?.lineHeight
                                : undefined;

                            const effectiveLineHeight = primaryOverrideLineHeight ?? headerStyle.lineHeight ?? forcedLineHeight ?? lineHeight;

                            // Calculate numeric LH for guide
                            let numericLineHeight = effectiveLineHeight;
                            if (effectiveLineHeight === 'normal' || isNaN(Number(effectiveLineHeight))) {
                                if (primaryFont?.fontObject) {
                                    const { ascender, descender, unitsPerEm } = primaryFont.fontObject;
                                    const lineGap = primaryFont.fontObject.tables?.os2?.sTypoLineGap ?? primaryFont.fontObject.hhea?.lineGap ?? 0;
                                    numericLineHeight = (Math.abs(ascender) + Math.abs(descender) + lineGap) / unitsPerEm;
                                } else {
                                    numericLineHeight = 1.2; // Default fallback if no metrics
                                }
                            }
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
                                    rgba(59, 130, 246, 0.05) ${numericLineHeight - 0.05}em,
                                    rgba(59, 130, 246, 0.2) ${numericLineHeight - 0.05}em,
                                    rgba(59, 130, 246, 0.2) ${numericLineHeight}em
                                )`,
                                backgroundSize: `100% ${numericLineHeight}em`
                            } : {};

                            return (
                                <div key={tag}>
                                    <span className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">{tag}</span>
                                    const isActualOverride = primaryFont?.id === primaryOverrideId;

                                    <div
                                        dir={language.dir || 'ltr'}
                                        style={{
                                            fontFamily: isActualOverride ? `'FallbackFont-${styleIdForTag}-${primaryOverrideId}'` : `UploadedFont-${styleIdForTag}`,
                                            color: colors.primary,
                                            fontSize: `${finalSizePx}px`,
                                            fontWeight: primarySettings.weight || 400,
                                            fontVariationSettings: primaryFont?.isVariable ? `'wght' ${primarySettings.weight || 400}` : undefined,
                                            lineHeight: (
                                                (primarySettings.lineGapOverride !== undefined && primarySettings.lineGapOverride !== '') ||
                                                (primarySettings.ascentOverride !== undefined && primarySettings.ascentOverride !== '') ||
                                                (primarySettings.descentOverride !== undefined && primarySettings.descentOverride !== '')
                                            ) ? 'normal'
                                                : effectiveLineHeight,
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
                        const primaryOverrideId = getPrimaryFontOverrideForStyle(styleIdForTag, language.id);
                        let primaryFont = primaryOverrideId
                            ? fonts.find(f => f.id === primaryOverrideId)
                            : null;

                        if (!primaryFont) {
                            primaryFont = fonts.find(f => f.type === 'primary');
                        }

                        const style = fontStyles?.[styleIdForTag];
                        const baseFontSize = style?.baseFontSize ?? 60;
                        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
                        const lineHeight = style?.lineHeight ?? 1.2;

                        const primarySettings = getEffectiveFontSettingsForStyle(styleIdForTag, primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight, weight: 400 };
                        const weight = primarySettings.weight || 400;
                        const isVariable = primaryFont?.isVariable;

                        // Calculate Final Pixel Size
                        let finalSizePx = headerStyle.scale * baseRem;
                        if (viewMode === 'h1' && primaryFont?.isPrimaryOverride && primarySettings?.h1Rem) {
                            finalSizePx = primarySettings.h1Rem * baseRem;
                        }

                        const forcedLineHeight = currentFallbackFontId && currentFallbackFontId !== 'cascade' && currentFallbackFontId !== 'legacy'
                            ? getEffectiveFontSettingsForStyle(styleIdForTag, currentFallbackFontId)?.lineHeight
                            : undefined;

                        const activeGroup = primaryFont?.metricGroupId ? metricGroups?.[primaryFont.metricGroupId] : null;
                        const hasLineHeightOverride = primaryFont?.isPrimaryOverride && (
                            (activeGroup?.lineHeight !== undefined && activeGroup?.lineHeight !== '' && activeGroup?.lineHeight !== 'normal') ||
                            (primaryFont?.lineHeight !== undefined && primaryFont?.lineHeight !== '' && primaryFont?.lineHeight !== 'normal')
                        );

                        const primaryOverrideLineHeight = hasLineHeightOverride
                            ? primarySettings.lineHeight
                            : undefined;

                        const effectiveLineHeight = primaryOverrideLineHeight ?? headerStyle.lineHeight ?? forcedLineHeight ?? lineHeight;



                        const alignmentStyle = getAlignmentGuideStyle(
                            primaryFont,
                            effectiveLineHeight,
                            finalSizePx
                        );

                        // Calculate numeric LH for guide
                        let numericLineHeight = effectiveLineHeight;
                        if (effectiveLineHeight === 'normal' || isNaN(Number(effectiveLineHeight))) {
                            if (metricsPrimaryFontObject) {
                                const { ascender, descender, unitsPerEm } = metricsPrimaryFontObject;
                                const lineGap = metricsPrimaryFontObject.tables?.os2?.sTypoLineGap ?? metricsPrimaryFontObject.hhea?.lineGap ?? 0;
                                numericLineHeight = (Math.abs(ascender) + Math.abs(descender) + lineGap) / unitsPerEm;
                            } else {
                                numericLineHeight = 1.2; // Default fallback if no metrics
                            }
                        }

                        // Browser Guide: Line Box Visualization
                        // Vertical repeating stripes matching effectiveLineHeight
                        const browserGuideStyle = showBrowserGuides ? {
                            backgroundImage: `repeating-linear-gradient(
                                to bottom,
                                rgba(59, 130, 246, 0.05) 0em,
                                rgba(59, 130, 246, 0.05) ${numericLineHeight - 0.05}em,
                                rgba(59, 130, 246, 0.2) ${numericLineHeight - 0.05}em,
                                rgba(59, 130, 246, 0.2) ${numericLineHeight}em
                            )`,
                            backgroundSize: `100% ${numericLineHeight}em`
                        } : {};

                        const isActualOverride = primaryFont?.id === primaryOverrideId;

                        return (
                            <div className="p-4">
                                <div
                                    dir={language.dir || 'ltr'}
                                    style={{
                                        fontFamily: isActualOverride ? `'FallbackFont-${styleIdForTag}-${primaryOverrideId}'` : `UploadedFont-${styleIdForTag}`,
                                        color: colors.primary,
                                        fontSize: `${finalSizePx}px`,
                                        fontWeight: weight,
                                        fontVariationSettings: isVariable ? `'wght' ${weight}` : undefined,
                                        lineHeight: (
                                            (primarySettings.lineGapOverride !== undefined && primarySettings.lineGapOverride !== '') ||
                                            (primarySettings.ascentOverride !== undefined && primarySettings.ascentOverride !== '') ||
                                            (primarySettings.descentOverride !== undefined && primarySettings.descentOverride !== '')
                                        ) ? 'normal'
                                            : effectiveLineHeight,
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
                    })()
                )}
            </div>
        </div>
    );
};

const FontConfigDropdown = ({
    language,
    currentFallbackLabel,
    fallbackOverrideFontId,
    fallbackOverrideOptions,
    fallbackOverrideFont,
    hasPrimaryOverride,
    primaryOverrideFont,
    primaryFontLabel,
    metricGroups,
    activeGroup, // passed or derived
    onTogglePrimary,
    onSelectFallback,
    assignFontToMetricGroup,
    removeFontFromMetricGroup,
    addMetricGroup,
    getEffectiveFontSettingsForStyle,
    fontScales,
    isOpen,
    onToggle,
    onClose
}) => {
    const [menuView, setMenuView] = useState('main');
    const dropdownRef = useRef(null);

    // activeGroup is likely passed as prop but let's derive if needed or use prop
    // The parent passes 'activeGroup' based on previous context, but let's ensure.
    // Actually the parent props seemed to lack 'activeGroup' in propTypes but it was used in code?
    // Let's re-derive it to be safe if it's available in scope, 
    // BUT 'metricGroups' and 'primaryOverrideFont' are passed.
    const derivedActiveGroup = primaryOverrideFont?.metricGroupId && metricGroups ? metricGroups[primaryOverrideFont.metricGroupId] : null;
    const currentActiveGroup = activeGroup || derivedActiveGroup;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Reset view when closed
    useEffect(() => {
        if (!isOpen) {
            setMenuView('main');
        }
    }, [isOpen]);

    // Determine label using prop
    let label = currentFallbackLabel;

    // If Primary Override is active, show summary
    if (hasPrimaryOverride) {
        label = `Primary + ${label}`;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={onToggle}
                className={`flex items-center gap-1.5 bg-white border rounded-md pl-2 pr-2 py-1 text-[11px] font-medium min-w-[120px] justify-between transition-colors ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-gray-200 hover:border-gray-300'
                    }`}
                title="Configure Fonts"
            >
                <span className={`truncate max-w-[140px] ${hasPrimaryOverride ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {label}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 flex-shrink-0">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">

                    {menuView === 'main' ? (
                        <>
                            {/* Primary Section */}
                            <div className="p-2 border-b border-gray-100 bg-slate-50/50">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        {hasPrimaryOverride && currentActiveGroup ? (
                                            <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 w-full justify-between">
                                                <span className="text-[9px] font-bold text-indigo-600 truncate" title={currentActiveGroup.name}>
                                                    {currentActiveGroup.name}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFontFromMetricGroup(primaryOverrideFont.id);
                                                    }}
                                                    className="text-indigo-400 hover:text-rose-500 rounded-full hover:bg-white p-0.5"
                                                    title="Unlink from group"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuView('options');
                                                }}
                                                className={`w-full flex items-center justify-between gap-1 text-[10px] font-medium px-2 py-1.5 rounded transition-colors ${hasPrimaryOverride
                                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                                    }`}
                                            >
                                                <span>{hasPrimaryOverride ? 'Overridden' : 'Override Primary'}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 opacity-50">
                                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fallback Section */}
                            <div className="max-h-60 overflow-y-auto p-1">
                                {fallbackOverrideOptions.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            CUSTOM
                                        </div>
                                        {fallbackOverrideOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => onSelectFallback(opt.id)}
                                                className={`w-full text-left px-2 py-1.5 text-xs rounded mb-0.5 flex items-center gap-2 group ${(fallbackOverrideFontId === opt.id || (fallbackOverrideFont?.fileName === opt.fileName && fallbackOverrideFont?.name === opt.name))
                                                    ? 'bg-indigo-50/50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${(fallbackOverrideFontId === opt.id || (fallbackOverrideFont?.fileName === opt.fileName && fallbackOverrideFont?.name === opt.name))
                                                    ? 'border-indigo-600 bg-white'
                                                    : 'border-slate-300 bg-transparent group-hover:border-slate-400'
                                                    }`}>
                                                    {(fallbackOverrideFontId === opt.id || (fallbackOverrideFont?.fileName === opt.fileName && fallbackOverrideFont?.name === opt.name)) && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                                    )}
                                                </span>
                                                <span className="truncate">{opt.label}</span>
                                            </button>
                                        ))}
                                        <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                    </>
                                )}

                                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    DEFAULTS
                                </div>

                                <button
                                    onClick={() => onSelectFallback('')}
                                    className={`w-full text-left px-2 py-1.5 text-xs rounded mb-0.5 flex items-center gap-2 group ${!fallbackOverrideFontId ? 'bg-indigo-50/50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${!fallbackOverrideFontId
                                        ? 'border-indigo-600 bg-white'
                                        : 'border-slate-300 bg-transparent group-hover:border-slate-400'
                                        }`}>
                                        {!fallbackOverrideFontId && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                        )}
                                    </span>
                                    <span>Auto (Default)</span>
                                </button>

                                <button
                                    onClick={() => onSelectFallback('legacy')}
                                    className={`w-full text-left px-2 py-1.5 text-xs rounded mb-0.5 flex items-center gap-2 group ${fallbackOverrideFontId === 'legacy' ? 'bg-indigo-50/50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${fallbackOverrideFontId === 'legacy'
                                        ? 'border-indigo-600 bg-white'
                                        : 'border-slate-300 bg-transparent group-hover:border-slate-400'
                                        }`}>
                                        {fallbackOverrideFontId === 'legacy' && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                        )}
                                    </span>
                                    <span>System Fallback</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        // Options View
                        <div className="p-1 min-h-[200px] flex flex-col">
                            <div className="p-2 border-b border-gray-100 flex items-center gap-2 mb-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuView('main');
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l-4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <span className="text-xs font-semibold text-slate-700">Primary Options</span>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePrimary(); // Toggles override
                                        setMenuView('main');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-slate-50 ${hasPrimaryOverride ? 'text-rose-600' : 'text-indigo-600'}`}
                                >
                                    {hasPrimaryOverride ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                            Remove Override
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                            </svg>
                                            Override for this language
                                        </>
                                    )}
                                </button>

                                <div className="h-px bg-slate-100 my-1 mx-2" />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const groupName = prompt('Enter name for new group:');
                                        if (groupName) {
                                            const settings = {
                                                scale: undefined,
                                                h1Rem: undefined,
                                                lineHeight: undefined,
                                                letterSpacing: undefined,
                                                weight: undefined
                                            };

                                            // Use existing font settings if available
                                            if (primaryOverrideFont) {
                                                const effectiveSettings = getEffectiveFontSettingsForStyle(primaryOverrideFont.id);
                                                settings.scale = effectiveSettings?.scale !== fontScales?.fallback ? effectiveSettings?.scale : undefined;
                                                settings.h1Rem = primaryOverrideFont.h1Rem;
                                                settings.lineHeight = primaryOverrideFont.lineHeight;
                                                settings.letterSpacing = primaryOverrideFont.letterSpacing;
                                                settings.weight = primaryOverrideFont.weightOverride;
                                                settings.ascentOverride = primaryOverrideFont.ascentOverride;
                                                settings.descentOverride = primaryOverrideFont.descentOverride;
                                                settings.lineGapOverride = primaryOverrideFont.lineGapOverride;
                                            }

                                            const newGroupId = addMetricGroup(groupName, settings);

                                            if (primaryOverrideFont) {
                                                assignFontToMetricGroup(primaryOverrideFont.id, newGroupId);
                                            } else {
                                                alert("Please 'Override for this language' first before grouping.");
                                            }
                                            setMenuView('main');
                                        }
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 font-medium flex items-center gap-2 ${!hasPrimaryOverride ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!hasPrimaryOverride}
                                    title={!hasPrimaryOverride ? "Active override required to group" : ""}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                                    </svg>
                                    Create New Group
                                </button>

                                {Object.values(metricGroups || {}).length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase mt-1">Existing Groups</div>
                                        {Object.values(metricGroups).map(g => (
                                            <button
                                                key={g.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (primaryOverrideFont) {
                                                        if (window.confirm(`Adding this language to "${g.name}" will overwrite its current configuration with the group's settings. Continue?`)) {
                                                            assignFontToMetricGroup(primaryOverrideFont.id, g.id);
                                                            setMenuView('main');
                                                        }
                                                    }
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 truncate ${!hasPrimaryOverride ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={!hasPrimaryOverride}
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

FontConfigDropdown.propTypes = {
    language: PropTypes.object.isRequired,
    currentFallbackLabel: PropTypes.string.isRequired,
    fallbackOverrideFontId: PropTypes.string,
    fallbackOverrideOptions: PropTypes.array.isRequired,
    hasPrimaryOverride: PropTypes.bool.isRequired,
    fallbackOverrideFont: PropTypes.object,
    primaryFontLabel: PropTypes.string,
    onTogglePrimary: PropTypes.func.isRequired,
    onSelectFallback: PropTypes.func.isRequired
};

LanguageCard.propTypes = {
    language: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        pangram: PropTypes.string.isRequired
    }).isRequired
};

export default LanguageCard;
