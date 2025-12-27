
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';
import { useContext } from 'react';

// Simple component to extract context for testing
const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    onContext(context);
    return null;
};

describe('Vertical Metrics Overrides', () => {
    it('initializes with undefined overrides', () => {
        let capturedContext;
        render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const fonts = capturedContext.fonts;
        expect(fonts[0].ascentOverride).toBeUndefined();
        expect(fonts[0].descentOverride).toBeUndefined();
    });

    it('updates ascentOverride via updateFallbackFontOverride', () => {
        let capturedContext;
        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const sampleFont = {
            id: 'test-font-ascent',
            type: 'fallback',
            name: 'Test Font Ascent'
        };
        capturedContext.addFallbackFont(sampleFont);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const fontId = 'test-font-ascent';
        const newVal = 1.2; // 120%
        capturedContext.updateFallbackFontOverride(fontId, 'ascentOverride', newVal);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const updatedFont = capturedContext.fonts.find(f => f.id === fontId);
        expect(updatedFont.ascentOverride).toBe(newVal);

        const effective = capturedContext.getEffectiveFontSettings(fontId);
        expect(effective.ascentOverride).toBe(newVal);
    });

    it('updates descentOverride via updateFallbackFontOverride', () => {
        let capturedContext;
        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const sampleFont = {
            id: 'test-font-descent',
            type: 'fallback',
            name: 'Test Font Descent'
        };
        capturedContext.addFallbackFont(sampleFont);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const fontId = 'test-font-descent';
        const newVal = 0.8; // 80%
        capturedContext.updateFallbackFontOverride(fontId, 'descentOverride', newVal);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const updatedFont = capturedContext.fonts.find(f => f.id === fontId);
        expect(updatedFont.descentOverride).toBe(newVal);

        const effective = capturedContext.getEffectiveFontSettings(fontId);
        expect(effective.descentOverride).toBe(newVal);
    });

    it('clears overrides when resetting fallback font', () => {
        let capturedContext;
        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const sampleFont = {
            id: 'test-font-reset',
            type: 'fallback',
            name: 'Test Font Reset'
        };
        capturedContext.addFallbackFont(sampleFont);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const fontId = 'test-font-reset';
        capturedContext.updateFallbackFontOverride(fontId, 'ascentOverride', 1.5);
        capturedContext.updateFallbackFontOverride(fontId, 'descentOverride', 0.5);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        capturedContext.resetFallbackFontOverrides(fontId);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const updatedFont = capturedContext.fonts.find(f => f.id === fontId);
        expect(updatedFont.ascentOverride).toBeUndefined();
        expect(updatedFont.descentOverride).toBeUndefined();
    });
});
