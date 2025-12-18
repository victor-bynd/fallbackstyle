import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useContext, useEffect } from 'react';
import { TypoProvider, TypoContext } from './TypoContext';

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
});
