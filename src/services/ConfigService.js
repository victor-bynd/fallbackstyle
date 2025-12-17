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
            appName = 'localize-type',
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
            showBrowserGuides
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
    }
};
