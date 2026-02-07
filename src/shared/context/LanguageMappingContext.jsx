import { useState, useCallback, useMemo, useEffect } from 'react';
import { DEFAULT_PALETTE } from '../data/constants';
import languagesData from '../data/languages.json';
import sampleSentences from '../data/sampleSentences.json';
import { normalizeFontName } from '../utils/fontNameUtils';
import { createLogger } from '../services/Logger';
import { useFontManagement } from './useFontManagement';
import { getNextUniqueColor } from '../utils/colorUtils';

const logger = createLogger('LanguageMapping');

// Merge sampleSentences into languages
const languages = languagesData.map(lang => ({
    ...lang,
    sampleSentence: lang.sampleSentence || sampleSentences[lang.id] || "The quick brown fox jumps over the lazy dog"
}));

/**
 * LanguageMappingContext
 *
 * Manages language-to-font associations and visibility:
 * - Language configuration and visibility
 * - Primary language designation
 * - Language-to-font mapping (primary and fallback overrides)
 * - System fallback overrides
 */

import { LanguageMappingContext } from './useLanguageMapping';

const getDefaultVisibleLanguageIds = () => [
    'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR',
    'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'ar-SA', 'hi-IN'
];



export const LanguageMappingProvider = ({ children }) => {
    // Get font management context
    const fontContext = useFontManagement();
    const {
        fonts,
        activeFontStyleId,
        fontStyles,
        updateStyleState,
        setFonts,
    } = fontContext;

    // Check if reset is in progress ONCE on mount and persist the decision
    const [wasReset] = useState(() =>
        typeof window !== 'undefined' &&
        sessionStorage.getItem('__app_reset_in_progress__') === 'true'
    );

    // Local state for visibility (not part of activeStyle)
    // Start empty - languages are added explicitly by user or loaded from config
    const [visibleLanguageIds, setVisibleLanguageIds] = useState([]);
    const [hiddenLanguageIds, setHiddenLanguageIds] = useState([]);

    // Get active style state
    const activeStyle = fontStyles[activeFontStyleId] || fontStyles.primary;
    const {
        configuredLanguages = [],
        primaryLanguages = wasReset ? [] : ['en-US'], // Empty during reset
        primaryFontOverrides = {},
        fallbackFontOverrides = {},
        systemFallbackOverrides = {}
    } = activeStyle;

    /**
     * Computed: All configured language IDs (sorted in canonical order)
     */
    const allConfiguredLanguageIds = useMemo(() => {
        const idSet = new Set([
            ...visibleLanguageIds,
            ...configuredLanguages,
            ...primaryLanguages,
            ...Object.keys(primaryFontOverrides),
            ...Object.keys(fallbackFontOverrides)
        ]);

        // Return in canonical order from languages.json
        return languages.map(l => l.id).filter(id => idSet.has(id));
    }, [visibleLanguageIds, configuredLanguages, primaryLanguages, primaryFontOverrides, fallbackFontOverrides]);

    /**
     * Computed: Languages with explicit font overrides only
     */
    const strictlyMappedLanguageIds = useMemo(() => {
        const mapped = new Set();
        Object.keys(primaryFontOverrides).forEach(id => mapped.add(id));
        Object.keys(fallbackFontOverrides).forEach(id => mapped.add(id));
        return Array.from(mapped);
    }, [primaryFontOverrides, fallbackFontOverrides]);

    /**
     * Computed: Effective visible language IDs (alias for allConfiguredLanguageIds)
     */
    const effectiveVisibleLanguageIds = allConfiguredLanguageIds;

    /**
     * Computed: Full language objects for visible languages
     */
    const visibleLanguages = useMemo(() => {
        return languages.filter(lang => effectiveVisibleLanguageIds.includes(lang.id));
    }, [effectiveVisibleLanguageIds]);

    /**
     * Computed: Supported languages (all languages)
     */
    const supportedLanguages = languages;
    const supportedLanguageIds = useMemo(() => languages.map(l => l.id), []);

    // ========== CONFIGURATION & VISIBILITY ==========

    /**
     * Reset handler scoped to language mapping state.
     * Listens for 'fallbackstyle:reset' custom event to allow
     * centralized reset flows (landing page) to trigger scoped resets.
     */
    useEffect(() => {
        const handler = (e) => {
            const scope = e?.detail?.scope || 'all';
            if (scope === 'all' || scope === 'multi-language') {
                logger.debug('Reset event received (LanguageMapping) - scope:', scope);

                // Note: Don't update state here - the page will reload anyway
                // State updates would trigger auto-save which we want to avoid
                // The storage has already been cleared by PersistenceContext
            }
        };

        window.addEventListener('fallbackstyle:reset', handler);
        return () => window.removeEventListener('fallbackstyle:reset', handler);
    }, []);


    /**
     * Set language visibility
     * @param {string|'__batch__'} langId - Language ID or '__batch__' for batch operation
     * @param {boolean|Array<string>} visible - Visibility boolean or array of language IDs for batch
     */
    const setLanguageVisibility = useCallback((langId, visible) => {
        // Handle batch mode (used for config restoration)
        if (langId === '__batch__' && Array.isArray(visible)) {
            // logger.debug('Batch setting language visibility:', visible.length);
            const sortedVisible = languages.map(l => l.id).filter(id => visible.includes(id));
            setVisibleLanguageIds(sortedVisible);
            return;
        }

        logger.debug('Setting language visibility:', langId, visible);

        if (visible) {
            setVisibleLanguageIds(prev => {
                if (prev.includes(langId)) return prev;
                const nextSet = new Set([...prev, langId]);
                // Re-sort in canonical order
                return languages.map(l => l.id).filter(id => nextSet.has(id));
            });
        } else {
            setVisibleLanguageIds(prev => prev.filter(id => id !== langId));
        }
    }, []);

    /**
     * Remove a configured language
     */
    const removeConfiguredLanguage = useCallback((langId) => {
        logger.debug('Removing configured language:', langId);

        updateStyleState(activeFontStyleId, prev => {
            // Remove from configured
            const nextConfigured = (prev.configuredLanguages || []).filter(id => id !== langId);

            // Clean up overrides
            const nextPrimaryOverrides = { ...prev.primaryFontOverrides };
            delete nextPrimaryOverrides[langId];

            const nextFallbackOverrides = { ...prev.fallbackFontOverrides };
            delete nextFallbackOverrides[langId];

            return {
                ...prev,
                configuredLanguages: nextConfigured,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides
            };
        });

        // Remove language-specific fonts
        setFonts(prev => prev.filter(f =>
            !(f.isLangSpecific && f.id.includes(`lang-${langId}`))
        ));

        // Remove from hidden
        setHiddenLanguageIds(prev => prev.filter(id => id !== langId));
    }, [activeFontStyleId, setFonts, updateStyleState]);

    /**
     * Add a language to the configured list
     */
    const addConfiguredLanguage = useCallback((langId) => {
        logger.debug('Adding configured language:', langId);
        updateStyleState(activeFontStyleId, prev => {
            const nextConfigured = new Set(prev.configuredLanguages || []);
            nextConfigured.add(langId);
            return {
                ...prev,
                configuredLanguages: Array.from(nextConfigured)
            };
        });
        setLanguageVisibility(langId, true);
    }, [activeFontStyleId, updateStyleState, setLanguageVisibility]);

    /**
     * Batch add configured languages
     */
    const batchAddConfiguredLanguages = useCallback((langIds) => {
        logger.debug('Batch adding configured languages:', langIds.length);
        updateStyleState(activeFontStyleId, prev => {
            const nextConfigured = new Set(prev.configuredLanguages || []);
            langIds.forEach(id => nextConfigured.add(id));
            return {
                ...prev,
                configuredLanguages: Array.from(nextConfigured)
            };
        });
        // Also ensure they are visible
        setVisibleLanguageIds(prev => {
            const nextSet = new Set([...prev, ...langIds]);
            return languages.map(l => l.id).filter(id => nextSet.has(id));
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Toggle primary language status
     */
    const togglePrimaryLanguage = useCallback((langId) => {
        logger.debug('Toggling primary language:', langId);
        updateStyleState(activeFontStyleId, prev => {
            const current = prev.primaryLanguages || [];
            const next = current.includes(langId)
                ? current.filter(id => id !== langId)
                : [...current, langId];

            return {
                ...prev,
                primaryLanguages: next
            };
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Check if a language is visible
     */
    const isLanguageVisible = useCallback((langId) => {
        return effectiveVisibleLanguageIds.includes(langId) && !hiddenLanguageIds.includes(langId);
    }, [effectiveVisibleLanguageIds, hiddenLanguageIds]);

    /**
     * Check if a language has explicit mappings
     */
    const isLanguageMapped = useCallback((langId) => {
        return !!primaryFontOverrides[langId] || !!fallbackFontOverrides[langId];
    }, [primaryFontOverrides, fallbackFontOverrides]);

    /**
     * Toggle language hidden status (temporary view state)
     */
    const toggleLanguageHidden = useCallback((langId) => {
        setHiddenLanguageIds(prev =>
            prev.includes(langId) ? prev.filter(id => id !== langId) : [...prev, langId]
        );
    }, []);

    /**
     * Unhide all currently hidden languages
     */
    const unhideAllLanguages = useCallback(() => {
        setHiddenLanguageIds([]);
    }, []);

    /**
     * Show all supported languages
     */
    const showAllLanguages = useCallback(() => {
        setVisibleLanguageIds(languages.map(l => l.id));
    }, []);

    /**
     * Hide all languages
     */
    const hideAllLanguages = useCallback(() => {
        setVisibleLanguageIds([]);
    }, []);

    /**
     * Reset visible languages to defaults
     */
    const resetVisibleLanguages = useCallback(() => {
        setVisibleLanguageIds(getDefaultVisibleLanguageIds());
    }, []);

    /**
     * Toggle language visibility (smart - removes if configured, adds if not)
     */
    const toggleLanguageVisibility = useCallback((langId) => {
        if (effectiveVisibleLanguageIds.includes(langId)) {
            // Remove fully (calls removeConfiguredLanguage)
            removeConfiguredLanguage(langId);
        } else {
            setLanguageVisibility(langId, true);
        }
    }, [effectiveVisibleLanguageIds, removeConfiguredLanguage, setLanguageVisibility]);

    // ========== FONT MAPPING ==========

    /**
     * Map a language to a font
     */
    const mapLanguageToFont = useCallback((langId, fontId) => {
        logger.debug('Mapping language to font:', langId, '->', fontId);

        const targetFont = fonts.find(f => f && f.id === fontId);
        if (!targetFont) {
            logger.warn('Target font not found:', fontId);
            return;
        }

        const isPrimary = targetFont.type === 'primary';

        // Clean up old overrides for this language
        setFonts(prev => prev.filter(f =>
            !(f && (f.isLangSpecific || f.isClone || f.id.startsWith('lang-')) &&
                f.id.includes(`lang-${langId}`))
        ));

        updateStyleState(activeFontStyleId, prev => {
            const nextPrimaryOverrides = { ...prev.primaryFontOverrides };
            const nextFallbackOverrides = { ...prev.fallbackFontOverrides };
            const nextConfigured = new Set(prev.configuredLanguages || []);

            if (isPrimary) {
                // Mapping to primary font
                const primaryFont = fonts.find(f => f && f.type === 'primary');
                if (fontId === primaryFont?.id) {
                    // Mapping to main primary - remove override (reset to default)
                    delete nextPrimaryOverrides[langId];
                } else {
                    nextPrimaryOverrides[langId] = fontId;
                }
                delete nextFallbackOverrides[langId];
            } else {
                // Mapping to fallback font
                nextFallbackOverrides[langId] = fontId;
                delete nextPrimaryOverrides[langId];
            }

            nextConfigured.add(langId);

            return {
                ...prev,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides,
                configuredLanguages: Array.from(nextConfigured)
            };
        });

        setLanguageVisibility(langId, true);
    }, [activeFontStyleId, fonts, setFonts, updateStyleState, setLanguageVisibility]);

    /**
     * Unmap a language (remove all overrides)
     */
    const unmapLanguage = useCallback((langId) => {
        logger.debug('Unmapping language:', langId);

        // Remove language-specific fonts outside the style updater
        setFonts(prevFonts => prevFonts.filter(f => {
            if (!f) return false;
            if (!(f.isLangSpecific || f.isClone || f.id.startsWith('lang-'))) return true;
            if (!f.id.includes(`lang-${langId}`)) return true;
            return false;
        }));

        updateStyleState(activeFontStyleId, prev => {
            // Remove overrides
            const nextPrimaryOverrides = { ...prev.primaryFontOverrides };
            const nextFallbackOverrides = { ...prev.fallbackFontOverrides };
            delete nextPrimaryOverrides[langId];
            delete nextFallbackOverrides[langId];

            // Remove from configured if not primary
            const hasPrimaryStatus = prev.primaryLanguages?.includes(langId);
            const nextConfigured = (!hasPrimaryStatus)
                ? (prev.configuredLanguages || []).filter(id => id !== langId)
                : prev.configuredLanguages;

            return {
                ...prev,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides,
                configuredLanguages: nextConfigured
            };
        });
    }, [activeFontStyleId, setFonts, updateStyleState]);

    /**
     * Assign font to multiple languages (bulk operation)
     */
    const assignFontToMultipleLanguages = useCallback((fontId, targetLangIds) => {
        logger.debug('Assigning font to multiple languages:', fontId, targetLangIds);

        const targetFont = fonts.find(f => f && f.id === fontId);
        if (!targetFont) return;

        const isPrimary = targetFont.type === 'primary';

        // Clean up old language-specific fonts outside the style updater
        targetLangIds.forEach(langId => {
            setFonts(prevFonts => prevFonts.filter(f =>
                !(f && (f.isLangSpecific || f.isClone || f.id.startsWith('lang-')) &&
                    f.id.includes(`lang-${langId}`))
            ));
        });

        // Set visibility outside the style updater
        targetLangIds.forEach(langId => {
            setLanguageVisibility(langId, true);
        });

        updateStyleState(activeFontStyleId, prev => {
            const draft = { ...prev };
            const nextPrimaryOverrides = { ...draft.primaryFontOverrides };
            const nextFallbackOverrides = { ...draft.fallbackFontOverrides };
            const nextConfigured = new Set(draft.configuredLanguages || []);

            targetLangIds.forEach(langId => {
                if (isPrimary) {
                    nextPrimaryOverrides[langId] = fontId;
                    delete nextFallbackOverrides[langId];
                } else {
                    nextFallbackOverrides[langId] = fontId;
                    delete nextPrimaryOverrides[langId];
                }

                nextConfigured.add(langId);
            });

            return {
                ...draft,
                primaryFontOverrides: nextPrimaryOverrides,
                fallbackFontOverrides: nextFallbackOverrides,
                configuredLanguages: Array.from(nextConfigured)
            };
        });
    }, [activeFontStyleId, fonts, setFonts, updateStyleState, setLanguageVisibility]);



    // ========== SYSTEM FALLBACK OVERRIDES ==========

    /**
     * Update system fallback override for a language
     */
    const updateSystemFallbackOverride = useCallback((langId, property, value) => {
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            systemFallbackOverrides: {
                ...prev.systemFallbackOverrides,
                [langId]: {
                    ...(prev.systemFallbackOverrides?.[langId] || {}),
                    [property]: value
                }
            }
        }));
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Reset system fallback override for a language
     */
    const resetSystemFallbackOverride = useCallback((langId) => {
        updateStyleState(activeFontStyleId, prev => {
            const next = { ...prev.systemFallbackOverrides };
            delete next[langId];
            return {
                ...prev,
                systemFallbackOverrides: next
            };
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Get primary font override for specific style
     */
    const getPrimaryFontOverrideForStyle = useCallback((styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.primaryFontOverrides?.[langId] || null;
    }, [fontStyles]);

    /**
     * Get fallback font override for specific style
     */
    const getFallbackFontOverrideForStyle = useCallback((styleId, langId) => {
        const style = fontStyles[styleId];
        return style?.fallbackFontOverrides?.[langId] || null;
    }, [fontStyles]);

    /**
     * Set fallback font override for specific style
     */
    const setFallbackFontOverrideForStyle = useCallback((styleId, langId, fontId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            fallbackFontOverrides: {
                ...prev.fallbackFontOverrides,
                [langId]: fontId
            }
        }));
    }, [updateStyleState]);

    /**
     * Clear fallback font override for specific style
     */
    const clearFallbackFontOverrideForStyle = useCallback((styleId, langId) => {
        updateStyleState(styleId, prev => {
            const next = { ...prev.fallbackFontOverrides };
            delete next[langId];
            return {
                ...prev,
                fallbackFontOverrides: next
            };
        });
    }, [updateStyleState]);

    /**
     * Clear primary font override
     */
    const clearPrimaryFontOverride = useCallback((langId) => {
        updateStyleState(activeFontStyleId, prev => {
            const next = { ...prev.primaryFontOverrides };
            delete next[langId];
            return {
                ...prev,
                primaryFontOverrides: next
            };
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Clear fallback font override for a language
     */
    const clearFallbackFontOverride = useCallback((langId) => {
        updateStyleState(activeFontStyleId, prev => {
            const next = { ...prev.fallbackFontOverrides };
            delete next[langId];
            return {
                ...prev,
                fallbackFontOverrides: next
            };
        });

        // Remove language-specific fonts
        setFonts(prevFonts => prevFonts.filter(f =>
            !(f && (f.isLangSpecific || f.isClone || f.id.startsWith('lang-')) &&
                f.id.includes(`lang-${langId}`))
        ));
    }, [activeFontStyleId, setFonts, updateStyleState]);

    /**
     * Set fallback font override (alias for mapLanguageToFont with fallback font)
     */
    const setFallbackFontOverride = useCallback((langId, fontId) => {
        if (fontId === null || fontId === undefined) {
            clearFallbackFontOverride(langId);
        } else {
            mapLanguageToFont(langId, fontId);
        }
    }, [mapLanguageToFont, clearFallbackFontOverride]);

    /**
     * Update fallback font override (alias for setFallbackFontOverride)
     */
    const updateFallbackFontOverride = setFallbackFontOverride;

    /**
     * Reset all fallback font overrides for a specific font
     */
    const resetFallbackFontOverrides = useCallback((fontId) => {
        updateStyleState(activeFontStyleId, prev => {
            const nextOverrides = { ...prev.fallbackFontOverrides };

            // Remove all entries that reference this fontId
            Object.keys(nextOverrides).forEach(langId => {
                if (nextOverrides[langId] === fontId) {
                    delete nextOverrides[langId];
                }
            });

            return {
                ...prev,
                fallbackFontOverrides: nextOverrides
            };
        });
    }, [activeFontStyleId, updateStyleState]);

    /**
     * Reset ALL fallback font overrides for a style
     */
    const resetAllFallbackFontOverridesForStyle = useCallback((styleId) => {
        updateStyleState(styleId, prev => ({
            ...prev,
            fallbackFontOverrides: {}
        }));
    }, [updateStyleState]);

    /**
     * Link font to language (alias for mapLanguageToFont)
     */
    const linkFontToLanguage = mapLanguageToFont;

    /**
     * Add language-specific primary font (create clone if missing)
     */
    const addLanguageSpecificPrimaryFont = useCallback((langId, options = {}) => {
        logger.debug('Adding language-specific primary font for:', langId);

        // If onlyIfMissing is true, check if override already exists
        if (options.onlyIfMissing) {
            const existing = primaryFontOverrides[langId];
            if (existing) {
                logger.debug('Primary override already exists for:', langId);
                return existing;
            }
        }

        const fontId = `lang-primary-${langId}-${Date.now()}`;

        setFonts(prev => {
            // Get the LATEST global primary font to clone
            const primaryFont = prev.find(f => f && f.type === 'primary');
            if (!primaryFont) {
                logger.warn('No primary font found to clone');
                return prev;
            }

            const newFont = {
                ...primaryFont,
                id: fontId,
                type: 'primary',
                isPrimaryOverride: true,
                isClone: true,
                parentId: primaryFont.id,
                color: primaryFont.color
            };

            return [...prev.filter(f => !f.id.startsWith(`lang-primary-${langId}`)), newFont];
        });

        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            primaryFontOverrides: {
                ...prev.primaryFontOverrides,
                [langId]: fontId
            }
        }));

        addConfiguredLanguage(langId);

        return fontId;
    }, [primaryFontOverrides, activeFontStyleId, setFonts, updateStyleState, addConfiguredLanguage]);

    /**
     * Add primary language overrides for multiple languages (batch)
     */
    const addPrimaryLanguageOverrides = useCallback((languageIds) => {
        languageIds.forEach(langId => {
            addLanguageSpecificPrimaryFont(langId, { onlyIfMissing: true });
        });
    }, [addLanguageSpecificPrimaryFont]);

    /**
     * Add language-specific primary font from existing font ID (clone)
     */
    const addLanguageSpecificPrimaryFontFromId = useCallback((sourceFontId, langId) => {
        logger.debug('Creating language-specific primary font from:', sourceFontId, 'for', langId);

        const fontId = `lang-primary-${langId}-${Date.now()}`;

        // Add to fonts array using functional update to avoid stale fonts from closure
        setFonts(prev => {
            const sourceFont = prev.find(f => f && f.id === sourceFontId);
            if (!sourceFont) {
                logger.warn('Source font not found for cloning:', sourceFontId);
                return prev;
            }

            // Create clone
            const newFont = {
                ...sourceFont,
                id: fontId,
                type: 'primary',
                isPrimaryOverride: true,
                isClone: true,
                parentId: sourceFontId,
                color: sourceFont.color
            };

            // Filter out any existing primary overrides for this same language to be clean
            return [...prev.filter(f => !f.id.startsWith(`lang-primary-${langId}`)), newFont];
        });

        // Map as primary override
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            primaryFontOverrides: {
                ...prev.primaryFontOverrides,
                [langId]: fontId
            }
        }));

        // Ensure language is configured and visible
        addConfiguredLanguage(langId);

        return fontId;
    }, [activeFontStyleId, setFonts, updateStyleState, addConfiguredLanguage]);

    /**
     * Batch add fonts and mappings
     */
    const batchAddFontsAndMappings = useCallback(({
        fonts: fontsToAdd,
        mappings,
        languageIds,
        primaryLanguages: selectedPrimaryLanguages,
        sourcePrimaryFontId,
        primaryFontData
    }) => {
        logger.debug('Batch adding fonts and mappings');

        // Combined atomic update of style state
        updateStyleState(activeFontStyleId, prev => {
            const nextFallbackOverrides = { ...prev.fallbackFontOverrides };
            const nextPrimaryOverrides = { ...prev.primaryFontOverrides };
            const nextConfigured = new Set(prev.configuredLanguages || []);
            const nextPrimaryLanguages = selectedPrimaryLanguages || prev.primaryLanguages || [];

            // 1. Prepare nextFonts array starting with previous ones
            let nextFonts = [...(prev.fonts || [])];

            // 1.5. Add or update primary font if provided
            if (primaryFontData) {
                const existingPrimaryIndex = nextFonts.findIndex(f => f && f.type === 'primary');
                const newPrimary = {
                    ...(existingPrimaryIndex >= 0 ? nextFonts[existingPrimaryIndex] : {}),
                    id: 'primary',
                    type: 'primary',
                    fontObject: primaryFontData.fontObject,
                    fontUrl: primaryFontData.fontUrl,
                    fontBuffer: primaryFontData.fontBuffer,
                    fileName: primaryFontData.fileName,
                    name: primaryFontData.name,
                    axes: primaryFontData.axes || null,
                    isVariable: primaryFontData.isVariable || false,
                    staticWeight: primaryFontData.staticWeight || 400,
                    color: (existingPrimaryIndex >= 0 ? nextFonts[existingPrimaryIndex].color : null) || DEFAULT_PALETTE[0]
                };

                if (existingPrimaryIndex >= 0) {
                    nextFonts[existingPrimaryIndex] = newPrimary;
                } else {
                    nextFonts.unshift(newPrimary);
                }
            }

            // 2. Add Fallback Fonts from fontsToAdd
            if (fontsToAdd && fontsToAdd.length > 0) {
                const primaryFont = nextFonts.find(f => f && f.type === 'primary');
                const pName = primaryFont ? normalizeFontName(primaryFont.fileName || primaryFont.name) : null;
                const existingNames = new Set(nextFonts.filter(f => f && f.type === 'fallback').map(f => normalizeFontName(f.fileName || f.name)));

                fontsToAdd.forEach(fontData => {
                    const nName = normalizeFontName(fontData.fileName || fontData.name);
                    if (pName && nName === pName) return;
                    if (existingNames.has(nName)) return;

                    nextFonts.push({
                        ...fontData,
                        type: 'fallback',
                        color: fontData.color || getNextUniqueColor(nextFonts)
                    });
                    existingNames.add(nName);
                });
            }

            // 3. Register explicit languageIds as configured
            if (languageIds) {
                languageIds.forEach(id => nextConfigured.add(id));
            }

            // 4. Process Fallback Mappings
            if (mappings) {
                Object.entries(mappings).forEach(([langId, fontIdentifier]) => {
                    let targetFont = nextFonts.find(f => f.id === fontIdentifier);

                    if (!targetFont) {
                        const normalizedTarget = normalizeFontName(fontIdentifier);
                        targetFont = nextFonts.find(f =>
                            normalizeFontName(f.fileName || f.name) === normalizedTarget
                        );
                    }

                    if (targetFont) {
                        nextFallbackOverrides[langId] = targetFont.id;
                        nextConfigured.add(langId);
                    }
                });
            }

            // 5. Process Primary Language Assignments & Clones
            if (selectedPrimaryLanguages && selectedPrimaryLanguages.length > 0) {
                const sourceFid = sourcePrimaryFontId || 'primary';
                const sourceFont = nextFonts.find(f => f && f.id === sourceFid);

                selectedPrimaryLanguages.forEach(langId => {
                    // Remove fallback if setting as primary
                    delete nextFallbackOverrides[langId];
                    nextConfigured.add(langId);

                    // Create Clone for primary override
                    if (sourceFont) {
                        const cloneId = `lang-primary-${langId}-${Date.now()}`;
                        const newClone = {
                            ...sourceFont,
                            id: cloneId,
                            type: 'primary',
                            isPrimaryOverride: true,
                            isClone: true,
                            parentId: sourceFont.id,
                            color: sourceFont.color
                        };
                        // Add clone and record mapping
                        nextFonts = [...nextFonts.filter(f => !f.id.startsWith(`lang-primary-${langId}`)), newClone];
                        nextPrimaryOverrides[langId] = cloneId;
                    }
                });
            }

            return {
                ...prev,
                fonts: nextFonts,
                configuredLanguages: Array.from(nextConfigured),
                fallbackFontOverrides: nextFallbackOverrides,
                primaryFontOverrides: nextPrimaryOverrides,
                primaryLanguages: nextPrimaryLanguages
            };
        });

        // Ensure visibility is updated
        if (languageIds || selectedPrimaryLanguages) {
            const allToVisible = [...(languageIds || []), ...(selectedPrimaryLanguages || [])];
            setVisibleLanguageIds(prev => {
                const nextSet = new Set([...prev, ...allToVisible]);
                return languages.map(l => l.id).filter(id => nextSet.has(id));
            });
        }
    }, [activeFontStyleId, updateStyleState, setVisibleLanguageIds]); // Added setVisibleLanguageIds to deps

    /**
     * Add a language-specific fallback font (uploads new font and maps it)
     */
    const addLanguageSpecificFallbackFont = useCallback((font, url, name, metadata, langId, buffer) => {
        logger.debug('Adding language-specific fallback font:', name, 'for', langId);

        const fontId = `lang-fallback-${langId}-${Date.now()}`;

        // Create the font object
        const newFont = {
            id: fontId,
            type: 'fallback',
            fontObject: font,
            fontUrl: url,
            fontBuffer: buffer,
            fileName: name,
            name: name,
            axes: metadata?.axes || null,
            isVariable: metadata?.isVariable || false,
            staticWeight: metadata?.staticWeight || null,
            isLangSpecific: true,
            isClone: true,
            color: getNextUniqueColor(fonts),
            lineHeight: 'normal'
        };

        // Add to fonts array
        setFonts(prev => [...prev, newFont]);

        // Map to language
        updateStyleState(activeFontStyleId, prev => ({
            ...prev,
            fallbackFontOverrides: {
                ...prev.fallbackFontOverrides,
                [langId]: fontId
            }
        }));

        // Ensure language is configured and visible
        addConfiguredLanguage(langId);

        return fontId;
    }, [activeFontStyleId, fonts, setFonts, updateStyleState, addConfiguredLanguage]);

    // Create context value
    const value = useMemo(() => ({
        // State
        configuredLanguages: allConfiguredLanguageIds,
        primaryLanguages,
        visibleLanguageIds: effectiveVisibleLanguageIds,
        hiddenLanguageIds,
        primaryFontOverrides,
        fallbackFontOverrides,
        systemFallbackOverrides,

        // Computed
        supportedLanguages,
        supportedLanguageIds,
        mappedLanguageIds: strictlyMappedLanguageIds,
        visibleLanguages,

        // Visibility
        setLanguageVisibility,
        setHiddenLanguageIds,
        toggleLanguageVisibility,
        toggleLanguageHidden,
        unhideAllLanguages,
        showAllLanguages,
        hideAllLanguages,
        resetVisibleLanguages,
        isLanguageVisible,
        isLanguageMapped,

        // Primary language
        togglePrimaryLanguage,

        // Configuration
        addConfiguredLanguage,
        batchAddConfiguredLanguages,
        removeConfiguredLanguage,

        // Mapping
        mapLanguageToFont,
        unmapLanguage,
        assignFontToMultipleLanguages,
        batchAddFontsAndMappings,

        // System fallbacks
        updateSystemFallbackOverride,
        resetSystemFallbackOverride,

        // Getters/Setters
        getPrimaryFontOverrideForStyle,
        getFallbackFontOverrideForStyle,
        setFallbackFontOverrideForStyle,
        clearFallbackFontOverrideForStyle,
        clearPrimaryFontOverride,

        // Additional methods
        setFallbackFontOverride,
        updateFallbackFontOverride,
        clearFallbackFontOverride,
        resetFallbackFontOverrides,
        resetAllFallbackFontOverridesForStyle,
        linkFontToLanguage,
        addLanguageSpecificFallbackFont,
        addLanguageSpecificPrimaryFont,
        addLanguageSpecificPrimaryFontFromId,
        addPrimaryLanguageOverrides
    }), [
        allConfiguredLanguageIds,
        primaryLanguages,
        effectiveVisibleLanguageIds,
        hiddenLanguageIds,
        primaryFontOverrides,
        fallbackFontOverrides,
        systemFallbackOverrides,
        supportedLanguages,
        supportedLanguageIds,
        strictlyMappedLanguageIds,
        visibleLanguages,
        setLanguageVisibility,
        setHiddenLanguageIds,
        toggleLanguageVisibility,
        toggleLanguageHidden,
        unhideAllLanguages,
        showAllLanguages,
        hideAllLanguages,
        resetVisibleLanguages,
        isLanguageVisible,
        isLanguageMapped,
        togglePrimaryLanguage,
        addConfiguredLanguage,
        batchAddConfiguredLanguages,
        removeConfiguredLanguage,
        mapLanguageToFont,
        unmapLanguage,
        assignFontToMultipleLanguages,
        batchAddFontsAndMappings,
        updateSystemFallbackOverride,
        resetSystemFallbackOverride,
        getPrimaryFontOverrideForStyle,
        getFallbackFontOverrideForStyle,
        setFallbackFontOverrideForStyle,
        clearFallbackFontOverrideForStyle,
        clearPrimaryFontOverride,
        setFallbackFontOverride,
        updateFallbackFontOverride,
        clearFallbackFontOverride,
        resetFallbackFontOverrides,
        resetAllFallbackFontOverridesForStyle,
        linkFontToLanguage,
        addLanguageSpecificFallbackFont,
        addLanguageSpecificPrimaryFont,
        addLanguageSpecificPrimaryFontFromId,
        addPrimaryLanguageOverrides
    ]);

    return (
        <LanguageMappingContext.Provider value={value}>
            {children}
        </LanguageMappingContext.Provider>
    );
};
