import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import opentype from 'opentype.js';
import { ConfigService } from '../services/ConfigService';
import { PersistenceService } from '../services/PersistenceService';
import { createLogger } from '../services/Logger';
import { useFontManagement } from './useFontManagement';
import { useLanguageMapping } from './useLanguageMapping';
import { useTypography } from './useTypography';
import { useUI } from './UIContext';

const logger = createLogger('Persistence');

/**
 * PersistenceContext
 *
 * Manages application state persistence:
 * - Auto-save to IndexedDB (debounced)
 * - Session restoration on load
 * - Configuration export/import
 * - App reset functionality
 *
 * Orchestrates all other contexts (Font, Language, Typography, UI)
 */

import { PersistenceContext } from './usePersistence';

export const PersistenceProvider = ({ children }) => {
    // Get all context dependencies
    const fontContext = useFontManagement();
    const languageContext = useLanguageMapping();
    const typographyContext = useTypography();
    const uiContext = useUI();

    const [isSessionLoading, setIsSessionLoading] = useState(true);
    const [isAppResetting, setIsAppResetting] = useState(false);
    const isResetting = useRef(false);
    const autoSaveTimeoutRef = useRef(null);

    /**
     * Get complete export configuration from all contexts
     */
    const getExportConfiguration = useCallback(() => {
        logger.debug('Generating export configuration');

        const { fontStyles, activeFontStyleId } = fontContext;
        const {
            visibleLanguageIds,
            hiddenLanguageIds
        } = languageContext;
        const {
            headerStyles,
            headerOverrides,
            headerFontStyleMap,
            textOverrides
        } = typographyContext;
        const {
            viewMode,
            textCase,
            gridColumns,
            activeConfigTab,
            showFallbackColors,
            showAlignmentGuides,
            showBrowserGuides,
            showFallbackOrder,
            colors
        } = uiContext;

        const config = {
            // Font Management
            fontStyles,
            activeFontStyleId,

            // Language Mapping (visibility stored separately)
            visibleLanguageIds,
            hiddenLanguageIds,

            // Typography
            headerStyles,
            headerOverrides,
            headerFontStyleMap,
            textOverrides,

            // UI State
            viewMode,
            textCase,
            gridColumns,
            activeConfigTab,
            showFallbackColors,
            showAlignmentGuides,
            showBrowserGuides,
            showFallbackOrder,
            colors,

            // Metadata
            version: '1.0.0',
            exportDate: new Date().toISOString()
        };

        // Use ConfigService to serialize
        return ConfigService.serializeConfig(config);
    }, [fontContext, languageContext, typographyContext, uiContext]);

    /**
     * Restore configuration to all contexts
     */
    const restoreConfiguration = useCallback(async (config) => {
        logger.info('Restoring configuration');
        isResetting.current = true;

        try {
            // Validate and normalize config
            const normalized = ConfigService.normalizeConfig(config);

            // Restore Font Management
            const { fontStyles, activeFontStyleId } = normalized;
            if (fontStyles) {
                // Hydrate fonts from IndexedDB
                for (const styleId of Object.keys(fontStyles)) {
                    const style = fontStyles[styleId];
                    if (style.fonts) {
                        for (let i = 0; i < style.fonts.length; i++) {
                            const font = style.fonts[i];
                            // Only hydrate if font has an ID and fontObject is missing (meaning it was stripped during save)
                            if (font.id && !font.fontObject) {
                                try {
                                    const storedData = await PersistenceService.getFont(font.id);
                                    if (storedData && storedData.fontBuffer) {
                                        // Recreate fontObject from buffer
                                        const fontObject = opentype.parse(storedData.fontBuffer);
                                        // Create new blob URL from buffer
                                        const blob = new Blob([storedData.fontBuffer], { type: 'font/ttf' });
                                        const fontUrl = URL.createObjectURL(blob);

                                        style.fonts[i] = {
                                            ...font,
                                            fontObject: fontObject,
                                            fontUrl: fontUrl,
                                            fontBuffer: storedData.fontBuffer
                                        };
                                        logger.debug('Hydrated font:', font.id);
                                    }
                                } catch (error) {
                                    logger.error('Failed to hydrate font:', font.id, error);
                                }
                            }
                        }
                    }
                }

                // Set font styles (batch update)
                fontContext.updateStyleState('__batch__', () => fontStyles);
            }

            if (activeFontStyleId) {
                fontContext.setActiveFontStyleId(activeFontStyleId);
            }

            // Restore Language Mapping
            if (normalized.visibleLanguageIds) {
                languageContext.setLanguageVisibility('__batch__', normalized.visibleLanguageIds);
            }
            if (normalized.hiddenLanguageIds) {
                languageContext.setHiddenLanguageIds(normalized.hiddenLanguageIds);
            }

            // Restore Typography
            if (normalized.headerStyles) {
                typographyContext.setHeaderStyles(normalized.headerStyles);
            }
            if (normalized.headerOverrides) {
                typographyContext.setHeaderOverrides(normalized.headerOverrides);
            }
            if (normalized.headerFontStyleMap) {
                typographyContext.setHeaderFontStyleMap(normalized.headerFontStyleMap);
            }
            if (normalized.textOverrides) {
                typographyContext.setTextOverrides(normalized.textOverrides);
            }

            // Restore UI State
            if (normalized.viewMode) uiContext.setViewMode(normalized.viewMode);
            if (normalized.textCase) uiContext.setTextCase(normalized.textCase);
            if (normalized.gridColumns) uiContext.setGridColumns(normalized.gridColumns);
            if (normalized.activeConfigTab) uiContext.setActiveConfigTab(normalized.activeConfigTab);
            if (typeof normalized.showFallbackColors === 'boolean') {
                uiContext.setShowFallbackColors(normalized.showFallbackColors);
            }
            if (typeof normalized.showAlignmentGuides === 'boolean') {
                uiContext.setShowAlignmentGuides(normalized.showAlignmentGuides);
            }
            if (typeof normalized.showBrowserGuides === 'boolean') {
                uiContext.setShowBrowserGuides(normalized.showBrowserGuides);
            }
            if (typeof normalized.showFallbackOrder === 'boolean') {
                uiContext.setShowFallbackOrder(normalized.showFallbackOrder);
            }
            if (normalized.colors) uiContext.setColors(normalized.colors);

            logger.info('Configuration restored successfully');
        } catch (error) {
            logger.error('Failed to restore configuration:', error);
            throw error;
        } finally {
            isResetting.current = false;
        }
    }, [fontContext, languageContext, typographyContext, uiContext]);

    /**
     * Reset app to initial state
     */
    const resetApp = useCallback(async () => {
        logger.warn('Resetting app to initial state');

        setIsAppResetting(true);
        isResetting.current = true;

        try {
            // Set flag BEFORE clearing storage to indicate reset is happening
            // This flag survives the clear and will be checked on reload
            sessionStorage.setItem('__app_reset_in_progress__', 'true');

            // Clear PersistenceService IndexedDB (multi-language app storage)
            await PersistenceService.clear();
            logger.debug('PersistenceService cleared');

            // Clear idb-keyval storage (brand-font app storage)
            try {
                const { clear: clearIdbKeyval } = await import('idb-keyval');
                await clearIdbKeyval();
                logger.debug('idb-keyval storage cleared');
            } catch (err) {
                logger.warn('Failed to clear idb-keyval storage:', err);
            }

            // Delete all IndexedDB databases to be absolutely sure
            try {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    if (db.name) {
                        logger.debug('Deleting database:', db.name);
                        await new Promise((resolve, reject) => {
                            const request = indexedDB.deleteDatabase(db.name);
                            request.onsuccess = () => resolve();
                            request.onerror = () => reject(request.error);
                            request.onblocked = () => {
                                logger.warn('Database deletion blocked:', db.name);
                                resolve(); // Continue anyway
                            };
                        });
                    }
                }
            } catch (err) {
                logger.warn('Failed to enumerate/delete IndexedDB databases:', err);
            }

            // Clear localStorage AFTER setting sessionStorage flag
            localStorage.clear();

            // Small delay to ensure all async operations complete
            await new Promise(resolve => setTimeout(resolve, 100));

            logger.info('App reset complete, redirecting to multi-language app...');

            // Force full page reload at the multi-language route
            window.location.replace('/multi-language');
        } catch (error) {
            logger.error('Failed to reset app:', error);
            sessionStorage.removeItem('__app_reset_in_progress__');
            setIsAppResetting(false);
            isResetting.current = false;
            throw error;
        }
    }, []);

    /**
     * Auto-save configuration (debounced)
     */
    useEffect(() => {
        // Don't auto-save during reset or initial load
        if (isResetting.current || isSessionLoading) {
            return;
        }

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Debounce save by 2 seconds
        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                const config = getExportConfiguration();
                await PersistenceService.saveConfig(config);

                // Save fonts to IndexedDB (save buffer, not fontObject)
                const { fonts, persistedFontIds } = fontContext;
                for (const font of fonts) {
                    if (font.fontBuffer && !persistedFontIds.current.has(font.id)) {
                        await PersistenceService.saveFont(font.id, {
                            fontBuffer: font.fontBuffer,
                            fileName: font.fileName
                        });
                        persistedFontIds.current.add(font.id);
                    }
                }

                logger.debug('Auto-save complete');
            } catch (error) {
                logger.error('Auto-save failed:', error);
            }
        }, 2000);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [
        fontContext.fontStyles,
        languageContext.visibleLanguageIds,
        languageContext.hiddenLanguageIds,
        typographyContext.headerStyles,
        typographyContext.textOverrides,
        uiContext.viewMode,
        uiContext.colors,
        isSessionLoading,
        getExportConfiguration,
        fontContext
    ]);

    /**
     * Load session on mount
     */
    useEffect(() => {
        const loadSession = async () => {
            // Check if app reset is in progress
            const resetInProgress = sessionStorage.getItem('__app_reset_in_progress__');

            if (resetInProgress) {
                logger.info('Reset detected, skipping session load and ensuring clean state');
                // Clear the flag
                sessionStorage.removeItem('__app_reset_in_progress__');

                // Double-check storage is actually empty
                try {
                    const checkConfig = await PersistenceService.loadConfig();
                    if (checkConfig) {
                        logger.warn('Found lingering config after reset, clearing again');
                        await PersistenceService.clear();
                    }
                } catch (err) {
                    logger.debug('Config check after reset:', err);
                }

                setIsSessionLoading(false);
                return;
            }

            logger.info('Loading session from storage');

            try {
                const savedConfig = await PersistenceService.loadConfig();

                if (savedConfig) {
                    await restoreConfiguration(savedConfig);
                    logger.info('Session loaded successfully');
                } else {
                    logger.info('No saved session found, using defaults');
                }
            } catch (error) {
                logger.error('Failed to load session:', error);
            } finally {
                setIsSessionLoading(false);
            }
        };

        loadSession();
    }, [restoreConfiguration]); // Empty dependency array - run once on mount

    // Create context value
    const value = useMemo(() => ({
        isSessionLoading,
        isAppResetting,
        getExportConfiguration,
        restoreConfiguration,
        resetApp
    }), [
        isSessionLoading,
        isAppResetting,
        getExportConfiguration,
        restoreConfiguration,
        resetApp
    ]);

    return (
        <PersistenceContext.Provider value={value}>
            {children}
        </PersistenceContext.Provider>
    );
};
