import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';
import { useContext } from 'react';

// Component that exposes context for testing
const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return null;
};

describe('Font Independence', () => {
    it('ensures separate inputs for generic fallback and language-specific override even if same font', () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Add a generic fallback font
        const fallbackFontData = {
            id: 'system-font-1',
            type: 'fallback',
            name: 'System Font 1',
            fileName: 'System Font 1' // simulating system font or uploaded font
        };

        act(() => {
            capturedContext.addFallbackFont(fallbackFontData);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // Identify the generic fallback font in state
        // It might be after primary, so index 1
        const genericFallback = capturedContext.fonts.find(f => f.name === 'System Font 1' && !f.isLangSpecific);
        expect(genericFallback).toBeDefined();
        const genericFallbackId = genericFallback.id;

        // 2. Clone it as a language-specific override (e.g., for 'fr')
        act(() => {
            capturedContext.addLanguageSpecificFont(genericFallbackId, 'fr');
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 3. Identify the override font
        const overrideFontId = capturedContext.fallbackFontOverrides['fr'];
        expect(overrideFontId).toBeDefined();
        const overrideFont = capturedContext.fonts.find(f => f.id === overrideFontId);
        expect(overrideFont).toBeDefined();

        // 4. Assert IDs are different
        expect(genericFallbackId).not.toBe(overrideFontId);

        // 5. Modify generic fallback scale
        act(() => {
            capturedContext.updateFallbackFontOverride(genericFallbackId, 'scale', 150);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // Refresh references
        const updatedGeneric = capturedContext.fonts.find(f => f.id === genericFallbackId);
        const updatedOverride = capturedContext.fonts.find(f => f.id === overrideFontId);

        // 6. Assert independence
        expect(updatedGeneric.scale).toBe(150);
        expect(updatedOverride.scale).toBeUndefined(); // Should NOT have changed

        // 7. Modify override scale
        act(() => {
            capturedContext.updateFallbackFontOverride(overrideFontId, 'scale', 90);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // Refresh references
        const finalGeneric = capturedContext.fonts.find(f => f.id === genericFallbackId);
        const finalOverride = capturedContext.fonts.find(f => f.id === overrideFontId);

        // 8. Assert independence again
        expect(finalGeneric.scale).toBe(150);
        expect(finalOverride.scale).toBe(90);
    });
});
