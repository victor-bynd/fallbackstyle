import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LanguageCard from '../components/LanguageCard';
import * as useTypoModule from '../context/useTypo';
import * as useFontStackModule from '../hooks/useFontStack';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

// Mock Data
const mockLanguage = {
    id: 'en-US',
    name: 'English (US)',
    sampleSentence: 'Hello World'
};

const mockPrimaryFont = {
    id: 'primary-font',
    type: 'primary',
    name: 'Primary Font',
    fontObject: { unitsPerEm: 1000, ascender: 800, descender: -200, charToGlyphIndex: () => 1 }
};

const mockMappedFont = {
    id: 'mapped-1',
    type: 'fallback',
    name: 'Mapped Font X',
    fontObject: { charToGlyphIndex: () => 1 },
    isLangSpecific: true
};

const mockGeneralFallback = {
    id: 'general-1',
    type: 'fallback',
    name: 'General Fallback A',
    fontObject: { charToGlyphIndex: () => 1 }
};

describe('LanguageCard Font Indicators', () => {
    let mockTypoContext;
    let buildFallbackFontStackForStyleMock;

    beforeEach(() => {
        // Reset mocks
        vi.restoreAllMocks();

        // Default Mock Context
        mockTypoContext = {
            primaryLanguages: [],
            fontStyles: { primary: { baseFontSize: 16 } },
            headerStyles: {},
            colors: { primary: '#000' },
            textOverrides: {},
            setTextOverride: vi.fn(),
            resetTextOverride: vi.fn(),
            getFontsForStyle: vi.fn(),
            getPrimaryFontFromStyle: vi.fn(),
            getEffectiveFontSettingsForStyle: vi.fn(),
            getFallbackFontOverrideForStyle: vi.fn(),
            getPrimaryFontOverrideForStyle: vi.fn(),
            setFallbackFontOverrideForStyle: vi.fn(),
            clearFallbackFontOverrideForStyle: vi.fn(),
            removeConfiguredLanguage: vi.fn(),
            viewMode: 'h1',
            textCase: 'none',
            showAlignmentGuides: false,
            showFallbackColors: true,
            activeFontStyleId: 'primary',
            systemFallbackOverrides: {},
            showFallbackOrder: true // ENABLE INDICATORS
        };

        vi.spyOn(useTypoModule, 'useTypo').mockReturnValue(mockTypoContext);

        // Mock useFontStack
        buildFallbackFontStackForStyleMock = vi.fn();
        vi.spyOn(useFontStackModule, 'useFontStack').mockReturnValue({
            buildFallbackFontStackForStyle: buildFallbackFontStackForStyleMock
        });
    });

    it('Scenario: Mapped font exists -> Shows Breadcrumb', () => {
        mockTypoContext.getPrimaryFontFromStyle.mockReturnValue(mockPrimaryFont);
        mockTypoContext.getFontsForStyle.mockReturnValue([mockPrimaryFont, mockMappedFont]);
        mockTypoContext.getFallbackFontOverrideForStyle.mockReturnValue('mapped-1');

        // Mock FontStack returning the Mapped Font
        buildFallbackFontStackForStyleMock.mockReturnValue([
            { fontFamily: 'Mapped Font X', fontId: 'mapped-1', fontObject: mockMappedFont.fontObject }
        ]);

        render(<LanguageCard language={mockLanguage} isHighlighted={false} />);

        expect(screen.getByTitle('Primary Font')).toHaveTextContent('Primary Font');
        expect(screen.getByTitle('Mapped to: Mapped Font X')).toHaveTextContent('Mapped Font X');
    });

    it('Scenario: Mapped font DELETED (Inconsistent State) -> Shows "Auto" (General Fallback)', () => {
        // Setup: Override ID points to 'mapped-1', but 'mapped-1' is NOT in fonts list
        mockTypoContext.getPrimaryFontFromStyle.mockReturnValue(mockPrimaryFont);
        mockTypoContext.getFontsForStyle.mockReturnValue([mockPrimaryFont, mockGeneralFallback]); // Only General Fallback exists
        mockTypoContext.getFallbackFontOverrideForStyle.mockReturnValue('mapped-1');

        // Important: useFontStack will fallback to general fallbacks when override lookup fails
        buildFallbackFontStackForStyleMock.mockReturnValue([
            { fontFamily: 'General Fallback A', fontId: 'general-1', fontObject: mockGeneralFallback.fontObject }
        ]);

        render(<LanguageCard language={mockLanguage} isHighlighted={false} />);

        // Should NOT show "Mapped Font X" (as it's gone)
        // Should show "General Fallback A"
        expect(screen.getByText('General Fallback A')).toBeInTheDocument();
    });

    it('Scenario: No General Fallbacks -> Indicator Disappears', () => {
        // Setup: Override ID points to missing, AND no general fallbacks
        mockTypoContext.getPrimaryFontFromStyle.mockReturnValue(mockPrimaryFont);
        mockTypoContext.getFontsForStyle.mockReturnValue([mockPrimaryFont]); // NO fallbacks
        mockTypoContext.getFallbackFontOverrideForStyle.mockReturnValue('mapped-1');

        // Mock useFontStack returning EMPTY array (no fallbacks)
        buildFallbackFontStackForStyleMock.mockReturnValue([]);

        render(<LanguageCard language={mockLanguage} isHighlighted={false} />);

        // Expectation: Middle badge gone.
        const mappedBadge = screen.queryByTitle(/Mapped to:/);
        expect(mappedBadge).not.toBeInTheDocument();

        // Should still see Primary and System
        expect(screen.getByTitle('Primary Font')).toBeInTheDocument();
        expect(screen.getByTitle('System Fallback')).toBeInTheDocument();
    });
});
