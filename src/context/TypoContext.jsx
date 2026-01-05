import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fallbackOptions, DEFAULT_PALETTE } from '../data/constants';
import languagesData from '../data/languages.json';
import sampleSentences from '../data/sampleSentences.json';

// Merge sampleSentences into languages
const languages = languagesData.map(lang => ({
    ...lang,
    sampleSentence: lang.sampleSentence || sampleSentences[lang.id] || "The quick brown fox jumps over the lazy dog" // Fallback
}));
import { resolveWeightForFont } from '../utils/weightUtils';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import { ConfigService } from '../services/ConfigService';
import { PersistenceService } from '../services/PersistenceService';
import { safeParseFontFile } from '../services/SafeFontLoader';

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
    fallbackLetterSpacing: null,
    lineHeightOverrides: {},
    fallbackScaleOverrides: {},
    fallbackFontOverrides: {},
    primaryFontOverrides: {},
    systemFallbackOverrides: {},
    missingColor: '#b8b8b8',
    missingBgColor: '#f1f5f9',
    primaryLanguages: [], // Default primary language
    configuredLanguages: [], // List of language IDs visible in sidebar
    // fontColors removed, stored in fonts
    baseRem: 16
});



export const TypoProvider = ({ children }) => {
    const [activeFontStyleId, setActiveFontStyleId] = useState('primary');

    // Ref to track which fonts have been saved to IDB to avoid re-saving
    const persistedFontIds = useRef(new Set());

    // Ref to track if we are currently resetting the app (blocks auto-save)
    const isResetting = useRef(false);
    const [isAppResetting, setIsAppResetting] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

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

    const systemFallbackOverrides = activeStyle.systemFallbackOverrides || {};

    const updateSystemFallbackOverride = (langId, key, value) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            systemFallbackOverrides: {
                ...(prev.systemFallbackOverrides || {}),
                [langId]: {
                    ...(prev.systemFallbackOverrides?.[langId] || {}),
                    [key]: value
                }
            }
        }));
    };

    const resetSystemFallbackOverride = (langId, key) => {
        updateStyleState(activeFontStyleId, prev => {
            if (!prev.systemFallbackOverrides?.[langId]) return prev;

            const nextOverrides = { ...prev.systemFallbackOverrides };
            if (key) {
                const nextLangOverrides = { ...nextOverrides[langId] };
                delete nextLangOverrides[key];
                if (Object.keys(nextLangOverrides).length === 0) {
                    delete nextOverrides[langId];
                } else {
                    nextOverrides[langId] = nextLangOverrides;
                }
            } else {
                delete nextOverrides[langId];
            }

            return {
                ...prev,
                systemFallbackOverrides: nextOverrides
            };
        });
    };

    const missingColor = activeStyle.missingColor || '#b8b8b8';
    const setMissingColor = (color) => {
        updateStyleState(activeFontStyleId, prev => ({ ...prev, missingColor: color }));
    };

    const missingBgColor = activeStyle.missingBgColor || '#f1f5f9';
    const setMissingBgColor = (color) => {
        updateStyleState(activeFontStyleId, prev => ({ ...prev, missingBgColor: color }));
    };
    const [textCase, setTextCase] = useState('none');
    const [viewMode, setViewMode] = useState('h1');
    const [gridColumns, setGridColumns] = useState(1);
    const [showFallbackColors, setShowFallbackColors] = useState(true);
    const [colors, setColors] = useState({
        primary: '#0f172a'
    });
    const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
    const [showBrowserGuides, setShowBrowserGuides] = useState(false);
    const [showFallbackOrder, setShowFallbackOrder] = useState(false);

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



    const showAllLanguages = () => {
        setVisibleLanguageIds(languages.map(l => l.id));
    };

    const hideAllLanguages = () => {
        setVisibleLanguageIds([]);

        updateStyleState(activeFontStyleId, prev => {
            // Remove all language-specific fonts (clones/overrides)
            const nextFonts = (prev.fonts || []).filter(f => {
                if (f.isLangSpecific) return false;
                if (f.isPrimaryOverride) return false;
                if (f.isClone) return false;
                if (typeof f.id === 'string' && f.id.startsWith('lang-')) return false;
                return true;
            });

            return {
                ...prev,
                fonts: nextFonts,
                configuredLanguages: [],
                primaryFontOverrides: {},
                fallbackFontOverrides: {}
            };
        });
    };

    const resetVisibleLanguages = () => {
        setVisibleLanguageIds(getDefaultVisibleLanguageIds());
    };

    const togglePrimaryLanguage = (langId) => {
        updateStyleState(activeFontStyleId, prev => {
            // Enforce single selection: Selecting a new language makes it the ONLY primary language.
            // If clicking the ID that is already primary, we keep it as is (enforce always having 1)
            const current = prev.primaryLanguages || ['en-US'];
            if (current.includes(langId)) {
                return prev;
            }
            return {
                ...prev,
                primaryLanguages: [langId]
            };
        });

        // Ensure the language is visible
        setLanguageVisibility(langId, true);
    };

    // List of ALL languages that have any configuration (explicit or overrides)
    const allConfiguredLanguageIds = useMemo(() => {
        const idSet = new Set([
            ...visibleLanguageIds,
            ...(activeStyle.configuredLanguages || []),
            ...(activeStyle.primaryLanguages || []), // Include Primary Languages
            ...Object.keys(activeStyle.primaryFontOverrides || {}),
            ...Object.keys(activeStyle.fallbackFontOverrides || {})
        ]);

        // Return sorted by canonical order (as defined in languagesData)
        return languages.map(l => l.id).filter(id => idSet.has(id));
    }, [visibleLanguageIds, activeStyle.configuredLanguages, activeStyle.primaryLanguages, activeStyle.primaryFontOverrides, activeStyle.fallbackFontOverrides]);

    // NEW: Strict mapping (Only explicit overrides, ignoring "Auto"/Inherit)
    const strictlyMappedLanguageIds = useMemo(() => {
        return Array.from(new Set([
            ...Object.keys(activeStyle.primaryFontOverrides || {}),
            ...Object.keys(activeStyle.fallbackFontOverrides || {})
        ]));
    }, [activeStyle.primaryFontOverrides, activeStyle.fallbackFontOverrides]);


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

        updateStyleState(styleId, prev => {
            const oldPrimary = (prev.fonts || []).find(f => f.type === 'primary');
            const primaryLangIds = prev.primaryLanguages || [];
            const primaryOverrides = prev.primaryFontOverrides || {};

            const newFontData = {
                fontObject: font,
                fontUrl: url,
                fileName: name,
                name,
                axes: metadata.axes,
                isVariable: metadata.isVariable,
                staticWeight: metadata.staticWeight ?? null
            };

            const newFonts = (prev.fonts || []).some(f => f.type === 'primary')
                ? prev.fonts.map(f => {
                    if (f.type === 'primary') {
                        return {
                            ...f,
                            ...newFontData
                            // Keep existing color & id
                        };
                    }

                    // Check if this font is a clone of the old primary (used for overrides)
                    const isCloneOfOldPrimary = oldPrimary && (
                        (f.fontObject && f.fontObject === oldPrimary.fontObject) ||
                        (f.fileName && f.fileName === oldPrimary.fileName) ||
                        (!f.fileName && !oldPrimary.fileName && f.name === oldPrimary.name)
                    );

                    if (isCloneOfOldPrimary && f.isPrimaryOverride) {
                        // Crucial Check: Only update if this override belongs to a PRIMARY LANGUAGE.
                        // We must find which language points to this font ID.
                        const langId = Object.keys(primaryOverrides).find(id => primaryOverrides[id] === f.id);

                        // If it's a primary language, we update it to sync with the new primary font.
                        // If NOT, we leave it alone (it keeps the old font object/file).
                        if (langId && primaryLangIds.includes(langId)) {
                            return {
                                ...f,
                                ...newFontData
                                // Preserves id, overrides, etc.
                            };
                        }
                    }

                    return f;
                })
                : [
                    {
                        ...createEmptyStyleState().fonts[0],
                        ...newFontData,
                        color: DEFAULT_PALETTE[(prev.fonts || []).length % DEFAULT_PALETTE.length]
                    },
                    ...(prev.fonts || [])
                ];

            return {
                ...prev,
                lineHeight: 'normal', // Reset to Auto when loading a new primary font
                weight: prev.fonts.some(f => f.type === 'primary')
                    ? resolveWeightForFont(
                        {
                            fontObject: font,
                            axes: metadata.axes,
                            staticWeight: metadata.staticWeight ?? null
                        },
                        prev.weight
                    )
                    : initialWeight,
                fonts: newFonts,
                activeFont: prev.activeFont || 'primary'
            };
        });
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
            // Check if this is a cloned font and if the original global font has a scale set
            if (font.isClone) {
                // Find original global font by matching fileName/name
                const original = style.fonts.find(f =>
                    f.type === 'fallback' &&
                    !f.isClone &&
                    f.fileName === font.fileName &&
                    f.name === font.name
                );

                if (original && original.scale !== undefined) {
                    finalScale = original.scale;
                }
            }

            // If still undefined, use global fallback scale
            if (finalScale === undefined) {
                finalScale = style.fontScales?.fallback ?? 100;
            }
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
            : (style.fallbackLetterSpacing !== undefined && style.fallbackLetterSpacing !== null ? style.fallbackLetterSpacing : style.letterSpacing);

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

    // New function to add fonts directly as language-specific overrides (skipping global fallback list)
    const addStrictlyMappedFonts = (fontsDataArray, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const nextFonts = [...(prev.fonts || [])];

            // Prepare new fonts
            const newFonts = fontsDataArray.map((f, i) => {
                // Ensure unique ID if not already provided
                const id = f.id || `fallback-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
                return {
                    ...f,
                    id,
                    type: 'fallback',
                    isClone: true, // Hides from "Global" list in FontCards
                    isLangSpecific: true,
                    // Use a color from the palette
                    color: DEFAULT_PALETTE[(nextFonts.length + i) % DEFAULT_PALETTE.length]
                };
            });

            // Add to fonts array
            nextFonts.push(...newFonts);

            // Update overrides
            // Update overrides
            const startOverrides = prev.fallbackFontOverrides || {};
            const langOverrides = { ...startOverrides };

            // Map the language to the NEW font ID
            // Since addStrictlyMappedFonts is usually called with one font for one language (via addLanguageSpecificFont wrapper),
            // we need to know WHICH language. 
            // The signature is (fontsDataArray, langId).

            if (langId && newFonts.length > 0) {
                const currentLangOverrides = langOverrides[langId];
                let nextLangOverrides = {};

                if (typeof currentLangOverrides === 'object' && currentLangOverrides !== null) {
                    nextLangOverrides = { ...currentLangOverrides };
                }

                // Add all new fonts
                newFonts.forEach(font => {
                    nextLangOverrides[font.id] = font.id;
                });

                langOverrides[langId] = nextLangOverrides;
            }

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: langOverrides
            };


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
                isClone: true,
                isPrimaryMap: originalFont.type === 'primary',
                isPrimaryOverride: originalFont.type === 'primary' || originalFont.isPrimaryOverride,
                // Explicitly preserve color from original to avoid it shifting/defaulting
                color: originalFont.color,
                // Reset/Remove specific properties that shouldn't be blindly copied if they were overrides on the original
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
            const currentOverrides = prev.fallbackFontOverrides?.[langId];
            let existingOverrideFontId = null;
            if (typeof currentOverrides === 'object' && currentOverrides !== null) {
                existingOverrideFontId = currentOverrides[originalFontId];
            } else if (typeof currentOverrides === 'string') {
                existingOverrideFontId = currentOverrides;
            }

            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                const existingFont = nextFonts.find(f => f.id === existingOverrideFontId);
                // Only remove if it was a language specific font (avoid removing system refs if that case existed)
                if (existingFont && existingFont.isLangSpecific) {
                    nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
                }
            }

            // ALWAYS COPY/CLONE Logic (Standard):
            // We no longer "Move" global fonts (removing them from global list) because it breaks
            // other languages that might be using the global font, and prevents the "Shared" font concept.

            // Add the new font
            nextFonts.push(newFont);

            // Update the override map: ensure structure is { [langId]: { [originalFontId]: overrideId } }
            const startOverrides = prev.fallbackFontOverrides || {};

            // Get existing overrides for this language
            const currentLangOverrides = startOverrides[langId];
            let nextLangOverrides = {};

            if (typeof currentLangOverrides === 'object' && currentLangOverrides !== null) {
                nextLangOverrides = { ...currentLangOverrides };
            }

            // Add the new mapping
            nextLangOverrides[originalFontId] = newFontId;

            const nextOverrides = {
                ...startOverrides,
                [langId]: nextLangOverrides
            };

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
    };

    // New function to create a language-specific clone of the PRIMARY font
    const addLanguageSpecificPrimaryFont = (langId, options = {}) => {
        const { onlyIfMissing = false } = options;
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            if (onlyIfMissing && prev.primaryFontOverrides?.[langId]) {
                return prev;
            }

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
            // If not a primary language, treat as a fallback override for the primary font


            // Standard Primary Override Path
            const newFont = {
                ...primaryFont,
                id: newFontId,
                type: 'fallback',
                isLangSpecific: true,
                isPrimaryOverride: true,
                hidden: false,
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            const existingOverrideFontId = prev.primaryFontOverrides?.[langId];
            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            nextFonts.push(newFont);

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

            // Ensure language is supported!
            setLanguageVisibility(langId, true);

            // Create a unique ID for the new language-specific font
            const newFontId = `lang-primary-${langId}-${Date.now()}`;

            // Create the clone
            const newFont = {
                ...sourceFont,
                id: newFontId,
                type: 'fallback',
                isLangSpecific: true,
                isPrimaryOverride: true,
                hidden: false,
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            let nextFonts = [...fonts];



            const existingOverrideFontId = prev.primaryFontOverrides?.[langId];
            if (existingOverrideFontId) {
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            nextFonts.push(newFont);

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

    // Assign a font to a language (Move from Global to Language-Specific)
    const assignFontToLanguage = (fontId, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];
            const fontIndex = fonts.findIndex(f => f.id === fontId);

            // Safety check
            if (fontIndex === -1) return prev;

            // Cannot move Primary Font (Index 0) out of stack
            if (fontIndex === 0) {
                console.warn('[TypoContext] Cannot remove Primary font from global stack. Cloning override only.');
                // We fallback to just adding the specific primary font clone, without removing original
                // This duplicates the logic of addLanguageSpecificPrimaryFontFromId essentially

                const sourceFont = fonts[0];
                const newFontId = `lang-primary-${langId}-${Date.now()}`;
                const newFont = {
                    ...sourceFont,
                    id: newFontId,
                    type: 'fallback',
                    isLangSpecific: true,
                    isPrimaryOverride: true,
                    hidden: false,
                    weightOverride: undefined,
                    scale: undefined,
                    lineHeight: undefined,
                    letterSpacing: undefined,
                    lineGapOverride: undefined,
                    ascentOverride: undefined,
                    descentOverride: undefined
                };

                let nextFonts = [...fonts];



                const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
                const existingOverride = nextPrimaryOverrides[langId];

                if (existingOverride) {
                    nextFonts = nextFonts.filter(f => f.id !== existingOverride);
                }

                nextFonts.push(newFont);
                nextPrimaryOverrides[langId] = newFontId;

                return {
                    ...prev,
                    fonts: nextFonts,
                    primaryFontOverrides: nextPrimaryOverrides
                };
            }

            // Normal Case: Fallback Font
            const sourceFont = fonts[fontIndex];

            // 1. Create Clone (Override)
            const newFontId = `lang-primary-${langId}-${Date.now()}`;
            const newFont = {
                ...sourceFont,
                id: newFontId,
                type: 'fallback',
                isLangSpecific: true,
                isPrimaryOverride: true, // Treat as primary override for that language
                hidden: false,
                // Reset metrics
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            // 2. Prepare overrides map
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            const existingOverride = nextPrimaryOverrides[langId];
            let nextFonts = [...fonts];

            if (existingOverride) {
                // If there was already an override, remove it
                nextFonts = nextFonts.filter(f => f.id !== existingOverride);
            }

            // 3. Add New Font
            nextFonts.push(newFont);
            nextPrimaryOverrides[langId] = newFontId;

            // 4. DO NOT REMOVE SOURCE FONT (Keep it in global list)
            // nextFonts = nextFonts.filter(f => f.id !== fontId);

            return {
                ...prev,
                fonts: nextFonts,
                primaryFontOverrides: nextPrimaryOverrides
            };
        });
        setLanguageVisibility(langId, true);
    };



    const addPrimaryLanguageOverrides = (languageIds) => {
        languageIds.forEach(langId => {
            // Only add if it doesn't already exist as a primary override
            addLanguageSpecificPrimaryFont(langId, { onlyIfMissing: true });
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

            let nextFonts = [...fonts];



            const existingOverrideFontId = prev.primaryFontOverrides?.[langId];
            if (existingOverrideFontId) {
                nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
            }

            nextFonts.push(newFont);

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


    // Link a font to a language (Soft mapping / Inheritance)
    const linkFontToLanguage = (originalFontId, langId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const startOverrides = prev.fallbackFontOverrides || {};
            const currentLangOverrides = startOverrides[langId];
            let nextLangOverrides = {};

            if (typeof currentLangOverrides === 'object' && currentLangOverrides !== null) {
                nextLangOverrides = { ...currentLangOverrides };
            }

            // Map the language to the ORIGINAL font ID (Self-reference indicates inheriting)
            nextLangOverrides[originalFontId] = originalFontId;

            const nextOverrides = {
                ...startOverrides,
                [langId]: nextLangOverrides
            };

            return {
                ...prev,
                fallbackFontOverrides: nextOverrides
            };
        });
        setLanguageVisibility(langId, true);
    };



    // Granular update for a specific language (Auto-Clone if needed)
    const updateLanguageSpecificSetting = (originalFontId, langId, property, value) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];
            const originalFont = fonts.find(f => f.id === originalFontId);
            if (!originalFont) return prev;

            // FIX: Check if we are acting on a clone directly (Recursive Edit Prevention)
            const isDirectCloneEdit = originalFont.isClone || originalFont.isLangSpecific;

            // ----------------------------------------------------------------
            // PRIMARY FONT HANDLING (Only for Primary Languages)
            // ----------------------------------------------------------------
            // If langId is NOT a primary language, treat it as a mapped fallback update below.
            if (originalFont.type === 'primary' || originalFont.isPrimaryOverride) {
                // If direct edit, target is itself. Else check for existing override.
                // Note: Primary overrides are simple { langId: fontId } map.
                let targetFontId = isDirectCloneEdit ? originalFontId : (prev.primaryFontOverrides?.[langId]);

                let nextFonts = [...fonts];
                const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };

                const existingOverrideId = targetFontId;

                // CHECK FOR SHARED OVERRIDE (Forking Logic)
                const isShared = Object.keys(nextPrimaryOverrides).some(lid => {
                    if (lid === langId) return false;
                    return nextPrimaryOverrides[lid] === existingOverrideId;
                });

                if (!isDirectCloneEdit && (!targetFontId || isShared)) {
                    // CREATE NEW CLONE (Primary Switch OR Fork from Shared)
                    // If shared, we clone the *existing override* to fork it.
                    // If not shared (and no target), we clone the *original font*.

                    const sourceFont = isShared
                        ? fonts.find(f => f.id === existingOverrideId)
                        : originalFont;

                    if (!sourceFont) return prev; // Should not happen

                    const newFontId = `lang-primary-${langId}-${Date.now()}`;
                    const newFont = {
                        ...sourceFont,
                        id: newFontId,
                        type: 'fallback', // Technical type for CSS generation
                        isLangSpecific: true,
                        isPrimaryOverride: true,
                        isClone: true,
                        hidden: false,
                        // Ensure we carry over color
                        color: sourceFont.color,
                        // If forking a shared override, we KEEP the current values. 
                        // If creating new from primary, we reset metrics to undefined (inherit).
                        ...(isShared ? {} : {
                            weightOverride: undefined,
                            scale: undefined,
                            lineHeight: undefined,
                            letterSpacing: undefined,
                            lineGapOverride: undefined,
                            ascentOverride: undefined,
                            descentOverride: undefined
                        })
                    };

                    // Apply the update
                    newFont[property] = value;
                    nextFonts.push(newFont);

                    // Update Map
                    nextPrimaryOverrides[langId] = newFontId;

                    return {
                        ...prev,
                        fonts: nextFonts,
                        primaryFontOverrides: nextPrimaryOverrides
                    };
                } else {
                    // UPDATE EXISTING (Target Identified)
                    const idToUpdate = targetFontId;
                    nextFonts = nextFonts.map(f => {
                        if (f.id === idToUpdate) {
                            return { ...f, [property]: value };
                        }
                        return f;
                    });

                    return {
                        ...prev,
                        fonts: nextFonts
                        // No map update needed
                    };
                }
            }

            // ----------------------------------------------------------------
            // FALLBACK FONT HANDLING (Existing Logic)
            // ----------------------------------------------------------------

            // 1. Determine if we need to clone (is it currently Linked or Cloned?)
            const currentOverrides = prev.fallbackFontOverrides?.[langId];
            let currentOverrideId = null;

            if (typeof currentOverrides === 'object' && currentOverrides !== null) {
                currentOverrideId = currentOverrides[originalFontId];
            } else if (typeof currentOverrides === 'string') {
                currentOverrideId = currentOverrides;
            }

            let targetFontId = currentOverrideId;

            if (isDirectCloneEdit) {
                targetFontId = originalFontId;
            }

            // CHECK SHARED USAGE
            // If the target font is currently shared by OTHER languages, we must FORK it (Clone)
            // regardless of whether it's already a clone or not.
            let isShared = false;
            if (targetFontId) {
                const allOverrides = prev.fallbackFontOverrides || {};
                // Check if any OTHER language maps to this SAME targetFontId
                isShared = Object.keys(allOverrides).some(lid => {
                    if (lid === langId) return false; // Skip self
                    const val = allOverrides[lid];
                    if (val === targetFontId) return true;
                    if (typeof val === 'object' && val !== null) {
                        return Object.values(val).includes(targetFontId);
                    }
                    return false;
                });
            }

            let nextFonts = [...fonts];
            let nextOverrides = { ...(prev.fallbackFontOverrides || {}) };

            // CLONE CONDITION: 
            // 1. Not a direct edit (meaning we are editing a global font that needs cloning)
            // 2. No target yet (Linked to global)
            // 3. Target is original (Linked)
            // 4. OR IS SHARED (Copy-On-Write) - This fixes the bug where grouped languages all update together

            const shouldClone = (!isDirectCloneEdit && (
                !targetFontId ||
                targetFontId === originalFontId
            )) || isShared;

            if (shouldClone) {
                // CLONE ACTION
                const newFontId = `lang-${langId}-${Date.now()}`;

                // Source for clone: Original, or the current shared clone?
                // If shared, we want to copy the SHARED clone's current state, not revert to original.
                const sourceFont = (isShared && targetFontId)
                    ? fonts.find(f => f.id === targetFontId) // Fork off the shared state
                    : originalFont; // Fork off the original

                if (!sourceFont) return prev; // Safety

                const newFont = {
                    // Spread source font
                    ...sourceFont,

                    // Overwrite with Clone specific properties
                    id: newFontId,
                    type: 'fallback',
                    isLangSpecific: true,
                    isClone: true,
                    isPrimaryMap: originalFont.type === 'primary',
                    isPrimaryOverride: originalFont.type === 'primary' || originalFont.isPrimaryOverride,
                    color: sourceFont.color,
                    hidden: false,

                    // Note: If forking a shared clone, PRESERVE its metrics unless overridden by 'property' call
                    // If forking original, RESET metrics
                    // Actually, if we fork a shared clone, we want its current settings to persist + our change.
                    // If we fork original, we usually want defaults.
                    // But `sourceFont` handles this spread. 
                    // EXCEPT: If source is original, we DO want to reset undefineds to allow fallbacks.
                    // If source is shared clone, it already has specific values.
                };

                // If forking from ORIGINAL (not shared clone), ensure overrides are undefined
                if (sourceFont === originalFont) {
                    newFont.weightOverride = undefined;
                    newFont.scale = undefined;
                    newFont.lineHeight = undefined;
                    newFont.letterSpacing = undefined;
                    newFont.lineGapOverride = undefined;
                    newFont.ascentOverride = undefined;
                    newFont.descentOverride = undefined;
                }

                // Specific update
                newFont[property] = value;

                nextFonts.push(newFont);

                // Update overrides map
                let langOverrides;
                const existingOverride = nextOverrides[langId];

                if (typeof existingOverride === 'string') {
                    // Normalize existing string override (which maps the language to 'originalFontId')
                    langOverrides = { [originalFontId]: existingOverride };
                } else {
                    langOverrides = { ...(existingOverride || {}) };
                }
                if (typeof nextOverrides[langId] === 'string') {
                    // This implies the whole language was mapped to one font.
                    // Now we are saying "For THIS original font, use THIS new font".
                    // But wait, if legacy string was 'targetFontId', we are replacing it.
                    // HOWEVER, if the user had mapped 'NotoSans' to 'LV-LV' (string override).
                    // And now we clone it. 
                    // The Map structure expects { [OriginalFontId]: OverrideId }.
                    // If the legacy string was just one font, we might need to be careful.
                    // For now, assume object structure is standard.
                }

                // Standard Map Update:
                // Map the ORIGINAL font ID to the NEW font ID.
                langOverrides[originalFontId] = newFontId;
                nextOverrides[langId] = langOverrides;

                targetFontId = newFontId;
            } else {
                // UPDATE EXISTING CLONE
                nextFonts = nextFonts.map(f => {
                    if (f.id === targetFontId) {
                        return { ...f, [property]: value };
                    }
                    return f;
                });
            }

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
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

    const unmapFont = (fontId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const nextFonts = [...(prev.fonts || [])];
            let isRootMapped = false;
            let targetLangId = null;

            // Check Fallback Overrides
            const nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };

            Object.keys(nextFallbackOverrides).forEach(langId => {
                const val = nextFallbackOverrides[langId];
                if (val && typeof val === 'object') {
                    Object.keys(val).forEach(origId => {
                        if (val[origId] === fontId) {
                            // Valid override entry found
                            if (origId === fontId) {
                                // Maps to itself -> Root Mapped (Direct Upload)
                                isRootMapped = true;
                                targetLangId = langId;
                            }
                            delete val[origId];
                        }
                    });
                } else if (val === fontId) {
                    // Legacy string format: Assume direct target
                    isRootMapped = true;
                    targetLangId = langId;
                    delete nextFallbackOverrides[langId];
                }
            });

            // Check Primary Overrides
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            let wasPrimaryOverride = false;
            Object.keys(nextPrimaryOverrides).forEach(langId => {
                if (nextPrimaryOverrides[langId] === fontId) {
                    wasPrimaryOverride = true;
                    targetLangId = langId;
                    delete nextPrimaryOverrides[langId];
                }
            });

            const fontIndex = nextFonts.findIndex(f => f.id === fontId);

            if (fontIndex !== -1) {
                // DECISION: Should we Delete or Promote?
                const fontToRemove = nextFonts[fontIndex];
                const primaryFont = nextFonts.find(f => f.type === 'primary' && !f.isPrimaryOverride);

                // Check if it is a clone of the Primary Font
                const isPrimaryClone = primaryFont && (
                    (fontToRemove.fontObject && fontToRemove.fontObject === primaryFont.fontObject) ||
                    (fontToRemove.fileName && fontToRemove.fileName === primaryFont.fileName) ||
                    (!fontToRemove.fileName && !primaryFont.fileName && fontToRemove.name === primaryFont.name)
                );

                // If it was a primary override (clone) OR a fallback clone of primary, we DELETE.
                // If it is a distinct, likely uploaded font (isRootMapped usually implies uploaded specifically for that lang), we PROMOTE.

                // Refined Logic:
                // If `isRootMapped` is true, it means it was an "Original" source for that mapping (e.g. Uploaded to Lang).
                // EXCEPT if it was somehow a clone that was mapped to itself? (Unlikely).

                // If `wasPrimaryOverride` is true:
                // Check if it's a clone of the current primary. If yes, DELETE.
                // If no (e.g. user uploaded a specific font as Primary Override), PROMOTE.

                let shouldDelete = false;

                if (wasPrimaryOverride) {
                    if (isPrimaryClone) shouldDelete = true;
                } else if (!isRootMapped) {
                    // It was a mapped clone (e.g. valid[origId] == fontId where origId != fontId)
                    shouldDelete = true;
                } else {
                    // It was Root Mapped (Uploaded/Direct). 
                    // However, if it happens to be a clone of primary (e.g. added via "Add Primary" to fallback?), check clone status.
                    // But usually RootMapped means it has its own identity.
                    // We default to KEEP/PROMOTE for Root Mapped to be safe (don't delete user uploads).
                    shouldDelete = false;
                }

                if (shouldDelete) {
                    nextFonts.splice(fontIndex, 1);
                } else {
                    // Promote to global fallback
                    nextFonts[fontIndex] = {
                        ...nextFonts[fontIndex],
                        isLangSpecific: false,
                        isPrimaryOverride: false,
                        isClone: false,
                        type: 'fallback'
                    };
                }
            }

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextFallbackOverrides,
                primaryFontOverrides: nextPrimaryOverrides
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

    const batchAddConfiguredLanguages = (langIds) => {
        const styleId = activeFontStyleId;

        // 1. Update configuredLanguages in style state
        updateStyleState(styleId, prev => {
            const current = new Set(prev.configuredLanguages || []);
            let changed = false;
            langIds.forEach(id => {
                // Basic validation: check if ID exists in master list? 
                // We trust the input for now, or could filter against `languages`
                if (!current.has(id)) {
                    current.add(id);
                    changed = true;
                }
            });

            if (!changed) return prev;

            return {
                ...prev,
                configuredLanguages: Array.from(current)
            };
        });

        // 2. Update visibility
        setVisibleLanguageIds(prev => {
            const nextSet = new Set(prev);
            let changed = false;
            langIds.forEach(id => {
                if (!nextSet.has(id)) {
                    nextSet.add(id);
                    changed = true;
                }
            });

            if (!changed) return prev;

            // Re-sort according to canonical order
            const canonical = languages.map(l => l.id);
            return canonical.filter(id => nextSet.has(id));
        });
    };

    const batchAddFontsAndMappings = ({ fonts, mappings, languageIds = [] }) => {
        const styleId = activeFontStyleId;

        updateStyleState(styleId, prev => {
            let nextFonts = [...(prev.fonts || [])];
            const currentConfigured = new Set(prev.configuredLanguages || []);

            // 1. Add New Fonts
            if (fonts && fonts.length > 0) {
                // Check to avoid duplicates based on ID or Name
                fonts.forEach(newFont => {
                    const exists = nextFonts.some(f => f.id === newFont.id);
                    if (!exists) {
                        // Assign color if missing
                        if (!newFont.color) {
                            newFont.color = DEFAULT_PALETTE[nextFonts.length % DEFAULT_PALETTE.length];
                        }
                        nextFonts.push(newFont);
                    }
                });
            }

            // 2. Update Overrides
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            const nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };

            if (mappings) {
                Object.entries(mappings).forEach(([langId, fontIdentifier]) => {
                    // Check if fontIdentifier corresponds to a loaded font
                    // In the uploader, we passed the file name as value.
                    // We need to find the font ID that matches that filename in the NOW updated nextFonts list.
                    // The uploader logic in `handleSetupConfirm` creates IDs like `uploaded-setup-...`
                    // and also passes `mappings` as `langId -> fileName`.
                    // So we map: fileName -> fontId

                    const fontIndex = nextFonts.findIndex(f => f.fileName === fontIdentifier || f.name === fontIdentifier);
                    if (fontIndex !== -1) {
                        const font = nextFonts[fontIndex];

                        // Mark the font as language-specific since it's being explicitly mapped
                        // This prevents it from appearing in the global fallback list by default
                        nextFonts[fontIndex] = {
                            ...font,
                            isLangSpecific: true,
                            isClone: false // Ensure it's treated as a primary entry for this lang
                        };

                        // We will set them as FALLBACK overrides for that language, 
                        // essentially saying "For this language, use THIS font family".
                        // Note: `fallbackFontOverrides` maps `langId -> fontId` (the font to use).
                        if (font.type === 'fallback') {
                            nextFallbackOverrides[langId] = font.id;
                        } else {
                            // If it happened to be the primary font, we might not need an override if it matches?
                            // But usually `fallbackFontOverrides` is checked first.
                            nextFallbackOverrides[langId] = font.id;
                        }
                    }
                });
            }

            // 3. Register All Languages (Configured)
            // Union of existing configured + new mappings keys + explicitly passed languageIds
            if (mappings) {
                Object.keys(mappings).forEach(id => currentConfigured.add(id));
            }
            if (languageIds) {
                languageIds.forEach(id => currentConfigured.add(id));
            }

            return {
                ...prev,
                fonts: nextFonts,
                configuredLanguages: Array.from(currentConfigured),
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides
            };
        });

        // 4. Update Visibility
        const idsToShow = new Set(languageIds || []);
        if (mappings) {
            Object.keys(mappings).forEach(id => idsToShow.add(id));
        }

        if (idsToShow.size > 0) {
            setVisibleLanguageIds(prev => {
                const nextSet = new Set(prev);
                idsToShow.forEach(id => nextSet.add(id));
                // Canonical Sort
                const canonical = languages.map(l => l.id);
                return canonical.filter(id => nextSet.has(id));
            });
        }
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

    const toggleLanguageVisibility = (langId) => {
        // Updated Logic:
        // If the language is currently effectively visible (either mostly manually selected OR has an override),
        // then "toggling" it off should mean "Removing it completely".
        // This fixes the bug where we couldn't uncheck a language that had a mapped font.
        if (effectiveVisibleLanguageIds.includes(langId)) {
            removeConfiguredLanguage(langId);
        } else {
            // Otherwise, explicitly add it to the visibility list
            setLanguageVisibility(langId, true);
        }
    };

    const getPrimaryFontOverrideForStyle = (styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.primaryFontOverrides?.[langId] || null;
    };

    const toggleFontGlobalStatus = (fontId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const nextFonts = [...(prev.fonts || [])];
            const fontIndex = nextFonts.findIndex(f => f.id === fontId);

            if (fontIndex !== -1) {
                // If it's already the primary font (index 0), we can't change status
                if (fontIndex === 0) return prev;

                const current = nextFonts[fontIndex];
                // Toggle isLangSpecific status
                // If currently LangSpecific (Private) -> Become Global (False)
                // If currently Global (Public) -> Become LangSpecific (Private)
                nextFonts[fontIndex] = {
                    ...current,
                    isLangSpecific: !current.isLangSpecific,
                    // Ensure it stays a fallback type relative to stack
                    type: 'fallback',
                    isClone: false,
                    isPrimaryOverride: false
                };
            }

            return {
                ...prev,
                fonts: nextFonts
            };
        });
    };

    const removeFallbackFont = (fontId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const fonts = prev.fonts || [];
            const targetFont = fonts.find(f => f.id === fontId);

            // If font not found, just return
            if (!targetFont) return prev;

            // Identify all fonts to remove: the target font AND any derived clones
            const idsToRemove = new Set([fontId]);

            // Scan for clones/derived fonts to also remove
            fonts.forEach(f => {
                if (idsToRemove.has(f.id)) return;

                // Check if this is a derived font (lang specific, override, clone)
                const isDerived = f.isLangSpecific || f.isPrimaryOverride || f.isClone || (typeof f.id === 'string' && f.id.startsWith('lang-'));

                if (isDerived) {
                    // Check for identity match with the target font
                    // 1. Same Font Object reference (strongest check for uploaded fonts)
                    if (f.fontObject && targetFont.fontObject && f.fontObject === targetFont.fontObject) {
                        idsToRemove.add(f.id);
                        return;
                    }

                    // 2. Same File Name (if uploaded)
                    if (f.fileName && targetFont.fileName && f.fileName === targetFont.fileName) {
                        idsToRemove.add(f.id);
                        return;
                    }

                    // 3. Same Name (if system font or no file name)
                    if (!f.fileName && !targetFont.fileName && f.name === targetFont.name) {
                        idsToRemove.add(f.id);
                        return;
                    }
                }
            });

            // Filter out all invalid fonts
            const filtered = fonts.filter(f => !idsToRemove.has(f.id));

            // Re-assign types if needed (ensure there is a primary if array not empty)
            const newFonts = filtered.map((f, i) => ({
                ...f,
                type: i === 0 ? 'primary' : 'fallback'
            }));

            let newActiveFont = prev.activeFont;
            if (idsToRemove.has(prev.activeFont)) {
                // If we deleted the active font, switch to the new primary (if exists)
                newActiveFont = newFonts.length > 0 ? newFonts[0].id : null;
            }

            // Cleanup Primary Overrides
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            Object.keys(nextPrimaryOverrides).forEach(langId => {
                if (idsToRemove.has(nextPrimaryOverrides[langId])) {
                    delete nextPrimaryOverrides[langId];
                }
            });

            // Cleanup Fallback Overrides
            const nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };
            Object.keys(nextFallbackOverrides).forEach(langId => {
                const val = nextFallbackOverrides[langId];
                if (val && typeof val === 'object') {
                    Object.keys(val).forEach(origId => {
                        // Remove if override value is deleted
                        if (idsToRemove.has(val[origId])) {
                            delete val[origId];
                        }
                        // Remove if original key is also deleted (linking to deleted font)
                        if (idsToRemove.has(origId)) {
                            delete val[origId];
                        }
                    });
                    if (Object.keys(val).length === 0) {
                        delete nextFallbackOverrides[langId];
                    }
                } else if (idsToRemove.has(val)) {
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

            // Update Primary Overrides for Primary Languages if they were pointing to the old primary
            let nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            let nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) }; // Clone fallback overrides
            const primaryLangIds = prev.primaryLanguages || [];

            if (hasPrimaryChanged && primaryLangIds.length > 0) {
                const oldPrimaryFont = currentFonts.find(f => f.id === oldPrimaryId);
                // We need the ACTUAL new primary font object from finalFonts
                const newPrimaryFont = finalFonts[0];

                if (oldPrimaryFont && newPrimaryFont) {
                    // Iterate ONLY through configured primary languages to ensure we don't accidentally update others
                    primaryLangIds.forEach(langId => {
                        // 1. Handle PrimaryOverrides (Clones)
                        const overrideId = nextPrimaryOverrides[langId];
                        if (overrideId) {
                            // Find the override font object in finalFonts
                            const overrideFont = finalFonts.find(f => f.id === overrideId);

                            // Check if this override was a clone of the OLD primary
                            const matchesOld = overrideFont && (
                                (overrideFont.fileName && overrideFont.fileName === oldPrimaryFont.fileName) ||
                                (overrideFont.name && overrideFont.name === oldPrimaryFont.name)
                            );

                            if (matchesOld) {
                                // Replace with clone of NEW primary
                                const newOverrideId = `lang-primary-${langId}-${Date.now()}`;
                                const newOverrideFont = {
                                    ...newPrimaryFont,
                                    id: newOverrideId,
                                    type: 'fallback',
                                    isLangSpecific: true,
                                    isPrimaryOverride: true,
                                    hidden: false,
                                    // Reset metrics
                                    weightOverride: undefined,
                                    scale: undefined,
                                    lineHeight: undefined,
                                    letterSpacing: undefined,
                                    lineGapOverride: undefined,
                                    ascentOverride: undefined,
                                    descentOverride: undefined
                                };

                                // Add new font
                                finalFonts.push(newOverrideFont);
                                // Update override
                                nextPrimaryOverrides[langId] = newOverrideId;

                                // Remove old override font
                                const idx = finalFonts.findIndex(f => f.id === overrideId);
                                if (idx !== -1) finalFonts.splice(idx, 1);
                            }
                        }

                        // 2. Handle FallbackOverrides (Explicit Mappings)
                        const fallbackOverrideVal = nextFallbackOverrides[langId];
                        // Check if this language is explicitly mapped to the OLD primary ID
                        if (typeof fallbackOverrideVal === 'string') {
                            if (fallbackOverrideVal === oldPrimaryId) {
                                // It was mapped to the old primary ID. Update to new primary ID.
                                nextFallbackOverrides[langId] = newPrimaryId;
                            }
                        }
                    });
                }
            }

            const newPrimary = finalFonts.find(f => f.type === 'primary');
            const nextWeight = primaryChanged && newPrimary
                ? resolveWeightForFont(newPrimary, prev.weight)
                : prev.weight;

            return {
                ...prev,
                fonts: finalFonts,
                weight: nextWeight,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides
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
        if (!fontId) {
            clearFallbackFontOverride(langId);
            return;
        }
        setLanguageVisibility(langId, true); // Ensure language is supported
        updateStyleState(activeFontStyleId, prev => {
            // Check if we are REPLACING an existing cloned font
            const currentOverrideId = prev.fallbackFontOverrides?.[langId];
            let nextFonts = prev.fonts;

            if (currentOverrideId && currentOverrideId !== fontId) {
                const oldFont = prev.fonts?.find(f => f.id === currentOverrideId);
                if (oldFont && (oldFont.isLangSpecific || oldFont.isClone || (typeof oldFont.id === 'string' && oldFont.id.startsWith('lang-')))) {
                    nextFonts = prev.fonts.filter(f => f.id !== currentOverrideId);
                }
            }

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: {
                    ...prev.fallbackFontOverrides,
                    [langId]: fontId
                }
            };
        });
    };

    const setFallbackFontOverrideForStyle = (styleId, langId, fontId) => {
        if (!fontId) {
            clearFallbackFontOverrideForStyle(styleId, langId);
            return;
        }
        updateStyleState(styleId, prev => {
            // Check if we are REPLACING an existing cloned font
            const currentOverrideId = prev.fallbackFontOverrides?.[langId];
            let nextFonts = prev.fonts;

            if (currentOverrideId && currentOverrideId !== fontId) {
                const oldFont = prev.fonts?.find(f => f.id === currentOverrideId);
                if (oldFont && (oldFont.isLangSpecific || oldFont.isClone || (typeof oldFont.id === 'string' && oldFont.id.startsWith('lang-')))) {
                    nextFonts = prev.fonts.filter(f => f.id !== currentOverrideId);
                }
            }

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: {
                    ...prev.fallbackFontOverrides,
                    [langId]: fontId
                }
            };
        });
    };

    const clearFallbackFontOverride = (langId) => {
        clearFallbackFontOverrideForStyle(activeFontStyleId, langId);
    };

    const clearFallbackFontOverrideForStyle = (styleId, langId) => {
        updateStyleState(styleId, prev => {
            const nextOverrides = { ...prev.fallbackFontOverrides };
            const fontIdToRemove = nextOverrides[langId];
            delete nextOverrides[langId];

            let nextFonts = prev.fonts;
            if (fontIdToRemove) {
                // Check if the font to remove is a clone/language-specific font
                // We check flags OR if the ID starts with 'lang-' (our naming convention for clones)
                const fontToRemove = prev.fonts?.find(f => f.id === fontIdToRemove);
                if (fontToRemove && (
                    fontToRemove.isLangSpecific ||
                    fontToRemove.isClone ||
                    (typeof fontToRemove.id === 'string' && fontToRemove.id.startsWith('lang-'))
                )) {
                    nextFonts = prev.fonts.filter(f => f.id !== fontIdToRemove);
                }
            }

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
    };

    const assignFontToMultipleLanguages = (fontId, targetLangIds) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const nextPrimaryOverrides = { ...(prev.primaryFontOverrides || {}) };
            const nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };
            const currentConfigured = new Set(prev.configuredLanguages || []);
            const primaryLangs = new Set(prev.primaryLanguages || []);

            // Identify current mappings
            const currentlyMapped = new Set();
            Object.entries(nextPrimaryOverrides).forEach(([lid, fid]) => {
                if (fid === fontId) currentlyMapped.add(lid);
            });
            Object.entries(nextFallbackOverrides).forEach(([lid, val]) => {
                if (val === fontId) currentlyMapped.add(lid);
                else if (typeof val === 'object') {
                    Object.values(val).forEach(v => {
                        if (v === fontId) currentlyMapped.add(lid);
                    });
                }
            });

            const targetSet = new Set(targetLangIds);

            // Handle Removals
            currentlyMapped.forEach(lid => {
                if (!targetSet.has(lid)) {
                    if (nextPrimaryOverrides[lid] === fontId) delete nextPrimaryOverrides[lid];
                    if (nextFallbackOverrides[lid] === fontId) delete nextFallbackOverrides[lid];
                    else if (typeof nextFallbackOverrides[lid] === 'object') {
                        const map = nextFallbackOverrides[lid];
                        Object.keys(map).forEach(k => {
                            if (map[k] === fontId) delete map[k];
                        });
                        if (Object.keys(map).length === 0) delete nextFallbackOverrides[lid];
                    }

                    // CLEANUP: If this language has no more overrides and is not a primary language, remove it from configured
                    const hasPrimary = !!nextPrimaryOverrides[lid];
                    const hasFallback = !!nextFallbackOverrides[lid]; // undefined if deleted

                    if (!hasPrimary && !hasFallback && !primaryLangs.has(lid)) {
                        currentConfigured.delete(lid);
                    }
                }
            });

            // Handle Additions
            targetLangIds.forEach(lid => {
                if (!currentlyMapped.has(lid)) {
                    // Check if the assigned font is a Primary Font
                    const isPrimaryAssignment = fonts.some(f => f.id === fontId && (f.type === 'primary' || f.isPrimaryOverride));

                    if (isPrimaryAssignment) {
                        nextPrimaryOverrides[lid] = fontId;
                    } else {
                        nextFallbackOverrides[lid] = fontId;
                    }
                    currentConfigured.add(lid);
                }
            });

            return {
                ...prev,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides,
                configuredLanguages: Array.from(currentConfigured)
            };
        });

        // Update Visibility - Only for additions to ensure they show up immediately
        if (targetLangIds && targetLangIds.length > 0) {
            setVisibleLanguageIds(prev => {
                const nextSet = new Set(prev);
                let changed = false;
                targetLangIds.forEach(id => {
                    if (!nextSet.has(id)) {
                        nextSet.add(id);
                        changed = true;
                    }
                });
                if (!changed) return prev;
                const canonical = languages.map(l => l.id);
                return canonical.filter(id => nextSet.has(id));
            });
        }
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
        // 1. Find the target font to get its name for broadcasting
        const font = fonts.find(f => f.id === fontId);
        if (!font) return;

        const targetName = normalizeFontName(font.fileName || font.name);

        // 2. Broadcast color update to ALL fonts with the same name across ALL styles
        setFontStyles(prev => {
            const nextStyles = { ...prev };
            Object.keys(nextStyles).forEach(styleId => {
                const style = nextStyles[styleId];
                if (style.fonts) {
                    nextStyles[styleId] = {
                        ...style,
                        fonts: style.fonts.map(f => {
                            if (normalizeFontName(f.fileName || f.name) === targetName) {
                                return { ...f, color };
                            }
                            return f;
                        })
                    };
                }
            });
            return nextStyles;
        });
    };

    const getFontColor = (fontId) => {
        const font = fonts.find(f => f.id === fontId);
        if (font && !font.fontObject && !font.fileName) {
            return missingColor;
        }
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
            activeConfigTab,
            fontStyles,
            headerStyles,
            headerOverrides,
            textOverrides,
            visibleLanguageIds,
            headerFontStyleMap,
            textCase,
            viewMode,
            gridColumns,
            colors,
            showFallbackColors,
            showAlignmentGuides,
            showBrowserGuides,
            appName: 'localize-type',
            DEFAULT_PALETTE
        });
    }, [
        activeFontStyleId,
        activeConfigTab,
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
        if (config.activeConfigTab) {
            setActiveConfigTab(config.activeConfigTab);
        }

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
                        // Use SafeFontLoader which uses a Worker + Timeout
                        const { font: parsedFont, metadata: parsedMeta } = await safeParseFontFile(file);

                        fontObject = parsedFont;
                        fontUrl = createFontUrl(file);
                        metadata = parsedMeta;
                    } catch (e) {
                        console.error("Failed to parse font file during restore (Worker/Safety check failed)", file.name, e);
                        // We proceed without the font object (Ghost Font state)
                    }
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

    // --- PERSISTENCE LOGIC START ---

    // 1. Load Initial State on Mount
    useEffect(() => {
        const loadState = async () => {
            try {
                const savedConfig = await PersistenceService.loadConfig();
                if (savedConfig) {
                    // Validate/Normalize first
                    const normalized = ConfigService.normalizeConfig({ data: savedConfig, metadata: { version: 1 } });
                    const validated = ConfigService.validateConfig(normalized);

                    if (validated) {
                        // Restore basic state
                        if (validated.activeFontStyleId) setActiveFontStyleId(validated.activeFontStyleId);
                        if (validated.activeConfigTab) setActiveConfigTab(validated.activeConfigTab);
                        if (validated.headerStyles) setHeaderStyles(validated.headerStyles);
                        if (validated.headerOverrides) setHeaderOverrides(validated.headerOverrides);
                        if (validated.textOverrides) setTextOverrides(validated.textOverrides);
                        if (validated.visibleLanguageIds) setVisibleLanguageIds(validated.visibleLanguageIds);
                        if (validated.colors) setColors(validated.colors);
                        if (validated.headerFontStyleMap) setHeaderFontStyleMap(validated.headerFontStyleMap);
                        if (validated.textCase) setTextCase(validated.textCase);
                        if (validated.viewMode) setViewMode(validated.viewMode);
                        if (validated.gridColumns) setGridColumns(validated.gridColumns);
                        if (validated.showFallbackColors !== undefined) setShowFallbackColors(validated.showFallbackColors);
                        if (validated.showAlignmentGuides !== undefined) setShowAlignmentGuides(validated.showAlignmentGuides);
                        if (validated.showBrowserGuides !== undefined) setShowBrowserGuides(validated.showBrowserGuides);
                        if (validated.showFallbackOrder !== undefined) setShowFallbackOrder(validated.showFallbackOrder);

                        // Restore Font Styles
                        if (validated.fontStyles) {
                            const styles = validated.fontStyles;
                            const newStyles = { ...styles };

                            for (const styleId of Object.keys(styles)) {
                                const style = styles[styleId];
                                if (style.fonts) {
                                    const hydratedFonts = await Promise.all(style.fonts.map(async (font) => {
                                        try {
                                            const blob = await PersistenceService.getFont(font.id);
                                            if (blob) {
                                                const { font: opentypeFont } = await parseFontFile(blob);
                                                const url = createFontUrl(blob);

                                                // Mark as persisted
                                                persistedFontIds.current.add(font.id);

                                                return {
                                                    ...font,
                                                    fontObject: opentypeFont,
                                                    fontUrl: url
                                                };
                                            }
                                        } catch (err) {
                                            console.warn('[TypoContext] Failed to hydrate font:', font.id, err);
                                        }
                                        return font;
                                    }));
                                    newStyles[styleId].fonts = hydratedFonts;
                                }
                            }
                            setFontStyles(newStyles);
                        }
                    }
                }
            } catch (err) {
                console.error('[TypoContext] Error loading persisted state:', err);
            } finally {
                setIsSessionLoading(false);
            }
        };

        loadState();
    }, []);

    // 2. Save State on Change
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            // Block validation/saving if we are in the middle of a reset
            if (isResetting.current) {
                console.log('[TypoContext] Skipping auto-save due to pending reset.');
                return;
            }

            const state = {
                activeFontStyleId,
                activeConfigTab,
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
                showFallbackOrder,
                appName: 'localize-type',
                DEFAULT_PALETTE
            };

            const serializedWrapper = ConfigService.serializeConfig(state);
            const serialized = serializedWrapper.data;

            // Size Check / Safety: Warn if config is getting very large, though we still attempt save.
            try {
                // Final safety check before actual write
                if (isResetting.current) return;

                const jsonString = JSON.stringify(serialized);
                const sizeBytes = new Blob([jsonString]).size;
                if (sizeBytes > 5 * 1024 * 1024) {
                    console.warn('[TypoContext] Config state is large:', (sizeBytes / 1024 / 1024).toFixed(2), 'MB');
                }
            } catch (e) {
                console.warn('[TypoContext] Failed to check config size', e);
            }

            await PersistenceService.saveConfig(serialized);

            const activeFontIds = new Set();

            // Save Fonts
            for (const styleId of Object.keys(fontStyles)) {
                const style = fontStyles[styleId];
                if (style.fonts) {
                    for (const font of style.fonts) {
                        activeFontIds.add(font.id);

                        // Only save if it's a blob URL (uploaded) AND not already persisted
                        if (font.fontUrl && font.fontUrl.startsWith('blob:') && font.fontObject) {
                            if (!persistedFontIds.current.has(font.id)) {
                                try {
                                    const response = await fetch(font.fontUrl);
                                    const blob = await response.blob();
                                    await PersistenceService.saveFont(font.id, blob);
                                    persistedFontIds.current.add(font.id);
                                } catch (err) {
                                    console.warn('[TypoContext] Failed to save font blob:', font.id, err);
                                }
                            }
                        }
                    }
                }
            }

            // Garbage Collection: Remove fonts from IDB that are no longer in activeFontIds
            try {
                const storedFontIds = await PersistenceService.getFontKeys();
                for (const storedId of storedFontIds) {
                    // Normalize: font IDs in store match font.id
                    if (!activeFontIds.has(storedId)) {
                        await PersistenceService.deleteFont(storedId);
                        persistedFontIds.current.delete(storedId);
                        console.log('[TypoContext] Garbage collected unused font:', storedId);
                    }
                }
            } catch (err) {
                console.warn('[TypoContext] Error during font garbage collection:', err);
            }

        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [
        activeFontStyleId,
        activeConfigTab,
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

    // --- PERSISTENCE LOGIC END ---

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
            systemFallbackOverrides,
            updateSystemFallbackOverride,
            resetSystemFallbackOverride,
            missingColor,
            setMissingColor,
            missingBgColor,
            setMissingBgColor,
            primaryLanguages: activeStyle.primaryLanguages || [],
            togglePrimaryLanguage,

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
            assignFontToMultipleLanguages,

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
            addStrictlyMappedFonts,
            addLanguageSpecificPrimaryFont,
            addLanguageSpecificPrimaryFontFromId,
            linkFontToLanguage,
            updateLanguageSpecificSetting,
            assignFontToLanguage,
            addPrimaryLanguageOverrides,
            addPrimaryLanguageOverrideWithFont,
            addLanguageSpecificFallbackFont,

            addConfiguredLanguage,
            batchAddConfiguredLanguages,
            batchAddFontsAndMappings,
            removeConfiguredLanguage,

            configuredLanguages: allConfiguredLanguageIds, // Show everything that has config in Sidebar/Tabs

            getPrimaryFontOverrideForStyle,
            removeLanguageSpecificFont,
            unmapFont,


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
            toggleBrowserGuides: () => setShowBrowserGuides(v => !v),
            // New "Supported" vs "Mapped" distinction
            supportedLanguages: languages,
            supportedLanguageIds: languages.map(l => l.id), // ALL AVAILABLE
            // isLanguageConfigured: (langId) => allConfiguredLanguageIds.includes(langId),
            mappedLanguageIds: strictlyMappedLanguageIds, // STRICTLY OVERRIDES
            isLanguageMapped: (langId) => strictlyMappedLanguageIds.includes(langId),

            toggleFontVisibility,
            toggleFontGlobalStatus,
            resetApp: async () => {
                isResetting.current = true;
                setIsAppResetting(true);

                // 1. Immediately clear memory state to default
                setFontStyles({
                    primary: createEmptyStyleState()
                });

                // 2. Clear Database
                await PersistenceService.clear();

                // 3. Reload
                window.location.reload();
            },
            isAppResetting,
            isSessionLoading,
            normalizeFontName, // Export for consistent UI checks
            showFallbackOrder,
            setShowFallbackOrder,
        }}>
            {children}
        </TypoContext.Provider>
    );
};

export default TypoContext;
