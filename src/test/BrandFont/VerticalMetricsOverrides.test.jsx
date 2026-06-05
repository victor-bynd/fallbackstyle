import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { FontManagementProvider } from '../../shared/context/FontManagementContext';
import { useFontManagement } from '../../shared/context/useFontManagement';
import { TypographyProvider } from '../../shared/context/TypographyContext';
import { useTypography } from '../../shared/context/useTypography';

const TestComponent = ({ onContext }) => {
    const fontManagement = useFontManagement();
    const typography = useTypography();

    useEffect(() => {
        onContext({ fontManagement, typography });
    }, [fontManagement, typography, onContext]);

    return null;
};

const renderWithProviders = (onContext) => render(
    <FontManagementProvider>
        <TypographyProvider>
            <TestComponent onContext={onContext} />
        </TypographyProvider>
    </FontManagementProvider>
);

describe('Vertical Metrics Overrides', () => {
    it('initializes with undefined overrides', () => {
        let capturedContext;
        renderWithProviders(ctx => {
            capturedContext = ctx;
        });

        const fonts = capturedContext.fontManagement.fonts;
        expect(fonts[0].ascentOverride).toBeUndefined();
        expect(fonts[0].descentOverride).toBeUndefined();
    });

    it('updates ascentOverride via updateFontProperty', () => {
        let capturedContext;
        renderWithProviders(ctx => {
            capturedContext = ctx;
        });

        const sampleFont = {
            id: 'test-font-ascent',
            type: 'fallback',
            name: 'Test Font Ascent'
        };

        act(() => {
            capturedContext.fontManagement.addFallbackFont(sampleFont);
        });

        act(() => {
            capturedContext.fontManagement.updateFontProperty(sampleFont.id, 'ascentOverride', 1.2);
        });

        const updatedFont = capturedContext.fontManagement.fonts.find(f => f.id === sampleFont.id);
        expect(updatedFont.ascentOverride).toBe(1.2);

        const effective = capturedContext.typography.getEffectiveFontSettings(sampleFont.id);
        expect(effective.ascentOverride).toBe(1.2);
    });

    it('updates descentOverride via updateFontProperty', () => {
        let capturedContext;
        renderWithProviders(ctx => {
            capturedContext = ctx;
        });

        const sampleFont = {
            id: 'test-font-descent',
            type: 'fallback',
            name: 'Test Font Descent'
        };

        act(() => {
            capturedContext.fontManagement.addFallbackFont(sampleFont);
        });

        act(() => {
            capturedContext.fontManagement.updateFontProperty(sampleFont.id, 'descentOverride', 0.8);
        });

        const updatedFont = capturedContext.fontManagement.fonts.find(f => f.id === sampleFont.id);
        expect(updatedFont.descentOverride).toBe(0.8);

        const effective = capturedContext.typography.getEffectiveFontSettings(sampleFont.id);
        expect(effective.descentOverride).toBe(0.8);
    });

    it('clears overrides when updating with undefined', () => {
        let capturedContext;
        renderWithProviders(ctx => {
            capturedContext = ctx;
        });

        const sampleFont = {
            id: 'test-font-reset',
            type: 'fallback',
            name: 'Test Font Reset'
        };

        act(() => {
            capturedContext.fontManagement.addFallbackFont(sampleFont);
        });

        act(() => {
            capturedContext.fontManagement.updateFontProperty(sampleFont.id, 'ascentOverride', 1.5);
            capturedContext.fontManagement.updateFontProperty(sampleFont.id, 'descentOverride', 0.5);
        });

        act(() => {
            capturedContext.fontManagement.updateFontProperty(sampleFont.id, 'ascentOverride', undefined);
            capturedContext.fontManagement.updateFontProperty(sampleFont.id, 'descentOverride', undefined);
        });

        const updatedFont = capturedContext.fontManagement.fonts.find(f => f.id === sampleFont.id);
        expect(updatedFont.ascentOverride).toBeUndefined();
        expect(updatedFont.descentOverride).toBeUndefined();
    });
});
