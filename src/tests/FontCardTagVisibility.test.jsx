import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('Font Card Tag Visibility', () => {

    it('should show ALL mapped language tags even when a specific language is active', () => {
        const mockFont = {
            id: 'font-1',
            type: 'fallback',
            fileName: 'TestFont.ttf',
            name: 'TestFont',
            fontObject: { numGlyphs: 100 },
        };

        // This font is mapped to French and Spanish
        const mockFallbackOverrides = {
            'fr-FR': { 'font-1': 'font-1' },
            'es-ES': { 'font-1': 'font-1' },
            'de-DE': 'other-font'
        };

        const mockContext = {
            fonts: [mockFont],
            getFontColor: () => '#000',
            updateFontColor: vi.fn(),
            getEffectiveFontSettings: () => ({}),
            fallbackFontOverrides: mockFallbackOverrides,
            primaryFontOverrides: {},
            linkFontToLanguage: vi.fn(),
            updateLanguageSpecificSetting: vi.fn(),
            primaryLanguages: [],
            // ... other needed mocks
        };

        useTypo.mockReturnValue(mockContext);

        // Render with activeTab set to 'fr-FR'
        // Verification: We expect BOTH 'fr-FR' and 'es-ES' tags to be visible
        // Currently, the bug causes only 'fr-FR' to show.
        render(
            <FontCard
                font={mockFont}
                isActive={true}
                activeTab="fr-FR"
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

        // Check if both tags are present
        const frTag = screen.queryByText('fr-FR');
        const esTag = screen.queryByText('es-ES');
        const allTag = screen.queryByText('ALL');

        expect(frTag).toBeInTheDocument();
        expect(esTag).toBeInTheDocument();
        expect(allTag).toBeInTheDocument();

        // Check highlighting - assumption: highlighted tag has specific class or style
        // Based on code: isSelected ? { backgroundColor: fontColor ... } : ...
        // We can check if it has the background color style or a specific class modification if any.
        // The code uses inline styles for background color on selection.
        // Let's assume we can check for style matching the expected font color.

        // We expect frTag to be highlighted because activeTab is 'fr-FR'
        // But currently editScope defaults to 'ALL', so 'fr-FR' might NOT be highlighted yet.
        // This test failure will drive the implementation.
        expect(frTag.closest('button')).toHaveStyle({ color: '#ffffff' }); // Active tags have white text
    });
});
