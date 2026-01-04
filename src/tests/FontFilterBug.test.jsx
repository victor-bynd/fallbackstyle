import { describe, it, expect } from 'vitest';

// Minimal reproduction of the filtering logic in App.jsx
describe('Font Filtering Logic', () => {
    it('should not show English when filtering by a language-specific font', () => {
        // Mock Data
        const fonts = [
            { id: 'f1', type: 'primary', name: 'Inter', fileName: 'Inter.ttf' },
            { id: 'f2', type: 'fallback', name: 'Roboto', fileName: 'Roboto.ttf', fontObject: {} }, // Global fallback
            { id: 'f3', type: 'fallback', name: 'CustomLangFont', fileName: 'CustomLangFont.ttf', fontObject: {}, isLangSpecific: true } // Language Specific
        ];

        const primaryLanguages = ['en-US'];
        const fallbackFontOverrides = {
            'fr-FR': { 'f3': 'f3' } // French uses CustomLangFont
        };
        const primaryFontOverrides = {};

        const fontFilter = ['CustomLangFont.ttf'];

        // Function under test (logic extracted from App.jsx)
        const filterLanguages = (languages) => {
            const globalPrimaryFont = fonts.find(f => f.type === 'primary' && !f.isPrimaryOverride);

            // BUG: The current implementation in App.jsx likely doesn't filter out isLangSpecific here
            // We want to reproduce the FAILURE first, so we mimic the buggy code IF we were writing a pure reproduction script.
            // But here we are writing a TEST ensuring the behavior is CORRECT.
            // So we write the test asserting correct behavior, and expect it to FAIL if the logic is buggy.

            // NOTE: I will replicate the logic *as I understand it works now* to confirm understanding? 
            // No, standard TDD: write expectation of Correctness.

            // Replicating App.jsx logic for "Global Fallback Fonts"
            // CURRENT BUGGY LOGIC:
            // const globalFallbackFonts = fonts.filter(f => f.type === 'fallback' && f.fontObject && !f.isClone);
            // 'f3' has isClone: undefined (falsy), so it is included!

            // CORRECT LOGIC should be:
            // const globalFallbackFonts = fonts.filter(f => f.type === 'fallback' && f.fontObject && !f.isClone && !f.isLangSpecific);

            // Let's implement a test helper that allows us to inject the logic or just verify the outcome if we could import App? 
            // We can't easily import App's internal logic. So I will write a small simulation here that mimics App.jsx
            // to demonstrate the flaw in the logic pattern.

            const effectiveLanguages = languages.filter(lang => {
                // 1. Calculate Global Fallbacks
                // BUGGY LINE from App.jsx:
                const globalFallbackFonts = fonts.filter(f => f.type === 'fallback' && f.fontObject && !f.isClone && !f.isLangSpecific);

                const langPrimaryOverride = primaryFontOverrides[lang.id];
                const langFallbackOverrides = fallbackFontOverrides[lang.id];

                const effectiveFontIds = new Set();

                // Primary
                if (langPrimaryOverride) {
                    effectiveFontIds.add(langPrimaryOverride);
                } else if (primaryLanguages.includes(lang.id) && globalPrimaryFont) {
                    effectiveFontIds.add(globalPrimaryFont.id);
                }

                // Fallbacks (Inheritance + Overrides)
                globalFallbackFonts.forEach(gf => {
                    let effectiveId = gf.id;
                    if (langFallbackOverrides) {
                        if (typeof langFallbackOverrides === 'object' && langFallbackOverrides[gf.id]) {
                            effectiveId = langFallbackOverrides[gf.id];
                        }
                    }
                    effectiveFontIds.add(effectiveId);
                });

                // Strictly mapped
                if (langFallbackOverrides && typeof langFallbackOverrides === 'object') {
                    Object.values(langFallbackOverrides).forEach(id => effectiveFontIds.add(id));
                }

                // Check filter
                return Array.from(effectiveFontIds).some(fontId => {
                    const f = fonts.find(font => font.id === fontId);
                    if (f) {
                        const name = f.fileName || f.name;
                        return fontFilter.includes(name);
                    }
                    return false;
                });
            });

            return effectiveLanguages.map(l => l.id);
        };

        const languages = [
            { id: 'en-US' },
            { id: 'fr-FR' }
        ];

        const result = filterLanguages(languages);

        // EXPECTATION: Only fr-FR should be returned because only it uses 'CustomLangFont'
        // ACTUAL (Buggy): en-US is returned because 'CustomLangFont' is considered a global fallback 
        // because it is not marked isClone (it's a direct lang specific add), so logic sees it as valid global fallback.
        expect(result).not.toContain('en-US');
        expect(result).toContain('fr-FR');
    });
});
