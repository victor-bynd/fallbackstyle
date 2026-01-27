import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { DEFAULT_PALETTE } from '../data/constants';
import { resolveWeightForFont } from '../utils/weightUtils';
import { normalizeFontName } from '../utils/fontNameUtils';
import { revokeFontUrl } from '../services/FontLoader';
import { createLogger } from '../services/Logger';

const logger = createLogger('FontManagement');

import { getNextUniqueColor } from '../utils/colorUtils';

/**
 * FontManagementContext
 *
 * Manages all font-related operations:
 * - Font loading, adding, removing, reordering
 * - Font metadata (weight, color, visibility)
 * - Language-specific font clones and overrides
 * - Multi-style font support
 */

import { FontManagementContext } from './useFontManagement';

const createEmptyFontState = () => ({
    fonts: [
        {
            id: 'primary',
            type: 'primary',
            fontObject: null,
            fontUrl: null,
            fontBuffer: null,
            fileName: null,
            name: null,
            axes: null,
            isVariable: false,
            staticWeight: null,
            color: DEFAULT_PALETTE[0]
        }
    ],
    // Default typography settings
    lineHeight: 'normal',
    previousLineHeight: 1.2,
    baseFontSize: 16,
    baseRem: 16,
    weight: 400,
    fontScales: { active: 100, fallback: 100 },
    isFallbackLinked: true,
    letterSpacing: 0,
    fallbackFont: 'sans-serif',
    fallbackLineHeight: 'normal',
    fallbackLetterSpacing: null,
    lineHeightOverrides: {},
    fallbackScaleOverrides: {},
    missingColor: '#b8b8b8',
    missingBgColor: '#f1f5f9'
});

