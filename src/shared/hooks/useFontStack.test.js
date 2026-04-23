import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFontStack } from './useFontStack';
import { useFontManagement } from '../context/useFontManagement';
import { useLanguageMapping } from '../context/useLanguageMapping';
import { useTypography } from '../context/useTypography';

vi.mock('../context/useFontManagement');
vi.mock('../context/useLanguageMapping');
vi.mock('../context/useTypography');

describe('useFontStack', () => {
    beforeEach(() => {
        useTypography.mockReturnValue({
            getEffectiveFontSettingsForStyle: () => ({ lineHeight: 'normal' })
        });
    });

    it('does not exclude fallback fonts due to overrides from other languages', () => {
        const fonts = [
            { id: 'primary-font', type: 'primary', name: 'Brand Sans' },
            { id: 'fallback-fr', type: 'fallback', name: 'Fallback FR', fontUrl: 'blob:fr' },
            { id: 'fallback-global', type: 'fallback', name: 'Fallback Global', fontUrl: 'blob:global' }
        ];

        useFontManagement.mockReturnValue({
            fontStyles: {
                primary: {
                    fallbackFont: 'sans-serif',
                    fallbackFontOverrides: {
                        'fr-FR': 'fallback-fr'
                    },
                    primaryFontOverrides: {}
                }
            },
            getFontsForStyle: () => fonts
        });

        useLanguageMapping.mockReturnValue({
            getFallbackFontOverrideForStyle: () => null
        });

        const { result } = renderHook(() => useFontStack());

        const stack = result.current.buildFallbackFontStackForStyle('primary', 'en-US');
        const fallbackIds = stack
            .filter(item => item.fontId !== 'legacy')
            .map(item => item.fontId);

        expect(fallbackIds).toContain('fallback-fr');
        expect(fallbackIds).toContain('fallback-global');
    });

    it('still excludes and prioritizes mapped fallback font for the active language override', () => {
        const fonts = [
            { id: 'primary-font', type: 'primary', name: 'Brand Sans' },
            { id: 'fallback-fr', type: 'fallback', name: 'Fallback FR', fontUrl: 'blob:fr' },
            { id: 'fallback-global', type: 'fallback', name: 'Fallback Global', fontUrl: 'blob:global' }
        ];

        useFontManagement.mockReturnValue({
            fontStyles: {
                primary: {
                    fallbackFont: 'sans-serif',
                    fallbackFontOverrides: {
                        'fr-FR': 'fallback-fr'
                    },
                    primaryFontOverrides: {}
                }
            },
            getFontsForStyle: () => fonts
        });

        useLanguageMapping.mockReturnValue({
            getFallbackFontOverrideForStyle: () => 'fallback-fr'
        });

        const { result } = renderHook(() => useFontStack());

        const stack = result.current.buildFallbackFontStackForStyle('primary', 'fr-FR');
        const fallbackIds = stack
            .filter(item => item.fontId !== 'legacy')
            .map(item => item.fontId);

        expect(fallbackIds[0]).toBe('fallback-fr');
        expect(fallbackIds).toContain('fallback-global');
        expect(fallbackIds.filter(id => id === 'fallback-fr')).toHaveLength(1);
    });
});
