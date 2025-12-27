import { useEffect, useState, useMemo, useCallback } from 'react';
import { fallbackOptions, DEFAULT_PALETTE } from '../data/constants';
import languages from '../data/languages.json';
import { resolveWeightForFont } from '../utils/weightUtils';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import { ConfigService } from '../services/ConfigService';

import { TypoContext } from './TypoContextDefinition';




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
            staticWeight: null,
            // selectedWeight removed, will use weightOverride if needed
            color: DEFAULT_PALETTE[0]
        }
    ],
    activeFont: 'primary',
    baseFontSize: 60,
    weight: 400, // Global weight for this style
    fontScales: { active: 100, fallback: 100 },
    isFallbackLinked: true,
    lineHeight: 'normal',
    previousLineHeight: 1.2, // Store previous line height for toggling Auto
    letterSpacing: 0,
    fallbackFont: 'sans-serif',
    fallbackLineHeight: 'normal',
    fallbackLetterSpacing: 0,
    lineHeightOverrides: {},
    fallbackScaleOverrides: {},
    fallbackFontOverrides: {},
    primaryFontOverrides: {},
    configuredLanguages: [], // List of language IDs visible in sidebar
    // fontColors removed, stored in fonts
    baseRem: 16
});



export const TypoProvider = ({ children }) => {
    const [activeFontStyleId, setActiveFontStyleId] = useState('primary');

    const [fontStyles, setFontStyles] = useState(() => ({
        primary: createEmptyStyleState()
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
        h1: { scale: 3.75, lineHeight: 1.2, letterSpacing: 0 },
        h2: { scale: 3.0, lineHeight: 1.2, letterSpacing: 0 },
        h3: { scale: 2.25, lineHeight: 1.2, letterSpacing: 0 },
        h4: { scale: 1.875, lineHeight: 1.2, letterSpacing: 0 },
        h5: { scale: 1.5, lineHeight: 1.2, letterSpacing: 0 },
        h6: { scale: 1.125, lineHeight: 1.2, letterSpacing: 0 }
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

    // activeConfigTab tracks the sidebar selection (e.g. 'primary' or a language ID)
    const [activeConfigTab, setActiveConfigTab] = useState('ALL');

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
            // Ensure baseRem is preserved if not in updater
            if (next && next.baseRem === undefined && current.baseRem !== undefined) {
                next.baseRem = current.baseRem;
            }
            return { ...prev, [styleId]: next };
        });
    };

    const getFontSizesForStyle = (styleId) => {
        const style = fontStyles[styleId] || createEmptyStyleState();
        return {
            active: Math.round(style.baseFontSize),
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

    const baseRem = activeStyle.baseRem || 16;
    const setBaseRem = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            baseRem: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.baseRem) : valueOrUpdater
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

    const toggleGlobalLineHeightAuto = useCallback(() => {
        updateStyleState(activeFontStyleId, prev => {
            const isAuto = prev.lineHeight === 'normal';
            console.log('[TypoContext] toggleGlobalLineHeightAuto called. Current isAuto:', isAuto, 'prev:', prev.lineHeight, 'previous:', prev.previousLineHeight);

            if (isAuto) {
                // Restore
                // SAFEGUARD: Ensure we don't restore 'normal' if previousLineHeight was somehow saved as 'normal'
                let restored = prev.previousLineHeight;
                if (restored === 'normal' || restored === undefined || restored === null) {
                    restored = 1.2;
                }
                console.log('[TypoContext] Restoring line height to:', restored);

                return {
                    ...prev,
                    lineHeight: restored
                };
            } else {
                // Save and set Auto
                console.log('[TypoContext] Setting line height to Auto. Saving previous:', prev.lineHeight);
                return {
                    ...prev,
                    previousLineHeight: prev.lineHeight,
                    lineHeight: 'normal'
                };
            }
        });
    }, [activeFontStyleId]);

    const previousLineHeight = activeStyle.previousLineHeight;
    const setPreviousLineHeight = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            previousLineHeight: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.previousLineHeight) : valueOrUpdater
        }));
    };

    const letterSpacing = activeStyle.letterSpacing;
    const setLetterSpacing = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            letterSpacing: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.letterSpacing) : valueOrUpdater
        }));
    };

    const fallbackLineHeight = activeStyle.fallbackLineHeight;
    const setFallbackLineHeight = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackLineHeight: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.fallbackLineHeight) : valueOrUpdater
        }));
    };

    const fallbackLetterSpacing = activeStyle.fallbackLetterSpacing;
    const setFallbackLetterSpacing = (valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackLetterSpacing: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev.fallbackLetterSpacing) : valueOrUpdater
        }));
    };

    const lineHeightOverrides = activeStyle.lineHeightOverrides || {};
    const fallbackScaleOverrides = activeStyle.fallbackScaleOverrides || {};
    const fallbackFontOverrides = activeStyle.fallbackFontOverrides || {};

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
    const [showBrowserGuides, setShowBrowserGuides] = useState(false);

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

    const getFallbackFontOverrideForStyle = (styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.fallbackFontOverrides?.[langId] || null;
    };

    const getFallbackScaleOverrideForStyle = (styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.fallbackScaleOverrides?.[langId];
    };

    const getDefaultVisibleLanguageIds = () => [
        // Default to empty. 'en-US' will be shown as a placeholder if this list is empty.
    ];

    const [visibleLanguageIds, setVisibleLanguageIds] = useState(() => {
        return getDefaultVisibleLanguageIds();
    });

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

    // List of ALL languages that have any configuration (explicit or overrides)
    const allConfiguredLanguageIds = useMemo(() => {
        return Array.from(new Set([
            'en-US', // Always include default
            ...visibleLanguageIds,
            ...(activeStyle.configuredLanguages || []),
            ...Object.keys(activeStyle.primaryFontOverrides || {}),
            ...Object.keys(activeStyle.fallbackFontOverrides || {})
        ]));
    }, [visibleLanguageIds, activeStyle.configuredLanguages, activeStyle.primaryFontOverrides, activeStyle.fallbackFontOverrides]);

    // List of visible languages should now always follow configured languages.
    // Individual filtering (e.g. by Group) is handled at the UI layer in App.jsx.
    // This prevents the "Focus Mode" that was hiding languages when selecting a sidebar item.
    const effectiveVisibleLanguageIds = useMemo(() => {
        return allConfiguredLanguageIds;
    }, [allConfiguredLanguageIds]);

    const visibleLanguages = languages.filter(l => effectiveVisibleLanguageIds.includes(l.id));

    const loadFont = (font, url, name, metadata = {}) => {
        const styleId = activeFontStyleId;
        const initialWeight = metadata.axes?.weight?.default ?? metadata.staticWeight ?? 400;

        updateStyleState(styleId, prev => ({
            ...prev,
            lineHeight: 'normal', // Reset to Auto when loading a new primary font
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
                            // Keep existing color
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
                        staticWeight: metadata.staticWeight ?? null,
                        color: DEFAULT_PALETTE[(prev.fonts || []).length % DEFAULT_PALETTE.length]
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
                scale: 100,
                lineHeight: style.lineHeight,
                weight: resolveWeightForFont(font, style.weight),
                lineGapOverride: font.lineGapOverride,
                ascentOverride: font.ascentOverride,
                descentOverride: font.descentOverride
            };
        }

        // Fallback or Primary Override (treated as fallback type but linked to primary logic)
        let finalScale = font.scale;
        let finalH1Rem = font.h1Rem;

        // Defaults if no override
        if (finalScale === undefined) {
            // UPDATED: Always default to fallback scale (even for primary overrides) 
            // so Global Scale Adjust controls them.
            finalScale = style.fontScales?.fallback ?? 100;
        }

        // Resolve Line Height
        const defaultLineHeight = (font.isPrimaryOverride)
            ? style.lineHeight
            : (style.fallbackLineHeight !== undefined ? style.fallbackLineHeight : style.lineHeight);

        const fontLineHeight = font.lineHeight;

        const effectiveLineHeight = (fontLineHeight !== undefined && fontLineHeight !== '' && fontLineHeight !== null)
            ? fontLineHeight
            : defaultLineHeight;

        // Resolve Letter Spacing
        const defaultLetterSpacing = (font.isPrimaryOverride)
            ? style.letterSpacing
            : (style.fallbackLetterSpacing !== undefined ? style.fallbackLetterSpacing : style.letterSpacing);

        const fontLetterSpacing = font.letterSpacing;

        const effectiveLetterSpacing = (fontLetterSpacing !== undefined && fontLetterSpacing !== '' && fontLetterSpacing !== null)
            ? fontLetterSpacing
            : defaultLetterSpacing;

        // Resolve Overrides
        return {
            baseFontSize: font.baseFontSize ?? style.baseFontSize,
            scale: finalScale,
            h1Rem: finalH1Rem,
            lineHeight: effectiveLineHeight,
            letterSpacing: effectiveLetterSpacing,
            weight: resolveWeightForFont(font, font.weightOverride ?? style.weight),
            fontSizeAdjust: font.fontSizeAdjust,
            lineGapOverride: font.lineGapOverride,
            ascentOverride: font.ascentOverride,
            descentOverride: font.descentOverride
        };
    };

    // Helper to get primary font from fonts array
    const getPrimaryFont = () => fonts.find(f => f.type === 'primary');

    const getFontsForStyle = (styleId) => {
        return (fontStyles[styleId]?.fonts || []).slice();
    };

    // Helper to check if a font is a system font (added by name, no uploaded file)
    const isSystemFont = (font) => !font.fontObject;

    // Helper to normalize font names for comparison (strips extension, common suffixes, lowercase)
    const normalizeFontName = (name) => {
        if (!name) return '';
        let n = name.trim().toLowerCase();

        // Remove extension
        const lastDot = n.lastIndexOf('.');
        if (lastDot > 0) {
            n = n.substring(0, lastDot);
        }

        // Remove common suffixes to isolate family name
        // Order matters: specific longer suffixes first
        const suffixes = [
            '-regular', ' regular', '_regular',
            '-bold', ' bold', '_bold',
            '-italic', ' italic', '_italic',
            '-medium', ' medium', '_medium',
            '-light', ' light', '_light',
            '-thin', ' thin', '_thin',
            '-black', ' black', '_black',
            '-semibold', ' semibold', '_semibold',
            '-extrabold', ' extrabold', '_extrabold',
            '-extralight', ' extralight', '_extralight'
        ];

        for (const suffix of suffixes) {
            if (n.endsWith(suffix)) {
                n = n.substring(0, n.length - suffix.length);
            }
        }

        return n.replace(/[-_]/g, ' ').trim();
    };

    // Add a new fallback font
    // System fonts are appended at the end, uploaded fonts are inserted before system fonts
    const addFallbackFont = (fontData) => {
        setFonts(prev => {
            // Check for duplication against primary font
            const primary = prev.find(f => f.type === 'primary');
            if (primary) {
                const pName = normalizeFontName(primary.fileName || primary.name);
                const nName = normalizeFontName(fontData.fileName || fontData.name);

                const isDupName = pName && nName && pName === nName;
                const isDupFile = primary.fileName && fontData.fileName && primary.fileName === fontData.fileName;

                if (isDupName || isDupFile) {
                    console.warn('[TypoContext] Attempted to add primary font as fallback. Skipping.');
                    return prev;
                }

                // Also check against existing fallbacks to prevent double-adding the same system font
                const isExistingFallback = prev.some(f => {
                    if (f.type !== 'fallback') return false;
                    const fName = normalizeFontName(f.fileName || f.name);
                    return fName === nName;
                });

                if (isExistingFallback) {
                    console.warn('[TypoContext] Attempted to add duplicate fallback font. Skipping.');
                    return prev;
                }
            }

            const nextColor = DEFAULT_PALETTE[prev.length % DEFAULT_PALETTE.length];
            const newFont = { ...fontData, color: nextColor };

            // If adding a system font, append at the end
            if (isSystemFont(newFont)) {
                return [...prev, newFont];
            }

            // If adding an uploaded font, insert after the last uploaded font but before system fonts
            const lastUploadedIndex = prev.reduce((lastIdx, font, idx) => {
                return !isSystemFont(font) ? idx : lastIdx;
            }, -1);

            // Insert after the last uploaded font (or after primary if no uploaded fallbacks yet)
            const insertIndex = lastUploadedIndex + 1;
            const before = prev.slice(0, insertIndex);
            const after = prev.slice(insertIndex);
            return [...before, newFont, ...after];
        });
    };

    // Add multiple fallback fonts (batch)
    const addFallbackFonts = (fontsDataArray) => {
        setFonts(prev => {
            const primary = prev.find(f => f.type === 'primary');
            const pName = primary ? normalizeFontName(primary.fileName || primary.name) : null;

            // Filter out duplicates (against primary AND existing fallbacks)
            const uniqueFonts = fontsDataArray.filter(f => {
                const nName = normalizeFontName(f.fileName || f.name);

                // Check against primary
                if (primary) {
                    const isDupName = pName && nName && pName === nName;
                    const isDupFile = primary.fileName && f.fileName && primary.fileName === f.fileName;
                    if (isDupName || isDupFile) return false;
                }

                // Check against existing fallbacks
                const isExisting = prev.some(existing => {
                    if (existing.type !== 'fallback') return false;
                    const existingName = normalizeFontName(existing.fileName || existing.name);
                    return existingName === nName;
                });

                return !isExisting;
            });

            if (uniqueFonts.length === 0) return prev;

            let currentLen = prev.length;
            const newFonts = uniqueFonts.map((f, i) => ({
                ...f,
                color: DEFAULT_PALETTE[(currentLen + i) % DEFAULT_PALETTE.length]
            }));
            return [...prev, ...newFonts];
        });
    };

    // New function to create a language-specific clone of a font
    const addLanguageSpecificFont = (originalFontId, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];
            const originalFont = fonts.find(f => f.id === originalFontId);

            if (!originalFont) {
                console.warn('[TypoContext] Original font not found for cloning:', originalFontId);
                return prev;
            }

            // Create a unique ID for the new language-specific font
            const newFontId = `lang-${langId}-${Date.now()}`;

            // Create the clone
            const newFont = {
                ...originalFont, // Clone properties
                id: newFontId,
                type: 'fallback',
                isLangSpecific: true,
                // Reset/Remove specific properties that shouldn't be blindly copied if they were overrides on the original (though original is likely global)
                // If original was a global fallback, it has normal props.
                // We want to start 'fresh' effectively, but inheriting the File/FontObject.
                hidden: false,
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            // Remove any existing override for THIS specific original font in THIS language
            // (In case one exists, though UI might prevent it)
            const currentOverrides = prev.fallbackFontOverrides?.[langId];
            let existingOverrideFontId = null;
            if (typeof currentOverrides === 'object' && currentOverrides !== null) {
                existingOverrideFontId = currentOverrides[originalFontId];
            } else if (typeof currentOverrides === 'string') {
                // Legacy support/cleanup (unlikely to hit if we migrate properly, but safe to check)
                // If the legacy single override happens to be for this font (we can't know for sure without the map)
                // So we assume legacy clears out.
            }

            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                const existingFont = nextFonts.find(f => f.id === existingOverrideFontId);
                if (existingFont && existingFont.isLangSpecific) {
                    nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
                }
            }

            // Add the new font
            nextFonts.push(newFont);

            // Update the override map: ensure structure is { [langId]: { [originalFontId]: overrideId } }
            const startOverrides = prev.fallbackFontOverrides || {};
            const langOverrides = typeof startOverrides[langId] === 'object' ? { ...startOverrides[langId] } : {};

            langOverrides[originalFontId] = newFontId;

            const nextOverrides = {
                ...startOverrides,
                [langId]: langOverrides
            };

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
    };

    // New function to create a language-specific clone of the PRIMARY font
    const addLanguageSpecificPrimaryFont = (langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];
            const primaryFont = fonts.find(f => f.type === 'primary');

            if (!primaryFont) {
                console.warn('[TypoContext] No primary font found for cloning.');
                return prev;
            }

            // Create a unique ID for the new language-specific font
            const newFontId = `lang-primary-${langId}-${Date.now()}`;

            // Create the clone
            // treat it as a fallback typographically (so it renders later if needed, though for primary override it replaces primary)
            // But we mark it as `isPrimaryOverride: true`
            const newFont = {
                ...primaryFont,
                id: newFontId,
                type: 'fallback', // Technical type for CSS generation (reusing fallback logic)
                isLangSpecific: true,
                isPrimaryOverride: true,
                hidden: false,
                // Reset overrides so they start fresh (inheriting from primary by default via UI, but technically distinct)
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            // Remove any existing override font for this language
            const existingOverrideFontId = prev.primaryFontOverrides?.[langId];
            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                // If the existing override was in a group, we might want to preserve that group?
                // But this function implies "Reset/Add New".
                // If targetGroupId is passed, we use that.
                // If not passed, we might want to check if existing one had a group?
                // For now, simple logic: explicit arguments win.
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            // Add the new font
            nextFonts.push(newFont);

            // Update the override map
            const nextOverrides = {
                ...(prev.primaryFontOverrides || {}),
                [langId]: newFontId
            };

            return {
                ...prev,
                fonts: nextFonts,
                primaryFontOverrides: nextOverrides
            };
        });
        setLanguageVisibility(langId, true);
    };

    // New function to create a language-specific clone of an EXISTING font (by ID) as a primary override
    const addLanguageSpecificPrimaryFontFromId = (sourceFontId, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];
            const sourceFont = fonts.find(f => f.id === sourceFontId);

            if (!sourceFont) {
                console.warn('[TypoContext] Source font not found for cloning:', sourceFontId);
                return prev;
            }

            // Create a unique ID for the new language-specific font
            const newFontId = `lang-primary-${langId}-${Date.now()}`;

            // Create the clone
            const newFont = {
                ...sourceFont,
                id: newFontId,
                type: 'fallback', // Technical type for CSS generation
                isLangSpecific: true,
                isPrimaryOverride: true,
                hidden: false,
                // Reset overrides so they start fresh
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            // Remove any existing override font for this language
            const existingOverrideFontId = prev.primaryFontOverrides?.[langId];
            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            // Add the new font
            nextFonts.push(newFont);

            // Update the override map
            const nextOverrides = {
                ...(prev.primaryFontOverrides || {}),
                [langId]: newFontId
            };

            return {
                ...prev,
                fonts: nextFonts,
                primaryFontOverrides: nextOverrides
            };
        });
        setLanguageVisibility(langId, true);
    };



    const addPrimaryLanguageOverrides = (languageIds) => {
        languageIds.forEach(langId => {
            // Only add if it doesn't already exist as a primary override
            if (!activeStyle.primaryFontOverrides?.[langId]) {
                addLanguageSpecificPrimaryFont(langId);
            }
        });
    };

    /**
     * Directly add a new font as a primary language override.
     * Used by the FontLanguageModal interstitial.
     */
    const addPrimaryLanguageOverrideWithFont = (font, url, name, metadata, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];

            // Create a unique ID for the new language-specific font
            const newFontId = `lang-primary-${langId}-${Date.now()}`;

            // Create the font entry
            const newFont = {
                id: newFontId,
                type: 'fallback',
                fontObject: font,
                fontUrl: url,
                fileName: name,
                name: name,
                axes: metadata.axes,
                isVariable: metadata.isVariable,
                staticWeight: metadata.staticWeight ?? null,
                isLangSpecific: true,
                isPrimaryOverride: true,
                hidden: false,
                color: DEFAULT_PALETTE[(fonts.length) % DEFAULT_PALETTE.length]
            };

            // Remove any existing override font for this language
            const existingOverrideFontId = prev.primaryFontOverrides?.[langId];
            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            // Add the new font
            nextFonts.push(newFont);

            // Update the override map
            const nextOverrides = {
                ...(prev.primaryFontOverrides || {}),
                [langId]: newFontId
            };

            return {
                ...prev,
                fonts: nextFonts,
                primaryFontOverrides: nextOverrides
            };
        });
        setLanguageVisibility(langId, true);
    };

    /**
     * Directly add a new font as a fallback language override.
     */
    const addLanguageSpecificFallbackFont = (font, url, name, metadata, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];

            // Create a unique ID
            const newFontId = `lang-fallback-${langId}-${Date.now()}`;

            // Create the font entry
            const newFont = {
                id: newFontId,
                type: 'fallback',
                fontObject: font,
                fontUrl: url,
                fileName: name,
                name: name,
                axes: metadata.axes,
                isVariable: metadata.isVariable,
                staticWeight: metadata.staticWeight ?? null,
                isLangSpecific: true,
                isPrimaryOverride: false, // It is a fallback override
                hidden: false,
                color: DEFAULT_PALETTE[(fonts.length) % DEFAULT_PALETTE.length]
            };

            // Remove any existing fallback override font for this language
            const existingOverrideFontId = prev.fallbackFontOverrides?.[langId];
            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            // Add the new font
            nextFonts.push(newFont);

            // Update the override map
            const nextOverrides = {
                ...(prev.fallbackFontOverrides || {}),
                [langId]: newFontId
            };

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
        setLanguageVisibility(langId, true);
    };


    const clearPrimaryFontOverride = (langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const overrideFontId = prev.primaryFontOverrides?.[langId];
            if (!overrideFontId) return prev;

            // Remove from fonts array
            const nextFonts = (prev.fonts || []).filter(f => f.id !== overrideFontId);

            // Remove from overrides map
            const nextOverrides = { ...(prev.primaryFontOverrides || {}) };
            delete nextOverrides[langId];

            return {
                ...prev,
                fonts: nextFonts,
                primaryFontOverrides: nextOverrides
            };
        });
    };



    const removeLanguageSpecificFont = (fontId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            // Remove from fonts array
            const nextFonts = (prev.fonts || []).filter(f => f.id !== fontId);

            // Remove from overrides map
            const nextOverrides = { ...(prev.fallbackFontOverrides || {}) };

            // Find which keys point to this fontId and delete them
            Object.keys(nextOverrides).forEach(langId => {
                const val = nextOverrides[langId];
                if (val && typeof val === 'object') {
                    // Nested map: { originalId: overrideId }
                    Object.keys(val).forEach(origId => {
                        if (val[origId] === fontId) {
                            delete val[origId];
                        }
                    });
                } else if (val === fontId) {
                    // Legacy single string
                    delete nextOverrides[langId];
                }
            });

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
    };

    const addConfiguredLanguage = (langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const current = new Set(prev.configuredLanguages || []);
            if (current.has(langId)) return prev;

            return {
                ...prev,
                configuredLanguages: [...current, langId]
            };
        });
        setLanguageVisibility(langId, true);
    };

    const removeConfiguredLanguage = (langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            // 1. Remove from configured list
            const nextConfigured = (prev.configuredLanguages || []).filter(id => id !== langId);

            // 2. Clear Primary Override
            let nextFonts = [...(prev.fonts || [])];
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };

            if (nextPrimaryOverrides[langId]) {
                const overrideFontId = nextPrimaryOverrides[langId];
                nextFonts = nextFonts.filter(f => f.id !== overrideFontId);
                delete nextPrimaryOverrides[langId];
            }

            // 3. Clear Fallback Override
            const nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };

            // Note: If we remove the fallback override, we should also remove the font-entry if it's unique to this language
            if (nextFallbackOverrides[langId]) {
                const overrideFontId = nextFallbackOverrides[langId];
                // Check if this font ID is used by any OTHER language? (Unlikely if created as language specific)
                // But let's be safe. The removeLanguageSpecificFont logic handles "Find which keys point to this fontId and delete them".
                // Here we know the language ID.

                // Helper to remove font if it IS language specific
                const fontToRemove = nextFonts.find(f => f.id === overrideFontId);
                if (fontToRemove && fontToRemove.isLangSpecific) {
                    nextFonts = nextFonts.filter(f => f.id !== overrideFontId);
                }
                delete nextFallbackOverrides[langId];
            }

            return {
                ...prev,
                configuredLanguages: nextConfigured,
                fonts: nextFonts,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides
            };
        });
        setLanguageVisibility(langId, false);
    };

    const getPrimaryFontOverrideForStyle = (styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.primaryFontOverrides?.[langId] || null;
    };

    const removeFallbackFont = (fontId) => {
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

            // Cleanup Primary Overrides
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            Object.keys(nextPrimaryOverrides).forEach(langId => {
                if (nextPrimaryOverrides[langId] === fontId) {
                    delete nextPrimaryOverrides[langId];
                }
            });

            // Cleanup Fallback Overrides
            const nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };
            Object.keys(nextFallbackOverrides).forEach(langId => {
                const val = nextFallbackOverrides[langId];
                // Check if this font ID is the override itself
                if (val && typeof val === 'object') {
                    Object.keys(val).forEach(origId => {
                        if (val[origId] === fontId) {
                            delete val[origId];
                        }
                        // Also, if the REMOVED font (fontId) was the *Original* font, we should remove the override mapping for it.
                        if (origId === fontId) {
                            // Optionally delete the override font itself?
                            // For now we just unlink it.
                            delete val[origId];
                        }
                    });
                } else if (val === fontId) {
                    delete nextFallbackOverrides[langId];
                }
            });

            return {
                ...prev,
                fonts: newFonts,
                activeFont: newActiveFont,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides
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

            // Check if primary font identity changed
            const oldPrimaryId = currentFonts[0]?.id;
            const newPrimaryId = newFonts[0]?.id;
            const hasPrimaryChanged = oldPrimaryId && newPrimaryId && oldPrimaryId !== newPrimaryId;

            // Logic to swap colors: 
            // If primary changed, the new primary should take the old primary's color
            // And the old primary (now fallback) should take the new primary's original color.
            let colorSwapMap = {}; // fontId -> newColor
            if (hasPrimaryChanged) {
                const oldPrimaryFont = currentFonts.find(f => f.id === oldPrimaryId);
                const newPrimaryFont = currentFonts.find(f => f.id === newPrimaryId);

                if (oldPrimaryFont && newPrimaryFont) {
                    // Swap colors
                    colorSwapMap[newPrimaryId] = oldPrimaryFont.color; // New primary gets old primary's color (e.g. Black)
                    colorSwapMap[oldPrimaryId] = newPrimaryFont.color; // Old primary gets new primary's original color
                }
            }

            // Reassign types based on new position
            // Index 0 is always Primary, others are Fallback
            const finalFonts = newFonts.map((font, index) => {
                const nextType = index === 0 ? 'primary' : 'fallback';

                // Check if we need to swap color for this font
                const nextColor = colorSwapMap[font.id] !== undefined ? colorSwapMap[font.id] : font.color;

                // If a fallback becomes the primary (or primary moves away), reset all fallback overrides
                // so they inherit from the new primary by default.
                if (primaryChanged && nextType === 'fallback') {
                    return {
                        ...font,
                        type: nextType,
                        color: nextColor,
                        baseFontSize: undefined,
                        scale: undefined,
                        lineHeight: undefined,
                        letterSpacing: undefined,
                        weightOverride: undefined,
                        fontSizeAdjust: undefined,
                        lineGapOverride: undefined,
                        ascentOverride: undefined,
                        descentOverride: undefined
                    };
                }

                // Keep state clean: when something becomes the primary font, clear fallback-only overrides.
                if (primaryChanged && nextType === 'primary') {
                    return {
                        ...font,
                        type: nextType,
                        color: nextColor,
                        baseFontSize: undefined,
                        scale: undefined,
                        lineHeight: undefined,
                        letterSpacing: undefined,
                        weightOverride: undefined,
                        fontSizeAdjust: undefined,
                        lineGapOverride: undefined,
                        ascentOverride: undefined,
                        descentOverride: undefined
                    };
                }

                return {
                    ...font,
                    type: nextType,
                    color: nextColor
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

    // Toggle font visibility
    const toggleFontVisibility = (fontId) => {
        setFonts(prev => prev.map(f =>
            f.id === fontId
                ? { ...f, hidden: !f.hidden }
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
                    weightOverride: undefined,

                    fontSizeAdjust: undefined,
                    lineGapOverride: undefined,
                    ascentOverride: undefined,
                    descentOverride: undefined
                }
                : f
        ));
    };

    const toggleFallbackLineHeightAuto = (fontId) => {
        setFonts(prev => prev.map(f => {
            if (f.id !== fontId || f.type !== 'fallback') return f;

            const isAuto = f.lineHeight === 'normal';
            if (isAuto) {
                // Turning Auto OFF: Restore previous manual value (if any)
                let restored = f.previousLineHeight;
                // SAFEGUARD: If restored value is invalid or 'normal', default to 1.2
                if (restored === 'normal' || restored === undefined || restored === null) {
                    restored = 1.2;
                }
                return {
                    ...f,
                    lineHeight: restored
                };
            } else {
                // Turning Auto ON: Save current manual value
                return {
                    ...f,
                    previousLineHeight: f.lineHeight,
                    lineHeight: 'normal'
                };
            }
        }));
    };

    // Get effective settings for a font (uses overrides if available, otherwise global)
    const getEffectiveFontSettings = (fontId) => {
        return getEffectiveFontSettingsForStyle(activeFontStyleId, fontId);
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
        clearFallbackFontOverrideForStyle(activeFontStyleId, langId);
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



    const updateFontColor = (fontId, color) => {
        setFonts(prev => prev.map(f =>
            f.id === fontId ? { ...f, color } : f
        ));
    };

    const getFontColor = (fontId) => {
        const font = fonts.find(f => f.id === fontId);
        return font?.color || DEFAULT_PALETTE[0];
    };

    const getFontColorForStyle = (styleId, index) => {
        const style = fontStyles[styleId];
        const fonts = style?.fonts || [];
        if (fonts[index]) {
            return fonts[index].color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
        }
        return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
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
                        weightOverride: undefined,
                        fontSizeAdjust: undefined,
                        sizeAdjust: undefined
                    }
                    : f
            )
        }));
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
        return ConfigService.serializeConfig({
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
            showFallbackColors,
            showAlignmentGuides,
            showBrowserGuides,
            DEFAULT_PALETTE // Pass constant if needed by service, or let service handle default logic
        });
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
        showFallbackColors,
        showAlignmentGuides,
        showBrowserGuides
    ]);

    const restoreConfiguration = useCallback(async (rawConfig, fontFilesMap = {}) => {
        let config = ConfigService.normalizeConfig(rawConfig);
        if (!config) return;

        // NEW: Validate to remove orphaned overrides
        config = ConfigService.validateConfig(config);

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
        if (config.showAlignmentGuides !== undefined) setShowAlignmentGuides(config.showAlignmentGuides);
        if (config.showBrowserGuides !== undefined) setShowBrowserGuides(config.showBrowserGuides);

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
                ...createEmptyStyleState(),
                ...style,
                fonts: newFonts
            };
        };

        const newPrimaryStyle = await processStyle(config.fontStyles?.primary);

        setFontStyles({
            primary: newPrimaryStyle
        });

    }, [DEFAULT_HEADER_STYLES]);

    return (
        <TypoContext.Provider value={{
            languages,
            visibleLanguageIds: effectiveVisibleLanguageIds, // Expose the effective list (with placeholder)
            visibleLanguages,
            isLanguageVisible: (langId) => effectiveVisibleLanguageIds.includes(langId),
            setLanguageVisibility,
            toggleLanguageVisibility,
            showAllLanguages,
            hideAllLanguages,
            resetVisibleLanguages,

            activeConfigTab,
            setActiveConfigTab,

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
            getExportConfiguration,
            restoreConfiguration,

            // NEW: Multi-font system
            fonts,
            setFonts,
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
            toggleFallbackLineHeightAuto,
            getEffectiveFontSettings,
            updateFontWeight,
            addLanguageSpecificFont,
            addLanguageSpecificPrimaryFont,
            addLanguageSpecificPrimaryFontFromId,
            addPrimaryLanguageOverrides,
            addPrimaryLanguageOverrideWithFont,
            addLanguageSpecificFallbackFont,

            addConfiguredLanguage,
            removeConfiguredLanguage,

            configuredLanguages: allConfiguredLanguageIds, // Show everything that has config in Sidebar/Tabs

            getPrimaryFontOverrideForStyle,
            clearPrimaryFontOverride,
            removeLanguageSpecificFont,


            // Helper to check if a font is a system font
            // isSystemFont, // This line was malformed in the instruction snippet, removing it.

            // Existing values
            fontObject,
            fontUrl,
            fileName,
            loadFont,
            fallbackFont,
            setFallbackFont,
            toggleFontVisibility,
            colors,
            setColors,
            fontSizes, // Derived
            baseFontSize,
            setBaseFontSize,
            baseRem,
            setBaseRem,
            fontScales,
            setFontScales,
            lineHeight,
            setLineHeight,
            previousLineHeight,
            toggleGlobalLineHeightAuto,
            setPreviousLineHeight,
            letterSpacing,
            setLetterSpacing,
            fallbackLineHeight,
            setFallbackLineHeight,
            fallbackLetterSpacing,
            setFallbackLetterSpacing,
            weight,
            setWeight,
            lineHeightOverrides,
            updateLineHeightOverride,
            resetAllLineHeightOverrides,
            fallbackScaleOverrides,
            updateFallbackScaleOverride,
            resetAllFallbackScaleOverrides,
            fallbackFontOverrides,
            primaryFontOverrides: activeStyle.primaryFontOverrides || {},
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
            toggleAlignmentGuides: () => setShowAlignmentGuides(v => !v),
            showBrowserGuides,
            setShowBrowserGuides,
            toggleBrowserGuides: () => setShowBrowserGuides(v => !v)
        }}>
            {children}
        </TypoContext.Provider>
    );
};

export default TypoContext;
