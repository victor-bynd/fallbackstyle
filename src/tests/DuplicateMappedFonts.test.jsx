
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FontCard } from '../components/FontCards';
import FontCards from '../components/FontCards';
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

// Mock useTypo hook
vi.mock('../context/useTypo', () => ({
    useTypo: vi.fn()
}));

import { useTypo } from '../context/useTypo';

describe('Shared Font Override Reproduction', () => {

    it('should allow modifying a shared font for a specific language without blocking overlay', async () => {
        // Setup Shared Font
        const globalFont = {
            id: 'font-global-1',
            type: 'fallback',
            fileName: 'SharedFont.ttf',
            name: 'SharedFont',
            fontObject: { numGlyphs: 100 },
            isClone: false,
            isLangSpecific: false
        };

        const mockFonts = [globalFont];

        // Shared Mapping: French and Spanish use the SAME global font ID
        const mockFallbackOverrides = {
            'fr-FR': { 'font-global-1': 'font-global-1' },
            'es-ES': { 'font-global-1': 'font-global-1' }
        };

        const mockUpdateLanguageSpecificSetting = vi.fn();
        const mockLinkFontToLanguage = vi.fn();

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
            getEffectiveFontSettings: () => ({ weight: 400 }), // Default settings
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
            linkFontToLanguage: mockLinkFontToLanguage,
            // THE CRITICAL FUNCTION
            updateLanguageSpecificSetting: mockUpdateLanguageSpecificSetting
        };

        useTypo.mockReturnValue(mockContext);

        // Render in French View
        render(<FontCards activeTab="fr-FR" selectedGroup="ALL" />);

        // 1. Locate the Font Card
        // It should be visible as it is mapped to fr-FR
        const fontCardTitle = screen.getByText('SharedFont');
        // Get the parent card container
        const cardContainer = fontCardTitle.closest('.relative.p-3'); // FontCard classes

        // 2. Click the 'fr-FR' tag to select it (Active Scope)
        // Find the language tag button
        // NOTE: Since activeTab is passed as 'fr-FR', the useEffect in FontCards automatically sets editScope to 'fr-FR'.
        // Clicking it again would TOGGLE it off to 'ALL'.
        // So we should NOT click it if we want to test scoped editing.
        const langTag = screen.getByText('fr-FR');
        // fireEvent.click(langTag); // REMOVED

        // 3. Verify NO Overlay blocks the inputs
        // "Inherited from Global" text should NOT be visible *within this card*
        const { within } = require('@testing-library/dom');
        const overlayText = within(cardContainer).queryByText('Inherited from Global');
        expect(overlayText).toBeNull();

        // 4. Find the Scale Slider (Size-Adjust)
        // It is an input[type="range"]
        const inputs = within(cardContainer).getAllByRole('slider');
        // Usually Scale is the first slider for fallback fonts
        const scaleSlider = inputs[0];

        // Simulate change
        fireEvent.change(scaleSlider, { target: { value: '110' } });

        // 5. Assert updateLanguageSpecificSetting is called
        // args: (fontId, scope, property, value)
        // font.id = 'font-global-1'
        // scope = 'fr-FR' 
        // property = 'scale'
        // value = 110 (as number or string depending on implementation)

        // Note: The slider value is string '110'. FontCards calls handleScopedUpdate('scale', '110').
        // handleScopedUpdate calls updateLanguageSpecificSetting.

        expect(mockUpdateLanguageSpecificSetting).toHaveBeenCalledWith(
            'font-global-1',
            'fr-FR',
            'scale',
            expect.anything()
        );
    });

    it('should show reset button when overridden and call linkFontToLanguage on click', () => {
        const globalFont = {
            id: 'font-global-1',
            type: 'fallback',
            fileName: 'SharedFont.ttf',
            name: 'SharedFont',
            fontObject: { numGlyphs: 100 },
            isClone: false,
            isLangSpecific: false
        };

        const mockFonts = [globalFont];

        // Simulate existing override for fr-FR (clone)
        // Global ID: font-global-1
        // Clone ID: font-clone-1
        const mockFallbackOverrides = {
            'fr-FR': { 'font-global-1': 'font-clone-1' },
            'es-ES': { 'font-global-1': 'font-global-1' }
        };

        const mockLinkFontToLanguage = vi.fn();

        const mockContext = {
            fonts: [...mockFonts, { ...globalFont, id: 'font-clone-1', isClone: true }],
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
            linkFontToLanguage: mockLinkFontToLanguage,
            updateLanguageSpecificSetting: vi.fn()
        };

        useTypo.mockReturnValue(mockContext);

        // Pass consolidatedIds to mimic real app behavior where clones are consolidated
        // The FontCard for 'SharedFont' will receive consolidatedIds=['font-global-1', 'font-clone-1']
        // To properly reproduce, we need to ensure FontCards logic (which computes consolidatedIds) is doing its job.
        // But here we are rendering FontCards (parent) which DOES use FontCard.
        // The key is that FontCards (the component) groups fonts.
        // If we provide both global and clone in `fonts` (mockFonts), FontCards *should* group them if they have same name.
        // globalFont name: 'SharedFont'
        // clone name: 'SharedFont'

        render(<FontCards activeTab="fr-FR" selectedGroup="ALL" />);

        // 1. Locate the Card
        // It might render the clone or global depending on sorting, but they are consolidated.
        const fontCardTitle = screen.getAllByText('SharedFont')[0];
        const cardContainer = fontCardTitle.closest('.relative.p-3');

        // 2. Find the language tag 'fr-FR'
        const langTag = within(cardContainer).getByText('fr-FR');

        // 3. Verify Reset Button Exists (it appears AS PART OF the tag button usually, or next to it)
        // Reset button has title "Reset to Global (All)"
        // Note: The Reset button is inside the tag button.
        const resetButton = within(langTag.closest('button')).getByTitle('Reset to Global (All)');
        expect(resetButton).toBeInTheDocument();

        // 4. Click Reset
        fireEvent.click(resetButton);

        // 5. Assert logic
        // Should link BACK to root font ('font-global-1')
        expect(mockLinkFontToLanguage).toHaveBeenCalledWith('font-global-1', 'fr-FR');
    });
});
