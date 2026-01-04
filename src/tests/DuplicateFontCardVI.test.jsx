
import React from 'react';
import { render, screen } from '@testing-library/react';
import FontCards from '../components/FontCards';
import { useTypo } from '../context/useTypo';
import { vi } from 'vitest';

// Mocks
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));
vi.mock('../components/InfoTooltip', () => ({
    default: ({ content }) => <div data-testid="tooltip">{content}</div>
}));
vi.mock('../context/useTypo');

describe('Duplicate Fallback Font Card Reproduction', () => {


    it('should NOT show duplicate cards for a System Font when it is overridden for a language', () => {
        // Setup:
        // 1. A System Font (no fontObject) "Arial"
        // 2. An override/mapping of "Arial" for 'VI-VN'
        // 3. View 'VI-VN' tab
        // Expected: Only ONE card for "Arial" (the overridden one) should be shown.

        const systemFont = {
            id: 'font-system-arial',
            type: 'fallback',
            fileName: null, // System fonts have no file
            name: 'Arial',
            fontObject: null, // CAUSE: System font
            isClone: false,
            isLangSpecific: false
        };

        // When we override a system font, we might create a clone or just map it.
        // Let's assume we create a clone for the override. 
        const cloneSystemFont = {
            id: 'font-clone-arial-vi',
            type: 'fallback',
            fileName: null,
            name: 'Arial',
            fontObject: null,
            isClone: true,
            isLangSpecific: true
        };

        const mockFonts = [systemFont, cloneSystemFont];

        // Mappings
        const mockFallbackOverrides = {
            'vi-VN': { 'font-system-arial': 'font-clone-arial-vi' }
        };

        const mockContext = {
            fonts: mockFonts,
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
            visibleLanguagesIds: ['vi-VN'],
            primaryLanguages: ['en-US']
        };

        useTypo.mockReturnValue(mockContext);

        // Render in VI-VN View
        render(<FontCards activeTab="vi-VN" selectedGroup="ALL" />);

        // Check for "Arial" cards
        const fontCards = screen.getAllByText('Arial');
        // Filter to ensure we are looking at the card title
        // Note: System fonts might render title slightly differently, but "Arial" text should be present.
        // We look for the bold font name element.
        const titles = fontCards.filter(el =>
            el.classList.contains('font-mono') &&
            el.classList.contains('text-[13px]') &&
            el.classList.contains('font-bold')
        );

        // Assert: Should be exactly 1
        expect(titles.length).toBe(1);
    });

});
