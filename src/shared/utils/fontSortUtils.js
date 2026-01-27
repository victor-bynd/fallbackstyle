import languages from '../data/languages.json';
import { normalizeFontName } from './fontNameUtils';

const languageOrderMap = new Map();
languages.forEach((l, i) => languageOrderMap.set(l.id, i));

// Helper to check if a font is a system font (added by name, no uploaded file)
export const isSystemFont = (font) => !font.fontObject;

export const groupAndSortFonts = (fonts, fallbackOverridesMap, primaryOverridesMap) => {
    const primary = (fonts || []).find(f => f && f.type === 'primary' && !f.isPrimaryOverride);
    const allFallback = (fonts || []).filter(f => f && f.type === 'fallback' && !f.isPrimaryOverride);
    const primaryOverrides = (fonts || []).filter(f => f && (f.isPrimaryOverride || (f.type === 'primary' && f.id !== 'primary')));

    // --- Process Primary Overrides (Standalone) ---
    const primaryOverridesList = [];
    primaryOverrides.forEach(font => {
        // Find languages
        const langIds = [];
        Object.entries(primaryOverridesMap || {}).forEach(([langId, fontId]) => {
            if (fontId === font.id) langIds.push(langId);
        });

        if (langIds.length > 0) {
            primaryOverridesList.push({ font, langIds });
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
        primaryOverrides: primaryOverridesList,
        globalFallbackFonts: filteredGlobalFallbacks,
        systemFonts,
        overriddenFonts
    };
};

export const getVisualFontIdOrder = (fonts, fallbackOverridesMap, primaryOverridesMap) => {
    const { primary, primaryOverrides, globalFallbackFonts, overriddenFonts } = groupAndSortFonts(fonts, fallbackOverridesMap, primaryOverridesMap);
    const ids = [];
    if (primary) ids.push(primary.id);
    primaryOverrides.forEach(item => ids.push(item.font.id));
    ids.push(...globalFallbackFonts.map(f => f.id));
    ids.push(...overriddenFonts.map(o => o.font.id));
    return ids;
};

