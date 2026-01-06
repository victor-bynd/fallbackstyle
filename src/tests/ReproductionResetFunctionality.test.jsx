import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FontCards from '../components/FontCards';
import { TypoContext } from '../context/TypoContextDefinition';

// Mock FontLoader
vi.mock('../services/FontLoader', () => ({
    createFontUrl: vi.fn(() => 'blob:mock-url'),
    parseFontFile: vi.fn(),
}));

// Mock weightUtils
vi.mock('../utils/weightUtils', () => ({
    buildWeightSelectOptions: () => [{ value: 400, label: 'Regular' }],
    resolveWeightToAvailableOption: () => 400,
}));

const createMockContext = () => {
    const defaultFonts = [
        {
            id: 'primary-font-id',
            type: 'primary',
            name: 'PrimaryFont',
            fileName: 'PrimaryFont.ttf',
        },
        {
            id: 'fallback-font-id',
            type: 'fallback',
            name: 'FallbackFont',
            fileName: 'FallbackFont.ttf',
        }
    ];

    return {
        fonts: defaultFonts,
        activeFont: 'primary-font-id',
        primaryFontOverrides: {
            'vi-VN': 'primary-font-id'
        },
        fallbackFontOverrides: {
            'he-IL': { 'fallback-font-id': 'fallback-clone-id' } // Specific clone mapping
        },
        activeConfigTab: 'ALL',
        systemFallbackOverrides: {},
        fontScales: { fallback: 100 },
        getEffectiveFontSettings: () => ({}),
        getFontColor: () => '#000000',
        updateFontWeight: vi.fn(),
        toggleFontVisibility: vi.fn(),
        updateFallbackFontOverride: vi.fn(),
        updateLanguageSpecificSetting: vi.fn(),

        // Mocks for functions to be called
        linkFontToLanguage: vi.fn(),
        clearPrimaryFontOverride: vi.fn(),
        clearFallbackFontOverride: vi.fn(),

        // Needed for rendering
        languages: [
            { id: 'vi-VN', name: 'Vietnamese' },
            { id: 'he-IL', name: 'Hebrew' }
        ],
        isLanguageConfigured: () => true,
        visibleLanguageIds: ['vi-VN', 'he-IL']
    };
};

describe('Reproduction: Reset Button Functionality', () => {
    it('should call clearPrimaryFontOverride when resetting a primary mappping', () => {
        const mockContext = createMockContext();

        render(
            <TypoContext.Provider value={mockContext}>
                <FontCards activeTab="ALL" selectedGroup="ALL" />
            </TypoContext.Provider>
        );

        // 1. Find Primary Font Card (Use getAllByText since title and other places might have it)
        const primaryCards = screen.getAllByText('PrimaryFont');
        const primaryCard = primaryCards[0].closest('.relative');

        // 2. Find Vietnamese Tag
        const viTag = within(primaryCard).getByText('vi-VN');

        // 3. Find and Click Reset Button
        const resetButton = within(viTag.closest('button')).getByTitle('Reset to Global (All)');
        fireEvent.click(resetButton);

        // EXPECTATION: Should call clearPrimaryFontOverride
        expect(mockContext.clearPrimaryFontOverride).toHaveBeenCalledWith('vi-VN');
        // Ensure legacy incorrect behavior is NOT called (or validation that we changed it)
        // If the code still calls linkFontToLanguage, this test might pass if we didn't mock it to throw or something?
        // Actually we want to verify it calls the NEW function.
    });

    it('should call linkFontToLanguage (Un-Clone) when resetting a fallback mappping', () => {
        const mockContext = createMockContext();

        render(
            <TypoContext.Provider value={mockContext}>
                <FontCards activeTab="ALL" selectedGroup="ALL" />
            </TypoContext.Provider>
        );

        // 1. Find Fallback Font Card
        const fallbackCard = screen.getByText('FallbackFont').closest('.relative');

        // 2. Find Hebrew Tag
        const heTag = within(fallbackCard).getByText('he-IL');

        // 3. Find and Click Reset Button
        const resetButton = within(heTag.closest('button')).getByTitle('Reset to Global (All)');
        fireEvent.click(resetButton);

        // EXPECTATION: Should call linkFontToLanguage with ORIGINAL Font ID to revert to mapped inheritance
        expect(mockContext.linkFontToLanguage).toHaveBeenCalledWith('fallback-font-id', 'he-IL');
        expect(mockContext.clearFallbackFontOverride).not.toHaveBeenCalled();
    });
});
