
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';
import { useContext } from 'react';

// Test component to interact with context
const TestComponent = () => {
    const {
        addLanguageSpecificFont,
        fontStyles,
        setFontScales,
        getEffectiveFontSettingsForStyle,
        addFallbackFont
    } = useContext(TypoContext);

    const styleId = 'primary';
    const style = fontStyles[styleId];
    // We'll use 'ru-RU' as our test language
    const testLang = 'ru-RU';

    // Helper to get effective scale for the language-specific override
    const getEffectiveScale = (langId) => {
        const overrideFontId = style.fallbackFontOverrides[langId];
        if (!overrideFontId) return null;
        const settings = getEffectiveFontSettingsForStyle(styleId, overrideFontId);
        return settings.scale;
    };

    return (
        <div>
            <div data-testid="global-scale">{style.fontScales.fallback}</div>
            <div data-testid="effective-scale-ru">{getEffectiveScale(testLang) ?? 'none'}</div>

            <button
                onClick={() => {
                    // Add a dummy fallback font first so we have something to clone
                    addFallbackFont({
                        id: 'base-font',
                        name: 'Base Font',
                        fileName: 'BaseFont.ttf',
                        type: 'fallback',
                        scale: undefined // Ensure it starts with no explicit scale
                    });
                }}
                data-testid="add-base-font"
            >
                Add Base Font
            </button>

            <button
                onClick={() => addLanguageSpecificFont('base-font', testLang)}
                data-testid="add-lang-font"
            >
                Add Lang Font
            </button>

            <button
                onClick={() => setFontScales(prev => ({ ...prev, fallback: 150 }))}
                data-testid="set-global-scale-150"
            >
                Set Scale 150
            </button>
        </div>
    );
};

describe('Fallback Scale Propagation', () => {
    test('Language-specific fallback should inherit Global Scale Adjust if not overridden', () => {
        render(
            <TypoProvider>
                <TestComponent />
            </TypoProvider>
        );

        // 1. Initial State
        expect(screen.getByTestId('global-scale')).toHaveTextContent('100');
        expect(screen.getByTestId('effective-scale-ru')).toHaveTextContent('none');

        // 2. Add Base Font
        fireEvent.click(screen.getByTestId('add-base-font'));

        // 3. Add Language Specific Font (clone of base)
        fireEvent.click(screen.getByTestId('add-lang-font'));

        // Should inherit default 100
        expect(screen.getByTestId('effective-scale-ru')).toHaveTextContent('100');

        // 4. Update Global Scale
        fireEvent.click(screen.getByTestId('set-global-scale-150'));

        // 5. Verify Inheritance
        // This is the key assertion: Does it show 150?
        expect(screen.getByTestId('global-scale')).toHaveTextContent('150');
        expect(screen.getByTestId('effective-scale-ru')).toHaveTextContent('150');
    });
});
