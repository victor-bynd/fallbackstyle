import { useCallback } from 'react';
import { useFontManagement } from '../context/useFontManagement';
import { useLanguageMapping } from '../context/useLanguageMapping';
import { useTypography } from '../context/useTypography';
import { normalizeFontName } from '../utils/fontNameUtils';

export const useFontStack = () => {
    const { fontStyles, getFontsForStyle } = useFontManagement();
    const { getFallbackFontOverrideForStyle } = useLanguageMapping();
    const { getEffectiveFontSettingsForStyle } = useTypography();

    const buildFallbackFontStackForStyle = useCallback((styleId, languageId) => {
        const style = fontStyles?.[styleId];
        const fallbackFont = style?.fallbackFont || 'sans-serif';
        const baseFontSize = style?.baseFontSize ?? 60;
        const fontScales = style?.fontScales || { active: 100, fallback: 100 };
        const fallbackLineHeight = style?.fallbackLineHeight ?? 'normal';
        const fallbackLetterSpacing = style?.fallbackLetterSpacing ?? 0;

        const fonts = getFontsForStyle(styleId);
        const overrideFontId = getFallbackFontOverrideForStyle(styleId, languageId);

        // Calculate general fallback fonts (unmapped fonts)
        const fallbackOverrides = style?.fallbackFontOverrides || {};
        const primaryOverrides = style?.primaryFontOverrides || {};

        const excludedFontIds = new Set();

        // Add Fallback Overrides (Values logic)
        Object.values(fallbackOverrides).forEach(val => {
            if (typeof val === 'string') {
                excludedFontIds.add(val);
            } else if (val && typeof val === 'object') {
                // Add keys (Base Font IDs) and values (Override Font IDs)
                Object.keys(val).forEach(k => excludedFontIds.add(k));
                Object.values(val).forEach(v => excludedFontIds.add(v));
            }
        });

        // Add Primary Overrides (Values logic)
        Object.values(primaryOverrides).forEach(val => {
            if (typeof val === 'string') excludedFontIds.add(val);
        });

        const primaryFont = fonts.find(f => f && f.type === 'primary');
        const pNameNormalized = normalizeFontName(primaryFont?.fileName || primaryFont?.name);

        // Filter out fallback fonts that are used as overrides in ANY language
        // AND ensure we don't duplicate the primary font in the fallback stack (same ID or same Name)
        const fallbackFonts = fonts.filter(f =>
            f &&
            f.type === 'fallback' &&
            !f.isPrimaryOverride &&
            !f.hidden &&
            !f.isClone &&
            !f.isLangSpecific &&
            f.id !== primaryFont?.id && // Sanity check for ID duplication
            !(
                // Robust Name match
                pNameNormalized && normalizeFontName(f.fileName || f.name) === pNameNormalized
            )
        );

        const buildStackItem = (font) => {
            if (font.fontUrl || font.name) {
                return {
                    fontFamily: `'FallbackFont-${styleId}-${font.id}'`,
                    fontId: font.id,
                    fontObject: font.fontObject,
                    settings: getEffectiveFontSettingsForStyle(styleId, font.id)
                };
            }
            return null;
        };

        const sysOverrides = style?.systemFallbackOverrides?.[languageId] || {};
        const hasSysOverrides = (
            sysOverrides.scale !== undefined ||
            sysOverrides.lineGapOverride !== undefined ||
            sysOverrides.ascentOverride !== undefined ||
            sysOverrides.descentOverride !== undefined
        );
        const sysFontFamily = hasSysOverrides ? `'SystemFallback-${styleId}-${languageId}'` : fallbackFont;

        if (overrideFontId) {
            if (overrideFontId === 'legacy') {
                return [{
                    fontFamily: sysFontFamily,
                    fontId: 'legacy',
                    settings: {
                        baseFontSize,
                        scale: fontScales.fallback,
                        lineHeight: fallbackLineHeight,
                        letterSpacing: fallbackLetterSpacing,
                        ...sysOverrides
                    }
                }];
            }

            // Handle both string (Legacy/Direct) and object (Granular) overrides
            const mappedFonts = [];
            if (typeof overrideFontId === 'string') {
                const f = fonts.find(f => f && f.id === overrideFontId);
                if (f) mappedFonts.push(f);
            } else if (typeof overrideFontId === 'object' && overrideFontId !== null) {
                // Values are the Clone IDs
                Object.values(overrideFontId).forEach(id => {
                    const f = fonts.find(f => f && f.id === id);
                    if (f) mappedFonts.push(f);
                });
            }

            if (mappedFonts.length > 0) {
                const overrideStack = [];
                const mappedIds = new Set(mappedFonts.map(f => f.id));

                // 1. Add Specific Mapped Fonts with high priority
                mappedFonts.forEach(font => {
                    if (font.hidden) return;
                    const item = buildStackItem(font);
                    if (item) {
                        overrideStack.push(item);
                    }
                });

                // 2. Add General Fallback Fonts (if not already mapped)
                fallbackFonts.forEach(font => {
                    if (!mappedIds.has(font.id)) {
                        const item = buildStackItem(font);
                        if (item) overrideStack.push(item);
                    }
                });

                // 3. Add System Fallback
                if (fallbackFont) {
                    overrideStack.push({
                        fontFamily: sysFontFamily,
                        fontId: 'legacy',
                        settings: {
                            baseFontSize,
                            scale: fontScales.fallback,
                            lineHeight: fallbackLineHeight,
                            letterSpacing: fallbackLetterSpacing,
                            ...sysOverrides
                        }
                    });
                }

                if (overrideStack.length > 0) {
                    return overrideStack;
                }
            }
        }

        // Default Case: No Override (General Fallbacks + System)
        const fontStack = [];

        fallbackFonts.forEach(font => {
            const item = buildStackItem(font);
            if (item) fontStack.push(item);
        });

        if (fallbackFont && !fontStack.some(f => f.fontFamily === sysFontFamily || f.fontFamily === fallbackFont)) {
            fontStack.push({
                fontFamily: sysFontFamily,
                fontId: 'legacy',
                settings: {
                    baseFontSize,
                    scale: fontScales.fallback,
                    lineHeight: fallbackLineHeight,
                    letterSpacing: fallbackLetterSpacing,
                    ...sysOverrides
                }
            });
        }

        return fontStack;
    }, [fontStyles, getFontsForStyle, getFallbackFontOverrideForStyle, getEffectiveFontSettingsForStyle]);

    return { buildFallbackFontStackForStyle };
};
