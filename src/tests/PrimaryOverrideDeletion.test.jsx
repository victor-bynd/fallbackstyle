
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoContext, TypoProvider } from '../context/TypoContext';
import { useContext } from 'react';

const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return null;
};

describe('Primary Override Deletion', () => {
    it('clears primary override and ensures global primary is returned', async () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Setup: Load a global primary font
        await act(async () => {
            const primaryFont = {
                unitsPerEm: 1000,
                charToGlyphIndex: () => 1
            };
            capturedContext.loadFont(primaryFont, 'primary.woff', 'Primary Font', {});
        });

        // Verify global primary exists
        let globalPrimary = capturedContext.getPrimaryFontFromStyle('primary');
        expect(globalPrimary).toBeDefined();
        expect(globalPrimary.type).toBe('primary');

        // 2. Add override for 'zh'
        await act(async () => {
            capturedContext.addLanguageSpecificPrimaryFont('zh');
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // Verify override exists
        let overrideId = capturedContext.getPrimaryFontOverrideForStyle('primary', 'zh');
        expect(overrideId).toBeTruthy();

        // 3. Delete the override
        await act(async () => {
            capturedContext.clearPrimaryFontOverride('zh');
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 4. Verify override is gone
        overrideId = capturedContext.getPrimaryFontOverrideForStyle('primary', 'zh');
        expect(overrideId).toBeFalsy();

        // 5. Verify getPrimaryFontFromStyle still returns global primary
        globalPrimary = capturedContext.getPrimaryFontFromStyle('primary');
        expect(globalPrimary).toBeDefined();
        expect(globalPrimary.type).toBe('primary');
        expect(globalPrimary.fontObject).toBeDefined();

        // 6. Verify fonts array does not contain the deleted font
        // Note: we don't know the exact ID of the deleted font unless we stored it,
        // but we can check count or check types.
        const fonts = capturedContext.getFontsForStyle('primary');
        const primaryCount = fonts.filter(f => f.type === 'primary').length;
        const overridesCount = fonts.filter(f => f.isPrimaryOverride).length;

        expect(primaryCount).toBe(1); // Only the global primary
        expect(overridesCount).toBe(0); // No overrides
    });

    it('removing the font file also clears the primary override mapping', async () => {
        let capturedContext;
        render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const langId = 'fr';

        // 1. Add override
        await act(async () => {
            capturedContext.addLanguageSpecificPrimaryFont(langId);
        });

        // 2. Get the override font ID
        let overrideId = capturedContext.getPrimaryFontOverrideForStyle('primary', langId);
        expect(overrideId).toBeTruthy();

        // 3. Remove the font file directly (simulating clicking "Remove" on the font card)
        await act(async () => {
            capturedContext.removeFallbackFont(overrideId);
        });

        // 4. Verify the override mapping is ALSO gone
        overrideId = capturedContext.getPrimaryFontOverrideForStyle('primary', langId);
        expect(overrideId).toBeFalsy();
    });
});
