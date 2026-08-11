import React from 'react';
import { render, screen } from '@testing-library/react';
import LanguageCard from '../../apps/multi-language/components/LanguageCard';
import { useFontManagement } from '../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../shared/context/useLanguageMapping';
import { useTypography } from '../../shared/context/useTypography';
import { useUI } from '../../shared/context/UIContext';
import { useFontStack } from '../../shared/hooks/useFontStack';
import { mockUseFontManagement, mockUseLanguageMapping, mockUseTypography, mockUseUI } from '../test-utils';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../shared/context/useFontManagement');
vi.mock('../../shared/context/useLanguageMapping');
vi.mock('../../shared/context/useTypography');
vi.mock('../../shared/context/UIContext');
vi.mock('../../shared/hooks/useFontStack');
vi.mock('../../shared/hooks/useTextRenderer', () => ({
    useTextRenderer: () => ({
        renderText: ({ content }) => <span>{content}</span>
    })
}));

describe('LanguageCard', () => {
    const mockLanguage = {
        id: 'en-US',
        name: 'English (US)',
        sampleSentence: 'The quick brown fox.',
        dir: 'ltr'
    };

    beforeEach(() => {
        useFontManagement.mockReturnValue(mockUseFontManagement({
            getFontsForStyle: () => [],
            getPrimaryFontFromStyle: () => ({
                fontObject: {
                    charToGlyphIndex: () => 0
                }
            }),
            activeFontStyleId: 'primary'
        }));
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            getPrimaryFontOverrideForStyle: () => null,
            getFallbackFontOverrideForStyle: () => null,
        }));
        useTypography.mockReturnValue(mockUseTypography({
            getEffectiveFontSettingsForStyle: () => ({ lineHeight: 'normal' }),
            headerFontStyleMap: {},
        }));

        useUI.mockReturnValue(mockUseUI());
        useFontStack.mockReturnValue({
            buildFallbackFontStackForStyle: () => []
        });
    });

    it('should render language name and sample text', () => {
        render(<LanguageCard language={mockLanguage} />);
        expect(screen.getByText('English (US)')).toBeInTheDocument();
        expect(screen.getByText('The quick brown fox.')).toBeInTheDocument();
    });

    it('preserves normal line height when normal is explicitly configured', () => {
        useFontManagement.mockReturnValue(mockUseFontManagement({
            getFontsForStyle: () => [{ id: 'font1', type: 'primary' }],
            getPrimaryFontFromStyle: () => ({
                id: 'font1',
                fontObject: { charToGlyphIndex: () => 0 }
            }),
            activeFontStyleId: 'primary'
        }));
        useTypography.mockReturnValue(mockUseTypography({
            getEffectiveFontSettingsForStyle: () => ({
                lineHeight: 'normal',
                lineGapOverride: 0.5
            }),
            headerFontStyleMap: {},
        }));

        render(<LanguageCard language={mockLanguage} />);
        const container = screen.getByText('The quick brown fox.').closest('div').parentElement;
        expect(container.style.lineHeight).toBe('normal');
    });

    it('keeps the text container at the style base size when the primary face is size-adjusted', () => {
        const fonts = [
            { id: 'primary', type: 'primary', fontObject: { charToGlyphIndex: () => 1 } },
            {
                id: 'lang-primary-fr-FR',
                type: 'primary',
                isPrimaryOverride: true,
                fontObject: { charToGlyphIndex: () => 1 }
            },
            { id: 'fallback-fr', type: 'fallback', fontObject: { charToGlyphIndex: () => 1 } }
        ];

        useFontManagement.mockReturnValue(mockUseFontManagement({
            fontStyles: {
                primary: {
                    baseFontSize: 16,
                    fonts
                }
            },
            getFontsForStyle: () => fonts,
            getPrimaryFontFromStyle: () => fonts[0],
            activeFontStyleId: 'primary'
        }));
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            primaryLanguages: [],
            getPrimaryFontOverrideForStyle: () => 'lang-primary-fr-FR',
            getFallbackFontOverrideForStyle: () => 'fallback-fr'
        }));
        useTypography.mockReturnValue(mockUseTypography({
            getEffectiveFontSettingsForStyle: (_styleId, fontId) => ({
                baseFontSize: fontId === 'lang-primary-fr-FR' ? 12 : 16,
                scale: fontId === 'lang-primary-fr-FR' ? 80 : 100,
                lineHeight: 'normal'
            })
        }));

        render(<LanguageCard language={{ ...mockLanguage, id: 'fr-FR', name: 'French' }} />);

        const container = screen.getByText('The quick brown fox.').closest('div').parentElement;
        expect(container.style.fontSize).toBe('16px');
    });
});
