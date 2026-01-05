
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontCard } from '../components/FontCards';
import { vi } from 'vitest';
import * as TypoContext from '../context/useTypo';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));

// Mock InfoTooltip
vi.mock('../components/InfoTooltip', () => ({
    default: ({ content }) => <div data-testid="tooltip">{content}</div>
}));

// Mock useTypo
vi.mock('../context/useTypo', () => ({
    useTypo: vi.fn()
}));

import { useTypo } from '../context/useTypo';

describe('Font Card Tag Collapse', () => {

    it('should show "Show More" button when tags exceed limit', () => {
        const mockFont = {
            id: 'font-1',
            type: 'fallback',
            fileName: 'TestFont.ttf',
            name: 'TestFont',
            fontObject: { numGlyphs: 100 },
        };

        // Create 20 dummy languages
        const manyLangs = {};
        for (let i = 0; i < 20; i++) {
            manyLangs[`lang-${i}`] = 'font-1';
        }

        const mockContext = {
            fonts: [mockFont],
            getFontColor: () => '#000',
            updateFontColor: vi.fn(),
            getEffectiveFontSettings: () => ({}),
            fallbackFontOverrides: manyLangs,
            primaryFontOverrides: {},
            linkFontToLanguage: vi.fn(),
            updateLanguageSpecificSetting: vi.fn(),
            primaryLanguages: [],
        };

        useTypo.mockReturnValue(mockContext);

        render(
            <FontCard
                font={mockFont}
                isActive={true}
                activeTab="ALL" // Show all tags
                getFontColor={() => '#000'}
                updateFontColor={vi.fn()}
                getEffectiveFontSettings={() => ({})}
                fontScales={{}}
                lineHeight={1.5}
                updateFallbackFontOverride={vi.fn()}
                resetFallbackFontOverrides={vi.fn()}
                setActiveFont={vi.fn()}
                updateFontWeight={vi.fn()}
                toggleFontVisibility={vi.fn()}
            />
        );

        // Should NOT see all 20 tags.
        // The default limit is calculated based on width, but in JSDOM width might be 0 or small.
        // We need to ensure the logic triggers. The component uses ResizeObserver and explicit width checks.
        // In JSDOM, offsetWidth is 0 by default. FontCard handles this by default setting limit to 11 if logic fails or width is small?
        // Actually, looking at FontCards.jsx: 
        // setTagsLimit(11) initial state.
        // calculateLimit() checks offsetWidth.

        // We expect "Show More" button.
        // Since we didn't implement it yet, this should fail.

        const showMoreBtn = screen.queryByText(/\+\d+/); // Regex for +number e.g. +9
        expect(showMoreBtn).toBeInTheDocument();
    });
});
