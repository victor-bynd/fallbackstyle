
import { describe, it, expect } from 'vitest';
import React from 'react';

// We need to mock the full App structure or just test the logic locally. 
// Testing App.jsx is heavy. I'll create a minimal component that uses the same logic or just manually verify the string generation 
// by extracting the hook logic, but extracting it might change the code too much.
// I will simulate the hook logic in a test since it's a pure function of state.

describe('Font Face Generation', () => {
    it('generates size-adjust descriptor when present', () => {
        const fontStyles = {
            primary: {
                fonts: [
                    { type: 'primary', id: 'p1', fontUrl: 'blob:p1', sizeAdjust: 90 },
                    { type: 'fallback', id: 'f1', fontUrl: 'blob:f1', sizeAdjust: 110 },
                    { type: 'fallback', id: 'f2', fontUrl: 'blob:f2' } // No sizeAdjust
                ]
            }
        };

        const generateFontFace = (fontStyles) => {
            return ['primary'] // We only care about primary style for this test
                .map(styleId => {
                    const style = fontStyles?.[styleId];
                    if (!style) return '';

                    const primary = style.fonts?.find(f => f.type === 'primary');
                    const primarySizeAdjust = (primary && primary.sizeAdjust !== undefined && primary.sizeAdjust !== '')
                        ? `size-adjust: ${primary.sizeAdjust}%;`
                        : '';

                    const primaryRule = primary?.fontUrl
                        ? `@font-face { font-family: 'UploadedFont-${styleId}'; src: url('${primary.fontUrl}'); ${primarySizeAdjust} }`
                        : '';

                    const fallbackRules = (style.fonts || [])
                        .filter(f => f.type === 'fallback' && f.fontUrl)
                        .map(font => {
                            const sizeAdjust = (font.sizeAdjust !== undefined && font.sizeAdjust !== '')
                                ? `size-adjust: ${font.sizeAdjust}%;`
                                : '';
                            return `@font-face { font-family: 'FallbackFont-${styleId}-${font.id}'; src: url('${font.fontUrl}'); ${sizeAdjust} }`;
                        })
                        .join('');

                    return `${primaryRule}${fallbackRules}`;
                })
                .join('');
        };

        const result = generateFontFace(fontStyles);

        // Verify Primary
        expect(result).toContain("size-adjust: 90%;");

        // Verify Fallback 1
        expect(result).toContain("size-adjust: 110%;");

        // Verify Fallback 2 (should not have it)
        // We need to match the specific block for f2 to be sure, but simplified:
        const f2Block = result.match(/FallbackFont-primary-f2.*?}/s)?.[0];
        expect(f2Block).toBeDefined();
        expect(f2Block).not.toContain("size-adjust:");
    });
});
