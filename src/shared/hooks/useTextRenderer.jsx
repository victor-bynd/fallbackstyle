import { useFontManagement } from '../context/useFontManagement';
import { useLanguageMapping } from '../context/useLanguageMapping';
import { useTypography } from '../context/useTypography';
import { useUI } from '../context/UIContext';
import { useFontStack } from './useFontStack';

export const useTextRenderer = () => {
    const { fontStyles, getFontsForStyle, getPrimaryFontFromStyle } = useFontManagement();
    const { getPrimaryFontOverrideForStyle, systemFallbackOverrides } = useLanguageMapping();
    const { getEffectiveFontSettingsForStyle, missingColor } = useTypography();

    const {
        colors,
        textCase,
        showFallbackColors,
        showBrowserGuides
    } = useUI();

    const { buildFallbackFontStackForStyle } = useFontStack();

    const renderText = ({
        content,
        languageId,
        styleId = 'primary',
        primaryFont = null,      // Custom font to use as primary (from props/loop)
        fontSize = null,        // Custom font size override
        lineHeight = null,      // Custom line height override
        color = null           // Custom color override
    }) => {
        if (!content) return null;

        let processedContent = content;
        if (textCase === 'uppercase') {
            processedContent = languageId ? content.toLocaleUpperCase(languageId) : content.toUpperCase();
        } else if (textCase === 'lowercase') {
            processedContent = languageId ? content.toLocaleLowerCase(languageId) : content.toLowerCase();
        } else if (textCase === 'capitalize') {
            // Sentence case: First letter Upper, rest Lower
            const lower = languageId ? content.toLocaleLowerCase(languageId) : content.toLowerCase();
            processedContent = (languageId ? lower.charAt(0).toLocaleUpperCase(languageId) : lower.charAt(0).toUpperCase()) + lower.slice(1);
        }

        const primaryOverrideId = getPrimaryFontOverrideForStyle(styleId, languageId);
        const allFonts = getFontsForStyle(styleId);

        let effectivePrimaryFont = primaryFont;

        if (!effectivePrimaryFont) {
            // 1. Check Primary Overrides
            if (primaryOverrideId) {
                effectivePrimaryFont = allFonts.find(f => f.id === primaryOverrideId);
            }

            // 2. Functional Primary Font
            if (!effectivePrimaryFont) {
                effectivePrimaryFont = getPrimaryFontFromStyle(styleId);
            }
        }

        const globalPrimary = getPrimaryFontFromStyle(styleId);
        const isHidden = effectivePrimaryFont?.hidden ||
            (effectivePrimaryFont?.isPrimaryOverride && globalPrimary?.hidden);



        const primaryFontObject = !isHidden ? effectivePrimaryFont?.fontObject : null;
        // If hidden, we treat it as if the font object text segmentation isn't needed for the primary, 
        // essentially treating it as a "missing" or "skipped" font at the top level.
        // However, we still need to process content.

        // If hidden, we shouldn't return parsed content immediately unless we want to render fallbacks.
        // The check for primaryFontObject below defaults to null return only if we have NO object.
        // If we hid it, we act as if the primary font object is missing, triggering fallback logic?

        // Actually if hidden, we just want to skip using the primary font family in the span.
        // If primaryFontObject is null, original code returns processedContent (raw string).
        // If hidden, we WANT usage of fallback fonts.
        // So let's NOT return raw content if hidden, but ensure we proceed to render using fallbacks.


        const style = fontStyles?.[styleId];
        const baseFontSize = fontSize ?? style?.baseFontSize ?? 16;
        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
        const effectiveLineHeight = lineHeight ?? style?.lineHeight ?? 'normal';

        const fallbackFontStack = buildFallbackFontStackForStyle(styleId, languageId);
        const fallbackFontStackString = fallbackFontStack.length > 0
            ? fallbackFontStack.map(f => f.fontFamily).join(', ')
            : 'sans-serif';

        // Get primary font settings
        const primarySettings = getEffectiveFontSettingsForStyle(styleId, effectivePrimaryFont?.id || 'primary') || {
            baseFontSize,
            scale: fontScales.active,
            lineHeight: effectiveLineHeight,
            color: color || colors.primary
        };

        // Ensure we use the provided color if context doesn't have it or we want to force it
        const effectivePrimaryColor = color || (showFallbackColors ? primarySettings.color : null) || colors.primary;

        // Determine the correct font family alias
        const isGlobalPrimary = effectivePrimaryFont?.type === 'primary' && !effectivePrimaryFont?.isPrimaryOverride;

        let primaryFamily = 'sans-serif';
        if (!isHidden && (effectivePrimaryFont?.fontUrl || effectivePrimaryFont?.name)) {
            if (isGlobalPrimary) {
                primaryFamily = `'UploadedFont-${styleId}'`;
            } else {
                // If it's a primary override, it was generated in the 'fallbackRules' loop with this ID
                primaryFamily = `'FallbackFont-${styleId}-${effectivePrimaryFont.id}'`;
            }
        }

        // --- OPTIMIZATION START ---
        // Fast Path: If no visual debugging aids are needed, use native CSS rendering.
        // This avoids creating thousands of DOM nodes for character segmentation.
        const useFastPath = !showFallbackColors && !showBrowserGuides;

        if (useFastPath) {
            // Note: In Fast Path, we rely on the @font-face `size-adjust` (calculated in useFontFaceStyles)
            // to handle scaling relative to the primary font.
            // We do NOT support manual `baseFontSize` overrides for *specific* fallback fonts in this mode,
            // as we can't switch the container's font-size mid-string without spans.

            return (
                <span
                    style={{
                        fontFamily: isHidden
                            ? fallbackFontStackString
                            : `${primaryFamily}, ${fallbackFontStackString}`,
                        color: effectivePrimaryColor,
                        verticalAlign: 'baseline',
                        letterSpacing: `${primarySettings.letterSpacing}em`,
                        lineHeight: 'inherit',
                        fontWeight: primarySettings.weight || 400,
                        fontVariationSettings: (effectivePrimaryFont?.isVariable || effectivePrimaryFont?.axes?.weight)
                            ? `'wght' ${primarySettings.weight || 400}`
                            : undefined
                    }}
                >
                    {processedContent}
                </span>
            );
        }
        // --- OPTIMIZATION END ---

        return processedContent.split('').map((char, index) => {
            // Fix: If primaryFontObject is missing (e.g. System Font), assume character exists (index 1).
            // Only use 0 (missing) if we have an object and it returns 0.
            const glyphIndex = primaryFontObject ? primaryFontObject.charToGlyphIndex(char) : 1;
            const isMissing = isHidden || glyphIndex === 0;

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
                            // Ignore errors
                        }
                    } else {
                        // System fallback (no object to check) - assume used
                        usedFallback = fallback;
                        break;
                    }
                }

                if (!usedFallback) {
                    // Use last resort
                    usedFallback = fallbackFontStack[fallbackFontStack.length - 1];
                }

                const fallbackSettings = getEffectiveFontSettingsForStyle(styleId, usedFallback.fontId) || {
                    baseFontSize,
                    scale: fontScales.fallback,
                    lineHeight: 'normal',
                    letterSpacing: 0,
                    weight: 400
                };

                const fonts = getFontsForStyle(styleId);
                const fontIndex = fonts.findIndex(f => f.id === usedFallback.fontId);
                const useMappedColor = fontIndex >= 0 && usedFallback.fontObject;

                const baseColor = useMappedColor
                    ? (fallbackSettings.color || colors.primary)
                    : (systemFallbackOverrides[languageId]?.missingColor || missingColor);

                const fontColor = showFallbackColors
                    ? baseColor
                    : effectivePrimaryColor;

                const weight = fallbackSettings.weight || 400;
                const isVariable = fonts[fontIndex]?.isVariable;

                const inlineBoxStyle = showBrowserGuides ? {
                    outline: '1px solid rgba(59, 130, 246, 0.5)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '2px'
                } : {};

                // Relative sizing math
                // We use ems to allow inheritance (crucial for headers where base size is large)
                // If fallback has a different baseFontSize than the active style, we scale it.
                // e.g. Style Base = 16px, Fallback Base = 20px -> Scale = 1.25em
                const styleBase = style.baseFontSize || 16;
                const fallbackBase = fallbackSettings.baseFontSize || styleBase;
                const relativeScale = fallbackBase / styleBase;

                return (
                    <span
                        key={index}
                        style={{
                            fontFamily: fallbackFontStackString,
                            color: fontColor,
                            letterSpacing: `${fallbackSettings.letterSpacing}em`,
                            verticalAlign: 'baseline',
                            fontWeight: weight,
                            fontVariationSettings: isVariable ? `'wght' ${weight} ` : undefined,
                            fontSize: `${relativeScale}em`,
                            ...inlineBoxStyle
                        }}
                    >
                        {char}
                    </span>
                );
            }

            // Primary Font Character
            const inlineBoxStyle = showBrowserGuides ? {
                outline: '1px solid rgba(59, 130, 246, 0.5)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '2px'
            } : {};

            const finalColor = showFallbackColors ? (effectivePrimaryFont?.color || effectivePrimaryColor) : effectivePrimaryColor;

            return (
                <span
                    key={index}
                    style={{
                        fontFamily: primaryFamily,
                        color: finalColor,
                        verticalAlign: 'baseline',
                        letterSpacing: `${primarySettings.letterSpacing}em`,
                        lineHeight: 'inherit',
                        ...inlineBoxStyle
                    }}
                >
                    {char}
                </span>
            );
        });
    };

    return { renderText };
};
