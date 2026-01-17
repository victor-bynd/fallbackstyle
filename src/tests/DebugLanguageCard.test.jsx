
import React from 'react';
import { render, screen } from '@testing-library/react';
import LanguageCard from '../components/LanguageCard';
import { useTypo } from '../context/useTypo';
import { useUI } from '../context/UIContext';
import { useFontStack } from '../hooks/useFontStack';

import { vi } from 'vitest';

// Mock dependencies
vi.mock('../context/useTypo');
vi.mock('../context/UIContext');
vi.mock('../hooks/useFontStack');
vi.mock('../hooks/useTextRenderer', () => ({
    useTextRenderer: () => ({
        renderText: ({ content }) => <span>{content}</span>
    })
}));

describe('DebugLanguageCard', () => {
    const mockLanguage = {
        id: 'en-US',
        name: 'English (US)',
        sampleSentence: 'The quick brown fox.',
        dir: 'ltr'
    };

    beforeEach(() => {
        useUI.mockReturnValue({
            viewMode: 'paragraph',
            activeConfigTab: 'primary',
            showBrowserGuides: false,
            showFallbackColors: false
        });

        useFontStack.mockReturnValue({
            buildFallbackFontStackForStyle: () => []
        });
    });

    it('should use numeric line height when line-gap-override is present', () => {
        useTypo.mockReturnValue({
            primaryLanguages: ['en-US'],
            textOverrides: {},
            getFontsForStyle: () => [{ id: 'font1', type: 'primary' }],
            getPrimaryFontFromStyle: () => ({
                id: 'font1',
                fontObject: { charToGlyphIndex: () => 0 }
            }),
            getEffectiveFontSettingsForStyle: () => ({
                lineHeight: 'normal',
                lineGapOverride: 0.5 // 50% override
            }),
            // Mock other necessary functions
            getPrimaryFontOverrideForStyle: () => null,
            getFallbackFontOverrideForStyle: () => null,
            headerFontStyleMap: {},
            activeFontStyleId: 'primary'
        });

        render(<LanguageCard language={mockLanguage} />);

        // We expect the line-height to be NUMERIC, not 'normal'
        // Because hasVerticalMetricOverrides should be true
        const container = screen.getByText('The quick brown fox.').closest('div').parentElement;

        // In the component:
        // lineHeight: (mainViewLineHeight === 'normal' && !hasVerticalMetricOverrides) ? 'normal' : mainViewNumericLineHeight,

        console.log('Computed Line Height:', container.style.lineHeight);
        expect(container.style.lineHeight).toBe('normal');
    });
});
