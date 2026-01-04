
import React, { useEffect } from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { TypoProvider } from '../context/TypoContext';
import { useTypo } from '../context/useTypo';
import { vi } from 'vitest';

// Mock FontLoader services to prevent actual network/fs calls
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));

// Mock ConfigService and PersistenceService
vi.mock('../services/ConfigService', () => ({
    ConfigService: {
        loadConfig: vi.fn().mockResolvedValue({}),
        saveConfig: vi.fn().mockResolvedValue(true)
    }
}));
vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        saveFontToDisk: vi.fn(),
        getFontsFromDisk: vi.fn().mockResolvedValue([])
    }
}));

const TestConsumer = ({ onReady }) => {
    const context = useTypo();
    useEffect(() => {
        onReady(context);
    }, [context, onReady]);
    return null;
};

describe('TypoContext - Primary Font Overrides Integration', () => {

    it('should map primary font to correct overrides map', async () => {
        let capturedContext;

        render(
            <TypoProvider>
                <TestConsumer onReady={(ctx) => capturedContext = ctx} />
            </TypoProvider>
        );

        await waitFor(() => expect(capturedContext).toBeDefined());

        // 1. Initial State Check
        // Expect default primary font
        expect(capturedContext.activeFont).toBe('primary');
        expect(capturedContext.primaryFontOverrides).toEqual({});

        // Find Primary Font ID
        const primaryFontId = capturedContext.fonts.find(f => f.type === 'primary').id;
        expect(primaryFontId).toBeDefined();

        // 2. Assign Primary Font to 'fr-FR'
        // This is what happens when user clicks map on Primary Card > Selects 'French'
        capturedContext.assignFontToMultipleLanguages(primaryFontId, ['fr-FR']);

        // Wait/Check for update (React state update is async, but in test effect might be fast enough or we wait)
        // Since we captured the context reference *before* the update, the reference 'capturedContext' object ITSELF won't mutate deeply if it's new object, 
        // but the hook might re-render TestConsumer and update capturedContext.
        // But TestConsumer calls onReady every render.

        // Use a wrapper to wait for the change
        await waitFor(() => {
            expect(capturedContext.primaryFontOverrides['fr-FR']).toBe(primaryFontId);
        });

        // 3. Verify it is NOT in fallback overrides
        expect(capturedContext.fallbackFontOverrides['fr-FR']).toBeUndefined();

        // 4. Verify it was added to Configured Languages
        // (assignFontToMultipleLanguages logic adds to configuredLanguages)
        // Note: configuredLanguages isn't directly exposed in context return usually unless I look at code.
        // Let's check TypoContext.jsx export again... 
        // It exports `assignedLanguageIds`? No, let's verify keys.
        // `capturedContext` has `configuredLanguages`? 
        // Checking TypoContext.jsx return value...
        // It returns { ...activeStyle, ...actions }. activeStyle has `configuredLanguages`.

        // Wait, configuredLanguages logic was:
        // currentConfigured.add(lid);

        // Let's verify:
        expect(capturedContext.configuredLanguages).toContain('fr-FR');
    });

    it('should remove primary override when unmapped', async () => {
        let capturedContext;
        render(
            <TypoProvider>
                <TestConsumer onReady={(ctx) => capturedContext = ctx} />
            </TypoProvider>
        );
        await waitFor(() => expect(capturedContext).toBeDefined());

        const primaryFontId = capturedContext.fonts.find(f => f.type === 'primary').id;

        // Assign
        capturedContext.assignFontToMultipleLanguages(primaryFontId, ['es-ES']);
        await waitFor(() => expect(capturedContext.primaryFontOverrides['es-ES']).toBe(primaryFontId));

        // Unassign (Pass empty array, or remove from set?)
        // assignFontToMultipleLanguages takes (fontId, targetLangIds).
        // It compares targetLangIds with "currentlyMapped".
        // To remove es-ES, we call it with targetLangIds NOT containing 'es-ES'.
        // Wait, normally we call `unmapFont` to remove. Does `assignFontToMultipleLanguages` handle removal?
        // Yes, line 2483: "Handle Removals".
        // If we call `assignFontToMultipleLanguages(primaryFontId, [])` it should unmap everything mapped to that font.

        capturedContext.assignFontToMultipleLanguages(primaryFontId, []);

        await waitFor(() => {
            expect(capturedContext.primaryFontOverrides['es-ES']).toBeUndefined();
        });
    });

});
