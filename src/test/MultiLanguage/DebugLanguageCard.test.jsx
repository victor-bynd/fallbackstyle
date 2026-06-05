
import React from 'react';
import { render, screen } from '@testing-library/react';
import LanguageCard from '../../apps/multi-language/components/LanguageCard';
import { useFontManagement } from '../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../shared/context/useLanguageMapping';
import { useTypography } from '../../shared/context/useTypography';
import { useUI } from '../../shared/context/UIContext';
import { useFontStack } from '../../shared/hooks/useFontStack';
import { mockUseFontManagement, mockUseLanguageMapping, mockUseTypography } from '../test-utils';

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

describe('DebugLanguageCard', () => {
    const mockLanguage = {
        id: 'en-US',
        name: 'English (US)',
        sampleSentence: 'The quick brown fox.',
        dir: 'ltr'
    };

    beforeEach(() => {
        useFontManagement.mockReturnValue(mockUseFontManagement({
            getFontsForStyle: () => [{ id: 'font1', type: 'primary' }],
            getPrimaryFontFromStyle: () => ({
                id: 'font1',
                fontObject: { charToGlyphIndex: () => 0 }
            }),
            activeFontStyleId: 'primary'
        }));
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            getPrimaryFontOverrideForStyle: () => null,
            getFallbackFontOverrideForStyle: () => null
        }));
        useTypography.mockReturnValue(mockUseTypography({
            getEffectiveFontSettingsForStyle: () => ({
                lineHeight: 'normal',
                lineGapOverride: 0.5
            }),
            headerFontStyleMap: {}
        }));
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

    it('preserves normal line height when normal is explicitly configured', () => {
        render(<LanguageCard language={mockLanguage} />);

        const container = screen.getByText('The quick brown fox.').closest('div').parentElement;
        expect(container.style.lineHeight).toBe('normal');
    });
});
