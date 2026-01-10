import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React, { useEffect } from 'react';
import { useTypo } from '../context/useTypo';
import { TypoProvider } from '../context/TypoContext';
import { UIProvider } from '../context/UIContext';

vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        saveConfig: vi.fn(),
        loadConfig: vi.fn().mockResolvedValue({}),
        clearConfig: vi.fn(),
        initDB: vi.fn().mockResolvedValue(),
    }
}));

// We need to test TypoContext STATE, not just UI.
// So we'll creating a test component that uses useTypo and exposes state for verification.

const TestComponent = ({ onState }) => {
    const {
        loadFont,
        batchAddFontsAndMappings,
        addPrimaryLanguageOverrides,
        togglePrimaryLanguage,
        fontObject,
        fonts,
        primaryFontOverrides,
        fallbackFontOverrides
    } = useTypo();

    useEffect(() => {
        onState({
            fonts,
            primaryFontOverrides,
            fallbackFontOverrides,
            fontObject
        });
    }, [fonts, primaryFontOverrides, fallbackFontOverrides, fontObject]);

    return (
        <div>Test Component</div>
    );
};

const mockFont = {
    names: { fontFamily: { en: 'MyFont' } },
    tables: { head: { style: 0 } }
};

describe('Start with Fonts Flow Reproduction', () => {
    test('should not corrupt Global Primary Font when mapped explicitly', async () => {
        let currentState = {};
        const onState = (s) => { currentState = s; };

        render(
            <UIProvider>
                <TypoProvider>
                    <TestComponent onState={onState} />
                </TypoProvider>
            </UIProvider>
        );

        // Simulation of FontUploader logic

        // 1. Load Primary Font
        const primaryFontData = {
            id: 'font-1',
            fileName: 'Primary.ttf',
            name: 'Primary.ttf',
            color: '#000000'
        };

        const fallbackFontData = {
            id: 'font-2',
            fileName: 'Secondary.ttf',
            name: 'Secondary.ttf'
        };

        // Access context methods via a wrapper or by mocking? 
        // We can't access them directly outside of component.
        // We need to trigger actions.

        // Let's modify TestComponent to accept a "scenario" prop or expose methods?
        // Easier: Just put the scenario inside the component in a useEffect or use a button.
    });
});

// Refined Test Setup
function ScenarioRunner({ scenario, onCheck }) {
    const context = useTypo();

    useEffect(() => {
        if (scenario) {
            scenario(context).then(() => {
                onCheck(context);
            });
        }
    }, [scenario]); // Run once scenario provided

    return null;
}

test('Start with Fonts Logic Flow', async () => {
    let finalContext;

    const scenario = async (context) => {
        const { loadFont, batchAddFontsAndMappings, addPrimaryLanguageOverrides, togglePrimaryLanguage } = context;

        // 1. Load Primary Font (simulating FontUploader)
        loadFont(mockFont, 'blob:url1', 'Primary.ttf', { axes: {}, isVariable: false });

        // 2. Batch Add (simulating FontUploader handleModalConfirm)
        // Mapped Primary.ttf to 'en-US'
        const fontsToRegister = [
            // Fixed FontUploader does NOT send Primary font here
            {
                id: 'font-2',
                fileName: 'Secondary.ttf',
                name: 'Secondary.ttf',
                type: 'fallback',
                fontObject: mockFont
            }
        ];

        const mappings = {
            'en-US': 'Primary.ttf', // Explicit mapping of primary font
            'fr-FR': 'Secondary.ttf'
        };

        const selectedPrimaryLanguages = ['en-US'];

        // Core Issue Step: 
        batchAddFontsAndMappings({
            fonts: fontsToRegister,
            mappings,
            languageIds: ['en-US', 'fr-FR']
        });

        // 3. Primary Overrides
        addPrimaryLanguageOverrides(selectedPrimaryLanguages);
        togglePrimaryLanguage('en-US');
    };

    render(
        <UIProvider>
            <TypoProvider>
                <TestComponent onState={(s) => { finalContext = s; }} />
                <ScenarioRunner
                    scenario={scenario}
                    onCheck={() => { }} // No-op, we rely on TestComponent logic
                />
            </TypoProvider>
        </UIProvider>
    );

    // Wait for updates (simulating React ticks)
    await new Promise(r => setTimeout(r, 200));

    console.log('FONTS:', JSON.stringify(finalContext.fonts.map(f => ({ name: f.fileName, type: f.type, id: f.id }))));

    // Assertions
    // Verify we have Global Primary and its Clone (from Primary Override)
    // The previous bug was Global Primary ITSELF becoming Lang Specific.
    const primaryFonts = finalContext.fonts.filter(f => f.fileName === 'Primary.ttf');
    expect(primaryFonts.length).toBe(2);

    const globalPrimary = primaryFonts.find(f => !f.isLangSpecific);
    const clonePrimary = primaryFonts.find(f => f.isLangSpecific);

    expect(globalPrimary).toBeDefined();
    expect(clonePrimary).toBeDefined();
    expect(globalPrimary.type).toBe('primary');

    // Check mapping uses Global ID (not clone)
    expect(finalContext.fallbackFontOverrides['en-US']).toBe(globalPrimary.id);
});
