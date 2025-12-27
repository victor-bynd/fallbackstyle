import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';
import LanguageCard from '../components/LanguageCard';
import { useContext, useEffect } from 'react';

// Setup component to inject state
const TestSetup = ({ onReady }) => {
    const context = useContext(TypoContext);

    useEffect(() => {
        // Setup initial fonts
        const primaryFont = {
            id: 'primary-font',
            type: 'primary',
            name: 'Primary Font',
            fileName: 'primary.ttf',
            fontObject: { charToGlyphIndex: () => 0 } // Mock font object
        };

        const fallbackFont = {
            id: 'fallback-font',
            type: 'fallback',
            name: 'Fallback Font',
            fileName: 'fallback.ttf',
            fontObject: { charToGlyphIndex: () => 1 } // Return 1 to indicate glyph exists
        };

        context.loadFont(primaryFont, 'primary.url', 'primary.ttf', {});
        // Add fallback via direct manipulation or helper? 
        // TypoContext doesn't expose setFonts directly globally, but loadFont sets primary.
        // addFallbackFont helper exists.

        context.setFonts(() => {
            // force clear and set for test
            return [primaryFont, fallbackFont];
        });

        onReady(context);
    }, [context, onReady]);

    return null;
};

// Language mock
const enLang = {
    id: 'en-US',
    name: 'English',
    pangram: 'The quick brown fox'
};

const HelperComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return <LanguageCard language={enLang} />;
};

describe('Live Preview Scale Double Application', () => {
    it('verifies if scale is applied to fontSize in LanguageCard', () => {
        let capturedContext;

        render(
            <TypoProvider>
                <HelperComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Setup fonts manually
        act(() => {
            const mockPrimaryFontObject = {
                charToGlyphIndex: (c) => (c === 'x' ? 0 : 1), // 'x' is missing in primary
                unitsPerEm: 1000,
                ascender: 800,
                descender: -200,
                tables: { os2: { sxHeight: 500, sCapHeight: 700 } }
            };

            // loadFont(fontObject, url, name, metadata)
            capturedContext.loadFont(mockPrimaryFontObject, 'url', 'Primary.ttf', {});
        });

        act(() => {
            const mockFallbackFontObject = {
                charToGlyphIndex: () => 1,
                unitsPerEm: 1000,
                ascender: 800,
                descender: -200
            };
            const fallback = {
                id: 'f1', type: 'fallback', name: 'Fallback',
                fontObject: mockFallbackFontObject,
                fileName: 'Fallback.ttf'
            };
            // Manually push to state since addFallbackFont appends
            capturedContext.setFonts(prev => [...prev, fallback]);
        });

        // 2. Set scale override on fallback
        act(() => {
            // Find the fallback font
            const fallback = capturedContext.fonts.find(f => f.type === 'fallback');
            // Use updateFallbackFontOverride
            capturedContext.updateFallbackFontOverride(fallback.id, 'scale', 50); // 50%
        });

        // 3. Inspect the fallback char 'x' (from pangram 'The quick brown fox')
        // 'x' is missing in primary (defined above), so it uses fallback.

        // Find elements. LanguageCard renders spans.
        // The pangram is 'The quick brown fox'. 'x' is the last char.
        // We can look for the text 'x'.
        const xSpan = screen.getByText('x');

        // 4. Assert styles
        // Expected: After fix, LanguageCard logic should NOT apply scale to fontSize.
        // It should rely on CSS size-adjust.
        // So fontSize should be 1em (ratio of base sizes, which are equal in this test).

        expect(xSpan.style.fontSize).toBe('1em');
    });
});
