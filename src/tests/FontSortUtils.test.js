
import { describe, it, expect } from 'vitest';
import { groupAndSortFonts } from '../utils/fontSortUtils';

describe('groupAndSortFonts', () => {
    it('should not include primary overrides in the global fallback list', () => {
        const mockFonts = [
            { id: 'primary', type: 'primary', isPrimaryOverride: false },
            { id: 'arial', type: 'fallback', isPrimaryOverride: false, name: 'Arial', metricGroupId: null },
            { id: 'override1', type: 'fallback', isPrimaryOverride: true, name: 'Override Font', metricGroupId: 'group1' }
        ];

        const metricGroups = {
            group1: { id: 'group1', name: 'Group 1' }
        };

        const primaryOverridesMap = {
            'en-US': 'override1'
        };

        const result = groupAndSortFonts(mockFonts, {}, primaryOverridesMap, metricGroups);

        // Verify primary override is in the group
        const group = result.primaryOverrideGroups.find(g => g.group.id === 'group1');
        expect(group).toBeDefined();
        expect(group.fonts.some(f => f.font.id === 'override1')).toBe(true);

        // Verify primary override is NOT in global fallback fonts
        // THIS IS EXPECTED TO FAIL BEFORE FIX
        const inGlobalFallback = result.globalFallbackFonts.some(f => f.id === 'override1');
        expect(inGlobalFallback).toBe(false);
    });
});
