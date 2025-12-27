
import { describe, it, expect } from 'vitest';
import { ConfigService } from '../services/ConfigService';

describe('ConfigService Persistence (Mega Test)', () => {

    it('should perfectly persist a complex application state', () => {
        // AUTOMATED AUDIT:
        // This mock state represents "literally every configuration in the app".
        // If you add a new field to 'Initial State' or 'TypoContext', ADD IT HERE.
        const complexState = {
            activeFontStyleId: 'primary',

            // 1. FONT STYLES & FONTS
            fontStyles: {
                primary: {
                    baseFontSize: 18, // Changed from default
                    weight: 500,
                    lineHeight: 1.6,
                    letterSpacing: 0.05,
                    fontScales: { active: 110, fallback: 95 },
                    isFallbackLinked: false,

                    // Fallback Defaults
                    fallbackLineHeight: 1.4,
                    fallbackLetterSpacing: 0.1,
                    fallbackFont: 'serif',

                    fonts: [
                        {
                            id: 'font-primary-1',
                            type: 'primary',
                            name: 'My Custom Font',
                            fileName: 'custom-font.woff2',
                            // These should be STRIPPED
                            fontObject: { dummy: 'object' },
                            fontUrl: 'blob:http://localhost:5173/uuid',

                            // Metrics & Overrides
                            baseFontSize: 18, // Local override
                            lineGapOverride: 0.2,
                            ascentOverride: 0.9,
                            descentOverride: 0.3,
                            fontSizeAdjust: 0.55,

                            // Variable Axes
                            axes: { weight: { min: 100, max: 900, default: 400 } },
                            isVariable: true,
                            staticWeight: 400,

                            color: '#FF0000',
                            hidden: false
                        },
                        {
                            id: 'font-fallback-1',
                            type: 'fallback',
                            name: 'System Fallback',
                            // System font has no fileName usually, or simple name
                            scale: 105,
                            lineHeight: 1.3,
                            letterSpacing: 0.02,
                            weightOverride: 700,
                            fontSizeAdjust: 0.48, // With size adjust

                            color: '#00FF00',
                            hidden: true
                        },
                        {
                            id: 'font-lang-jp',
                            type: 'fallback',
                            isLangSpecific: true,
                            name: 'Japanese Font',
                            fileName: 'jp.ttf'
                        }
                    ],

                    // 2. OVERRIDES
                    // Nested / Granular Overrides
                    fallbackFontOverrides: {
                        'ja-JP': {
                            'font-fallback-1': 'font-lang-jp'
                        },
                        // Legacy/Flat override (should be normalized or supported)
                        'ru-RU': 'font-fallback-1'
                    },

                    fallbackScaleOverrides: {
                        'ja-JP': 120,
                        'ru-RU': 90
                    },

                    lineHeightOverrides: {
                        'ja-JP': 1.8
                    },

                    primaryFontOverrides: {
                        // Future proofing if used
                    }
                }
            },

            // 3. HEADER STYLES
            headerStyles: {
                h1: { scale: 4.5, lineHeight: 1.1, letterSpacing: -0.02 },
                h2: { scale: 3.5, lineHeight: 1.2, letterSpacing: -0.01 },
                h3: { scale: 2.5, lineHeight: 1.3, letterSpacing: 0 },
                h4: { scale: 2.0, lineHeight: 1.3, letterSpacing: 0 },
                h5: { scale: 1.5, lineHeight: 1.4, letterSpacing: 0.01 },
                h6: { scale: 1.2, lineHeight: 1.4, letterSpacing: 0.01 }
            },
            headerOverrides: {
                h1: { scale: true }, // Marks that h1 scale was manually changed
                h2: { lineHeight: true }
            },

            // 4. TEXT CONTENT OVERRIDES
            textOverrides: {
                'ja-JP': 'こんにちは',
                'en-US': 'Hello World'
            },

            // 5. UI STATE / VIEW SETTINGS
            visibleLanguageIds: ['en-US', 'ja-JP', 'ru-RU'],
            headerFontStyleMap: {
                h1: 'primary',
                h2: 'primary'
            },
            textCase: 'uppercase',
            viewMode: 'waterfall',
            gridColumns: 3,
            showFallbackColors: false,
            showAlignmentGuides: true,
            showBrowserGuides: true,

            // 6. GLOBAL
            colors: {
                primary: '#111111',
                missing: '#CCCCCC',
                missingBg: '#EEEEEE'
            },
            appName: 'localize-type-test'
        };

        // --- ACTION: Serialize ---
        const serialized = ConfigService.serializeConfig(complexState);
        const exportedData = serialized.data;
        const fontStyle = exportedData.fontStyles.primary;

        // --- VERIFICATION START ---

        // 1. Metadata check
        expect(serialized.metadata.version).toBe(1);
        expect(serialized.metadata.appName).toBe('localize-type-test');

        // 2. Font Sanitization
        const restoredPrimaryFont = fontStyle.fonts.find(f => f.id === 'font-primary-1');
        expect(restoredPrimaryFont.fontObject).toBeUndefined(); // MUST be stripped
        expect(restoredPrimaryFont.fontUrl).toBeUndefined();    // MUST be stripped
        expect(restoredPrimaryFont.fileName).toBe('custom-font.woff2'); // Kept for reference

        // 3. Font Metrics Persistence
        expect(restoredPrimaryFont.baseFontSize).toBe(18);
        expect(restoredPrimaryFont.fontSizeAdjust).toBe(0.55);
        expect(restoredPrimaryFont.axes).toEqual({ weight: { min: 100, max: 900, default: 400 } });
        expect(restoredPrimaryFont.isVariable).toBe(true);
        expect(restoredPrimaryFont.lineGapOverride).toBe(0.2);

        // 4. Fallback Font Persistence
        const restoredFallbackFont = fontStyle.fonts.find(f => f.id === 'font-fallback-1');
        expect(restoredFallbackFont.scale).toBe(105);
        expect(restoredFallbackFont.weightOverride).toBe(700);
        expect(restoredFallbackFont.hidden).toBe(true);

        // 5. Overrides Persistence (Nested & Flat)
        expect(fontStyle.fallbackFontOverrides['ja-JP']).toEqual({ 'font-fallback-1': 'font-lang-jp' });
        expect(fontStyle.fallbackFontOverrides['ru-RU']).toBe('font-fallback-1');

        expect(fontStyle.fallbackScaleOverrides['ja-JP']).toBe(120);
        expect(fontStyle.lineHeightOverrides['ja-JP']).toBe(1.8);

        // 6. Global Style Settings
        expect(fontStyle.baseFontSize).toBe(18);
        expect(fontStyle.fontScales).toEqual({ active: 110, fallback: 95 });
        expect(fontStyle.isFallbackLinked).toBe(false);

        // 7. Header Styles & View Settings
        expect(exportedData.headerStyles.h1.scale).toBe(4.5);
        expect(exportedData.headerOverrides.h1).toEqual({ scale: true });

        expect(exportedData.textOverrides['ja-JP']).toBe('こんにちは');
        expect(exportedData.visibleLanguageIds).toEqual(['en-US', 'ja-JP', 'ru-RU']);
        expect(exportedData.viewMode).toBe('waterfall');

        // 8. Guides & Colors
        expect(exportedData.showAlignmentGuides).toBe(true);
        expect(exportedData.colors.missing).toBe('#CCCCCC');

        // --- ACTION: Validate & Normalize ---
        // Simulating the Import process
        const normalized = ConfigService.normalizeConfig(serialized);
        const validated = ConfigService.validateConfig(normalized);

        // 9. Validation Logic Check
        // Ensure that valid overrides were NOT stripped
        expect(validated.fontStyles.primary.fallbackFontOverrides['ja-JP']).toEqual({ 'font-fallback-1': 'font-lang-jp' });
        expect(validated.fontStyles.primary.fallbackFontOverrides['ru-RU']).toBe('font-fallback-1');
    });

    it('should clean up orphaned overrides during validation', () => {
        const dirtyState = {
            fontStyles: {
                primary: {
                    fonts: [{ id: 'font-1', type: 'primary' }], // Only font-1 exists
                    fallbackFontOverrides: {
                        'ja-JP': 'font-999', // Missing font (Flat)
                        'en-US': {
                            'font-1': 'font-888' // Missing target (Nested)
                        },
                        'fr-FR': {
                            'font-1': 'font-1' // Valid self-ref/alias (Nested)
                        }
                    }
                }
            }
        };

        const validated = ConfigService.validateConfig(dirtyState);
        const overrides = validated.fontStyles.primary.fallbackFontOverrides;

        // ja-JP should be removed (Orphaned flat)
        expect(overrides['ja-JP']).toBeUndefined();

        // en-US should be removed (Orphaned target in nested)
        expect(overrides['en-US']).toBeUndefined();

        // fr-FR should be kept (Valid target)
        expect(overrides['fr-FR']).toEqual({ 'font-1': 'font-1' });
    });

    it('should support legacy flat config structure (backward compatibility)', () => {
        const legacyConfig = {
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    fonts: [],
                    baseFontSize: 16
                }
            },
            headerStyles: {}
        };
        // No metadata wrapper

        const normalized = ConfigService.normalizeConfig(legacyConfig);
        expect(normalized).toEqual(legacyConfig);
        expect(normalized.fontStyles).toBeDefined();
    });
});
