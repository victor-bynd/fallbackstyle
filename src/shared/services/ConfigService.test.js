import { describe, it, expect } from 'vitest';
import { ConfigService } from './ConfigService';

describe('ConfigService', () => {
    describe('normalizeConfig', () => {
        it('should return data directly if version is >= 1', () => {
            const v1Config = {
                metadata: { version: 1, appName: 'localize-type' },
                data: {
                    activeFontStyleId: 'primary',
                    fontStyles: { primary: {} }
                }
            };
            const result = ConfigService.normalizeConfig(v1Config);
            expect(result).toEqual(v1Config.data);
        });

        it('should return raw config if it looks like a legacy config', () => {
            const legacyConfig = {
                activeFontStyleId: 'primary',
                fontStyles: {},
                headerStyles: {}
            };
            const result = ConfigService.normalizeConfig(legacyConfig);
            expect(result).toEqual(legacyConfig);
        });

        it('should return null for invalid config', () => {
            const invalidConfig = { foo: 'bar' };
            const result = ConfigService.normalizeConfig(invalidConfig);
            expect(result).toBeNull();
        });

        it('should return null for null/undefined input', () => {
            expect(ConfigService.normalizeConfig(null)).toBeNull();
            expect(ConfigService.normalizeConfig(undefined)).toBeNull();
        });
    });

    describe('serializeConfig', () => {
        it('should serialize state into Version 1 format', () => {
            const state = {
                activeFontStyleId: 'primary',
                fontStyles: {
                    primary: {
                        id: 'primary',
                        fonts: [
                            { id: 'f1', name: 'Roboto', fontObject: { dummy: 'obj' }, fontUrl: 'blob:url' }
                        ]
                    }
                },
                headerStyles: { h1: {} },
                headerOverrides: {},
                textOverrides: {},
                visibleLanguageIds: ['en'],
                colors: ['#000'],
                headerFontStyleMap: {},
                textCase: 'none',
                viewMode: 'h1',
                gridColumns: 1,
                showFallbackColors: true,
                showAlignmentGuides: false,
                showBrowserGuides: false,
                appName: 'localize-type',
                DEFAULT_PALETTE: ['#000']
            };

            const result = ConfigService.serializeConfig(state);

            expect(result.metadata.version).toBe(1);
            expect(result.metadata.appName).toBe('localize-type');
            expect(result.metadata.exportedAt).toBeDefined();

            expect(result.data.activeFontStyleId).toBe('primary');
            expect(result.data.fontStyles.primary.fonts[0].fontObject).toBeUndefined();
            expect(result.data.fontStyles.primary.fonts[0].fontUrl).toBeUndefined();
            expect(result.data.fontStyles.primary.fonts[0].name).toBe('Roboto');
        });

        it('should preserve all font metrics and properties (except non-serializable)', () => {
            const state = {
                activeFontStyleId: 'primary',
                fontStyles: {
                    primary: {
                        fonts: [
                            {
                                id: 'primary',
                                type: 'primary',
                                name: 'CustomFont',
                                fileName: 'CustomFont.ttf',
                                fontObject: { /* non-serializable */ },
                                fontUrl: 'blob:http://localhost/abc',
                                fontBuffer: new ArrayBuffer(8),
                                color: '#ff0000',
                                axes: [{ tag: 'wght', min: 100, max: 900 }],
                                isVariable: true,
                                staticWeight: 400,
                                // Metric overrides
                                scale: 105,
                                lineHeight: 1.5,
                                letterSpacing: 0.02,
                                baseFontSize: 18,
                                weightOverride: 500,
                                lineGapOverride: 10,
                                ascentOverride: 90,
                                descentOverride: 20,
                                fontSizeAdjust: 0.5,
                                sizeAdjust: 95
                            },
                            {
                                id: 'fallback-1',
                                type: 'fallback',
                                name: 'Arial',
                                fontObject: null,
                                fontUrl: null,
                                color: '#00ff00',
                                hidden: false,
                                isLangSpecific: false,
                                isClone: false
                            }
                        ],
                        // Typography settings stored in style
                        lineHeight: 1.4,
                        previousLineHeight: 1.2,
                        baseFontSize: 16,
                        baseRem: 16,
                        weight: 400,
                        fontScales: { active: 100, fallback: 95 },
                        isFallbackLinked: false,
                        letterSpacing: 0.01,
                        fallbackFont: 'Arial',
                        fallbackLineHeight: 1.3,
                        fallbackLetterSpacing: 0.02,
                        lineHeightOverrides: { 'en-US': 1.6 },
                        fallbackScaleOverrides: { 'ja-JP': 90 },
                        missingColor: '#cccccc',
                        missingBgColor: '#eeeeee',
                        // Language mapping stored in style
                        configuredLanguages: ['en-US', 'ja-JP', 'es-ES'],
                        primaryLanguages: ['en-US'],
                        primaryFontOverrides: { 'ja-JP': 'lang-primary-ja-JP-123' },
                        fallbackFontOverrides: { 'es-ES': 'fallback-1' },
                        systemFallbackOverrides: { 'ar-SA': { fontFamily: 'Tahoma' } }
                    }
                },
                headerStyles: {
                    h1: { scale: 3.0, lineHeight: 1.2, letterSpacing: -0.02 },
                    h2: { scale: 2.5, lineHeight: 1.3, letterSpacing: 0 }
                },
                headerOverrides: {
                    h1: { lineHeight: true },
                    h2: {}
                },
                headerFontStyleMap: { h1: 'primary', h2: 'primary' },
                textOverrides: { 'en-US': 'Custom sample text' },
                visibleLanguageIds: ['en-US', 'ja-JP', 'es-ES'],
                hiddenLanguageIds: ['fr-FR'],
                colors: { primary: '#0f172a' },
                textCase: 'uppercase',
                viewMode: 'h2',
                gridColumns: 2,
                activeConfigTab: 'FONTS',
                showFallbackColors: true,
                showAlignmentGuides: true,
                showBrowserGuides: false,
                showFallbackOrder: true,
                appName: 'fallback-style'
            };

            const result = ConfigService.serializeConfig(state);
            const data = result.data;

            // Verify metadata
            expect(result.metadata.version).toBe(1);
            expect(result.metadata.appName).toBe('fallback-style');

            // Verify font properties are preserved (except non-serializable)
            const primaryFont = data.fontStyles.primary.fonts[0];
            expect(primaryFont.id).toBe('primary');
            expect(primaryFont.name).toBe('CustomFont');
            expect(primaryFont.fileName).toBe('CustomFont.ttf');
            expect(primaryFont.color).toBe('#ff0000');
            expect(primaryFont.axes).toEqual([{ tag: 'wght', min: 100, max: 900 }]);
            expect(primaryFont.isVariable).toBe(true);
            expect(primaryFont.staticWeight).toBe(400);
            // Metric overrides
            expect(primaryFont.scale).toBe(105);
            expect(primaryFont.lineHeight).toBe(1.5);
            expect(primaryFont.letterSpacing).toBe(0.02);
            expect(primaryFont.baseFontSize).toBe(18);
            expect(primaryFont.weightOverride).toBe(500);
            expect(primaryFont.lineGapOverride).toBe(10);
            expect(primaryFont.ascentOverride).toBe(90);
            expect(primaryFont.descentOverride).toBe(20);
            expect(primaryFont.fontSizeAdjust).toBe(0.5);
            expect(primaryFont.sizeAdjust).toBe(95);
            // Non-serializable should be removed
            expect(primaryFont.fontObject).toBeUndefined();
            expect(primaryFont.fontUrl).toBeUndefined();
            expect(primaryFont.fontBuffer).toBeUndefined();

            // Verify fallback font
            const fallbackFont = data.fontStyles.primary.fonts[1];
            expect(fallbackFont.id).toBe('fallback-1');
            expect(fallbackFont.type).toBe('fallback');
            expect(fallbackFont.color).toBe('#00ff00');
            expect(fallbackFont.hidden).toBe(false);

            // Verify style-level typography settings
            const style = data.fontStyles.primary;
            expect(style.lineHeight).toBe(1.4);
            expect(style.previousLineHeight).toBe(1.2);
            expect(style.baseFontSize).toBe(16);
            expect(style.baseRem).toBe(16);
            expect(style.weight).toBe(400);
            expect(style.fontScales).toEqual({ active: 100, fallback: 95 });
            expect(style.isFallbackLinked).toBe(false);
            expect(style.letterSpacing).toBe(0.01);
            expect(style.fallbackFont).toBe('Arial');
            expect(style.fallbackLineHeight).toBe(1.3);
            expect(style.fallbackLetterSpacing).toBe(0.02);
            expect(style.lineHeightOverrides).toEqual({ 'en-US': 1.6 });
            expect(style.fallbackScaleOverrides).toEqual({ 'ja-JP': 90 });
            expect(style.missingColor).toBe('#cccccc');
            expect(style.missingBgColor).toBe('#eeeeee');

            // Verify language mapping in style
            expect(style.configuredLanguages).toEqual(['en-US', 'ja-JP', 'es-ES']);
            expect(style.primaryLanguages).toEqual(['en-US']);
            expect(style.primaryFontOverrides).toEqual({ 'ja-JP': 'lang-primary-ja-JP-123' });
            expect(style.fallbackFontOverrides).toEqual({ 'es-ES': 'fallback-1' });
            expect(style.systemFallbackOverrides).toEqual({ 'ar-SA': { fontFamily: 'Tahoma' } });

            // Verify header styles
            expect(data.headerStyles.h1).toEqual({ scale: 3.0, lineHeight: 1.2, letterSpacing: -0.02 });
            expect(data.headerOverrides.h1).toEqual({ lineHeight: true });
            expect(data.headerFontStyleMap.h1).toBe('primary');

            // Verify text overrides
            expect(data.textOverrides).toEqual({ 'en-US': 'Custom sample text' });

            // Verify language visibility
            expect(data.visibleLanguageIds).toEqual(['en-US', 'ja-JP', 'es-ES']);
            expect(data.hiddenLanguageIds).toEqual(['fr-FR']);

            // Verify UI state
            expect(data.colors).toEqual({ primary: '#0f172a' });
            expect(data.textCase).toBe('uppercase');
            expect(data.viewMode).toBe('h2');
            expect(data.gridColumns).toBe(2);
            expect(data.activeConfigTab).toBe('FONTS');
            expect(data.showFallbackColors).toBe(true);
            expect(data.showAlignmentGuides).toBe(true);
            expect(data.showBrowserGuides).toBe(false);
            expect(data.showFallbackOrder).toBe(true);
        });

        it('should handle language-specific font clones correctly', () => {
            const state = {
                activeFontStyleId: 'primary',
                fontStyles: {
                    primary: {
                        fonts: [
                            {
                                id: 'primary',
                                type: 'primary',
                                name: 'MainFont',
                                fontObject: {},
                                fontUrl: 'blob:url',
                                color: '#000'
                            },
                            {
                                id: 'lang-primary-ja-JP-123',
                                type: 'primary',
                                name: 'MainFont',
                                fontObject: {},
                                fontUrl: 'blob:url',
                                color: '#000',
                                isPrimaryOverride: true,
                                isClone: true,
                                parentId: 'primary',
                                // Language-specific metric overrides
                                scale: 90,
                                lineHeight: 1.8,
                                letterSpacing: 0.05
                            },
                            {
                                id: 'lang-fallback-ko-KR-456',
                                type: 'fallback',
                                name: 'NotoSansKR',
                                fontObject: {},
                                fontUrl: 'blob:url',
                                color: '#333',
                                isLangSpecific: true,
                                isClone: true,
                                lineHeight: 1.6
                            }
                        ],
                        primaryFontOverrides: { 'ja-JP': 'lang-primary-ja-JP-123' },
                        fallbackFontOverrides: { 'ko-KR': 'lang-fallback-ko-KR-456' }
                    }
                },
                headerStyles: {},
                headerOverrides: {},
                textOverrides: {},
                visibleLanguageIds: ['ja-JP', 'ko-KR'],
                colors: {},
                headerFontStyleMap: {},
                textCase: 'none',
                viewMode: 'h1',
                gridColumns: 1,
                showFallbackColors: true,
                showAlignmentGuides: false,
                showBrowserGuides: false,
                showFallbackOrder: false
            };

            const result = ConfigService.serializeConfig(state);
            const fonts = result.data.fontStyles.primary.fonts;

            // Verify language-specific primary clone
            const jaClone = fonts.find(f => f.id === 'lang-primary-ja-JP-123');
            expect(jaClone).toBeDefined();
            expect(jaClone.isPrimaryOverride).toBe(true);
            expect(jaClone.isClone).toBe(true);
            expect(jaClone.parentId).toBe('primary');
            expect(jaClone.scale).toBe(90);
            expect(jaClone.lineHeight).toBe(1.8);
            expect(jaClone.letterSpacing).toBe(0.05);
            expect(jaClone.fontObject).toBeUndefined();

            // Verify language-specific fallback
            const koFallback = fonts.find(f => f.id === 'lang-fallback-ko-KR-456');
            expect(koFallback).toBeDefined();
            expect(koFallback.isLangSpecific).toBe(true);
            expect(koFallback.isClone).toBe(true);
            expect(koFallback.lineHeight).toBe(1.6);
            expect(koFallback.fontObject).toBeUndefined();

            // Verify overrides map
            expect(result.data.fontStyles.primary.primaryFontOverrides).toEqual({ 'ja-JP': 'lang-primary-ja-JP-123' });
            expect(result.data.fontStyles.primary.fallbackFontOverrides).toEqual({ 'ko-KR': 'lang-fallback-ko-KR-456' });
        });
    });

    describe('validateConfig', () => {
        it('should remove orphaned fallback font overrides', () => {
            const data = {
                fontStyles: {
                    primary: {
                        fonts: [
                            { id: 'primary', type: 'primary' },
                            { id: 'fallback-1', type: 'fallback' }
                        ],
                        fallbackFontOverrides: {
                            'en-US': 'fallback-1',        // Valid
                            'ja-JP': 'deleted-font-id',   // Orphaned - should be removed
                            'es-ES': 'cascade'            // Special value - should be kept
                        }
                    }
                }
            };

            const result = ConfigService.validateConfig(data);

            expect(result.fontStyles.primary.fallbackFontOverrides['en-US']).toBe('fallback-1');
            expect(result.fontStyles.primary.fallbackFontOverrides['ja-JP']).toBeUndefined();
            expect(result.fontStyles.primary.fallbackFontOverrides['es-ES']).toBe('cascade');
        });

        it('should remove orphaned primary font overrides', () => {
            const data = {
                fontStyles: {
                    primary: {
                        fonts: [
                            { id: 'primary', type: 'primary' },
                            { id: 'lang-primary-ja-JP-123', type: 'primary', isClone: true }
                        ],
                        primaryFontOverrides: {
                            'ja-JP': 'lang-primary-ja-JP-123',  // Valid
                            'ko-KR': 'deleted-clone-id'          // Orphaned - should be removed
                        }
                    }
                }
            };

            const result = ConfigService.validateConfig(data);

            expect(result.fontStyles.primary.primaryFontOverrides['ja-JP']).toBe('lang-primary-ja-JP-123');
            expect(result.fontStyles.primary.primaryFontOverrides['ko-KR']).toBeUndefined();
        });
    });
});
