import { useCallback } from 'react';
import { useTypo } from '../context/useTypo';

export const useFontStack = () => {
    const {
        fontStyles,
        getFontsForStyle,
        getFallbackFontOverrideForStyle,
        getEffectiveFontSettingsForStyle,
    } = useTypo();

    const buildFallbackFontStackForStyle = useCallback((styleId, languageId) => {
        const style = fontStyles?.[styleId];
        const fallbackFont = style?.fallbackFont || 'sans-serif';
        const baseFontSize = style?.baseFontSize ?? 60;
        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
        const fallbackLineHeight = style?.fallbackLineHeight ?? 'normal';
        const fallbackLetterSpacing = style?.fallbackLetterSpacing ?? 0;

        const fonts = getFontsForStyle(styleId);
        const overrideFontId = getFallbackFontOverrideForStyle(styleId, languageId);

        if (overrideFontId) {
            if (overrideFontId === 'legacy') {
                return [{
                    fontFamily: fallbackFont,
                    fontId: 'legacy',
                    settings: { baseFontSize, scale: fontScales.fallback, lineHeight: fallbackLineHeight, letterSpacing: fallbackLetterSpacing }
                }];
            }

            const overrideFont = fonts.find(f => f.id === overrideFontId);
            if (overrideFont && !overrideFont.hidden) {
                const overrideStack = [];
                if (overrideFont.fontUrl) {
                    overrideStack.push({
                        fontFamily: `'FallbackFont-${styleId}-${overrideFont.id}'`,
                        fontId: overrideFont.id,
                        fontObject: overrideFont.fontObject,
                        settings: getEffectiveFontSettingsForStyle(styleId, overrideFont.id)
                    });
                } else if (overrideFont.name) {
                    overrideStack.push({
                        fontFamily: overrideFont.name,
                        fontId: overrideFont.id,
                        fontObject: overrideFont.fontObject,
                        settings: getEffectiveFontSettingsForStyle(styleId, overrideFont.id)
                    });
                }

                if (fallbackFont) {
                    overrideStack.push({
                        fontFamily: fallbackFont,
                        fontId: 'legacy',
                        settings: { baseFontSize, scale: fontScales.fallback, lineHeight: fallbackLineHeight, letterSpacing: fallbackLetterSpacing }
                    });
                }

                if (overrideStack.length > 0) {
                    return overrideStack;
                }
            }
        }

        const globalOverrides = style?.fallbackFontOverrides || {};
        const globalOverriddenFontIds = new Set(Object.values(globalOverrides));
        const primaryFont = fonts.find(f => f.type === 'primary');

        // Filter out fallback fonts that are used as overrides in ANY language
        // AND ensure we don't duplicate the primary font in the fallback stack (same ID or same Name)
        const fallbackFonts = fonts.filter(f =>
            f.type === 'fallback' &&
            !f.isPrimaryOverride &&
            !f.hidden &&
            !f.isClone &&
            !f.isLangSpecific &&
            !globalOverriddenFontIds.has(f.id) &&
            f.id !== primaryFont?.id && // Sanity check for ID duplication
            !(
                // If it's a system font (added by name) and matches primary name, it's a duplicate
                (!f.fontObject && !f.fontUrl) &&
                (f.name === primaryFont?.name || f.name === primaryFont?.fileName)
            )
        );
        const fontStack = [];

        fallbackFonts.forEach(font => {
            if (font.fontUrl || font.name) {
                fontStack.push({
                    fontFamily: `'FallbackFont-${styleId}-${font.id}'`,
                    fontId: font.id,
                    fontObject: font.fontObject,
                    settings: getEffectiveFontSettingsForStyle(styleId, font.id)
                });
            }
        });

        if (fallbackFont && !fontStack.some(f => f.fontFamily === fallbackFont)) {
            fontStack.push({
                fontFamily: fallbackFont,
                fontId: 'legacy',
                settings: { baseFontSize, scale: fontScales.fallback, lineHeight: fallbackLineHeight, letterSpacing: fallbackLetterSpacing }
            });
        }

        return fontStack;
    }, [fontStyles, getFontsForStyle, getFallbackFontOverrideForStyle, getEffectiveFontSettingsForStyle]);

    return { buildFallbackFontStackForStyle };
};
