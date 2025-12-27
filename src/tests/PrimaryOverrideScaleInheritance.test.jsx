
import React, { useContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TypoProvider, TypoContext } from '../context/TypoContext';

const TestComponent = () => {
    const {
        addLanguageSpecificPrimaryFont,
        fontStyles,
        setFontScales,
        getEffectiveFontSettingsForStyle,
        addFallbackFont // Need a font to exist first? addLanguageSpecificPrimaryFont clones Primary.
        // Primary exists by default in context? Yes, 'primary' style has one.
    } = useContext(TypoContext);

    const styleId = 'primary';
    const style = fontStyles[styleId];
    const testLang = 'fr-FR'; // French

    const getPrimaryOverrideScale = () => {
        const overrideFontId = style.primaryFontOverrides[testLang];
        if (!overrideFontId) return 'none';
        const settings = getEffectiveFontSettingsForStyle(styleId, overrideFontId);
        return settings.scale;
    };

    return (
        <div>
            <div data-testid="global-fallback-scale">{style.fontScales.fallback}</div>
            <div data-testid="global-active-scale">{style.fontScales.active}</div>
            <div data-testid="override-scale">{getPrimaryOverrideScale()}</div>

            <button
                onClick={() => addLanguageSpecificPrimaryFont(testLang)}
                data-testid="add-override"
            >
                Add Override
            </button>

            <button
                onClick={() => setFontScales(prev => ({ ...prev, fallback: 50 }))}
                data-testid="set-fallback-scale-50"
            >
                Set Fallback Scale 50
            </button>

            <button
                onClick={() => setFontScales(prev => ({ ...prev, active: 200 }))}
                data-testid="set-active-scale-200"
            >
                Set Active Scale 200
            </button>
        </div>
    );
};

describe('Primary Override Scale Inheritance', () => {
    test('Primary language overrides should inherit Global Fallback Scale, NOT Active Scale', async () => {
        render(
            <TypoProvider>
                <TestComponent />
            </TypoProvider>
        );

        // 1. Initial State
        expect(screen.getByTestId('global-fallback-scale')).toHaveTextContent('100');
        expect(screen.getByTestId('override-scale')).toHaveTextContent('none');

        // 2. Add Primary Override
        fireEvent.click(screen.getByTestId('add-override'));

        // 3. Set Fallback Scale to 50
        fireEvent.click(screen.getByTestId('set-fallback-scale-50'));

        // 4. Verify Inheritance
        // CURRENT BEHAVIOR (Bug): It uses Active Scale (100) or ignores Fallback (50).
        // DESIRED BEHAVIOR: It should use Fallback Scale (50).

        // Let's assert what we EXPECT (50). If it fails, we confirmed the bug.
        // If it's currently using Active, it would remain 100.
        await waitFor(() => {
            expect(screen.getByTestId('override-scale')).toHaveTextContent('50');
        });

        // 5. Ensure changing Active Scale doesn't affect it (optional, but good for confirmation)
        fireEvent.click(screen.getByTestId('set-active-scale-200'));
        await waitFor(() => {
            expect(screen.getByTestId('override-scale')).toHaveTextContent('50');
        });
    });
});
