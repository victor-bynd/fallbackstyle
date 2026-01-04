import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { TypoProvider } from '../context/TypoContext';
import { useTypo } from '../context/useTypo';

// Test Component to access context
const TestComponent = ({ onReady }) => {
    const context = useTypo();
    React.useEffect(() => {
        if (onReady) onReady(context);
    }, [context, onReady]);
    return null;
};

// Better structure for context testing
const ContextConsumer = ({ testFn }) => {
    const context = useTypo();
    return (
        <button onClick={() => testFn(context)} data-testid="run-test">Run</button>
    );
};

describe('FontOverrideContext Logic (integrated)', () => {
    it('should allow partial inheritance (e.g. Override Weight, Inherit Scale)', async () => {
        let capturedContext;

        // Helper to grab fresh context
        const GetContext = () => {
            capturedContext = useTypo();
            return null;
        };

        const { rerender } = render(
            <TypoProvider>
                <GetContext />
            </TypoProvider>
        );

        // 1. Add Global Font (Scale 100)
        act(() => {
            capturedContext.addFallbackFont({
                id: 'global-1',
                fileName: 'Global.ttf',
                name: 'Global',
                type: 'fallback',
                scale: 100
            });
        });

        // 2. Clone for 'fr' by changing WEIGHT only
        // This triggers the "Clone Action" in updateLanguageSpecificSetting
        act(() => {
            capturedContext.updateLanguageSpecificSetting('global-1', 'fr', 'weightOverride', 700);
        });

        // Check clone created
        const cloneId = capturedContext.fallbackFontOverrides['fr']['global-1'];
        expect(cloneId).toBeTruthy();

        // 3. Change Global SCALE to 120
        act(() => {
            capturedContext.updateFallbackFontOverride('global-1', 'scale', 120);
        });

        // 4. Verify 'fr' Clone settings
        // Expectation: 
        // - Weight should be 700 (Local Override)
        // - Scale should be 120 (Inherited from Global because we didn't touch it locally)

        const effectiveSettings = capturedContext.getEffectiveFontSettings(cloneId);

        console.log('Effective Settings Scale:', effectiveSettings.scale);

        expect(effectiveSettings.weight).toBe(700);

        // BUG REPRODUCTION expect:
        // If the clone captured the scale=100 at creation time, this will be 100.
        // If inheritance works correctly, it should be 120.
        expect(effectiveSettings.scale).toBe(120);
    });
});
