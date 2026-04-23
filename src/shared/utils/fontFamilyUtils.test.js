import { describe, it, expect } from 'vitest';
import { getFallbackFontFamily, getSystemFallbackFamily, getUploadedFontFamily } from './fontFamilyUtils';

describe('fontFamilyUtils', () => {
    it('sanitizes style and font IDs in fallback family names', () => {
        const family = getFallbackFontFamily("pri'mary style", 'font/id(1)');
        expect(family).toBe("'FallbackFont-pri_mary_style-font_id_1_'");
    });

    it('sanitizes style and language IDs in system fallback family names', () => {
        const family = getSystemFallbackFamily('style/1', 'zh-Hant_TW');
        expect(family).toBe("'SystemFallback-style_1-zh-Hant_TW'");
    });

    it('sanitizes uploaded family style IDs', () => {
        const family = getUploadedFontFamily('brand style\nA');
        expect(family).toBe("'UploadedFont-brand_style_A'");
    });
});
