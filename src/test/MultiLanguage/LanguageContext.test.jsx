import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { LanguageMappingProvider } from '../../shared/context/LanguageMappingContext';
import { useLanguageMapping } from '../../shared/context/useLanguageMapping';
import { FontManagementContext } from '../../shared/context/useFontManagement';

// Mock FontManagementContext
const mockFontContext = {
    fonts: [],
    activeFontStyleId: 'primary',
    fontStyles: {
        primary: {
            configuredLanguages: [],
            primaryLanguages: [],
            primaryFontOverrides: {},
            fallbackFontOverrides: {}
        }
    },
    updateStyleState: vi.fn((styleId, updater) => {
        // Simple mock implementation to simulate state update for testing if needed
        // For this test, we mostly care about visibleLanguageIds which is local to LanguageMappingContext
        if (typeof updater === 'function') {
            updater(mockFontContext.fontStyles.primary);
        }
    }),
    setFonts: vi.fn(),
};

// Test component to consume context
const TestComponent = ({ langId }) => {
    const {
        addConfiguredLanguage,
        removeConfiguredLanguage,
        isLanguageVisible
    } = useLanguageMapping();

    return (
        <div>
            <div data-testid="visibility">{isLanguageVisible(langId) ? 'VISIBLE' : 'HIDDEN'}</div>
            <button onClick={() => addConfiguredLanguage(langId)}>Add</button>
            <button onClick={() => removeConfiguredLanguage(langId)}>Remove</button>
        </div>
    );
};

describe('LanguageMappingContext - Removal Bug', () => {
    it('should remove language from visible languages when removed', async () => {
        const langId = 'es-ES';

        render(
            <FontManagementContext.Provider value={mockFontContext}>
                <LanguageMappingProvider>
                    <TestComponent langId={langId} />
                </LanguageMappingProvider>
            </FontManagementContext.Provider>
        );

        // Initial state should be hidden (or whatever default is, but we'll add it first)
        // Actually defaults are hardcoded in context, let's assume we start by adding it to be sure.

        // 1. Add the language
        const addButton = screen.getByText('Add');
        await act(async () => {
            addButton.click();
        });

        // Verify it's visible
        expect(screen.getByTestId('visibility')).toHaveTextContent('VISIBLE');

        // 2. Remove the language
        const removeButton = screen.getByText('Remove');
        await act(async () => {
            removeButton.click();
        });

        // 3. Verify it's HIDDEN
        // FAILURE EXPECTED HERE BEFORE FIX
        expect(screen.getByTestId('visibility')).toHaveTextContent('HIDDEN');
    });
});
