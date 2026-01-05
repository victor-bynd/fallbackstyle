import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FontCards from '../components/FontCards';
import { useTypo } from '../context/useTypo';

// Mock context
vi.mock('../context/useTypo', () => ({
    useTypo: vi.fn(),
}));

// Mock child components
vi.mock('../components/LanguageMultiSelectModal', () => ({
    default: ({ onClose, onConfirm, title }) => (
        <div data-testid="multi-select-modal">
            <h1>{title}</h1>
            <button onClick={onClose}>Close</button>
            <button onClick={() => onConfirm(['fr-FR', 'de-DE'])}>Confirm Mock Selection</button>
        </div>
    )
}));

describe('FontCards Multi-Select Mapping', () => {
    const mockUnmapFont = vi.fn();
    const mockAddLanguageSpecificFont = vi.fn();
    const mockLinkFontToLanguage = vi.fn();
    const mockSetActiveConfigTab = vi.fn();

    const mockFont = {
        id: 'font-1',
        name: 'Test Font',
        type: 'fallback',
        fontObject: { numGlyphs: 100 }, // Ensure it hits the check for "valid loaded font"
        isLangSpecific: false,
        fileName: 'TestFont.ttf'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useTypo.mockReturnValue({
            fonts: [mockFont],
            activeFont: null,
            fontScales: { fallback: 100 },
            getFontColor: () => '#000',
            getEffectiveFontSettings: () => ({}),
            fallbackFontOverrides: {},
            primaryFontOverrides: {},
            unmappedFonts: [mockFont],  // Ensure it shows up in general list
            unmapFont: mockUnmapFont,
            addLanguageSpecificFont: mockAddLanguageSpecificFont,
            linkFontToLanguage: mockLinkFontToLanguage,
            setActiveConfigTab: mockSetActiveConfigTab,
            // Add other necessary mock returns if component crashes
            missingColor: '#000',
            systemFallbackOverrides: {},
            languagesData: [],
            setLineHeight: vi.fn(),
            updateFontColor: vi.fn(),
            updateFallbackFontOverride: vi.fn(),
        });
    });

    it('should open multi-select modal and map to multiple languages', async () => {
        render(<FontCards activeTab="ALL" />);

        // Click Map button
        const mapBtn = screen.getByTitle('Map to Language');
        fireEvent.click(mapBtn);

        // Verify Modal Opens
        expect(screen.getByTestId('multi-select-modal')).toBeInTheDocument();
        expect(screen.getByText('Map Test Font to Languages')).toBeInTheDocument();

        // Simulate confirming selection (fr-FR, de-DE)
        fireEvent.click(screen.getByText('Confirm Mock Selection'));

        // Verify Modal Closes
        await waitFor(() => {
            expect(screen.queryByTestId('multi-select-modal')).not.toBeInTheDocument();
        });

        // Verify Mapping Logic was called for both languages
        // Since mockFont has fontObject, it should try to "link"
        expect(mockLinkFontToLanguage).toHaveBeenCalledWith('font-1', 'fr-FR');
        expect(mockLinkFontToLanguage).toHaveBeenCalledWith('font-1', 'de-DE');
        expect(mockLinkFontToLanguage).toHaveBeenCalledTimes(2);
    });
});
