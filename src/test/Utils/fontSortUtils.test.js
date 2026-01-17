
import { describe, it, expect } from 'vitest';
import { groupAndSortFonts, getVisualFontIdOrder, isSystemFont } from '../../utils/fontSortUtils';

// Mock languages data if possible, but the utility imports it directly. 
// Ideally we should mock the module, but for unit testing logic with internal data it might be okay if data is stable.
// Assuming 'en-US' and 'fr-FR' exist in languages.json.

describe('fontSortUtils', () => {

    describe('isSystemFont', () => {
        it('returns true if no fontObject', () => {
            expect(isSystemFont({ name: 'Arial' })).toBe(true);
        });

        it('returns false if fontObject is present', () => {
            expect(isSystemFont({ name: 'MyFont', fontObject: {} })).toBe(false);
        });
    });

    describe('groupAndSortFonts', () => {
        const mockPrimary = { id: 'primary', type: 'primary', fileName: 'Primary.ttf', fontObject: {} };
        const mockFallbackUploaded = { id: 'f1', type: 'fallback', fileName: 'Fallback1.ttf', fontObject: {} };
        const mockSystem = { id: 's1', type: 'fallback', name: 'Arial' }; // No fontObject

        it('separates primary, uploaded, and system fonts', () => {
            const fonts = [mockPrimary, mockFallbackUploaded, mockSystem];
            const overrides = {};
            const primaryOverrides = {};

            const result = groupAndSortFonts(fonts, overrides, primaryOverrides);

            expect(result.primary).toEqual(mockPrimary);
            expect(result.globalFallbackFonts).toContain(mockFallbackUploaded);
            expect(result.systemFonts).toContain(mockSystem);
            expect(result.overriddenFonts).toEqual([]);
        });

        it('handles primary overrides', () => {
            const primaryOverrideFont = { id: 'p_fr', type: 'primary', isPrimaryOverride: true, fileName: 'PrimaryFR.ttf' };
            const fonts = [mockPrimary, primaryOverrideFont];
            const primaryOverridesMap = { 'fr-FR': 'p_fr' };

            const result = groupAndSortFonts(fonts, {}, primaryOverridesMap);

            expect(result.primary).toEqual(mockPrimary);
            expect(result.primaryOverrides).toHaveLength(1);
            expect(result.primaryOverrides[0].font).toEqual(primaryOverrideFont);
            expect(result.primaryOverrides[0].langIds).toContain('fr-FR');
        });

        it('handles fallback overrides', () => {
            const fallbackOverrideFont = { id: 'f_fr', type: 'fallback', fileName: 'FallbackFR.ttf', fontObject: {} };
            const fonts = [mockPrimary, mockFallbackUploaded, fallbackOverrideFont];
            const fallbackOverridesMap = { 'fr-FR': 'f_fr' };

            const result = groupAndSortFonts(fonts, fallbackOverridesMap, {});

            expect(result.primary).toEqual(mockPrimary);
            // reused mockFallbackUploaded should be in global
            expect(result.globalFallbackFonts).toContain(mockFallbackUploaded);

            // fallbackOverrideFont should be in overriddenFonts, NOT global
            // Wait, logic says: "Identify fonts active in overrides... exclude from global"
            expect(result.globalFallbackFonts).not.toContain(fallbackOverrideFont);

            expect(result.overriddenFonts).toHaveLength(1);
            expect(result.overriddenFonts[0].font).toEqual(fallbackOverrideFont);
            expect(result.overriddenFonts[0].languages).toContain('fr-FR');
        });
    });

    describe('getVisualFontIdOrder', () => {
        it('returns correct order of IDs', () => {
            const f1 = { id: 'p1', type: 'primary', fontObject: {}, name: 'P1' };
            const f2 = { id: 'o1', type: 'primary', isPrimaryOverride: true, fontObject: {}, name: 'O1' };
            const f3 = { id: 'fb1', type: 'fallback', fontObject: {}, name: 'FB1' };
            const f4 = { id: 'ov1', type: 'fallback', fontObject: {}, name: 'OV1' };

            // p1 is primary
            // o1 is primary override for 'fr-FR'
            // fb1 is global fallback
            // ov1 is fallback override for 'es-ES'

            const fonts = [f1, f2, f3, f4];
            const pMap = { 'fr-FR': 'o1' };
            const fbMap = { 'es-ES': 'ov1' };

            const ids = getVisualFontIdOrder(fonts, fbMap, pMap);

            // Expect: Primary -> Primary Overrides -> Global Fallbacks -> Overridden Fallbacks
            // Note: System fonts are excluded from global list in groupAndSortFonts if I recall correctly? 
            // Let's check the code... 
            // groupAndSortFonts returns { primary, primaryOverrides, globalFallbackFonts, systemFonts, overriddenFonts }
            // getVisualFontIdOrder uses: primary, primaryOverrides, globalFallbackFonts, overriddenFonts.
            // It seems it IGNORES systemFonts in the return list? 
            // Wait, let me check the implementation of getVisualFontIdOrder again in thought.
            // "ids.push(...globalFallbackFonts.map(f => f.id));" 
            // "ids.push(...overriddenFonts.map(o => o.font.id));"
            // It does NOT explicitly push systemFonts. But are systemFonts included in globalFallbackFonts?
            // "const uploadedFallbackFonts = nonOverriddenFallbacks.filter(f => !isSystemFont(f));"
            // "const systemFonts = nonOverriddenFallbacks.filter(f => isSystemFont(f));"
            // "globalFallbackFonts: filteredGlobalFallbacks" (which comes from uploadedFallbackFonts)
            // So system fonts are NOT in globalFallbackFonts.
            // And systemFonts are returned separately but NOT used in getVisualFontIdOrder? 
            // That sounds like a potential bug or intended feature (maybe system fonts are not "visualized" in the same way?).
            // Let's assume the order tested here uses what's available.

            expect(ids[0]).toBe('p1');
            expect(ids).toContain('o1');
            expect(ids).toContain('fb1');
            expect(ids).toContain('ov1');

            // Order: Primary, PrimaryOverrides, Global, Overridden
            expect(ids.indexOf('p1')).toBeLessThan(ids.indexOf('o1'));
            expect(ids.indexOf('o1')).toBeLessThan(ids.indexOf('fb1'));
            expect(ids.indexOf('fb1')).toBeLessThan(ids.indexOf('ov1'));
        });
    });
});
