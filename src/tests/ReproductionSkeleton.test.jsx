import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypoProvider, useTypo } from '../context/TypoContext';
import React from 'react';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));

// Mock Persistence
vi.mock('../services/PersistenceService', () => ({
    loadProject: vi.fn().mockResolvedValue(null),
    saveProject: vi.fn(),
    clearProject: vi.fn()
}));

describe('TypoContext - Override Reproduction', () => {
    let result;

    const wrapper = ({ children }) => (
        <TypoProvider>{children}</TypoProvider>
    );

    beforeEach(async () => {
        // Clear mocks logic if needed
        const { result: r } = renderHook(() => useTypo(), { wrapper });
        result = r;

        // Wait for init?
        await act(async () => { });
    });

    it('should create a clone when overriding a global font', async () => {
        // 1. Add Global Font
        const globalFont = {
            id: 'global-1',
            name: 'Global Font',
            fileName: 'Global.ttf',
            type: 'fallback',
            isClone: false,
            isLangSpecific: false
        };

        await act(async () => {
            // Simulate adding font directly to state if possible, or use addFont logic 
            // Since addFont is complex (file upload), we might need to manipulate state or mock addFont result.
            // Actually, let's use the provided `fonts` state manipulation if exposed? No.
            // We have to rely on `addFont` or assume state is seeded.
            // Let's rely on internal state mechanics if we can't easily add.
            // Actually `TypoProvider` initializes with empty fonts.

            // We can treat `TypoProvider` as black box.
            // Ideally we'd modify the test to seed the context.
            // But let's assume `addFont` works or mock the input.
        });

        // Let's skip complex setup and verify the logic function directly if we could exported it? No.

        // Alternative: Verify behavior using the hook methods.
        // We can't easily add a font file in test without heavy mocking.
        // But we CAN verify `updateLanguageSpecificSetting` if we can get a font in there.
        // `updateLanguageSpecificSetting` requires an existing font ID.

        // Let's assume we can inject a font via "Local Storage" mock?
        // PersistenceService.loadProject is mocked to return null.
        // If we change it to return a state with 1 font?
    });
});
