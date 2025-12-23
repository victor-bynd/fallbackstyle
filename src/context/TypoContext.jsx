import { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { fallbackOptions, DEFAULT_PALETTE } from '../data/constants';
import languages from '../data/languages.json';
import { resolveWeightForFont } from '../utils/weightUtils';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import { ConfigService } from '../services/ConfigService';

export const TypoContext = createContext();

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
    metricGroups: {}, // NEW: Stores group definitions { id: { name, scale, lineHeight, ... } }
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

    const lineHeightOverrides = activeStyle.lineHeightOverrides;
    const fallbackScaleOverrides = activeStyle.fallbackScaleOverrides;
    const fallbackFontOverrides = activeStyle.fallbackFontOverrides;
    const metricGroups = activeStyle.metricGroups || {};

    const addMetricGroup = (name, initialSettings = {}) => {
        const styleId = activeFontStyleId;
        const groupId = `group-${Date.now()}`;
        updateStyleState(styleId, prev => ({
            ...prev,
            metricGroups: {
                ...(prev.metricGroups || {}),
                [groupId]: {
                    id: groupId,
                    name,
                    ...initialSettings
                }
            }
        }));
        return groupId;
    };

    const updateMetricGroup = (groupId, updates) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const currentGroups = prev.metricGroups || {};
            if (!currentGroups[groupId]) return prev;

            return {
                ...prev,
                metricGroups: {
                    ...currentGroups,
                    [groupId]: {
                        ...currentGroups[groupId],
                        ...updates
                    }
                }
            };
        });
    };

    const deleteMetricGroup = (groupId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            const currentGroups = { ...(prev.metricGroups || {}) };
            delete currentGroups[groupId];

            // Also remove assignments from fonts
            const nextFonts = (prev.fonts || []).map(f => {
                if (f.metricGroupId === groupId) {
                    const { metricGroupId, ...rest } = f;
                    return rest;
                }
                return f;
            });

            return {
                ...prev,
                metricGroups: currentGroups,
                fonts: nextFonts
            };
        });
    };

    const assignFontToMetricGroup = (fontId, groupId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => ({
            ...prev,
            fonts: (prev.fonts || []).map(f =>
                f.id === fontId ? { ...f, metricGroupId: groupId } : f
            )
        }));
    };

    const removeFontFromMetricGroup = (fontId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => ({
            ...prev,
            fonts: (prev.fonts || []).map(f => {
                if (f.id === fontId) {
                    const { metricGroupId, ...rest } = f;
                    return rest;
                }
                return f;
            })
        }));
    };

    const createGroupForFont = (fontId, groupName, initialSettings = {}) => {
        const styleId = activeFontStyleId;
        const groupId = `group-${Date.now()}`;

        updateStyleState(styleId, prev => {
            const currentMetricGroups = prev.metricGroups || {};
            const nextMetricGroups = {
                ...currentMetricGroups,
                [groupId]: {
                    id: groupId,
                    name: groupName,
                    ...initialSettings
                }
            };

            const nextFonts = (prev.fonts || []).map(f =>
                f.id === fontId ? { ...f, metricGroupId: groupId } : f
            );

            return {
                ...prev,
                metricGroups: nextMetricGroups,
                fonts: nextFonts
            };
        });

        return groupId;
    };

    const createEmptyMetricGroup = (groupName, initialSettings = {}) => {
        const styleId = activeFontStyleId;
        const groupId = `group-${Date.now()}`;

        updateStyleState(styleId, prev => {
            const currentMetricGroups = prev.metricGroups || {};
            return {
                ...prev,
                metricGroups: {
                    ...currentMetricGroups,
                    [groupId]: {
                        id: groupId,
                        name: groupName,
                        ...initialSettings
                    }
                }
            };
        });
        return groupId;
    };

    const addLanguagesToGroup = (groupId, languageIds) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            let nextFonts = [...(prev.fonts || [])];
            let nextOverrides = { ...(prev.primaryFontOverrides || {}) };
            let nextFallbackOverrides = { ...(prev.fallbackFontOverrides || {}) };

            // 1. Identify languages currently in this group
            const currentGroupLangs = Object.keys(nextOverrides).filter(langId => {
                const fontId = nextOverrides[langId];
                const font = nextFonts.find(f => f.id === fontId);
                return font && font.metricGroupId === groupId;
            });

            // 2. Determine removals (langs in group but NOT in new list)
            const langsToRemove = currentGroupLangs.filter(id => !languageIds.includes(id));

            langsToRemove.forEach(langId => {
                const fontId = nextOverrides[langId];
                // Remove from fonts
                nextFonts = nextFonts.filter(f => f.id !== fontId);
                // Remove from primary overrides
                delete nextOverrides[langId];
                // Remove from fallback overrides (safety)
                Object.keys(nextFallbackOverrides).forEach(key => {
                    if (nextFallbackOverrides[key] === fontId) {
                        delete nextFallbackOverrides[key];
                    }
                });
            });

            // 3. Process additions/updates
            languageIds.forEach(langId => {
                const existingFontId = nextOverrides[langId];
                if (existingFontId) {
                    // Language already has a primary override
                    // Ensure it is assigned to THIS group (move it if it was in another)
                    nextFonts = nextFonts.map(f =>
                        f.id === existingFontId ? { ...f, metricGroupId: groupId } : f
                    );
                } else {
                    // Create new primary override font
                    const primaryFont = nextFonts.find(f => f.type === 'primary');
                    if (primaryFont) {
                        const newFontId = `lang-primary-${langId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        const newFont = {
                            ...primaryFont,
                            id: newFontId,
                            type: 'fallback',
                            isLangSpecific: true,
                            isPrimaryOverride: true,
                            metricGroupId: groupId,
                            hidden: false,
                            weightOverride: undefined,
                            scale: undefined,
                            lineHeight: undefined,
                            letterSpacing: undefined,
                            lineGapOverride: undefined,
                            ascentOverride: undefined,
                            descentOverride: undefined
                        };
                        nextFonts.push(newFont);
                        nextOverrides[langId] = newFontId;
                    }
                }
            });

            return {
                ...prev,
                fonts: nextFonts,
                primaryFontOverrides: nextOverrides,
                fallbackFontOverrides: nextFallbackOverrides
            };
        });
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

        // Check for Group Settings first
        const group = font.metricGroupId ? style.metricGroups?.[font.metricGroupId] : null;

        if (font.type === 'primary') {
            // Primary Base: usually shouldn't have metrics overridden unless via group?
            // Actually, the main primary font (non-override) uses global settings.
            // But if we allow grouping main primary font, what happens?
            // For now assume this is mostly for overrides/fallbacks, but let's see.

            // If Group exists, use its values, otherwise use globals/defaults.
            // Note: Primary font typically determines the BASE lineHeight/weight.

            return {
                baseFontSize: style.baseFontSize,
                scale: group?.scale ?? style.fontScales.active, // Group scale replaces global active scale?
                lineHeight: group?.lineHeight ?? style.lineHeight,
                weight: resolveWeightForFont(font, group?.weight ?? style.weight),
                lineGapOverride: group?.lineGapOverride ?? font.lineGapOverride,
                ascentOverride: group?.ascentOverride ?? font.ascentOverride,
                descentOverride: group?.descentOverride ?? font.descentOverride
            };
        }

        // Fallback or Primary Override (treated as fallback type but linked to primary logic)

        // Resolve scale:
        // 1. Group Scale (if exists) -> treated as override
        // 2. Font Override (sizeAdjust/scale/h1Rem) (if not grouped)
        // 3. Global Default (active or fallback scale)

        let finalScale = undefined;
        let finalH1Rem = undefined;

        if (group) {
            // Mapping Logic:
            // - If Primary Override: group.scale is interpreted as h1Rem (unless explicit group.h1Rem exists).
            // - If Fallback: group.scale is percentage scale.

            if (font.isPrimaryOverride) {
                // Prioritize explicit h1Rem if group has it, otherwise map from scale if suitable range?
                // Actually, UI will send `h1Rem` to group for primary overrides if we fix it there.
                // But for backward compat or shared logic, let's respect both.

                finalH1Rem = group.h1Rem !== undefined ? group.h1Rem : group.scale;
                // Note: If reusing a group created for fallback (scale~100) on a primary (scale~3.75), 
                // it might look weird, but that's user choice to group unmatched things.

                // Pure scale (size-adjust) for primary override:
                // Typically primary overrides don't use size-adjust (they use H1 Rem), 
                // UNLESS user specifically wants to shrink the glyphs themselves (rare for primary replacement).
                // Let's assume if they grouped it, they want the shared value.
            } else {
                finalScale = group.scale;
            }
        } else {
            finalScale = font.scale;
            finalH1Rem = font.h1Rem;
        }

        // Defaults if no override/group
        if (finalScale === undefined) {
            finalScale = font.isPrimaryOverride
                ? (style.fontScales?.active ?? 100)
                : (style.fontScales?.fallback ?? 100);
        }

        // Resolve Line Height
        const defaultLineHeight = (font.isPrimaryOverride)
            ? style.lineHeight
            : (style.fallbackLineHeight !== undefined ? style.fallbackLineHeight : style.lineHeight);

        const groupLineHeight = group?.lineHeight;
        const fontLineHeight = font.lineHeight;

        // Group takes precedence if defined
        const effectiveLineHeight = (groupLineHeight !== undefined && groupLineHeight !== '' && groupLineHeight !== null)
            ? groupLineHeight
            : ((fontLineHeight !== undefined && fontLineHeight !== '' && fontLineHeight !== null)
                ? fontLineHeight
                : defaultLineHeight);

        // Resolve Letter Spacing
        const defaultLetterSpacing = (font.isPrimaryOverride)
            ? style.letterSpacing
            : (style.fallbackLetterSpacing !== undefined ? style.fallbackLetterSpacing : style.letterSpacing);

        const groupLetterSpacing = group?.letterSpacing;
        const fontLetterSpacing = font.letterSpacing;

        const effectiveLetterSpacing = (groupLetterSpacing !== undefined && groupLetterSpacing !== '' && groupLetterSpacing !== null)
            ? groupLetterSpacing
            : ((fontLetterSpacing !== undefined && fontLetterSpacing !== '' && fontLetterSpacing !== null)
                ? fontLetterSpacing
                : defaultLetterSpacing);

        // Resolve Overrides
        const getOverride = (prop) => (group?.[prop] !== undefined && group?.[prop] !== '') ? group[prop] : font[prop];

        return {
            baseFontSize: font.baseFontSize ?? style.baseFontSize,
            scale: finalScale,
            h1Rem: finalH1Rem, // Pass this through
            lineHeight: effectiveLineHeight,
            letterSpacing: effectiveLetterSpacing,
            weight: resolveWeightForFont(font, group?.weightOverride ?? font.weightOverride ?? style.weight),
            fontSizeAdjust: font.fontSizeAdjust, // Keep native CSS prop support if used
            lineGapOverride: getOverride('lineGapOverride'),
            ascentOverride: getOverride('ascentOverride'),
            descentOverride: getOverride('descentOverride')
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
                ...originalFont,
                id: newFontId,
                type: 'fallback',
                isLangSpecific: true,
                // Do not copy language overrides or hidden status
                hidden: false,
                weightOverride: undefined,
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined
            };

            // Remove any existing language-specific font for this language to avoid orphans
            const existingOverrideFontId = prev.fallbackFontOverrides?.[langId];
            let nextFonts = [...fonts];
            if (existingOverrideFontId) {
                const existingFont = nextFonts.find(f => f.id === existingOverrideFontId);
                if (existingFont && existingFont.isLangSpecific) {
                    nextFonts = nextFonts.filter(f => f.id !== existingOverrideFontId);
                }
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
    };

    // New function to create a language-specific clone of the PRIMARY font
    const addLanguageSpecificPrimaryFont = (langId, targetGroupId = null) => {
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
                metricGroupId: targetGroupId, // NEW: Assign key to group if provided
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
    };

    const addLanguageToPrimaryGroup = (langId, groupId) => {
        const overrideFontId = activeStyle.primaryFontOverrides?.[langId];
        if (overrideFontId) {
            assignFontToMetricGroup(overrideFontId, groupId);
        } else {
            addLanguageSpecificPrimaryFont(langId, groupId);
        }
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

    const removeLanguageGroup = (langId) => {
        clearPrimaryFontOverride(langId);
        clearFallbackFontOverride(langId);
    };

    const removeLanguageSpecificFont = (fontId) => {
        const styleId = activeFontStyleId;
        updateStyleState(styleId, prev => {
            // Remove from fonts array
            const nextFonts = (prev.fonts || []).filter(f => f.id !== fontId);

            // Remove from overrides map
            const nextOverrides = { ...(prev.fallbackFontOverrides || {}) };

            // Find which keys point to this fontId and delete them
            Object.keys(nextOverrides).forEach(key => {
                if (nextOverrides[key] === fontId) {
                    delete nextOverrides[key];
                }
            });

            return {
                ...prev,
                fonts: nextFonts,
                fallbackFontOverrides: nextOverrides
            };
        });
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
                if (nextFallbackOverrides[langId] === fontId) {
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
            addLanguageToPrimaryGroup,

            getPrimaryFontOverrideForStyle,
            clearPrimaryFontOverride,
            removeLanguageSpecificFont,
            removeLanguageGroup,

            metricGroups,
            addMetricGroup,
            updateMetricGroup,
            deleteMetricGroup,
            assignFontToMetricGroup,
            removeFontFromMetricGroup,
            createGroupForFont,
            createEmptyMetricGroup,
            addLanguagesToGroup,
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
