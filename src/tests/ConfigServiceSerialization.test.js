import { describe, it, expect } from 'vitest';
import { ConfigService } from '../services/ConfigService';

describe('ConfigService Serialization', () => {
    it('should include language-specific overrides in the exported config', () => {
        const mockState = {
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    fonts: [{ id: 'font1', type: 'primary' }],
                    fallbackFontOverrides: {
                        'ja-JP': 'font_japanese_custom'
                    },
                    fallbackScaleOverrides: {
                        'ja-JP': 120
                    },
                    lineHeightOverrides: {
                        'ja-JP': 1.5
                    }
                },

            },
            headerStyles: {},
            headerOverrides: {},
            textOverrides: {},
            visibleLanguageIds: [],
            colors: {},
            headerFontStyleMap: {},
            textCase: 'none',
            viewMode: 'h1',
            gridColumns: 1,
            showFallbackColors: true,
            showAlignmentGuides: false,
            showBrowserGuides: false
        };

        const exported = ConfigService.serializeConfig(mockState);
        const fontStyles = exported.data.fontStyles;

        // Verify structure
        expect(fontStyles).toBeDefined();
        expect(fontStyles.primary).toBeDefined();

        // Verify Overrides
        expect(fontStyles.primary.fallbackFontOverrides).toBeDefined();
        expect(fontStyles.primary.fallbackFontOverrides['ja-JP']).toBe('font_japanese_custom');

        expect(fontStyles.primary.fallbackScaleOverrides).toBeDefined();
        expect(fontStyles.primary.fallbackScaleOverrides['ja-JP']).toBe(120);

        expect(fontStyles.primary.lineHeightOverrides).toBeDefined();
        expect(fontStyles.primary.lineHeightOverrides['ja-JP']).toBe(1.5);
    });

    it('should strip non-serializable fields', () => {
        const mockState = {
            fontStyles: {
                primary: {
                    fonts: [{
                        id: 'font1',
                        type: 'primary',
                        fontObject: { some: 'object' }, // Should be removed
                        fontUrl: 'blob:...' // Should be removed
                    }]
                }
            }
        };

        const exported = ConfigService.serializeConfig(mockState);
        const font = exported.data.fontStyles.primary.fonts[0];

        expect(font.fontObject).toBeUndefined();
        expect(font.fontUrl).toBeUndefined();
        expect(font.id).toBe('font1');
    });

    it('should preserve system font order alongside uploaded fonts', () => {
        // Simulate a mixed font stack: uploaded fonts followed by system fonts
        const mockState = {
            fontStyles: {
                primary: {
                    fonts: [
                        { id: 'primary1', type: 'primary', fontObject: {}, fileName: 'Primary.ttf' },
                        { id: 'fallback1', type: 'fallback', fontObject: {}, fileName: 'Fallback1.ttf' },
                        { id: 'fallback2', type: 'fallback', fontObject: {}, fileName: 'Fallback2.woff2' },
                        // System fonts (no fontObject, no fileName)
                        { id: 'system1', type: 'fallback', name: 'Arial' },
                        { id: 'system2', type: 'fallback', name: 'Noto Sans' }
                    ]
                }
            }
        };

        const exported = ConfigService.serializeConfig(mockState);
        const fonts = exported.data.fontStyles.primary.fonts;

        // Verify order is preserved
        expect(fonts).toHaveLength(5);
        expect(fonts[0].id).toBe('primary1');
        expect(fonts[1].id).toBe('fallback1');
        expect(fonts[2].id).toBe('fallback2');
        expect(fonts[3].id).toBe('system1');
        expect(fonts[3].name).toBe('Arial');
        expect(fonts[4].id).toBe('system2');
        expect(fonts[4].name).toBe('Noto Sans');

        // System fonts should not have fontObject or fontUrl
        expect(fonts[3].fontObject).toBeUndefined();
        expect(fonts[4].fontObject).toBeUndefined();
    });

    it('should include fontSizeAdjust property in serialized fonts', () => {
        const mockState = {
            fontStyles: {
                primary: {
                    fonts: [
                        { id: 'primary1', type: 'primary' },
                        { id: 'fallback1', type: 'fallback', fontSizeAdjust: 0.5 },
                        { id: 'fallback2', type: 'fallback', fontSizeAdjust: 0.48 },
                        { id: 'fallback3', type: 'fallback' } // No fontSizeAdjust
                    ]
                }
            }
        };

        const exported = ConfigService.serializeConfig(mockState);
        const fonts = exported.data.fontStyles.primary.fonts;

        // Verify fontSizeAdjust is preserved
        expect(fonts[0].fontSizeAdjust).toBeUndefined(); // Primary font
        expect(fonts[1].fontSizeAdjust).toBe(0.5);
        expect(fonts[2].fontSizeAdjust).toBe(0.48);
        expect(fonts[3].fontSizeAdjust).toBeUndefined();
    });
});
