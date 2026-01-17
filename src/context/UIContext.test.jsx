
import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { UIProvider, useUI } from './UIContext';

// Helper component to expose Context values to tests
const TestConsumer = ({ onContext }) => {
    const context = useUI();
    useEffect(() => {
        onContext(context);
    }, [context, onContext]);
    return null;
};

describe('UIContext', () => {
    it('provides default values', () => {
        let contextValues;
        render(
            <UIProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </UIProvider>
        );

        expect(contextValues).toBeDefined();
        // Check some defaults from UIContext.jsx
        expect(contextValues.viewMode).toBeDefined(); // e.g. 'h1'
        expect(contextValues.textCase).toBe('none');
        expect(contextValues.gridColumns).toBe(1);
        expect(contextValues.colors.primary).toBeDefined();
    });

    it('updates viewMode', () => {
        let contextValues;
        render(
            <UIProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </UIProvider>
        );

        act(() => {
            contextValues.setViewMode('grid');
        });

        expect(contextValues.viewMode).toBe('grid');
    });

    it('updates textCase', () => {
        let contextValues;
        render(
            <UIProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </UIProvider>
        );

        act(() => {
            contextValues.setTextCase('uppercase');
        });

        expect(contextValues.textCase).toBe('uppercase');
    });

    it('updates gridColumns', () => {
        let contextValues;
        render(
            <UIProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </UIProvider>
        );

        act(() => {
            contextValues.setGridColumns(3);
        });

        expect(contextValues.gridColumns).toBe(3);
    });

    it('updates config tabs', () => {
        let contextValues;
        render(
            <UIProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </UIProvider>
        );

        act(() => {
            contextValues.setActiveConfigTab('LANGUAGES');
        });

        expect(contextValues.activeConfigTab).toBe('LANGUAGES');
    });

    it('updates visibility toggles', () => {
        let contextValues;
        render(
            <UIProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </UIProvider>
        );

        const initialGuide = contextValues.showAlignmentGuides;

        act(() => {
            contextValues.setShowAlignmentGuides(!initialGuide);
            contextValues.setShowFallbackColors(false);
        });

        expect(contextValues.showAlignmentGuides).toBe(!initialGuide);
        expect(contextValues.showFallbackColors).toBe(false);
    });
});
