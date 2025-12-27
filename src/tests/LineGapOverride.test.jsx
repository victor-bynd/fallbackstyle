
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

describe('Line Gap Override', () => {
    it('initializes with undefined lineGapOverride', () => {
        let capturedContext;
        render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const fonts = capturedContext.fonts;
        expect(fonts[0].lineGapOverride).toBeUndefined();
    });

    it('updates lineGapOverride via updateFallbackFontOverride', async () => {
        let capturedContext;
        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // Add a fallback font first
        const sampleFont = {
            id: 'test-font-1',
            type: 'fallback',
            name: 'Test Font'
        };

        // We can't easily await state updates in this pattern without act(), 
        // but TypoProvider updates are sync-ish in tests usually.
        // Let's rely on internal helpers exposed in context.

        // However, accessing setFonts directly via context is possible.
        // Better: trigger the update function and re-read context.

        // 1. Add font
        capturedContext.addFallbackFont(sampleFont);

        // Rerender to get updated context
        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const fontId = 'test-font-1';

        // 2. Update lineGapOverride
        const newVal = 0.5; // 50%
        capturedContext.updateFallbackFontOverride(fontId, 'lineGapOverride', newVal);

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const updatedFont = capturedContext.fonts.find(f => f.id === fontId);
        expect(updatedFont.lineGapOverride).toBe(newVal);

        // 3. Verify effective settings
        const effective = capturedContext.getEffectiveFontSettings(fontId);
        expect(effective.lineGapOverride).toBe(newVal);
    });
});
