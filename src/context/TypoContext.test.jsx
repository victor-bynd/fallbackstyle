import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useContext, useEffect } from 'react';
import { TypoProvider } from './TypoContext';
import { TypoContext } from './TypoContextDefinition';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

// Helper component to expose Context values to tests
const TestConsumer = ({ onContext }) => {
    const context = useContext(TypoContext);
    useEffect(() => {
        onContext(context);
    }, [context, onContext]);
    return null;
};

describe('TypoContext', () => {
    it('provides default values', () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        expect(contextValues).toBeDefined();
        expect(contextValues.activeFontStyleId).toBe('primary');
        expect(contextValues.baseFontSize).toBe(60);
        expect(contextValues.fontStyles.primary).toBeDefined();
    });

    it('can set base font size', () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        act(() => {
            contextValues.setBaseFontSize(72);
        });

        expect(contextValues.baseFontSize).toBe(72);
    });

    it('can add a fallback font', () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        const newFont = {
            id: 'test-font',
            name: 'Test Font',
            type: 'fallback'
        };

        act(() => {
            contextValues.addFallbackFont(newFont);
        });

        const fonts = contextValues.fontStyles.primary.fonts;
        expect(fonts).toHaveLength(2); // Default primary + new fallback
        expect(fonts[1].id).toBe('test-font');
    });

    it('can remove a fallback font', () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        const newFont = {
            id: 'test-font',
            name: 'Test Font',
            type: 'fallback'
        };

        act(() => {
            contextValues.addFallbackFont(newFont);
        });

        expect(contextValues.fontStyles.primary.fonts).toHaveLength(2);

        act(() => {
            contextValues.removeFallbackFont('test-font');
        });

        expect(contextValues.fontStyles.primary.fonts).toHaveLength(1);
    });


    it('preserves font colors when reordering fallback fonts', () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        // 1. Initial State: Primary Font + 2 Fallbacks
        const font2 = { id: 'font-2', name: 'Font 2', type: 'fallback' };
        const font3 = { id: 'font-3', name: 'Font 3', type: 'fallback' };

        act(() => {
            contextValues.addFallbackFont(font2);
            contextValues.addFallbackFont(font3);
        });

        // Current state: [Primary, Font2, Font3]
        let fonts = contextValues.fontStyles.primary.fonts;
        expect(fonts).toHaveLength(3);

        const font2Id = fonts[1].id;
        const font2Color = fonts[1].color;
        const font3Id = fonts[2].id;
        const font3Color = fonts[2].color;

        expect(font2Color).not.toBe(font3Color);

        // 2. Reorder: Swap Font2 (Index 1) and Font3 (Index 2)
        act(() => {
            contextValues.reorderFonts(1, 2);
        });

        fonts = contextValues.fontStyles.primary.fonts;

        // Expected State: [Primary, Font3, Font2]

        // Index 1 should be Font3, with ITS original color
        expect(fonts[1].id).toBe(font3Id);
        expect(fonts[1].color).toBe(font3Color); // Color should persist

        // Index 2 should be Font2, with ITS original color
        expect(fonts[2].id).toBe(font2Id);
        expect(fonts[2].color).toBe(font2Color); // Color should persist
    });


    it('swaps colors when a fallback font replaces the primary font', () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        // 1. Initial State
        const primaryFont = contextValues.fontStyles.primary.fonts[0];
        const primaryColor = primaryFont.color;

        // 2. Add Fallback Font
        const newFont = {
            id: 'fallback-1',
            name: 'Fallback One',
            type: 'fallback'
        };

        act(() => {
            contextValues.addFallbackFont(newFont);
        });

        const fallbackColor = contextValues.fontStyles.primary.fonts[1].color;

        // 3. Swap Primary (0) and Fallback (1)
        act(() => {
            contextValues.reorderFonts(0, 1);
        });

        const fonts = contextValues.fontStyles.primary.fonts;

        // The *new* Primary (index 0, was Fallback) should now have the *Old Primary's* Color
        expect(fonts[0].id).toBe('fallback-1');
        expect(fonts[0].color).toBe(primaryColor);

        // The *Old* Primary (index 1, was Primary) should now have the *Old Fallback's* Color
        expect(fonts[1].id).toBe(primaryFont.id);
        expect(fonts[1].color).toBe(fallbackColor);
    });
});