export const FontManagementProvider = ({ children }) => {
    const [activeFontStyleId, setActiveFontStyleId] = useState('primary');
    const [fontStyles, setFontStyles] = useState(() => ({
        primary: createEmptyFontState()
    }));

    // Ref to track which fonts have been saved to IDB to avoid re-saving
    const persistedFontIds = useRef(new Set());

    // Get active style
    const activeStyle = useMemo(() => fontStyles[activeFontStyleId] || fontStyles.primary, [fontStyles, activeFontStyleId]);
    const fonts = useMemo(() => activeStyle.fonts || [], [activeStyle.fonts]);

    // Helper to check if a font is a system font (added by name, no uploaded file)
    const isSystemFont = useCallback((font) => !font?.fontObject, []);

    // Core state updater for a specific style
    const updateStyleState = useCallback((styleId, updater) => {
        setFontStyles(prev => {
            if (styleId === '__batch__') {
                return typeof updater === 'function' ? updater(prev) : updater;
            }
            const style = prev[styleId] || createEmptyFontState();
            const updated = typeof updater === 'function' ? updater(style) : { ...style, ...updater };
            return {
                ...prev,
                [styleId]: updated
            };
        });
    }, []);

    // Update fonts array for active style
    const setFonts = useCallback((valueOrUpdater) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fonts: typeof valueOrUpdater === 'function'
                ? valueOrUpdater(prev.fonts || [])
                : valueOrUpdater
        }));
    }, [activeFontStyleId, updateStyleState]);

    // Get primary font
    const getPrimaryFont = useCallback(() => {
        return fonts.find(f => f && f.type === 'primary');
    }, [fonts]);

    // Get primary font from specific style
    const getPrimaryFontFromStyle = useCallback((styleId) => {
        const style = fontStyles[styleId];
        return style?.fonts?.find(f => f && f.type === 'primary') || null;
    }, [fontStyles]);

    // Get all fonts for a specific style
    const getFontsForStyle = useCallback((styleId) => {
        const style = fontStyles[styleId];
        return (style?.fonts || []).filter(f => f != null);
    }, [fontStyles]);

    // Get active font
    const getActiveFont = useCallback(() => {
        const activeId = activeStyle.activeFont || 'primary';
        return fonts.find(f => f && f.id === activeId) || getPrimaryFont();
    }, [activeStyle.activeFont, fonts, getPrimaryFont]);

    // Get activeFont ID
    const activeFont = activeStyle.activeFont || 'primary';

    /**
     * Set active font by ID
     */
    const setActiveFont = useCallback((fontId) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            activeFont: fontId
        }));
    }, [activeFontStyleId, updateStyleState]);

    // Derived values for primary font
    const primaryFont = getPrimaryFont();
    const fontObject = primaryFont?.fontObject || null;
    const fontUrl = primaryFont?.fontUrl || null;
    const fileName = primaryFont?.fileName || null;

    /**
     * Load a new primary font
     */
    const loadFont = useCallback((font, url, name, metadata = {}, buffer = null) => {
        logger.debug('Loading primary font:', name, metadata);

        // Clear primary from persisted cache to ensure new buffer is saved
        persistedFontIds.current.delete('primary');

        setFonts(prev => {
            const primary = prev.find(f => f && f.type === 'primary');
            const weight = metadata.isVariable
                ? resolveWeightForFont(metadata.axes, 400)
                : metadata.staticWeight || 400;

            const updated = [...prev];
            const primaryIndex = updated.findIndex(f => f && f.type === 'primary');

            const newPrimary = {
                ...(primary || {}),
                id: 'primary',
                type: 'primary',
                fontObject: font,
                fontUrl: url,
                fontBuffer: buffer,
                fileName: name,
                name: name,
                axes: metadata.axes || null,
                isVariable: metadata.isVariable || false,
                staticWeight: weight,
                color: primary?.color || DEFAULT_PALETTE[0]
            };

            if (primaryIndex >= 0) {
                updated[primaryIndex] = newPrimary;
            } else {
                updated.unshift(newPrimary);
            }

            return updated;
        });
    }, [setFonts]);

    /**
     * Add a fallback font to the stack
     */
    const addFallbackFont = useCallback((fontData) => {
        logger.debug('Adding fallback font:', fontData.name || fontData.fileName);

        setFonts(prev => {
            const primary = prev.find(f => f && f.type === 'primary');

            // Check for duplication against primary
            if (primary && fontData.fileName) {
                const pName = normalizeFontName(primary.fileName || primary.name);
                const nName = normalizeFontName(fontData.fileName || fontData.name);
                if (pName && nName && pName === nName) {
                    logger.warn('Duplicate font detected (matches primary), not adding:', fontData.name);
                    return prev;
                }
            }

            // Check for duplication in existing fallbacks
            const existingNames = prev
                .filter(f => f && f.type === 'fallback')
                .map(f => normalizeFontName(f.fileName || f.name));

            const newName = normalizeFontName(fontData.fileName || fontData.name);
            if (existingNames.includes(newName)) {
                logger.warn('Duplicate font detected (matches existing fallback), not adding:', fontData.name);
                return prev;
            }

            // System fonts go at end, uploaded fonts before system fonts
            const isSystem = isSystemFont(fontData);
            const firstSystemIndex = prev.findIndex(f => f && f.type === 'fallback' && isSystemFont(f));

            // Ensure a stable unique id for persistence
            const newFontId = fontData.id || `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newFont = {
                id: newFontId,
                ...fontData,
                type: 'fallback',
                color: fontData.color || getNextUniqueColor(prev)
            };

            if (isSystem || firstSystemIndex === -1) {
                // Append at end
                return [...prev, newFont];
            } else {
                // Insert before first system font
                const updated = [...prev];
                updated.splice(firstSystemIndex, 0, newFont);
                return updated;
            }
        });
    }, [setFonts, isSystemFont]);

    /**
     * Add multiple fallback fonts at once
     */
    const addFallbackFonts = useCallback((fontsDataArray) => {
        logger.debug('Batch adding fallback fonts:', fontsDataArray.length);

        setFonts(prev => {
            const primary = prev.find(f => f && f.type === 'primary');
            const pName = primary ? normalizeFontName(primary.fileName || primary.name) : null;

            // Filter out duplicates
            const existingNames = new Set(
                prev
                    .filter(f => f && f.type === 'fallback')
                    .map(f => normalizeFontName(f.fileName || f.name))
            );

            const newFonts = fontsDataArray
                .filter(fontData => {
                    const nName = normalizeFontName(fontData.fileName || fontData.name);
                    // Check against primary
                    if (pName && nName === pName) return false;
                    // Check against existing
                    if (existingNames.has(nName)) return false;
                    existingNames.add(nName);
                    return true;
                })
                .reduce((acc, fontData, i) => {
                    const id = fontData.id || `fallback-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`;
                    const newFont = {
                        id,
                        ...fontData,
                        type: 'fallback',
                        color: fontData.color || getNextUniqueColor([...prev, ...acc])
                    };
                    acc.push(newFont);
                    return acc;
                }, []);

            return [...prev, ...newFonts];
        });
    }, [setFonts]);

    /**
     * Add strictly mapped fonts (language-specific, not global)
     */
    const addStrictlyMappedFonts = useCallback((fontsDataArray, langId) => {
        logger.debug('Adding strictly mapped fonts for language:', langId, fontsDataArray.length);

        const newFonts = [];
        fontsDataArray.forEach((fontData, i) => {
            const newFont = {
                ...fontData,
                id: `fallback-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'fallback',
                isClone: true,
                isLangSpecific: true,
                color: fontData.color || getNextUniqueColor([...fonts, ...newFonts]),
                lineHeight: fontData.lineHeight || 'normal'
            };
            newFonts.push(newFont);
        });

        setFonts(prev => [...prev, ...newFonts]);

        // Note: Caller should update fallbackFontOverrides map
        return newFonts;
    }, [setFonts, fonts]);

    /**
     * Add a language-specific clone of an existing font
     */
    const addLanguageSpecificFont = useCallback((originalFontId, langId, initialUpdates = {}) => {
        logger.debug('Creating language-specific clone:', originalFontId, 'for', langId);

        setFonts(prev => {
            const original = prev.find(f => f && f.id === originalFontId);
            if (!original) {
                logger.warn('Original font not found:', originalFontId);
                return prev;
            }

            // Remove previous override for same language
            const filtered = prev.filter(f =>
                !(f && f.parentId === originalFontId && (typeof f.id === 'string' && f.id.includes(`lang-${langId}`)))
            );

            const clone = {
                ...original,
                ...initialUpdates,
                id: `lang-${langId}-${Date.now()}`,
                isClone: true,
                isLangSpecific: true,
                parentId: originalFontId,
                color: original.color,
                // Reset metric overrides
                scale: undefined,
                lineHeight: undefined,
                letterSpacing: undefined,
                baseFontSize: undefined,
                weightOverride: undefined,
                lineGapOverride: undefined,
                ascentOverride: undefined,
                descentOverride: undefined,
                fontSizeAdjust: undefined,
                sizeAdjust: undefined
            };

            return [...filtered, clone];
        });
    }, [setFonts]);

    /**
     * Remove a fallback font (and all its clones)
     */
    const removeFallbackFont = useCallback((fontId) => {
        logger.debug('Removing fallback font:', fontId);

        setFonts(prev => {
            const fontToRemove = prev.find(f => f && f.id === fontId);
            if (!fontToRemove) return prev;

            // Find all related fonts (by fontObject, fileName, or name)
            const isRelated = (f) => {
                if (!f || f.id === fontId) return true;
                if (fontToRemove.fontObject && f.fontObject === fontToRemove.fontObject) return true;
                if (fontToRemove.fileName && f.fileName === fontToRemove.fileName) return true;
                if (!fontToRemove.fileName && !f.fileName &&
                    normalizeFontName(f.name) === normalizeFontName(fontToRemove.name)) return true;
                return false;
            };

            // Revoke blob URLs for fonts being removed
            prev.forEach(f => {
                if (isRelated(f) && f.fontUrl) {
                    revokeFontUrl(f.fontUrl);
                    logger.debug('Revoked blob URL for font:', f.id);
                }
            });

            const filtered = prev.filter(f => !isRelated(f));

            // Re-assign types (index 0 = current primary selection or first font)
            // Note: In some styles, the first font might not be the primary if it's a multi-primary app,
            // but for this app the first element of fonts array is always type='primary'.
            return filtered.map((f, i) => ({
                ...f,
                type: i === 0 ? 'primary' : 'fallback'
            }));
        });

        // Note: Caller should clean up override maps
    }, [setFonts]);

    /**
     * Reorder fonts in the stack
     */
    const reorderFonts = useCallback((oldIndex, newIndex) => {
        logger.debug('Reordering fonts:', oldIndex, '->', newIndex);

        setFonts(prev => {
            if (oldIndex === newIndex) return prev;
            if (oldIndex < 0 || oldIndex >= prev.length) return prev;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const reordered = [...prev];
            const [moved] = reordered.splice(oldIndex, 1);
            reordered.splice(newIndex, 0, moved);

            // Swap colors if primary changes
            if (oldIndex === 0 || newIndex === 0) {
                const oldPrimary = prev[0];
                const newPrimary = reordered[0];
                if (oldPrimary && newPrimary && oldPrimary.id !== newPrimary.id) {
                    const tempColor = newPrimary.color;
                    newPrimary.color = oldPrimary.color;
                    if (oldIndex === 0) {
                        reordered[newIndex].color = tempColor;
                    }
                }
            }

            // Re-assign types and clear overrides when type changes
            return reordered.map((f, i) => {
                const oldType = f.type;
                const newType = i === 0 ? 'primary' : 'fallback';
                const typeChanged = oldType !== newType;

                return {
                    ...f,
                    type: newType,
                    // Clear metric overrides on type change
                    ...(typeChanged && {
                        scale: undefined,
                        lineHeight: undefined,
                        letterSpacing: undefined,
                        baseFontSize: undefined,
                        weightOverride: undefined,
                        lineGapOverride: undefined,
                        ascentOverride: undefined,
                        descentOverride: undefined,
                        fontSizeAdjust: undefined,
                        sizeAdjust: undefined
                    })
                };
            });
        });

        // Note: Caller should update override maps if primary changed
    }, [setFonts]);

    /**
     * Update font color (broadcasts to all fonts with same name across all styles)
     */
    const updateFontColor = useCallback((fontId, color) => {
        logger.debug('Updating font color:', fontId, color);

        setFontStyles(prev => {
            // Find the font in the current state to get its name
            const activeStyle = prev[activeFontStyleId] || prev.primary;
            const font = activeStyle?.fonts?.find(f => f && f.id === fontId);
            if (!font) return prev;

            const targetName = normalizeFontName(font.fileName || font.name);

            // Create a new state object
            const nextStyles = { ...prev };
            Object.keys(nextStyles).forEach(styleId => {
                const style = nextStyles[styleId];
                if (style && style.fonts) {
                    nextStyles[styleId] = {
                        ...style,
                        fonts: style.fonts.map(f => {
                            if (!f) return f;
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
    }, [activeFontStyleId]);

    /**
     * Get font color with fallback to parent
     */
    const getFontColor = useCallback((fontId) => {
        const font = fonts.find(f => f && f.id === fontId);
        if (!font) return DEFAULT_PALETTE[0];
        if (font.color) return font.color;

        // Fallback to parent color if clone
        if (font.parentId) {
            const parent = fonts.find(f => f && f.id === font.parentId);
            return parent?.color || DEFAULT_PALETTE[0];
        }

        return DEFAULT_PALETTE[0];
    }, [fonts]);

    /**
     * Get font color for a specific style by index
     */
    const getFontColorForStyle = useCallback((styleId, index) => {
        const style = fontStyles[styleId];
        const font = style?.fonts?.[index];
        return font?.color || DEFAULT_PALETTE[0];
    }, [fontStyles]);

    /**
     * Update font weight
     */
    const updateFontWeight = useCallback((fontId, newWeight) => {
        logger.debug('Updating font weight:', fontId, newWeight);

        // We can't use a functional updater here easily because it calls other state setters
        // But we can access the latest state if needed, or just let fonts dependency handle it.
        // If we keep fonts in dependencies, it's NOT stale.
        const font = fonts.find(f => f && f.id === fontId);
        if (!font) {
            logger.warn('Font not found for weight update:', fontId);
            return;
        }

        if (font.type === 'primary') {
            // Update global weight for active style
            updateStyleState(activeFontStyleId, prev => ({
                ...prev,
                weight: newWeight
            }));
        } else {
            // Set weightOverride for fallback
            setFonts(prev => prev.map(f =>
                f && f.id === fontId
                    ? { ...f, weightOverride: newWeight }
                    : f
            ));
        }
    }, [fonts, activeFontStyleId, setFonts, updateStyleState]);

    /**
     * Toggle font visibility
     */
    const toggleFontVisibility = useCallback((fontId) => {
        setFonts(prev => prev.map(f =>
            f && f.id === fontId
                ? { ...f, hidden: !f.hidden }
                : f
        ));
    }, [setFonts]);

    /**
     * Update a specific property of a font
     */
    const updateFontProperty = useCallback((fontId, property, value) => {
        logger.debug('Updating font property:', fontId, property, value);
        setFonts(prev => prev.map(f =>
            f && f.id === fontId
                ? { ...f, [property]: value }
                : f
        ));
    }, [setFonts]);

    /**
     * Update a setting for a language-specific font clone
     */
    const updateLanguageSpecificSetting = useCallback((parentFontId, langId, property, value) => {
        logger.debug('Updating language-specific setting:', parentFontId, langId, property, value);
        setFonts(prev => prev.map(f => {
            if (!f || !f.id) return f;
            // Check if this is a clone for the target language and parent font
            const isCloneForLang = (f.parentId === parentFontId || f.id === parentFontId) &&
                (typeof f.id === 'string' && (f.id.includes(`lang-${langId}`) || f.id.includes(`lang-primary-${langId}`)));

            if (isCloneForLang) {
                return { ...f, [property]: value };
            }
            return f;
        }));
    }, [setFonts]);

    /**
     * Toggle font global status (make language-specific vs global)
     */
    const toggleFontGlobalStatus = useCallback((fontId) => {
        setFonts(prev => prev.map(f =>
            f && f.id === fontId
                ? { ...f, isLangSpecific: !f.isLangSpecific }
                : f
        ));
    }, [setFonts]);

    // Ref to track fontStyles for cleanup on unmount
    const fontStylesRef = useRef(fontStyles);
    useEffect(() => {
        fontStylesRef.current = fontStyles;
    }, [fontStyles]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            logger.debug('Cleaning up blob URLs on unmount');
            Object.values(fontStylesRef.current).forEach(style => {
                style.fonts?.forEach(font => {
                    if (font?.fontUrl) {
                        revokeFontUrl(font.fontUrl);
                    }
                });
            });
        };
    }, []); // Only run on unmount

    // Create context value
    const value = useMemo(() => ({
        // State
        fonts,
        activeFontStyleId,
        fontStyles,
        primaryFont,
        fontObject,
        fontUrl,
        fileName,
        persistedFontIds,
        activeFont,

        // Core methods
        loadFont,
        setFonts,
        setActiveFontStyleId,
        setActiveFont,
        addFallbackFont,
        addFallbackFonts,
        removeFallbackFont,
        reorderFonts,

        // Language-specific
        addLanguageSpecificFont,
        addStrictlyMappedFonts,

        // Color management
        updateFontColor,
        getFontColor,
        getFontColorForStyle,

        // Weight management
        updateFontWeight,
        updateFontProperty,
        updateLanguageSpecificSetting,

        // Visibility
        toggleFontVisibility,
        toggleFontGlobalStatus,

        // Getters
        getPrimaryFont,
        getPrimaryFontFromStyle,
        getFontsForStyle,
        getActiveFont,
        isSystemFont,

        // Style management
        updateStyleState
    }), [
        fonts,
        activeFontStyleId,
        fontStyles,
        primaryFont,
        fontObject,
        fontUrl,
        fileName,
        activeFont,
        loadFont,
        setFonts,
        setActiveFontStyleId,
        setActiveFont,
        addFallbackFont,
        addFallbackFonts,
        removeFallbackFont,
        reorderFonts,
        addLanguageSpecificFont,
        addStrictlyMappedFonts,
        updateFontColor,
        getFontColor,
        getFontColorForStyle,
        updateFontWeight,
        updateFontProperty,
        updateLanguageSpecificSetting,
        toggleFontVisibility,
        toggleFontGlobalStatus,
        getPrimaryFont,
        getPrimaryFontFromStyle,
        getFontsForStyle,
        getActiveFont,
        isSystemFont,
        updateStyleState
    ]);

    /**
     * Reset handler: clears all font uploads/config and revokes blob URLs.
     * Listens for a global CustomEvent 'fallbackstyle:reset' so other parts
     * of the app can trigger a scoped reset without importing the context.
     */
    useEffect(() => {
        const handler = (e) => {
            const scope = e?.detail?.scope || 'all';
            if (scope === 'all' || scope === 'brand-font') {
                logger.debug('Reset event received (FontManagement) - scope:', scope);

                // Revoke all blob URLs across styles
                Object.values(fontStyles).forEach(style => {
                    style.fonts?.forEach(font => {
                        if (font?.fontUrl) revokeFontUrl(font.fontUrl);
                    });
                });

                // Clear persisted ids
                persistedFontIds.current.clear();

                // Reset in-memory font state to default single primary
                // Note: Don't update state here - the page will reload anyway
                // setFontStyles({ primary: createEmptyFontState() });
            }
        };

        window.addEventListener('fallbackstyle:reset', handler);
        return () => window.removeEventListener('fallbackstyle:reset', handler);
    }, [fontStyles]);

    return (
        <FontManagementContext.Provider value={value}>
            {children}
        </FontManagementContext.Provider>
    );
};
