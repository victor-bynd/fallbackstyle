import React, { useContext } from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';
import { useFontFaceStyles } from '../hooks/useFontFaceStyles';

const TestComponent = () => {
    const { addFallbackFont, setFontScales } = useContext(TypoContext);
    const styles = useFontFaceStyles();

    return (
        <div>
            <div data-testid="styles">{styles}</div>
            <button
                onClick={() => addFallbackFont({
                    id: 'system-arial',
                    name: 'Arial',
                    fileName: null,
                    fontUrl: null, // Simulate System Font
                    type: 'fallback'
                })}
                data-testid="add-system-font"
            >
                Add System Font
            </button>
            <button
                onClick={() => setFontScales(prev => ({ ...prev, fallback: 150 }))}
                data-testid="set-scale"
            >
                Set Scale
            </button>
        </div>
    );
};

describe('System Font Scaling', () => {
    test('System fonts should have @font-face rules with size-adjust when scaled', async () => {
        render(
            <TypoProvider>
                <TestComponent />
            </TypoProvider>
        );

        // 1. Add System Font
        screen.getByTestId('add-system-font').click();

        // 2. Set Scale
        screen.getByTestId('set-scale').click();

        // 3. Check Styles
        await waitFor(() => {
            const styleContent = screen.getByTestId('styles').textContent;

            expect(styleContent).toContain('FallbackFont-primary-system-arial');
            expect(styleContent).toContain('size-adjust: 150%');
        });
    });
});
