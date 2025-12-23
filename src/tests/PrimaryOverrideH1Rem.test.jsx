import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoContext, TypoProvider } from '../context/TypoContext';
import { useContext } from 'react';

const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return null;
};

describe('Primary Override H1 Rem', () => {
    it('allows setting h1Rem on a primary override font', async () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Add a primary font
        const primaryFont = {
            id: 'primary-font-1',
            type: 'primary',
            name: 'Primary Font',
            fontUrl: 'primary.woff',
            fontObject: { unitsPerEm: 1000 }
        };

        await act(async () => {
            capturedContext.loadFont(primaryFont.fontObject, primaryFont.fontUrl, primaryFont.name, {});
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 2. Add a primary override for 'fr'
        await act(async () => {
            capturedContext.addLanguageSpecificPrimaryFont('fr');
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const overrideId = capturedContext.primaryFontOverrides['fr'];
        expect(overrideId).toBeDefined();

        // 3. Update h1Rem on the override
        await act(async () => {
            capturedContext.updateFallbackFontOverride(overrideId, 'h1Rem', 4.5);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 4. Verify h1Rem is set
        const overrideFont = capturedContext.fonts.find(f => f.id === overrideId);
        expect(overrideFont.h1Rem).toBe(4.5);

        // 5. Verify it persists via updateFallbackFontOverride (which is what FontTabs uses)
        // (Step 3 already used updateFallbackFontOverride, ensuring it works for primary overrides too)
    });
});
