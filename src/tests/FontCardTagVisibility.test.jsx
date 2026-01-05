import React from 'react';
import { render, screen } from '@testing-library/react';
import { FontCard } from '../components/FontCards';
import { vi } from 'vitest';
import * as TypoContext from '../context/useTypo';

// Mock dependencies
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));
vi.mock('../components/InfoTooltip', () => ({
    default: ({ content }) => <div>{content}</div>
}));
vi.mock('../context/useTypo', () => ({
    useTypo: vi.fn()
}));

import { useTypo } from '../context/useTypo';

describe('Font Card Tag Visibility', () => {
    it('should show all mapped tags even when a specific language is active', () => {
        const mockFont = {
            id: 'font-1',
            type: 'fallback',
            fileName: 'TestFont.ttf',
            name: 'TestFont',
            fontObject: { numGlyphs: 100 },
        };

        const mockContext = {
            fonts: [mockFont],
            getFontColor: () => '#000',
            updateFontColor: vi.fn(),
            getEffectiveFontSettings: () => ({}),
            fallbackFontOverrides: {
                'fr-FR': { 'font-1': 'font-1' },
                'es-ES': { 'font-1': 'font-1' }
            },
            primaryFontOverrides: {},
            linkFontToLanguage: vi.fn(),
            updateLanguageSpecificSetting: vi.fn(),
            primaryLanguages: [],
            activeConfigTab: 'fr-FR' // Active tab is French
        };

        useTypo.mockReturnValue(mockContext);

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
                onSelectLanguage={vi.fn()}
            />
        );

        // BOTH tags should be visible
        const frTag = screen.getByText('fr-FR');
        const esTag = screen.getByText('es-ES');

        expect(frTag).toBeDefined();
        expect(esTag).toBeDefined();

        // Verify that fr-FR is highlighted (active) because activeTab passed is 'fr-FR'
        // We know that active tags have white text color (#ffffff)
        // We can check the computed style or the inline style prop
        // The inline style for selected is: { backgroundColor: fontColor, borderColor: fontColor, color: '#ffffff' }

        // Note: checking inline style in JSDOM/Testing Library can be tricky if applied via style prop object
        expect(frTag).toHaveStyle({ color: '#ffffff' });

        // es-ES should not be highlighted (color should be fontColor which is #000)
        expect(esTag).toHaveStyle({ color: '#000' });
    });
});
