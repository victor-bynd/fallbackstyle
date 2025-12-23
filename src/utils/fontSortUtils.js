import languages from '../data/languages.json';

const languageOrderMap = new Map();
languages.forEach((l, i) => languageOrderMap.set(l.id, i));

// Helper to check if a font is a system font (added by name, no uploaded file)
export const isSystemFont = (font) => !font.fontObject;

export const groupAndSortFonts = (fonts, fallbackOverridesMap, primaryOverridesMap, metricGroups) => {
    const primary = (fonts || []).find(f => f.type === 'primary' && !f.isPrimaryOverride);
    const allFallback = (fonts || []).filter(f => f.type === 'fallback' && !f.isPrimaryOverride);
    const primaryOverrides = (fonts || []).filter(f => f.isPrimaryOverride || (f.type === 'primary' && f.id !== 'primary'));

    // --- Process Primary Overrides (Grouped) ---
    const primaryOverrideGroups = [];
    const processedPrimaryIds = new Set();

    // 1. Group by metricGroupId
    if (metricGroups) {
        Object.values(metricGroups).forEach(group => {
            // Find fonts belonging to this group
            // Note: A "Primary Override Group" logically consists of languages sharing settings.
            // The fonts themselves might be the same or different.
            // We need to find which languages map to fonts in this group.

            const fontsInGroup = primaryOverrides.filter(f => f.metricGroupId === group.id);
            // Find languages for these fonts
            const groupLangs = [];
            const groupFonts = [];

            fontsInGroup.forEach(font => {
                processedPrimaryIds.add(font.id);
                groupFonts.push(font);

                // Find languages using this font as primary override
                Object.entries(primaryOverridesMap || {}).forEach(([langId, fontId]) => {
                    if (fontId === font.id) {
                        groupLangs.push(langId);
                    }
                });
            });

            primaryOverrideGroups.push({
                type: 'group',
                group: group,
                fonts: groupFonts.map(f => ({
                    font: f,
                    langIds: groupLangs.filter(lid => primaryOverridesMap[lid] === f.id)
                }))
            });
        });
    }

    // 2. Ungrouped Primary Overrides (Single Language or just not in a named group)
    primaryOverrides.forEach(font => {
        if (processedPrimaryIds.has(font.id)) return;

        // Find languages
        const langIds = [];
        Object.entries(primaryOverridesMap || {}).forEach(([langId, fontId]) => {
            if (fontId === font.id) langIds.push(langId);
        });

        if (langIds.length > 0) {
            // Treat as a "Single Item Group" or just a standalone override
            // We usually want to show them looking like a group (so they have controls)
            // We'll return them as a "virtual" group for consistent rendering
            primaryOverrideGroups.push({
                type: 'standalone',
                fonts: [{ font, langIds }]
            });
        }
    });


    // --- Process Fallback Overrides ---
    const overriddenEntries = Object.entries(fallbackOverridesMap || {});
    // Map fontID -> list of langIds
    const fontUsageMap = new Map();
    overriddenEntries.forEach(([langId, fontId]) => {
        if (!fontUsageMap.has(fontId)) fontUsageMap.set(fontId, []);
        fontUsageMap.get(fontId).push(langId);
    });

    const overriddenFontIds = new Set(fontUsageMap.keys());

    // Identify fonts that are active in overrides (including clones) to prevent duplicates in global list
    const activeOverrideFonts = allFallback.filter(f => overriddenFontIds.has(f.id));
    const activeOverrideSignatures = new Set(activeOverrideFonts.map(f => f.fileName || f.name));

    // Separate system fonts from uploaded fonts
    const nonOverriddenFallbacks = allFallback.filter(f =>
        !overriddenFontIds.has(f.id) &&
        !f.isLangSpecific &&
        !activeOverrideSignatures.has(f.fileName || f.name)
    );
    const uploadedFallbackFonts = nonOverriddenFallbacks.filter(f => !isSystemFont(f));
    const systemFonts = nonOverriddenFallbacks.filter(f => isSystemFont(f));

    const overriddenFonts = allFallback
        .filter(f => overriddenFontIds.has(f.id))
        .map(f => {
            const usedInLangs = fontUsageMap.get(f.id) || [];
            return { font: f, languages: usedInLangs };
        })
        .sort((a, b) => {
            const getMinIndex = (langs) => {
                if (!langs.length) return Infinity;
                return Math.min(...langs.map(id => languageOrderMap.get(id) ?? Infinity));
            };
            return getMinIndex(a.languages) - getMinIndex(b.languages);
        });

    // Helper to normalize font names for comparison (consistent with TypoContext)
    const normalizeFontName = (name) => {
        if (!name) return '';
        let n = name.trim().toLowerCase();

        // Remove extension
        const lastDot = n.lastIndexOf('.');
        if (lastDot > 0) {
            n = n.substring(0, lastDot);
        }

        // Remove common suffixes
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

    const primaryName = primary ? normalizeFontName(primary.fileName || primary.name) : null;

    // Filter out fallbacks that match the primary font
    const filteredGlobalFallbacks = uploadedFallbackFonts.filter(f => {
        if (!primaryName) return true;
        const fName = normalizeFontName(f.fileName || f.name);

        // Check matching normalized name
        if (fName && fName === primaryName) return false;

        // Check exact filename match if both exist
        if (primary.fileName && f.fileName && primary.fileName === f.fileName) return false;

        return true;
    });

    return {
        primary,
        primaryOverrideGroups, // New return value
        globalFallbackFonts: filteredGlobalFallbacks,
        systemFonts,
        overriddenFonts
    };
};

export const getVisualFontIdOrder = (fonts, fallbackOverridesMap, primaryOverridesMap, metricGroups) => {
    const { primary, primaryOverrideGroups, globalFallbackFonts, overriddenFonts } = groupAndSortFonts(fonts, fallbackOverridesMap, primaryOverridesMap, metricGroups);
    const ids = [];
    if (primary) ids.push(primary.id);
    primaryOverrideGroups.forEach(group => {
        group.fonts.forEach(item => ids.push(item.font.id));
    });
    ids.push(...globalFallbackFonts.map(f => f.id));
    ids.push(...overriddenFonts.map(o => o.font.id));
    return ids;
};
