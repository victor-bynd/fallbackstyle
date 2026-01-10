import { useMemo } from 'react';
import { useTypo } from '../context/useTypo';
import { useUI } from '../context/UIContext';
import { useFontStack } from './useFontStack';

export const useTextRenderer = () => {
    const {
        fontStyles,
        getFontsForStyle,
        getPrimaryFontFromStyle,
        getPrimaryFontOverrideForStyle,
        getFallbackFontOverrideForStyle,
        getEffectiveFontSettingsForStyle,
        systemFallbackOverrides,
        missingColor
    } = useTypo();

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
        color = null,           // Custom color override
        inheritLineHeight = false, // If true, won't set explicit LH (for header inheritance)
        inheritFontSize = false   // If true, won't set explicit Font Size (for header inheritance)
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

        const primaryFontObject = effectivePrimaryFont?.fontObject;
        if (!primaryFontObject) return processedContent; // Return raw content if no primary font object (system font mode?)

        const style = fontStyles?.[styleId];
        const baseFontSize = fontSize ?? style?.baseFontSize ?? 16;
        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
        const effectiveLineHeight = lineHeight ?? style?.lineHeight ?? 1.2;

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
        const effectivePrimaryColor = color || primarySettings.color || colors.primary;

        return processedContent.split('').map((char, index) => {
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
                    lineHeight: 1.2,
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

            const finalColor = showFallbackColors ? effectivePrimaryColor : effectivePrimaryColor;

            return (
                <span
                    key={index}
                    style={{
                        color: finalColor,
                        verticalAlign: 'baseline',
                        letterSpacing: `${primarySettings.letterSpacing}em`,
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
