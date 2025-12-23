import { describe, it, expect } from 'vitest';
import { ConfigService } from '../services/ConfigService';

describe('ConfigService Validation', () => {
    it('should validate and clean configuration', () => {
        const mockConfig = {
            fontStyles: {
                primary: {
                    fonts: [{ id: 'font1' }],
                    fallbackFontOverrides: {
                        'en-US': 'font1', // Valid
                        'fr-FR': 'font2'  // Invalid (orphaned)
                    }
                },
            }
        };

        const validated = ConfigService.validateConfig(mockConfig);

        expect(validated.fontStyles.primary.fallbackFontOverrides['en-US']).toBe('font1');
        expect(validated.fontStyles.primary.fallbackFontOverrides['fr-FR']).toBeUndefined();
    });

    it('should handle missing overrides gracefully', () => {
        const niceConfig = {
            fontStyles: {
                primary: { fonts: [] },
            }
        };
        const validated = ConfigService.validateConfig(niceConfig);
        expect(validated).toEqual(niceConfig);
    });
});
