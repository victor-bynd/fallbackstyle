import { useState, useCallback, useMemo } from 'react';
import { createLogger } from '../services/Logger';
import { useFontManagement } from './useFontManagement';

const logger = createLogger('Typography');

/**
 * TypographyContext
 *
 * Manages all typography styling settings:
 * - Base font sizing (baseFontSize, baseRem)
 * - Font scaling (active and fallback scales)
 * - Line height and letter spacing (global and per-language)
 * - Header styles (h1-h6)
 * - Text overrides per language
 * - Missing glyph colors
 */

import { TypographyContext } from './useTypography';

const DEFAULT_HEADER_STYLES = {
    h1: { scale: 3.0, lineHeight: 'normal', letterSpacing: 0 },
    h2: { scale: 2.625, lineHeight: 'normal', letterSpacing: 0 },
    h3: { scale: 2.25, lineHeight: 'normal', letterSpacing: 0 },
    h4: { scale: 1.875, lineHeight: 'normal', letterSpacing: 0 },
    h5: { scale: 1.5, lineHeight: 'normal', letterSpacing: 0 },
    h6: { scale: 1.125, lineHeight: 'normal', letterSpacing: 0 }
};



export const TypographyProvider = ({ children }) => {
    // Get font management context
    const fontContext = useFontManagement();
    const { activeFontStyleId, fontStyles, updateStyleState } = fontContext;

    // Header styles (separate from activeStyle)
    const [headerStyles, setHeaderStyles] = useState(() => ({ ...DEFAULT_HEADER_STYLES }));
    const [headerOverrides, setHeaderOverrides] = useState(() => ({
        h1: {}, h2: {}, h3: {}, h4: {}, h5: {}, h6: {}
    }));

    // Header font style mapping (which typography style for each header)
    const [headerFontStyleMap, setHeaderFontStyleMap] = useState(() => ({
        h1: 'primary', h2: 'primary', h3: 'primary',
        h4: 'primary', h5: 'primary', h6: 'primary'
    }));

    // Text overrides (per language)
    const [textOverrides, setTextOverrides] = useState({});

    // Get active style state
    const activeStyle = fontStyles[activeFontStyleId] || fontStyles.primary;
    const {
        baseFontSize = 16,
        baseRem = 16,
        weight = 400,
        fontScales = { active: 100, fallback: 100 },
        isFallbackLinked = true,
        lineHeight = 'normal',
        previousLineHeight = 1.2,
        letterSpacing = 0,
        fallbackFont = 'sans-serif',
        fallbackLineHeight = 'normal',
        fallbackLetterSpacing = null,
        lineHeightOverrides = {},
        fallbackScaleOverrides = {},
        missingColor = '#b8b8b8',
        missingBgColor = '#f1f5f9'
    } = activeStyle;

    // ========== BASE TYPOGRAPHY SETTINGS ==========

    /**
     * Set base font size
     */
    const setBaseFontSize = useCallback((size) => {
        logger.debug('Setting base font size:', size);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            baseFontSize: size,
            baseRem: size
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set base rem
     */
    const setBaseRem = useCallback((rem) => {
        logger.debug('Setting base rem:', rem);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            baseRem: rem,
            baseFontSize: rem
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set weight
     */
    const setWeight = useCallback((newWeight) => {
        logger.debug('Setting weight:', newWeight);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            weight: newWeight
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set font scales
     */
    const setFontScales = useCallback((scales) => {
        logger.debug('Setting font scales:', scales);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fontScales: { ...prev.fontScales, ...scales }
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set fallback linked status
     */
    const setIsFallbackLinked = useCallback((linked) => {
        logger.debug('Setting fallback linked:', linked);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            isFallbackLinked: linked
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set fallback font (system font name)
     */
    const setFallbackFont = useCallback((fontName) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackFont: fontName
        }));
    }, [activeFontStyleId, updateStyleState]);

    // ========== LINE HEIGHT ==========

    /**
     * Set line height
     */
    const setLineHeight = useCallback((value) => {
        logger.debug('Setting line height:', value);
        updateStyleState(activeFontStyleId, prev => {
            // Store previous non-normal value
            const prevValue = prev.lineHeight !== 'normal' ? prev.lineHeight : prev.previousLineHeight;
            return {
                ...prev,
                lineHeight: value,
                previousLineHeight: prevValue
            };
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Toggle global line height auto (normal <-> previous value)
     */
    const toggleGlobalLineHeightAuto = useCallback(() => {
        logger.debug('Toggling global line height auto');
        updateStyleState(activeFontStyleId, prev => {
            if (prev.lineHeight === 'normal') {
                return { ...prev, lineHeight: prev.previousLineHeight || 1.2 };
            } else {
                return {
                    ...prev,
                    previousLineHeight: prev.lineHeight,
                    lineHeight: 'normal'
                };
            }
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set fallback line height
     */
    const setFallbackLineHeight = useCallback((value) => {
        logger.debug('Setting fallback line height:', value);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackLineHeight: value
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Update line height override for language/font
     */
    const updateLineHeightOverride = useCallback((key, value) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            lineHeightOverrides: {
                ...prev.lineHeightOverrides,
                [key]: value
            }
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Reset line height override
     */
    const resetLineHeightOverride = useCallback((key) => {
        updateStyleState(activeFontStyleId, prev => {
            const next = { ...prev.lineHeightOverrides };
            delete next[key];
            return {
                ...prev,
                lineHeightOverrides: next
            };
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Reset ALL line height overrides for a style
     */
    const resetAllLineHeightOverridesForStyle = useCallback((styleId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            lineHeightOverrides: {}
        }));
    }, [updateStyleState]);

    // ========== LETTER SPACING ==========

    /**
     * Set letter spacing
     */
    const setLetterSpacing = useCallback((value) => {
        logger.debug('Setting letter spacing:', value);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            letterSpacing: value
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set fallback letter spacing
     */
    const setFallbackLetterSpacing = useCallback((value) => {
        logger.debug('Setting fallback letter spacing:', value);
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackLetterSpacing: value
        }));
    }, [activeFontStyleId, updateStyleState]);

    // ========== HEADER STYLES ==========

    /**
     * Mark header property as manually overridden
     */
    const markHeaderOverride = useCallback((tag, property, value = true) => {
        setHeaderOverrides(prev => ({
            ...prev,
            [tag]: {
                ...(prev[tag] || {}),
                [property]: value
            }
        }));
    }, []);

    /**
     * Clear header override
     */
    const clearHeaderOverride = useCallback((tag, property) => {
        setHeaderOverrides(prev => {
            const next = { ...(prev || {}) };
            if (!next[tag]) return prev;
            const copy = { ...next[tag] };
            delete copy[property];
            next[tag] = copy;
            return next;
        });
    }, []);

    /**
     * Reset header style property to default
     */
    const resetHeaderStyleProperty = useCallback((tag, property) => {
        setHeaderStyles(prev => ({
            ...prev,
            [tag]: {
                ...prev[tag],
                [property]: DEFAULT_HEADER_STYLES[tag][property]
            }
        }));
        clearHeaderOverride(tag, property);
    }, [clearHeaderOverride]);

    /**
     * Reset entire header style
     */
    const resetHeaderStyle = useCallback((tag) => {
        setHeaderStyles(prev => ({ ...prev, [tag]: { ...DEFAULT_HEADER_STYLES[tag] } }));
        setHeaderOverrides(prev => ({ ...prev, [tag]: {} }));
    }, []);

    /**
     * Reset all header styles
     */
    const resetAllHeaderStyles = useCallback(() => {
        setHeaderStyles({ ...DEFAULT_HEADER_STYLES });
        setHeaderOverrides({ h1: {}, h2: {}, h3: {}, h4: {}, h5: {}, h6: {} });
    }, []);

    /**
     * Update header style
     * @param {string} tag - Header tag (h1-h6)
     * @param {string} property - Property name (scale, lineHeight, letterSpacing)
     * @param {any} value - New value
     * @param {string} source - 'manual' or 'sync' (sync only applies if not overridden)
     */
    const updateHeaderStyle = useCallback((tag, property, value, source = 'manual') => {
        // If this is a sync from main-style and the property is overridden, don't apply
        if (source === 'sync' && headerOverrides?.[tag]?.[property]) {
            return;
        }

        setHeaderStyles(prev => ({
            ...prev,
            [tag]: {
                ...prev[tag],
                [property]: value
            }
        }));

        if (source === 'manual') {
            markHeaderOverride(tag, property, true);
        }
    }, [headerOverrides, markHeaderOverride]);

    /**
     * Reset header line height override
     */
    const resetHeaderLineHeightOverride = useCallback((tag) => {
        resetHeaderStyleProperty(tag, 'lineHeight');
    }, [resetHeaderStyleProperty]);

    /**
     * Set header font style (which typography style to use)
     */
    const setHeaderFontStyle = useCallback((tag, styleId) => {
        setHeaderFontStyleMap(prev => ({
            ...prev,
            [tag]: styleId
        }));
    }, []);

    // ========== FALLBACK SCALE OVERRIDES ==========

    /**
     * Update fallback scale override for language
     */
    const updateFallbackScaleOverride = useCallback((langId, scale) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackScaleOverrides: {
                ...prev.fallbackScaleOverrides,
                [langId]: scale
            }
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Get fallback scale override for specific style
     */
    const getFallbackScaleOverrideForStyle = useCallback((styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.fallbackScaleOverrides?.[langId];
    }, [fontStyles]);

    /**
     * Reset global fallback scale for style
     */
    const resetGlobalFallbackScaleForStyle = useCallback((styleId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            fontScales: { ...prev.fontScales, fallback: 100 },
            fallbackScaleOverrides: {}
        }));
    }, [updateStyleState]);

    // ========== TEXT OVERRIDES ==========

    /**
     * Set text override for language
     */
    const setTextOverride = useCallback((langId, text) => {
        setTextOverrides(prev => ({
            ...prev,
            [langId]: text
        }));
    }, []);

    /**
     * Reset text override for language
     */
    const resetTextOverride = useCallback((langId) => {
        setTextOverrides(prev => {
            const next = { ...prev };
            delete next[langId];
            return next;
        });
    }, []);

    // ========== MISSING GLYPH COLORS ==========

    /**
     * Set missing glyph color
     */
    const setMissingColor = useCallback((color) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            missingColor: color
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Set missing glyph background color
     */
    const setMissingBgColor = useCallback((color) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            missingBgColor: color
        }));
    }, [activeFontStyleId, updateStyleState]);

    // ========== COMPUTED PROPERTIES ==========

    /**
     * Get effective font settings for a specific style and font
     */
    const getEffectiveFontSettingsForStyle = useCallback((styleId, fontId) => {
        const style = fontStyles[styleId];
        if (!style) return null;

        const font = style.fonts?.find(f => f && f.id === fontId);
        if (!font) return null;

        const isPrimary = font.type === 'primary';
        const scales = style.fontScales || { active: 100, fallback: 100 };
        const sLineHeight = (isPrimary ? style.lineHeight : style.fallbackLineHeight) || 'normal';

        return {
            baseFontSize: font.baseFontSize ?? style.baseFontSize ?? 16,
            scale: font.scale ?? (isPrimary ? scales.active : scales.fallback) ?? 100,
            lineHeight: font.lineHeight ?? sLineHeight,
            letterSpacing: font.letterSpacing ?? (isPrimary ? style.letterSpacing : style.fallbackLetterSpacing) ?? 0,
            weight: font.weightOverride ?? style.weight ?? 400,
            ascentOverride: font.ascentOverride,
            descentOverride: font.descentOverride,
            lineGapOverride: font.lineGapOverride,
            color: font.color,
            fontScales: scales
        };
    }, [fontStyles]);

    /**
     * Get font sizes for a specific style (active and fallback)
     */
    const getFontSizesForStyle = useCallback((styleId) => {
        const style = fontStyles[styleId];
        if (!style) return { active: 16, fallback: 16 };

        const base = style.baseFontSize || 16;
        const scales = style.fontScales || { active: 100, fallback: 100 };

        return {
            active: (base * scales.active) / 100,
            fallback: (base * scales.fallback) / 100
        };
    }, [fontStyles]);

    /**
     * Computed: Font sizes for active style
     */
    const fontSizes = useMemo(() => {
        return getFontSizesForStyle(activeFontStyleId);
    }, [activeFontStyleId, getFontSizesForStyle]);

    /**
     * Get effective font settings for active style (convenience method)
     */
    const getEffectiveFontSettings = useCallback((fontId) => {
        return getEffectiveFontSettingsForStyle(activeFontStyleId, fontId);
    }, [activeFontStyleId, getEffectiveFontSettingsForStyle]);

    // Create context value
    const value = useMemo(() => ({
        // Base typography
        baseFontSize,
        baseRem,
        weight,
        fontScales,
        isFallbackLinked,
        fallbackFont,

        // Base setters
        setBaseFontSize,
        setBaseRem,
        setWeight,
        setFontScales,
        setIsFallbackLinked,
        setFallbackFont,

        // Line height
        lineHeight,
        previousLineHeight,
        fallbackLineHeight,
        lineHeightOverrides,
        setLineHeight,
        setFallbackLineHeight,
        toggleGlobalLineHeightAuto,
        updateLineHeightOverride,
        resetLineHeightOverride,
        resetAllLineHeightOverridesForStyle,

        // Letter spacing
        letterSpacing,
        fallbackLetterSpacing,
        setLetterSpacing,
        setFallbackLetterSpacing,

        // Header styles
        headerStyles,
        headerOverrides,
        headerFontStyleMap,
        updateHeaderStyle,
        resetHeaderStyle,
        resetAllHeaderStyles,
        markHeaderOverride,
        clearHeaderOverride,
        resetHeaderStyleProperty,
        resetHeaderLineHeightOverride,
        setHeaderFontStyle,

        // Fallback scale overrides
        fallbackScaleOverrides,
        updateFallbackScaleOverride,
        getFallbackScaleOverrideForStyle,
        resetGlobalFallbackScaleForStyle,

        // Text overrides
        textOverrides,
        setTextOverride,
        resetTextOverride,

        // Missing colors
        missingColor,
        missingBgColor,
        setMissingColor,
        setMissingBgColor,

        // Computed
        fontSizes,
        getEffectiveFontSettings,
        getEffectiveFontSettingsForStyle,
        getFontSizesForStyle,

        // Constants
        DEFAULT_HEADER_STYLES
    }), [
        baseFontSize,
        baseRem,
        weight,
        fontScales,
        isFallbackLinked,
        fallbackFont,
        setBaseFontSize,
        setBaseRem,
        setWeight,
        setFontScales,
        setIsFallbackLinked,
        setFallbackFont,
        lineHeight,
        previousLineHeight,
        fallbackLineHeight,
        lineHeightOverrides,
        setLineHeight,
        setFallbackLineHeight,
        toggleGlobalLineHeightAuto,
        updateLineHeightOverride,
        resetLineHeightOverride,
        resetAllLineHeightOverridesForStyle,
        letterSpacing,
        fallbackLetterSpacing,
        setLetterSpacing,
        setFallbackLetterSpacing,
        headerStyles,
        headerOverrides,
        headerFontStyleMap,
        updateHeaderStyle,
        resetHeaderStyle,
        resetAllHeaderStyles,
        markHeaderOverride,
        clearHeaderOverride,
        resetHeaderStyleProperty,
        resetHeaderLineHeightOverride,
        setHeaderFontStyle,
        fallbackScaleOverrides,
        updateFallbackScaleOverride,
        getFallbackScaleOverrideForStyle,
        resetGlobalFallbackScaleForStyle,
        textOverrides,
        setTextOverride,
        resetTextOverride,
        missingColor,
        missingBgColor,
        setMissingColor,
        setMissingBgColor,
        fontSizes,
        getEffectiveFontSettings,
        getEffectiveFontSettingsForStyle,
        getFontSizesForStyle
    ]);

    return (
        <TypographyContext.Provider value={value}>
            {children}
        </TypographyContext.Provider>
    );
};
