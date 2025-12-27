import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useEffect, useContext } from 'react';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

/**
 * Test Consumer Component
 * Acts as the "User" performing actions via the Context API.
 */
const LifecycleTestConsumer = ({ onReady, performAction }) => {
    const context = useContext(TypoContext);

    useEffect(() => {
        if (onReady) onReady(context);
    }, [context, onReady]);

    useEffect(() => {
        if (performAction) {
            performAction(context);
        }
    }, [performAction, context]);

    return null;
};

describe('Config Lifecycle Integration', () => {
    it('should correctly export JSON after a user updates header styles', async () => {
        let contextRef = null;

        // 1. Render the Provider and Consumer
        render(
            <TypoProvider>
                <LifecycleTestConsumer onReady={(ctx) => (contextRef = ctx)} />
            </TypoProvider>
        );

        expect(contextRef).toBeDefined();

        // 2. Simulate User Action: Change H1 scale
        // The user drags a slider, calling updateHeaderStyle
        await act(async () => {
            // updateHeaderStyle(tag, property, value, source)
            contextRef.updateHeaderStyle('h1', 'scale', 4.5, 'manual');
        });

        // Verify state update internally first
        expect(contextRef.headerStyles.h1.scale).toBe(4.5);
        expect(contextRef.headerOverrides.h1.scale).toBe(true);

        // 3. Simulate Export
        const exportedConfig = contextRef.getExportConfiguration();

        // 4. Verification: Check that the export contains the manual override
        expect(exportedConfig).toBeDefined();
        expect(exportedConfig.data.headerStyles.h1.scale).toBe(4.5);

        // Also verify metadata
        expect(exportedConfig.metadata.version).toBe(1);
        expect(exportedConfig.metadata.appName).toBe('localize-type');
    });
});
