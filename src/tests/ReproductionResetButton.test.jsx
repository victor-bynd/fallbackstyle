import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FontCards from '../components/FontCards';
import { TypoContext } from '../context/TypoContextDefinition';

// Mock FontLoader to avoid network requests
vi.mock('../services/FontLoader', () => ({
    createFontUrl: vi.fn(() => 'blob:mock-url'),
    parseFontFile: vi.fn(),
}));

// Mock weightUtils
vi.mock('../utils/weightUtils', () => ({
    buildWeightSelectOptions: () => [{ value: 400, label: 'Regular' }],
    resolveWeightToAvailableOption: () => 400,
}));

// Mock TypoContext
const createMockContext = (overrides = {}) => {
    const defaultFonts = [
        {
            id: 'primary-font-id',
            type: 'primary',
            name: 'Primary Font',
            fileName: 'PrimaryFont.ttf',
            fontObject: { numGlyphs: 100 },
        },
        {
            id: 'fallback-font-id',
            type: 'fallback',
            name: 'Fallback Font',
            fileName: 'FallbackFont.ttf',
            fontObject: { numGlyphs: 100 },
        }
    ];

    // Primary Override (Clone)
    const primaryOverrideFont = {
        ...defaultFonts[0],
        id: 'primary-override-id',
        type: 'fallback', // TypoContext converts primary overrides to fallback type
        isPrimaryOverride: true,
        isLangSpecific: true,
        isClone: true,
    };

    // Fallback Override (Clone)
    const fallbackOverrideFont = {
        ...defaultFonts[1],
        id: 'fallback-override-id',
        isLangSpecific: true,
        isClone: true,
    };

    const fonts = [
        ...defaultFonts,
        primaryOverrideFont,
        fallbackOverrideFont
    ];

    return {
        fonts,
        activeFont: 'primary-font-id',
        primaryFontOverrides: {
            'vi-VN': 'primary-override-id' // Vietnamese uses primary override
        },
        fallbackFontOverrides: {
            'he-IL': { 'fallback-font-id': 'fallback-override-id' } // Object format for clones
        },
        activeConfigTab: 'ALL', // Global View
        systemFallbackOverrides: {},
        fontScales: { fallback: 100 },
        getEffectiveFontSettings: () => ({}),
        getFontColor: () => '#000000',
        updateFontWeight: vi.fn(),
        toggleFontVisibility: vi.fn(),
        updateFallbackFontOverride: vi.fn(),
        updateLanguageSpecificSetting: vi.fn(),
        linkFontToLanguage: vi.fn(),
        unmapFont: vi.fn(), // This matches the reset handler usage in FontCards
        ...overrides
    };
};

describe('Reproduction: Missing Reset Button on Overrides', () => {
    it('should show reset button for primary override on language tag (Language View)', () => {
        const mockContext = createMockContext({
            activeConfigTab: 'vi-VN' // Viewing Vietnamese tab
        });

        render(
            <TypoContext.Provider value={mockContext}>
                <FontCards activeTab="vi-VN" selectedGroup="vi-VN" />
            </TypoContext.Provider>
        );

        // Debug: Log the visible text to see if tags are rendering
        // screen.debug();

        // 2. Find Vietnamese Tag directly (it will be on the override card, not the main one)
        const viTag = screen.getByText('vi-VN');
        expect(viTag).toBeInTheDocument();

        // 3. Check for Reset Button within the Tag
        // The reset button is an SVG div/button inside the tag button
        // It has a title "Reset to Global (All)"
        const resetButton = within(viTag.closest('button')).queryByTitle('Reset to Global (All)');

        // EXPECTATION: Should be present (but bug makes it missing)
        expect(resetButton).toBeInTheDocument();
    });

    it('should show reset button for mapped fallback override on language tag', () => {
        const mockContext = createMockContext();

        render(
            <TypoContext.Provider value={mockContext}>
                <FontCards activeTab="ALL" selectedGroup="ALL" />
            </TypoContext.Provider>
        );

        // 1. Find Fallback Font Card
        const fallbackCard = screen.getByText('FallbackFont').closest('.relative');
        expect(fallbackCard).toBeInTheDocument();

        // 2. Find Hebrew Tag
        const heTag = within(fallbackCard).getByText('he-IL');
        expect(heTag).toBeInTheDocument();

        // 3. Check for Reset Button within the Tag
        const resetButton = within(heTag.closest('button')).queryByTitle('Reset to Global (All)');

        // EXPECTATION: Should be present
        expect(resetButton).toBeInTheDocument();
    });

    it('should NOT show reset button for inherited fallback mapping (Un-cloned)', () => {
        const mockContext = createMockContext({
            fallbackFontOverrides: {
                'he-IL': { 'fallback-font-id': 'fallback-font-id' } // Inherited (Original -> Original)
            }
        });

        render(
            <TypoContext.Provider value={mockContext}>
                <FontCards activeTab="ALL" selectedGroup="ALL" />
            </TypoContext.Provider>
        );

        // 1. Find Fallback Font Card
        const fallbackCard = screen.getByText('FallbackFont').closest('.relative');
        expect(fallbackCard).toBeInTheDocument();

        // 2. Find Hebrew Tag
        const heTag = screen.getByText('he-IL');
        expect(heTag).toBeInTheDocument();

        // 3. Ensure Reset Button is NOT present
        const resetButton = within(heTag.closest('button')).queryByTitle('Reset to Global (All)');
        expect(resetButton).not.toBeInTheDocument();
    });
});
