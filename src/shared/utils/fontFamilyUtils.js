/**
 * Build deterministic and CSS-safe family names for runtime @font-face aliases.
 */

const sanitizeCssFamilyPart = (value) => {
    if (value === undefined || value === null) return '';
    return String(value)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const getUploadedFontFamily = (styleId) => {
    return `'UploadedFont-${sanitizeCssFamilyPart(styleId)}'`;
};

export const getFallbackFontFamily = (styleId, fontId) => {
    return `'FallbackFont-${sanitizeCssFamilyPart(styleId)}-${sanitizeCssFamilyPart(fontId)}'`;
};

export const getSystemFallbackFamily = (styleId, languageId) => {
    return `'SystemFallback-${sanitizeCssFamilyPart(styleId)}-${sanitizeCssFamilyPart(languageId)}'`;
};
