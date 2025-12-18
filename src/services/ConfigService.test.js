import { describe, it, expect } from 'vitest';
import { ConfigService } from './ConfigService';
import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';

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
    });



});
