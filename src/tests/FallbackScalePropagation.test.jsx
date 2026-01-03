
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
        const overrideMap = style.fallbackFontOverrides[langId];
        if (!overrideMap) return null;
        // In this test, we cloned 'base-font', so we look up the override for that ID
        const overrideFontId = overrideMap['base-font'];
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

    test('Cloned fallback should inherit Original Font Scale if set', () => {
        const TestComponentWithFontUpdate = () => {
            const {
                addLanguageSpecificFont,
                fontStyles,
                getEffectiveFontSettingsForStyle,
                addFallbackFont,
                updateFallbackFontOverride
            } = useContext(TypoContext);

            const styleId = 'primary';
            const style = fontStyles[styleId];
            const testLang = 'fr-FR';

            const getEffectiveScale = (langId) => {
                const overrideMap = style.fallbackFontOverrides[langId];
                if (!overrideMap) return null;
                const overrideFontId = overrideMap['base-font-2'];
                if (!overrideFontId) return null;

                const settings = getEffectiveFontSettingsForStyle(styleId, overrideFontId);
                return settings.scale;
            };

            return (
                <div>
                    <div data-testid="effective-scale-fr">{getEffectiveScale(testLang) ?? 'none'}</div>

                    <button
                        onClick={() => {
                            addFallbackFont({
                                id: 'base-font-2',
                                name: 'Base Font 2',
                                fileName: 'BaseFont2.ttf',
                                type: 'fallback',
                                scale: undefined
                            });
                        }}
                        data-testid="add-base-font-2"
                    >
                        Add Base Font 2
                    </button>

                    <button
                        onClick={() => addLanguageSpecificFont('base-font-2', testLang)}
                        data-testid="add-lang-font-2"
                    >
                        Add Lang Font 2
                    </button>

                    <button
                        onClick={() => updateFallbackFontOverride('base-font-2', 'scale', 125)}
                        data-testid="set-font-scale-125"
                    >
                        Set Font Scale 125
                    </button>
                </div>
            );
        };

        render(
            <TypoProvider>
                <TestComponentWithFontUpdate />
            </TypoProvider>
        );

        // 1. Add Base Font 2
        fireEvent.click(screen.getByTestId('add-base-font-2'));

        // 2. Clone it for FR
        fireEvent.click(screen.getByTestId('add-lang-font-2'));

        // Should default to 100
        expect(screen.getByTestId('effective-scale-fr')).toHaveTextContent('100');

        // 3. Update ORIGINAL Font Scale to 125
        fireEvent.click(screen.getByTestId('set-font-scale-125'));

        // 4. Verify Clone inherits 125
        expect(screen.getByTestId('effective-scale-fr')).toHaveTextContent('125');
    });
});
