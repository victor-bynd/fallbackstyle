
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import FontCards from '../components/FontCards';
import { vi } from 'vitest';
import * as TypoContext from '../context/useTypo';

// Mock services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));

vi.mock('../components/InfoTooltip', () => ({
    default: ({ content }) => <div data-testid="tooltip">{content}</div>
}));

vi.mock('../context/useTypo', () => ({
    useTypo: vi.fn()
}));

import { useTypo } from '../context/useTypo';

describe('Mapped Font Grouping Reproduction', () => {

    it('should group fonts with same name into a single card with multiple language tags', () => {
        const fontName = 'SameFontName.ttf';
        const font1 = {
            id: 'font-1',
            type: 'fallback',
            fileName: fontName,
            name: 'SameFontName',
            fontObject: { numGlyphs: 100 },
            isLangSpecific: false
        };
        const font2 = {
            id: 'font-2',
            type: 'fallback',
            fileName: fontName, // Same filename
            name: 'SameFontName',
            fontObject: { numGlyphs: 100 },
            isLangSpecific: false
        };

        // Mock context with 2 fonts (Same Name, Diff ID)
        const mockFallbackOverrides = {
            'fr-FR': { 'font-root': 'font-1' }, // Mapped to font-1
            'es-ES': { 'font-root': 'font-2' }  // Mapped to font-2
        };

        const mockContext = {
            fonts: [font1, font2],
            activeFont: 'primary',
            setActiveFont: vi.fn(),
            updateFontWeight: vi.fn(),
            toggleFontVisibility: vi.fn(),
            updateFallbackFontOverride: vi.fn(),
            resetFallbackFontOverrides: vi.fn(),
            addFallbackFonts: vi.fn(),
            addStrictlyMappedFonts: vi.fn(),
            unmapFont: vi.fn(),
            weight: 400,
            fontScales: { active: 100, fallback: 100 },
            lineHeight: 1.2,
            getFontColor: () => '#000',
            updateFontColor: vi.fn(),
            getEffectiveFontSettings: () => ({ weight: 400 }),
            fallbackFontOverrides: mockFallbackOverrides,
            primaryFontOverrides: {},
            addLanguageSpecificPrimaryFont: vi.fn(),
            addLanguageSpecificFont: vi.fn(),
            setFontScales: vi.fn(),
            setIsFallbackLinked: vi.fn(),
            setLineHeight: vi.fn(),
            setActiveConfigTab: vi.fn(),
            fallbackFont: 'sans-serif',
            setFallbackFont: vi.fn(),
            systemFallbackOverrides: {},
            updateSystemFallbackOverride: vi.fn(),
            resetSystemFallbackOverride: vi.fn(),
            missingColor: '#ccc',
            setMissingColor: vi.fn(),
            normalizeFontName: (name) => name.toLowerCase(),
            setFallbackFontOverride: vi.fn(),
            linkFontToLanguage: vi.fn(),
            updateLanguageSpecificSetting: vi.fn(),
            activeTab: 'ALL', // View where grouping happens
            primaryLanguages: []
        };

        useTypo.mockReturnValue(mockContext);

        render(<FontCards activeTab="ALL" selectedGroup="ALL" />);

        // 1. Assert only ONE card with title 'SameFontName' is rendered
        const cards = screen.getAllByText('SameFontName');
        expect(cards).toHaveLength(1);

        // 2. Assert BOTH tags are present on that card
        const cardContainer = cards[0].closest('.relative.p-3');
        expect(within(cardContainer).getByText('fr-FR')).toBeInTheDocument();
        expect(within(cardContainer).getByText('es-ES')).toBeInTheDocument();
    });
});
