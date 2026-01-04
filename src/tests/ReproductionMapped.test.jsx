import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TypoProvider } from '../context/TypoContextDefinition';
import { useTypo } from '../context/useTypoDefinition'; // Assuming split or direct import
import * as PersistenceService from '../services/PersistenceService';

// Fix import if useTypo is default or named
// In previous usage: import { useTypo } from '../context/useTypo';

// Mock Persistence
vi.mock('../services/PersistenceService', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        PersistenceService: {
            ...actual.PersistenceService,
            loadConfig: vi.fn(),
            saveConfig: vi.fn(),
            clear: vi.fn(),
            getFont: vi.fn(),
            saveFont: vi.fn()
        }
    };
});

describe('Mapped Font Shared State Verification', () => {
    it('clones a mapped font when overridden for a specific language', async () => {
        const mappedFontId = 'mapped-font-1';
        const initialState = {
            fontStyles: {
                primary: {
                    fonts: [{
                        id: mappedFontId,
                        name: 'Mapped Shared Font',
                        fileName: 'Mapped.ttf',
                        type: 'fallback',
                        isLangSpecific: true, // It is 'mapped'
                        isClone: false
                    }],
                    // Simulate that this font is mapped to FR and DE
                    fallbackFontOverrides: {
                        'fr': { [mappedFontId]: mappedFontId }, // Initially maps to itself (or logical mapping)
                        // If logic uses map to track which fonts are active.
                        // Actually, for mapped fonts, they appear in the list because they are assigned.
                        // Let's assume the user "Added" this font to FR and DE using distinct IDs?
                        // If they used "Map Font", usually it creates an entry in fallbackFontOverrides?
                        // Or does it add to 'fonts' list with 'lang: fr'?

                        // Let's assume standard "Map Font" behavior:
                        // It adds a font to the global list, but maybe with isLangSpecific?
                        // OR it adds an override entry in fallbackFontOverrides forcing a specific global font to be used?

                        // Let's assume the most problematic case: 
                        // The font exists in `fonts` list.
                        // Both FR and DE use it.
                        // We rely on `fallbackFontOverrides` to map a 'virtual' slot to this font?
                        // OR: `visibleLanguageIds`?

                        // In TypoContext: define how mapped fonts work.
                        // Usually: `assignFontToLanguage(fontId, langId)`
                        // This updates `fallbackFontOverrides[langId][fontId] = fontId`?
                        // Let's verify this assumption in the code.

                        // Based on code reading: `assignFontToLanguage` sets:
                        // nextOverrides[langId][originalFontId] = fontId;
                        // If fontId is the GLOBAL font, then:
                        'fr': { 'g1': mappedFontId },
                        'de': { 'g1': mappedFontId }
                        // But wait, mappedFontId IS the font we are editing?
                    },
                    fontScales: { active: 100, fallback: 100 }
                }
            }
        };

        // Let's verify what happens when we "Map" a font in the real app.
        // If I upload "MyFont", it gets ID "MyFont".
        // I map "MyFont" to French.
        // It shows up in French list.
        // If I edit it in French, "MyFont" properties change?
        // If "MyFont" is solely for French, that's fine.
        // If "MyFont" is implicitly shared (available to all), editing it in French should probably clone it if we want isolation.

        // Setup: One "Mapped" font shared by two languages via overrides.
        // But if `isLangSpecific: true`, the logic says `isDirectCloneEdit = true`.
        // So update happens IN PLACE on `mappedFontId`.
        // This is correct if `mappedFontId` belongs ONLY to French.
        // But if `mappedFontId` is shared with German, then modifying it affects German too.

        PersistenceService.PersistenceService.loadConfig.mockResolvedValue(initialState);

        const wrapper = ({ children }) => <TypoProvider>{children}</TypoProvider>;
        const { result } = renderHook(() => useTypo(), { wrapper });

        // WAIT for load
        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        // Verify initial state
        const fonts = result.current.fonts;
        const targetFont = fonts.find(f => f.id === mappedFontId);
        expect(targetFont).toBeDefined();

        // 1. Update scale for French
        await act(async () => {
            // updateLanguageSpecificSetting(originalFontId, langId, property, value)
            // But for mapped font, what is 'originalFontId'? 
            // It is passed as the first arg.
            result.current.updateLanguageSpecificSetting(mappedFontId, 'fr', 'scale', 150);
        });

        // 2. Check if a NEW clone was created
        const updatedFonts = result.current.fonts;

        // We expect:
        // - The original 'mappedFontId' font to remain unchanged (scale undefined or 100)
        // - A NEW font with id like 'lang-fr-...' to exist
        // - This new font to have scale 150
        // - 'fr' override to point to this new font

        const originalUnchanged = updatedFonts.find(f => f.id === mappedFontId);
        // If the bug exists, this will have scale 150

        const frOverrideId = result.current.fallbackFontOverrides['fr']?.[mappedFontId];
        // If bug exists, this might still be mappedFontId (or maybe logic didn't update map?)

        // Logic currently:
        // isDirectCloneEdit = originalFont.isClone || originalFont.isLangSpecific (TRUE for mapped font)
        // -> targetFontId = originalFontId (mappedFontId)
        // -> UPDATE EXISTING CLONE
        // -> updates mappedFontId in place.

        // FAILURE EXPECTED:
        expect(originalUnchanged.scale).not.toBe(150);
        expect(frOverrideId).not.toBe(mappedFontId);
    });
});
