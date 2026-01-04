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

describe('Font Card Navigation', () => {

    it('should call onSelectLanguage when clicking a language tag if activeTab is not ALL', () => {
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
            activeConfigTab: 'fr-FR'
        };

        useTypo.mockReturnValue(mockContext);

        const onSelectLanguageMock = vi.fn();

        render(
            <FontCard
                font={mockFont}
                isActive={true}
                activeTab="fr-FR" // Currently viewing French
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
                onSelectLanguage={onSelectLanguageMock}
            />
        );

        // Click on Spanish tag
        const esTag = screen.getByText('es-ES');
        fireEvent.click(esTag);

        // Should call onSelectLanguage with 'es-ES' because we are in 'fr-FR' view
        // and cannot see Spanish card otherwise
        expect(onSelectLanguageMock).toHaveBeenCalledWith('es-ES');
    });

    it('should call onSelectLanguage with ALL when clicking the ALL button if activeTab is not ALL', () => {
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
            activeConfigTab: 'fr-FR'
        };

        useTypo.mockReturnValue(mockContext);

        const onSelectLanguageMock = vi.fn();

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
                onSelectLanguage={onSelectLanguageMock}
            />
        );

        // Click on ALL tag
        const allTag = screen.getByText('ALL');
        fireEvent.click(allTag);

        expect(onSelectLanguageMock).toHaveBeenCalledWith('ALL');
    });
});
