
import { describe, it, expect } from 'vitest';
import { groupAndSortFonts } from '../utils/fontSortUtils';

describe('groupAndSortFonts', () => {
    it('should not include primary overrides in the global fallback list', () => {
        const mockFonts = [
            { id: 'primary', type: 'primary', isPrimaryOverride: false },
            { id: 'arial', type: 'fallback', isPrimaryOverride: false, name: 'Arial' },
            { id: 'override1', type: 'fallback', isPrimaryOverride: true, name: 'Override Font' }
        ];

        const primaryOverridesMap = {
            'en-US': 'override1'
        };

        const result = groupAndSortFonts(mockFonts, {}, primaryOverridesMap);

        // Verify primary override is in the primaryOverrides list
        expect(result.primaryOverrides).toBeDefined();
        expect(result.primaryOverrides.some(item => item.font.id === 'override1')).toBe(true);
        expect(result.primaryOverrides[0].langIds).toContain('en-US');

        // Verify primary override is NOT in global fallback fonts
        const inGlobalFallback = result.globalFallbackFonts.some(f => f.id === 'override1');
        expect(inGlobalFallback).toBe(false);
    });
});
