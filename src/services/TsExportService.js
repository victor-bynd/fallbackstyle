import { LANGUAGE_GROUPS } from '../utils/languageUtils';

export const TsExportService = {
    /**
     * Generates the TypeScript content string from the current app state.
     * @param {Object} state - The application state (extracted from TypoContext)
     * @returns {string} The formatted TypeScript file content.
     */
    generateTsContent: (state) => {
        const {
            fontStyles,
            headerStyles,
            primaryFontOverrides,
            fallbackFontOverrides
        } = state;

        // 1. Prepare Data Structures
        const primaryStyle = fontStyles.primary || {};
        const primaryFont = (primaryStyle.fonts || []).find(f => f.type === 'primary');
        const fallbackFonts = (primaryStyle.fonts || []).filter(f => f.type === 'fallback');

        // Helper to get font family name string
        const getFamilyName = (font) => {
            if (!font) return 'sans-serif';
            // If it's a file, remove extension
            const name = font.fileName || font.name || 'sans-serif';
            return name.replace(/\.[^/.]+$/, "");
        };

        const primaryFamilyName = getFamilyName(primaryFont);

        // 2. Build Font Families Record
        const fontFamilies = {
            brandHeading: {
                name: primaryFamilyName,
                stack: [primaryFamilyName, "Inter", "Helvetica Neue", "Arial", "sans-serif"],
                roles: ["heading"],
                supports: {
                    scripts: ["latin"],
                    // Ideally we'd map configuredLanguages to locales, but for now we list common ones
                    locales: ["en", "es", "fr", "de", "it", "pt"]
                },
                fallbacks: [
                    { family: "Inter", reason: "metric-compatible" },
                    { family: "system-ui", reason: "system" }
                ],
                notes: "Primary brand font for headings."
            },
            bodyText: {
                name: primaryFamilyName, // Using same primary font for body by default unless we had a separate body picker
                stack: [primaryFamilyName, "system-ui", "-apple-system", "sans-serif"],
                roles: ["body", "ui"],
                supports: {
                    scripts: ["latin"]
                },
                fallbacks: [
                    { family: "system-ui", reason: "system" }
                ],
                notes: "Primary body and UI font."
            }
        };

        // Add entries for fallback fonts referenced in overrides
        // We collect all unique fonts used in overrides to define them as specialized families
        const usedOverrideFonts = new Set();

        // Check Configured Overrides
        const checkOverrides = (overrides) => {
            if (!overrides) return;
            Object.values(overrides).forEach(val => {
                if (typeof val === 'string') usedOverrideFonts.add(val);
                else if (typeof val === 'object') Object.values(val).forEach(v => usedOverrideFonts.add(v));
            });
        };
        checkOverrides(primaryFontOverrides);
        checkOverrides(fallbackFontOverrides);

        // Also look at the general fallbacks list to define a generic CJK or similar if present?
        // For now, let's create a definition for each fallback font found in the stack
        fallbackFonts.forEach(f => {
            const key = generateEcoKey(getFamilyName(f));
            if (fontFamilies[key]) return; // distinct names only

            fontFamilies[key] = {
                name: getFamilyName(f),
                stack: [getFamilyName(f), "sans-serif"],
                roles: ["heading", "body", "ui"],
                supports: {
                    scripts: inferScripts(f) // We try to guess based on... nothing really available in metadata easily. Default to generic.
                },
                notes: "Fallback font configured in system."
            };
        });

        // 3. Build Locale Overrides
        const localeOverrides = {};

        // Merge all languages that have overrides
        const allOverrideLangs = new Set([
            ...Object.keys(primaryFontOverrides || {}),
            ...Object.keys(fallbackFontOverrides || {})
        ]);

        allOverrideLangs.forEach(langId => {
            const entry = {};

            // Check Heading/Primary override
            // In our app, 'primaryFontOverrides' usually replaces the main font
            if (primaryFontOverrides && primaryFontOverrides[langId]) {
                // Find the font object to get the name
                // (Assuming font ID is stored, we need to map IDs to Names if they are IDs)
                // Actually, context says primaryFontOverrides maps LangID -> FontID
                // We need to resolve FontID to a Family Key
                const fontId = primaryFontOverrides[langId];
                const font = (primaryStyle.fonts || []).find(f => f.id === fontId);
                if (font) {
                    entry.heading = generateEcoKey(getFamilyName(font));
                    entry.body = generateEcoKey(getFamilyName(font)); // Assume it replaces both for now
                }
            }

            // Check Fallback overrides
            // In the app, fallback overrides are "if basic latin fails, use this".
            // In this TS schema, it seems to imply "Use this font instead of brand font for this locale".
            // If we have a fallback assigned, we map it here.
            if (fallbackFontOverrides && fallbackFontOverrides[langId]) {
                const val = fallbackFontOverrides[langId];
                let fontId = null;
                if (typeof val === 'string') fontId = val;
                // If it's granular (object), we pick the first one or 'primary'-equivalent?
                // This schema is simpler than our granular overrides. We pick the most relevant one.
                else if (typeof val === 'object') fontId = Object.values(val)[0]; // simplistic

                if (fontId) {
                    // If we also had a primary override, we might resolve conflict.
                    // Usually fallback is for "body" if the primary was just a heading font?
                    // But let's assume if there is a fallback specific for this language, it's the main font for that language.
                    const font = (primaryStyle.fonts || []).find(f => f.id === fontId);
                    if (font) {
                        const key = generateEcoKey(getFamilyName(font));
                        if (!entry.heading) entry.heading = key;
                        if (!entry.body) entry.body = key;
                    }
                }
            }

            if (Object.keys(entry).length > 0) {
                localeOverrides[langId] = entry;
            }
        });

        // 4. Build Type Ramp
        const typeRamp = {};
        if (headerStyles) {
            // Base size
            const base = primaryStyle.baseFontSize || 16;

            // H1-H6
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const style = headerStyles[tag];
                if (style) {
                    // Ramp Key: e.g. headingXL for H1 ? 
                    // Let's just use h1, h2 keys or map roughly
                    const map = { h1: 'headingXL', h2: 'headingL', h3: 'headingM', h4: 'headingS', h5: 'headingXS', h6: 'headingXXS' };
                    const key = map[tag];
                    typeRamp[key] = {
                        font: "brandHeading",
                        size: Math.round(base * (style.scale || 1)),
                        lineHeight: style.lineHeight || 1.1,
                        letterSpacing: style.letterSpacing || 0,
                        weight: 600 // Default, or fetch from overrides if we tracked weight per header
                    };
                }
            });
        }
        // Body styles
        typeRamp['bodyM'] = {
            font: "bodyText",
            size: Math.round(primaryStyle.baseFontSize || 16),
            lineHeight: 1.5,
            weight: primaryStyle.weight || 400
        };

        return generateTemplate(fontFamilies, localeOverrides, typeRamp);
    }
};

