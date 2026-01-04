
/* eslint-disable react/prop-types */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TypoProvider } from '../context/TypoContext';
import { useTypo } from '../context/useTypo';
import { vi, describe, it, expect } from 'vitest';

// Mocks
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

vi.mock('../services/SafeFontLoader', () => ({
    safeParseFontFile: vi.fn(),
}));

vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        loadConfig: vi.fn().mockResolvedValue(null),
        saveConfig: vi.fn(),
        getFont: vi.fn(),
        saveFont: vi.fn(),
        getFontKeys: vi.fn().mockResolvedValue([]),
        deleteFont: vi.fn(),
        clear: vi.fn(),
    }
}));

vi.mock('../services/ConfigService', () => ({
    ConfigService: {
        normalizeConfig: vi.fn(c => c?.data || c),
        validateConfig: vi.fn(c => c),
        serializeConfig: vi.fn(c => ({ data: c })),
    }
}));

describe('Prevent Font Deletion on Unmap', () => {
    it('should NOT delete the font when unmapping even if it was exclusively mapped', async () => {
        const wrapper = ({ children }) => <TypoProvider>{children}</TypoProvider>;
        const { result } = renderHook(() => useTypo(), { wrapper });

        const fontId = 'test-font-1';
        const fontData = {
            id: fontId,
            name: 'Test Font',
            fileName: 'TestFont.ttf',
            type: 'fallback',
        };

        // 1. Add font
        act(() => {
            result.current.addFallbackFont(fontData);
        });

        // 2. Map it exclusively (simulate strict mapping behavior)
        act(() => {
            // Using setFallbackFontOverride sets it as a direct value (String) in standard usage simulation
            result.current.setFallbackFontOverride('fr-FR', fontId);
        });

        // Verify mapping
        expect(result.current.getFallbackFontForLanguage('fr-FR')).toBe(fontId);
        expect(result.current.fonts.find(f => f.id === fontId)).toBeDefined();

        // 3. Unmap it
        act(() => {
            result.current.unmapFont(fontId);
        });

        // 4. Assert Preservation
        const fontAfter = result.current.fonts.find(f => f.id === fontId);

        // This EXPECTATION represents the DESTINATION (User Request).
        // It should FAIL currently.
        expect(fontAfter).toBeDefined();

        // Verify it was promoted / cleaned up (assuming we want it visible)
        // If we implemented the fix correctly, it should likely be visible (not hidden, not langSpecific?)
        // But the primary requirement is just presence for now.
    });
});
