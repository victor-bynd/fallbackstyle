/**
 * Service for handling configuration export and import.
 * Centralizes versioning, migration, and normalization logic.
 */

export const ConfigService = {
    /**
     * Serializes the current application state into a versioned JSON object.
     * @param {Object} state - The current application state.
     * @returns {Object} The versioned configuration object.
     */
    serializeConfig: (state) => {
        const {
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
            appName = 'fallback-style',
            DEFAULT_PALETTE
        } = state;

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

        const configData = {
            activeFontStyleId,
            activeConfigTab,
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
            showFallbackColors,
            showAlignmentGuides,
            showBrowserGuides,
            showFallbackOrder
        };

        return {
            metadata: {
                version: 1,
                exportedAt: new Date().toISOString(),
                appName
            },
            data: configData
        };
    },

    /**
     * Normalizes a configuration object, handling legacy (flat) and new (versioned) formats.
     * @param {Object} rawConfig - The raw JSON object imported from a file.
     * @returns {Object|null} The normalized configuration data object (v1 schema), or null if invalid.
     */
    normalizeConfig: (rawConfig) => {
        if (!rawConfig) return null;

        // Check for Version 1 wrapper
        if (rawConfig.metadata && rawConfig.data && rawConfig.metadata.version >= 1) {
            return rawConfig.data;
        }

        // Fallback: Assume Legacy (flat structure)
        // Basic validation to ensure it looks like a config
        if (rawConfig.fontStyles || rawConfig.headerStyles) {
            return rawConfig;
        }

        return null;
    },

    /**
     * Validates and cleans the configuration data.
     * Specifically checks for orphaned font overrides.
     * @param {Object} data - The normalized configuration data.
     * @returns {Object} The validated configuration data.
     */
    validateConfig: (data) => {
        if (!data || !data.fontStyles) return data;

        const cleanData = { ...data };
        const styles = ['primary'];

        styles.forEach(styleId => {
            const style = cleanData.fontStyles[styleId];
            if (!style) return;

            // Migration: Move legacy missing colors to style state if not present
            if (!style.missingColor && data.colors?.missing) {
                style.missingColor = data.colors.missing;
            }
            if (!style.missingBgColor && data.colors?.missingBg) {
                style.missingBgColor = data.colors.missingBg;
            }

            if (!style.fallbackFontOverrides) return;

            const existingFontIds = new Set((style.fonts || []).map(f => f.id));
            const validOverrides = {};
            let hasChanges = false;

            Object.entries(style.fallbackFontOverrides).forEach(([langId, overrideValue]) => {
                // Case 1: Legacy/Flat overrides (String)
                if (typeof overrideValue === 'string') {
                    if (overrideValue === 'legacy' || overrideValue === 'cascade' || existingFontIds.has(overrideValue)) {
                        validOverrides[langId] = overrideValue;
                    } else {
                        hasChanges = true;
                        console.warn(`Removed orphaned override for language ${langId}: font ${overrideValue} not found.`);
                    }
                    return;
                }

                // Case 2: Granular/Nested overrides (Object: { [originalFontId]: overrideFontId })
                if (typeof overrideValue === 'object' && overrideValue !== null) {
                    const cleanNested = {};
                    let nestedChanged = false;

                    Object.entries(overrideValue).forEach(([origId, targetOverrideId]) => {
                        // We check if targetOverrideId exists in our font stack.
                        // Ideally we also check if origId exists, but the main goal is to ensure the target is valid.
                        if (existingFontIds.has(targetOverrideId)) {
                            cleanNested[origId] = targetOverrideId;
                        } else {
                            nestedChanged = true;
                            console.warn(`Removed orphaned granular override in language ${langId}: target font ${targetOverrideId} not found.`);
                        }
                    });

                    if (Object.keys(cleanNested).length > 0) {
                        validOverrides[langId] = cleanNested;
                        if (nestedChanged) hasChanges = true; // We modified the object content
                    } else {
                        hasChanges = true; // We dropped the whole language entry because it became empty
                    }
                    return;
                }

                // Invalid format
                hasChanges = true;
            });

            if (hasChanges) {
                style.fallbackFontOverrides = validOverrides;
            }

            // Validate Primary Font Overrides
            if (style.primaryFontOverrides) {
                const validPrimaryOverrides = {};
                let primaryHasChanges = false;

                Object.entries(style.primaryFontOverrides).forEach(([langId, overrideFontId]) => {
                    if (existingFontIds.has(overrideFontId)) {
                        validPrimaryOverrides[langId] = overrideFontId;
                    } else {
                        primaryHasChanges = true;
                        console.warn(`Removed orphaned primary override for language ${langId}: font ${overrideFontId} not found.`);
                    }
                });

                if (primaryHasChanges) {
                    style.primaryFontOverrides = validPrimaryOverrides;
                }
            }
        });

        return cleanData;
    }
};