// --- Helpers ---

function generateEcoKey(name) {
    if (!name) return 'unknown';
    // CamelCase the name
    return name.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
}

function inferScripts(font) {
    // Very basic inference or return generic
    return ["latin", "cyrillic"];
}

function generateTemplate(fontFamilies, localeOverrides, typeRamp) {
    return `/**
 * typography.types.ts
 *
 * Generated by Localize-Type
 * ${new Date().toISOString()}
 */

////////////////////////////
// Core types
////////////////////////////

export type FontRole = "heading" | "body" | "ui";
export type Script =
  | "latin"
  | "cyrillic"
  | "greek"
  | "arabic"
  | "hebrew"
  | "cjk";

export type Locale = string;

////////////////////////////
// Font family definition
////////////////////////////

export interface FontFamily {
  name: string;
  stack: string[];
  roles: FontRole[];
  supports: {
    scripts: Script[];
    locales?: Locale[];
  };
  fallbacks?: Array<{
    family: string;
    reason: "metric-compatible" | "script-coverage" | "system";
  }>;
  notes?: string;
}

////////////////////////////
// Font families
////////////////////////////

export const fontFamilies: Record<string, FontFamily> = ${JSON.stringify(fontFamilies, null, 2)};

////////////////////////////
// Locale-based overrides
////////////////////////////

export const localeOverrides: Record<
  string,
  {
    heading?: keyof typeof fontFamilies;
    body?: keyof typeof fontFamilies;
  }
> = ${JSON.stringify(localeOverrides, null, 2)};

////////////////////////////
// Type ramp tokens
////////////////////////////

export interface TypeStyle {
  font: keyof typeof fontFamilies;
  size: number;
  lineHeight: number;
  letterSpacing?: number;
  weight: number;
}

export const typeRamp: Record<string, TypeStyle> = ${JSON.stringify(typeRamp, null, 2)};
`;
}
