import { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { fallbackOptions, DEFAULT_PALETTE } from '../data/constants';
import languages from '../data/languages.json';
import { resolveWeightForFont } from '../utils/weightUtils';
import { parseFontFile, createFontUrl } from '../services/FontLoader';

const TypoContext = createContext();

const VISIBLE_LANGUAGE_IDS_STORAGE_KEY = 'localize-type:visibleLanguageIds:v3';

const createEmptyStyleState = () => ({
    fonts: [
        {
            id: 'primary',
            type: 'primary',
            fontObject: null,
            fontUrl: null,
            fileName: null,
            name: null,
            baseFontSize: 60,
            // Weight metadata
            axes: null,
            isVariable: false,
            staticWeight: null
            // selectedWeight removed, will use weightOverride if needed
        }
    ],
    activeFont: 'primary',
    baseFontSize: 60,
    weight: 400, // Global weight for this style
    fontScales: { active: 100, fallback: 100 },
    isFallbackLinked: true,
    lineHeight: 1.2,
    letterSpacing: 0,
    fallbackFont: 'sans-serif',
    lineHeightOverrides: {},
    fallbackScaleOverrides: {},
    fallbackFontOverrides: {},
    fontColors: DEFAULT_PALETTE
});

const createEmptySecondaryStyleState = () => ({
    ...createEmptyStyleState(),
    fonts: [],
    activeFont: null
});

export const TypoProvider = ({ children }) => {
    const [activeFontStyleId, setActiveFontStyleId] = useState('primary');

    const [fontStyles, setFontStyles] = useState(() => ({
        primary: createEmptyStyleState(),
        secondary: createEmptySecondaryStyleState()
    }));

    const activeStyle = fontStyles[activeFontStyleId] || fontStyles.primary;

    const getPrimaryFontFromStyle = (styleId) => {
        const style = fontStyles[styleId];
        return style?.fonts?.find(f => f.type === 'primary') || null;
    };

    const primaryFont = getPrimaryFontFromStyle('primary');
    const fontObject = primaryFont?.fontObject || null;
    const fontUrl = primaryFont?.fontUrl || null;
    const fileName = primaryFont?.fileName || null;

    const DEFAULT_HEADER_STYLES = useMemo(() => ({
        h1: { scale: 1.0, lineHeight: 1.2, letterSpacing: 0 },
        h2: { scale: 0.8, lineHeight: 1.2, letterSpacing: 0 },
        h3: { scale: 0.6, lineHeight: 1.2, letterSpacing: 0 },
        h4: { scale: 0.5, lineHeight: 1.2, letterSpacing: 0 },
        h5: { scale: 0.4, lineHeight: 1.2, letterSpacing: 0 },
        h6: { scale: 0.3, lineHeight: 1.2, letterSpacing: 0 }
    }), []);

    const [headerStyles, setHeaderStyles] = useState(() => ({ ...DEFAULT_HEADER_STYLES }));

    // Track which header properties have been manually overridden by the user.
    const [headerOverrides, setHeaderOverrides] = useState(() => ({
        h1: {}, h2: {}, h3: {}, h4: {}, h5: {}, h6: {}
    }));

    const markHeaderOverride = useCallback((tag, property, value = true) => {
        setHeaderOverrides(prev => ({
            ...prev,
            [tag]: {
                ...(prev[tag] || {}),
                [property]: value
            }
        }));
    }, []);

    const clearHeaderOverride = (tag, property) => {
        setHeaderOverrides(prev => {
            const next = { ...(prev || {}) };
            if (!next[tag]) return prev;
            const copy = { ...next[tag] };
            delete copy[property];
            next[tag] = copy;
            return next;
        });
    };

    const resetHeaderStyleProperty = (tag, property) => {
        setHeaderStyles(prev => ({
            ...prev,
            [tag]: {
                ...prev[tag],
                [property]: DEFAULT_HEADER_STYLES[tag][property]
            }
        }));
        clearHeaderOverride(tag, property);
    };

    const resetHeaderStyle = (tag) => {
        setHeaderStyles(prev => ({ ...prev, [tag]: { ...DEFAULT_HEADER_STYLES[tag] } }));
        setHeaderOverrides(prev => ({ ...prev, [tag]: {} }));
    };

    const resetAllHeaderStyles = () => {
        setHeaderStyles({ ...DEFAULT_HEADER_STYLES });
        setHeaderOverrides({ h1: {}, h2: {}, h3: {}, h4: {}, h5: {}, h6: {} });
    };

    // updateHeaderStyle: source 'manual' marks an override; source 'sync' mirrors main style only if not overridden
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

    // Content Overrides
    const [textOverrides, setTextOverrides] = useState({});

    const setTextOverride = (langId, text) => {
        setTextOverrides(prev => ({
            ...prev,
            [langId]: text
        }));
    };

    const resetTextOverride = (langId) => {
        setTextOverrides(prev => {
            const next = { ...prev };
            delete next[langId];
            return next;
        });
    };

    const updateStyleState = (styleId, updater) => {
        setFontStyles(prev => {
            const current = prev[styleId] || createEmptyStyleState();
            const next = typeof updater === 'function' ? updater(current) : updater;
            return { ...prev, [styleId]: next };
        });
    };

    const getFontSizesForStyle = (styleId) => {
        const style = fontStyles[styleId] || createEmptyStyleState();
        return {
            active: Math.round(style.baseFontSize * (style.fontScales.active / 100)),
            fallback: Math.round(style.baseFontSize * (style.fontScales.fallback / 100))
        };
    };

    // Derived value for backward compatibility with components expecting pixels
    const fontSizes = getFontSizesForStyle(activeFontStyleId);

    const baseFontSize = activeStyle.baseFontSize;
    const setBaseFontSize = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            baseFontSize: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.baseFontSize) : valueOrUpdater
        }));
    };

    const fontScales = activeStyle.fontScales;
    const setFontScales = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fontScales: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.fontScales) : valueOrUpdater
        }));
    };

    const isFallbackLinked = activeStyle.isFallbackLinked;
    const setIsFallbackLinked = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            isFallbackLinked: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.isFallbackLinked) : valueOrUpdater
        }));
    };

    const lineHeight = activeStyle.lineHeight;
    const setLineHeight = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            lineHeight: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.lineHeight) : valueOrUpdater
        }));
    };

    const letterSpacing = activeStyle.letterSpacing;
    const setLetterSpacing = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            letterSpacing: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.letterSpacing) : valueOrUpdater
        }));
    };

    // Mirror selected main-style properties into headers unless the header property has been overridden.
    // We mirror `lineHeight` and `letterSpacing` so header styles follow main font tab changes by default.
    useEffect(() => {
        // Read values directly from the currently active main style so we don't rely on local bindings
        const currentStyle = fontStyles?.[activeFontStyleId] || {};
        const lh = currentStyle.lineHeight;
        const ls = currentStyle.letterSpacing;

        Object.keys(DEFAULT_HEADER_STYLES).forEach(tag => {
            updateHeaderStyle(tag, 'lineHeight', lh, 'sync');
            updateHeaderStyle(tag, 'letterSpacing', ls, 'sync');
        });
    }, [fontStyles, activeFontStyleId, DEFAULT_HEADER_STYLES, updateHeaderStyle]);

    const weight = activeStyle.weight;
    const setWeight = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            weight: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.weight) : valueOrUpdater
        }));
    };

    const fallbackFont = activeStyle.fallbackFont;
    const setFallbackFont = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackFont: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.fallbackFont) : valueOrUpdater
        }));
    };
    const [textCase, setTextCase] = useState('none');
    const [viewMode, setViewMode] = useState('h1');
    const [gridColumns, setGridColumns] = useState(1);
    const [showFallbackColors, setShowFallbackColors] = useState(true);
    const [colors, setColors] = useState({
        primary: '#0f172a',
        missing: '#b8b8b8', // rgb(184,184,184)
        missingBg: '#f1f5f9' // Slate-100
    });
    const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);

    const fonts = activeStyle.fonts;
    const setFonts = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fonts: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.fonts) : valueOrUpdater
        }));
    };

    const activeFont = activeStyle.activeFont;
    const setActiveFont = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            activeFont: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.activeFont) : valueOrUpdater
        }));
    };

    const lineHeightOverrides = activeStyle.lineHeightOverrides;
    const fallbackScaleOverrides = activeStyle.fallbackScaleOverrides;
    const fallbackFontOverrides = activeStyle.fallbackFontOverrides;

    const getFallbackFontOverrideForStyle = (styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.fallbackFontOverrides?.[langId] || null;
    };

    const getFallbackScaleOverrideForStyle = (styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.fallbackScaleOverrides?.[langId];
    };

    const getDefaultVisibleLanguageIds = () => [
        'en-US', // English
        'ru-RU', // Russian
        'el-GR', // Greek
        'ar-SA', // Arabic
        'hi-IN', // Hindi
        'vi-VN', // Vietnamese
        'bn-IN', // Bengali
        'zh-CN', // Chinese (Simplified)
        'zh-TW', // Chinese (Traditional)
        'ja-JP', // Japanese
        'ko-KR', // Korean
        'th-TH', // Thai
        'gu-IN', // Gujarati
        'pa-IN', // Punjabi (Gurmukhi)
        'kn-IN', // Kannada
        'ml-IN', // Malayalam
        'ta-IN', // Tamil
        'te-IN'  // Telugu
    ];

    const [visibleLanguageIds, setVisibleLanguageIds] = useState(() => {
        const defaultIds = getDefaultVisibleLanguageIds();
        try {
            const raw = localStorage.getItem(VISIBLE_LANGUAGE_IDS_STORAGE_KEY);
            if (!raw) return defaultIds;

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return defaultIds;

            // Respect the saved selection order, but only keep IDs that still exist.
            // This ensures hidden languages remain hidden after a reload.
            const validSet = new Set(languages.map(l => l.id));
            const seen = new Set();
            return parsed
                .filter(id => typeof id === 'string')
                .filter(id => validSet.has(id))
                .filter(id => {
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to load visible languages from localStorage:', err);
            }
            return defaultIds;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(VISIBLE_LANGUAGE_IDS_STORAGE_KEY, JSON.stringify(visibleLanguageIds));
        } catch (err) {
            // Ignore persistence failures (private mode, quota exceeded, etc.)
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to save visible languages to localStorage:', err);
            }
        }
    }, [visibleLanguageIds]);

    const isLanguageVisible = (langId) => visibleLanguageIds.includes(langId);

    const setLanguageVisibility = (langId, visible) => {
        setVisibleLanguageIds(prev => {
            const exists = prev.includes(langId);
            if (visible) {
                if (exists) return prev;
                // Insert back in canonical order (languages.json)
                const canonical = languages.map(l => l.id);
                const nextSet = new Set(prev);
                nextSet.add(langId);
                return canonical.filter(id => nextSet.has(id));
            }

            if (!exists) return prev;
            return prev.filter(id => id !== langId);
        });
    };

    const toggleLanguageVisibility = (langId) => {
        setLanguageVisibility(langId, !isLanguageVisible(langId));
    };

    const showAllLanguages = () => {
        setVisibleLanguageIds(languages.map(l => l.id));
    };

    const hideAllLanguages = () => {
        setVisibleLanguageIds([]);
    };

    const resetVisibleLanguages = () => {
        setVisibleLanguageIds(getDefaultVisibleLanguageIds());
    };

    const visibleLanguages = languages.filter(l => visibleLanguageIds.includes(l.id));

    const loadFont = (font, url, name, metadata = {}) => {
        const styleId = activeFontStyleId;
        const initialWeight = metadata.axes?.weight?.default ?? metadata.staticWeight ?? 400;

        updateStyleState(styleId, prev => ({
            ...prev,
            weight: (prev.fonts || []).some(f => f.type === 'primary')
                ? resolveWeightForFont(
                    {
                        fontObject: font,
                        axes: metadata.axes,
                        staticWeight: metadata.staticWeight ?? null
                    },
                    prev.weight
                )
                : initialWeight,
            fonts: (prev.fonts || []).some(f => f.type === 'primary')
                ? prev.fonts.map(f =>
                    f.type === 'primary'
                        ? {
                            ...f,
                            fontObject: font,
                            fontUrl: url,
                            fileName: name,
                            name,
                            axes: metadata.axes,
                            isVariable: metadata.isVariable,
                            staticWeight: metadata.staticWeight ?? null
                            // No selectedWeight, use global weight
                        }
                        : f
                )
                : [
                    {
                        ...createEmptyStyleState().fonts[0],
                        fontObject: font,
                        fontUrl: url,
                        fileName: name,
                        name,
                        axes: metadata.axes,
                        isVariable: metadata.isVariable,
                        staticWeight: metadata.staticWeight ?? null
                        // No selectedWeight, defaults to global
                    },
                    ...(prev.fonts || [])
                ],
            activeFont: prev.activeFont || 'primary'
        }));
    };

    const getEffectiveFontSettingsForStyle = (styleId, fontId) => {
        const style = fontStyles[styleId];
        if (!style) return null;

        const font = style.fonts.find(f => f.id === fontId);
        if (!font) return null;

        if (font.type === 'primary') {
            return {
                baseFontSize: style.baseFontSize,
                scale: style.fontScales.active,
                lineHeight: style.lineHeight,
                weight: resolveWeightForFont(font, style.weight) // Use global weight (resolved for this font)
            };
        }

        // Fallback font
        const effectiveLineHeight = (font.lineHeight !== undefined && font.lineHeight !== '' && font.lineHeight !== null)
            ? font.lineHeight
            : style.lineHeight;

        const effectiveLetterSpacing = (font.letterSpacing !== undefined && font.letterSpacing !== '' && font.letterSpacing !== null)
            ? font.letterSpacing
            : style.letterSpacing;

        return {
            baseFontSize: font.baseFontSize ?? style.baseFontSize,
            scale: font.scale ?? style.fontScales.fallback,
            lineHeight: effectiveLineHeight,
            letterSpacing: effectiveLetterSpacing,
            weight: resolveWeightForFont(font, font.weightOverride ?? style.weight) // Use override OR global (resolved for this font)
        };
    };

    // Helper to get primary font from fonts array
    const getPrimaryFont = () => fonts.find(f => f.type === 'primary');

    const getFontsForStyle = (styleId) => {
        return (fontStyles[styleId]?.fonts || []).slice();
    };

    // Add a new fallback font
    const addFallbackFont = (fontData) => {
        setFonts(prev => [...prev, fontData]);
    };

    // Add multiple fallback fonts (batch)
    const addFallbackFonts = (fontsDataArray) => {
        setFonts(prev => [...prev, ...fontsDataArray]);
    };

    // Remove a fallback font
    const removeFallbackFont = (fontId) => {
        setFonts(prev => {
            const filtered = prev.filter(f => f.id !== fontId);
            const reassigned = filtered.map((f, i) => ({
                ...f,
                type: i === 0 ? 'primary' : 'fallback'
            }));

            // If we removed the active font, or if activeFont is no longer in the list:
            // (Note: we can't check 'activeFont' state directly inside the updater if we count on synchronous logic 
            // but we can check if the ID is gone).
            // Actually, we need to update activeFont separately or here?
            // Since setActiveFont is separate state, we should do it outside or in a useEffect, 
            // but here we can't easily effect the other state atom.
            // Wait, updateStyleState handles 'fonts'. 'activeFont' is a sibling property in the style object?
            // No, the style object contains { fonts, activeFont ... }.

            return reassigned;
        });

        // We also need to ensure activeFont points to something valid if we removed the current one.
        // But since we are using 'setFonts' which wraps 'updateStyleState' for 'fonts', we should probably 
        // update 'activeFont' in the same pass if possible, OR rely on a check.
        // The original code did: if (activeFont === fontId) setActiveFont('primary');
        // Now 'primary' might be the ID of the deleted font if it was the default one.
        // We should set activeFont to the ID of the new head, or null if empty.

        // This is tricky because `setFonts` is a helper that only updates `fonts`.
        // I should rewrite this to use `updateStyleState` directly to update both fields atomically.

        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const filtered = (prev.fonts || []).filter(f => f.id !== fontId);
            const newFonts = filtered.map((f, i) => ({
                ...f,
                type: i === 0 ? 'primary' : 'fallback'
            }));

            let newActiveFont = prev.activeFont;
            if (prev.activeFont === fontId) {
                // If we deleted the active font, switch to the new primary (if exists)
                newActiveFont = newFonts.length > 0 ? newFonts[0].id : null;
            }

            return {
                ...prev,
                fonts: newFonts,
                activeFont: newActiveFont
            };
        });
    };

    // Reorder fonts (move a font from oldIndex to newIndex)
    // Reorder fonts (move a font from oldIndex to newIndex)
    const reorderFonts = (oldIndex, newIndex) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const currentFonts = prev.fonts || [];
            const newFonts = [...currentFonts];

            // Perform the move
            const [movedFont] = newFonts.splice(oldIndex, 1);
            newFonts.splice(newIndex, 0, movedFont);

            const primaryChanged = oldIndex === 0 || newIndex === 0;

            // Reassign types based on new position
            // Index 0 is always Primary, others are Fallback
            const finalFonts = newFonts.map((font, index) => {
                const nextType = index === 0 ? 'primary' : 'fallback';

                // If a fallback becomes the primary (or primary moves away), reset all fallback overrides
                // so they inherit from the new primary by default.
                if (primaryChanged && nextType === 'fallback') {
                    return {
                        ...font,
                        type: nextType,
                        type: nextType,
                        baseFontSize: undefined,
                        scale: undefined,
                        lineHeight: undefined,
                        letterSpacing: undefined,
                        weightOverride: undefined
                    };
                }

                // Keep state clean: when something becomes the primary font, clear fallback-only overrides.
                if (primaryChanged && nextType === 'primary') {
                    return {
                        ...font,
                        type: nextType,
                        baseFontSize: undefined,
                        scale: undefined,
                        lineHeight: undefined,
                        letterSpacing: undefined,
                        weightOverride: undefined
                    };
                }

                return {
                    ...font,
                    type: nextType
                };
            });

            const newPrimary = finalFonts.find(f => f.type === 'primary');
            const nextWeight = primaryChanged && newPrimary
                ? resolveWeightForFont(newPrimary, prev.weight)
                : prev.weight;

            return {
                ...prev,
                fonts: finalFonts,
                weight: nextWeight
            };
        });
    };

    // Get the active font object
    const getActiveFont = () => fonts.find(f => f.id === activeFont);

    // Update a fallback font's override settings
    const updateFallbackFontOverride = (fontId, field, value) => {
        setFonts(prev => prev.map(f =>
            f.id === fontId
                ? { ...f, [field]: value }
                : f
        ));
    };

    // Reset a fallback font's overrides to use global settings
    const resetFallbackFontOverrides = (fontId) => {
        setFonts(prev => prev.map(f =>
            f.id === fontId && f.type === 'fallback'
                ? {
                    ...f,
                    baseFontSize: undefined,
                    scale: undefined,
                    lineHeight: undefined,
                    letterSpacing: undefined,
                    weightOverride: undefined
                }
                : f
        ));
    };

    // Get effective settings for a font (uses overrides if available, otherwise global)
    const getEffectiveFontSettings = (fontId) => {
        const font = fonts.find(f => f.id === fontId);
        if (!font) return null;

        if (font.type === 'primary') {
            return {
                baseFontSize,
                scale: fontScales.active,
                lineHeight,
                weight: resolveWeightForFont(font, weight) // Global weight (resolved for this font)
            };
        } else {
            // Fallback font: use overrides if set, otherwise use global fallback scale
            return {
                baseFontSize: font.baseFontSize ?? baseFontSize,
                scale: font.scale ?? fontScales.fallback,
                lineHeight: font.lineHeight ?? lineHeight,
                weight: resolveWeightForFont(font, font.weightOverride ?? weight) // Override OR global (resolved for this font)
            };
        }
    };

    const updateLineHeightOverride = (langId, value) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            lineHeightOverrides: {
                ...prev.lineHeightOverrides,
                [langId]: value
            }
        }));
    };

    const updateLineHeightOverrideForStyle = (styleId, langId, value) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            lineHeightOverrides: {
                ...prev.lineHeightOverrides,
                [langId]: value
            }
        }));
    };

    const resetAllLineHeightOverrides = () => {
        updateStyleState(activeFontStyleId, prev => ({ ...prev, lineHeightOverrides: {} }));
    };

    const resetAllLineHeightOverridesForStyle = (styleId) => {
        updateStyleState(styleId, prev => ({ ...prev, lineHeightOverrides: {} }));
    };

    const updateFallbackScaleOverride = (langId, value) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackScaleOverrides: {
                ...prev.fallbackScaleOverrides,
                [langId]: value
            }
        }));
    };

    const resetAllFallbackScaleOverrides = () => {
        updateStyleState(activeFontStyleId, prev => ({ ...prev, fallbackScaleOverrides: {} }));
    };

    // Per-locale fallback font overrides
    const setFallbackFontOverride = (langId, fontId) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackFontOverrides: {
                ...prev.fallbackFontOverrides,
                [langId]: fontId
            }
        }));
    };

    const setFallbackFontOverrideForStyle = (styleId, langId, fontId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            fallbackFontOverrides: {
                ...prev.fallbackFontOverrides,
                [langId]: fontId
            }
        }));
    };

    const clearFallbackFontOverride = (langId) => {
        updateStyleState(activeFontStyleId, prev => {
            const next = { ...prev.fallbackFontOverrides };
            delete next[langId];
            return { ...prev, fallbackFontOverrides: next };
        });
    };

    const clearFallbackFontOverrideForStyle = (styleId, langId) => {
        updateStyleState(styleId, prev => {
            const next = { ...prev.fallbackFontOverrides };
            delete next[langId];
            return { ...prev, fallbackFontOverrides: next };
        });
    };

    const resetAllFallbackFontOverrides = () => {
        updateStyleState(activeFontStyleId, prev => ({ ...prev, fallbackFontOverrides: {} }));
    };

    const resetAllFallbackFontOverridesForStyle = (styleId) => {
        updateStyleState(styleId, prev => ({ ...prev, fallbackFontOverrides: {} }));
    };

    // Get the fallback font to use for a specific language
    // Returns fontId if overridden, or null to use cascade
    const getFallbackFontForLanguage = (langId) => {
        return fallbackFontOverrides[langId] || null;
    };

    const fontColors = activeStyle.fontColors;
    const setFontColors = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fontColors: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.fontColors) : valueOrUpdater
        }));
    };

    const updateFontColor = (index, color) => {
        setFontColors(prev => {
            const newColors = [...prev];
            while (newColors.length <= index) {
                newColors.push(DEFAULT_PALETTE[newColors.length % DEFAULT_PALETTE.length]);
            }
            newColors[index] = color;
            return newColors;
        });
    };

    const getFontColor = (index) => {
        if (fontColors[index]) {
            return fontColors[index];
        }
        return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
    };

    const getFontColorForStyle = (styleId, index) => {
        const style = fontStyles[styleId];
        const palette = style?.fontColors || DEFAULT_PALETTE;
        return palette[index] || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
    };

    const updateFontWeight = (fontId, newWeight) => {
        // Check if font is primary
        const isPrimary = fonts.find(f => f.id === fontId)?.type === 'primary';

        if (isPrimary) {
            setWeight(newWeight); // Update global weight
        } else {
            setFonts(prev => prev.map(f =>
                f.id === fontId
                    ? { ...f, weightOverride: newWeight }
                    : f
            ));
        }
    };

    const resetGlobalFallbackScaleForStyle = (styleId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            fontScales: {
                ...prev.fontScales,
                fallback: 100
            }
        }));
    };



    const resetFallbackFontOverridesForStyle = (styleId, fontId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            fonts: prev.fonts.map(f =>
                f.id === fontId && f.type === 'fallback'
                    ? {
                        ...f,
                        baseFontSize: undefined,
                        scale: undefined,
                        lineHeight: undefined,
                        letterSpacing: undefined,
                        weightOverride: undefined
                    }
                    : f
            )
        }));
    };



    const copyFontsFromPrimaryToSecondary = () => {
        const primaryFonts = fontStyles.primary?.fonts || [];
        if (primaryFonts.length === 0) return;

        // Clone all fonts from Primary (including the actual Primary font)
        const copiedFonts = primaryFonts.map((f, index) => ({
            ...f,
            id: `${f.id}-secondary-${Date.now()}-${index}`, // Ensure unique IDs
            // Reset overrides for the new context
            baseFontSize: undefined,
            scale: undefined,
            lineHeight: undefined,
            letterSpacing: undefined,
            weightOverride: undefined,
            // The first font from Primary becomes the Primary for Secondary (type 'primary')
            // All subsequent fonts become fallback (type 'fallback')
            type: index === 0 ? 'primary' : 'fallback'
        }));

        updateStyleState('secondary', prev => {
            // We are deliberately replacing the ENTIRE stack in Secondary with the copy from Primary
            // because the user clicked "Copy from Primary", implying a full reset/sync.
            // If we wanted to append, the logic would be different, but "Copy from Primary" usually implies "Make it look like Primary".
            // However, the request says "including the 'primary font' but instead use that font as the 'Secondary font' at the top... followed by... fallbacks".

            // To be safe and avoid deleting existing work if the user just wanted to bring them over:
            // But usually "Copy X to Y" when Y is empty (or when this button is shown) implies setting Y.
            // Given the button is only shown when "!fonts.some(f => f.type === 'fallback')", 
            // the secondary stack might still have a Primary font (if uploaded manually) or might be empty.

            // If the user already uploaded a Secondary Primary font, we probably shouldn't overwrite it 
            // UNLESS the user explicitly wants to "Copy from Primary" which might imply overwriting.
            // But let's look at the requirement: "use that font as the 'Secondary font' at the top of the list".

            // If we strictly follow "use that font as the 'Secondary font' at the top", we are replacing the current head.

            return {
                ...prev,
                fonts: copiedFonts
            };
        });
    };

    const [headerFontStyleMap, setHeaderFontStyleMap] = useState({
        h1: 'primary',
        h2: 'primary',
        h3: 'primary',
        h4: 'primary',
        h5: 'primary',
        h6: 'primary'
    });

    const setHeaderFontStyle = (tag, styleId) => {
        setHeaderFontStyleMap(prev => ({ ...prev, [tag]: styleId }));
    };

    const resetHeaderLineHeightOverride = useCallback((tag) => {
        const styleId = headerFontStyleMap?.[tag] || activeFontStyleId || 'primary';
        const lh = fontStyles?.[styleId]?.lineHeight ?? DEFAULT_HEADER_STYLES?.[tag]?.lineHeight ?? 1.2;

        setHeaderStyles(prev => ({
            ...prev,
            [tag]: {
                ...prev[tag],
                lineHeight: lh
            }
        }));

        setHeaderOverrides(prev => {
            const next = { ...(prev || {}) };
            if (!next[tag]) return prev;
            const copy = { ...next[tag] };
            delete copy.lineHeight;
            next[tag] = copy;
            return next;
        });
    }, [headerFontStyleMap, activeFontStyleId, fontStyles, DEFAULT_HEADER_STYLES]);

    const getExportConfiguration = useCallback(() => {
        // Create a deep clean copy of fontStyles that removes non-serializable fontObjects
        const cleanFontStyles = {};

        Object.keys(fontStyles).forEach(styleId => {
            const style = fontStyles[styleId];
            cleanFontStyles[styleId] = {
                ...style,
                fonts: (style.fonts || []).map(font => {
                    // Filter out fontObject (Opentype object) and URL which might be blob
                    const serializableFont = { ...font };
                    delete serializableFont.fontObject;
                    delete serializableFont.fontUrl;
                    return serializableFont;
                })
            };
        });

        return {
            activeFontStyleId,
            fontStyles: cleanFontStyles,
            headerStyles,
            headerOverrides,
            textOverrides,
            visibleLanguageIds,
            colors: colors || DEFAULT_PALETTE,
            headerFontStyleMap,
            textCase,
            viewMode,
            gridColumns,
            showFallbackColors
        };
    }, [
        activeFontStyleId,
        fontStyles,
        headerStyles,
        headerOverrides,
        textOverrides,
        visibleLanguageIds,
        colors,
        headerFontStyleMap,
        textCase,
        viewMode,
        gridColumns,
        showFallbackColors
    ]);

    const restoreConfiguration = useCallback(async (config, fontFilesMap = {}) => {
        if (!config) return;

        // Restore simple state
        setActiveFontStyleId(config.activeFontStyleId || 'primary');
        setHeaderStyles(config.headerStyles || DEFAULT_HEADER_STYLES);
        setHeaderOverrides(config.headerOverrides || {});
        setTextOverrides(config.textOverrides || {});

        if (config.visibleLanguageIds) {
            setVisibleLanguageIds(config.visibleLanguageIds);
        }

        if (config.colors) setColors(config.colors);
        if (config.showFallbackColors !== undefined) setShowFallbackColors(config.showFallbackColors);

        // Restore extended settings
        if (config.headerFontStyleMap) setHeaderFontStyleMap(config.headerFontStyleMap);
        if (config.textCase) setTextCase(config.textCase);
        if (config.viewMode) setViewMode(config.viewMode);
        if (config.gridColumns) setGridColumns(config.gridColumns);

        // Restore Font Styles
        const processStyle = async (style) => {
            if (!style) return createEmptyStyleState();

            const newFonts = await Promise.all((style.fonts || []).map(async (font) => {
                let fontObject = null;
                let fontUrl = null;
                let metadata = {
                    axes: font.axes,
                    isVariable: font.isVariable,
                    staticWeight: font.staticWeight
                };

                // If we have a file provided in the map
                if (font.fileName && fontFilesMap[font.fileName]) {
                    const file = fontFilesMap[font.fileName];
                    try {
                        const { font: parsedFont, metadata: parsedMeta } = await parseFontFile(file);
                        fontObject = parsedFont;
                        fontUrl = createFontUrl(file);
                        metadata = parsedMeta;
                    } catch (e) {
                        console.error("Failed to parse font file during restore", file.name, e);
                    }
                } else if (font.fontUrl && !font.fileName) {
                    // Case: System fonts or remote fonts that don't need upload? 
                    // Currently the app only supports local uploads or system fonts (no URL).
                    // If fontUrl exists but no fileName, it might be a blob URL which is invalid now.
                    // We should clear it.
                    // Ideally system fonts have name but no fontObject/Url.
                }

                return {
                    ...font,
                    fontObject,
                    fontUrl,
                    axes: metadata.axes,
                    isVariable: metadata.isVariable,
                    staticWeight: metadata.staticWeight
                };
            }));

            return {
                ...style,
                fonts: newFonts
            };
        };

        const newPrimaryStyle = await processStyle(config.fontStyles?.primary);
        const newSecondaryStyle = await processStyle(config.fontStyles?.secondary || createEmptySecondaryStyleState());

        setFontStyles({
            primary: newPrimaryStyle,
            secondary: newSecondaryStyle
        });

    }, [DEFAULT_HEADER_STYLES]);

    return (
        <TypoContext.Provider value={{
            languages,
            visibleLanguageIds,
            visibleLanguages,
            isLanguageVisible,
            setLanguageVisibility,
            toggleLanguageVisibility,
            showAllLanguages,
            hideAllLanguages,
            resetVisibleLanguages,

            activeFontStyleId,
            setActiveFontStyleId,
            fontStyles,
            getFontsForStyle,
            getFontSizesForStyle,
            getEffectiveFontSettingsForStyle,
            getFontColorForStyle,
            getFallbackFontOverrideForStyle,
            getFallbackScaleOverrideForStyle,
            getPrimaryFontFromStyle,

            updateLineHeightOverrideForStyle,
            resetAllLineHeightOverridesForStyle,
            setFallbackFontOverrideForStyle,
            clearFallbackFontOverrideForStyle,
            resetAllFallbackFontOverridesForStyle,
            resetGlobalFallbackScaleForStyle,
            resetFallbackFontOverridesForStyle,
            copyFontsFromPrimaryToSecondary,
            getExportConfiguration,
            restoreConfiguration,

            // NEW: Multi-font system
            fonts,
            setFonts,
            fontColors, // Expose colors state
            setFontColors,
            updateFontColor,
            getFontColor, // Expose helper
            activeFont,
            setActiveFont,
            getPrimaryFont,
            getActiveFont,
            addFallbackFont,
            addFallbackFonts,
            removeFallbackFont,
            reorderFonts,
            updateFallbackFontOverride,
            resetFallbackFontOverrides,
            getEffectiveFontSettings,
            updateFontWeight,

            // Existing values
            fontObject,
            fontUrl,
            fileName,
            loadFont,
            fallbackFont,
            setFallbackFont,
            colors,
            setColors,
            fontSizes, // Derived
            baseFontSize,
            setBaseFontSize,
            fontScales,
            setFontScales,
            lineHeight,
            setLineHeight,
            letterSpacing,
            setLetterSpacing,
            weight,
            setWeight,
            lineHeightOverrides,
            updateLineHeightOverride,
            resetAllLineHeightOverrides,
            fallbackScaleOverrides,
            updateFallbackScaleOverride,
            resetAllFallbackScaleOverrides,
            fallbackFontOverrides,
            setFallbackFontOverride,
            clearFallbackFontOverride,
            resetAllFallbackFontOverrides,
            getFallbackFontForLanguage,
            gridColumns,
            setGridColumns,
            textCase,
            setTextCase,
            viewMode,
            setViewMode,
            fallbackOptions,
            showFallbackColors,
            setShowFallbackColors,
            isFallbackLinked,
            setIsFallbackLinked,
            headerStyles,
            setHeaderStyles,
            DEFAULT_HEADER_STYLES,
            headerOverrides,
            markHeaderOverride,
            clearHeaderOverride,
            resetHeaderStyleProperty,
            resetHeaderStyle,
            resetAllHeaderStyles,
            updateHeaderStyle,
            resetHeaderLineHeightOverride,
            headerFontStyleMap,
            setHeaderFontStyle,
            // Backward compatibility: expose headerScales as computed value
            headerScales: Object.fromEntries(
                Object.entries(headerStyles).map(([tag, style]) => [tag, style.scale])
            ),
            textOverrides,
            setTextOverride,
            resetTextOverride,
            showAlignmentGuides,
            setShowAlignmentGuides,
            toggleAlignmentGuides: () => setShowAlignmentGuides(prev => !prev)
        }}>
            {children}
        </TypoContext.Provider>
    );
};

export default TypoContext;
