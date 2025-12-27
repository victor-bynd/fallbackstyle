import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';
import { useFontFaceStyles } from '../hooks/useFontFaceStyles';
import { useContext } from 'react';

// Component that consumes useFontFaceStyles and exposes context
const TestComponent = ({ onContext, onStyles }) => {
    const context = useContext(TypoContext);
    const styles = useFontFaceStyles();

    if (onContext) onContext(context);
    if (onStyles) onStyles(styles);

    return null;
};

describe('Primary Font Override Scaling', () => {
    it('creates a primary override that inherits primary scale, not fallback scale', () => {
        let capturedContext;
        let capturedStyles;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent
                    onContext={ctx => capturedContext = ctx}
                    onStyles={styles => capturedStyles = styles}
                />
            </TypoProvider>
        );

        // 1. Setup initial state: Primary Scale = 120%, Fallback Scale = 80%
        // We need to modify the fontScales directly or via setters
        capturedContext.setFontScales({ active: 120, fallback: 80 });

        rerender(
            <TypoProvider>
                <TestComponent
                    onContext={ctx => capturedContext = ctx}
                    onStyles={styles => capturedStyles = styles}
                />
            </TypoProvider>
        );

        // 2. Add a Primary Font (dummy)
        const primaryFont = {
            id: 'primary-font-1',
            type: 'primary',
            name: 'Primary Font',
            fontUrl: 'primary.woff',
            fontObject: { unitsPerEm: 1000 } // dummy object
            // no specific scale override
        };
        capturedContext.loadFont(primaryFont.fontObject, primaryFont.fontUrl, primaryFont.name, {});

        // 3. Create a Primary Override for a language (e.g. 'fr')
        // We simulate what addLanguageSpecificPrimaryFont does, but we can call it directly if exposed
        if (capturedContext.addLanguageSpecificPrimaryFont) {
            capturedContext.addLanguageSpecificPrimaryFont('fr');
        } else {
            throw new Error('addLanguageSpecificPrimaryFont is not exposed');
        }

        rerender(
            <TypoProvider>
                <TestComponent
                    onContext={ctx => capturedContext = ctx}
                    onStyles={styles => capturedStyles = styles}
                />
            </TypoProvider>
        );

        // 4. Verify the Override Font exists
        const overrideFontId = capturedContext.primaryFontOverrides['fr'];
        expect(overrideFontId).toBeDefined();

        const overrideFont = capturedContext.fonts.find(f => f.id === overrideFontId);
        expect(overrideFont).toBeDefined();
        expect(overrideFont.isPrimaryOverride).toBe(true);

        // 5. Check Effective Settings
        const effectiveSettings = capturedContext.getEffectiveFontSettings(overrideFontId);

        // CRITICAL CHECK: Should be using ACTIVE scale (120), not FALLBACK scale (80)
        expect(effectiveSettings.scale).toBe(120);

        // 6. Check Generated CSS (useFontFaceStyles)
        const css = capturedStyles;
        const fontRuleRegex = new RegExp(`font-family: 'FallbackFont-primary-${overrideFontId}'`, 'g');
        expect(css).toMatch(fontRuleRegex);

        // Check for size-adjust
        const sizeAdjustRegex = /size-adjust: 120%;/;
        expect(css).toMatch(sizeAdjustRegex);
    });
});
