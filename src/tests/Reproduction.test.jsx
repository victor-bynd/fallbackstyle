import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TypoProvider } from '../context/TypoContext';
import { useTypo } from '../context/useTypo';
import * as PersistenceService from '../services/PersistenceService';
import React from 'react';

vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));

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

describe('TypoContext Override Fix Verification', () => {
    it('creates a clone when overriding a global font property', async () => {
        const initialState = {
            fontStyles: {
                primary: {
                    fonts: [{
                        id: 'g1',
                        name: 'Global Font',
                        fileName: 'Global.ttf',
                        type: 'fallback',
                        isClone: false
                    }],
                    primaryFontOverrides: {},
                    fallbackFontOverrides: {},
                    fontScales: { active: 100, fallback: 100 }
                }
            }
        };

        PersistenceService.PersistenceService.loadConfig.mockResolvedValue(initialState);
        // Also ensure normalize/validate passes or mock ConfigService?
        // Assuming ConfigService handles this structure.


        const wrapper = ({ children }) => <TypoProvider>{children}</TypoProvider>;
        const { result } = renderHook(() => useTypo(), { wrapper });

        // Wait for load
        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        // Verify Initial State
        expect(result.current.fonts).toHaveLength(1);
        expect(result.current.fonts[0].id).toBe('g1');

        // ACTION: Override Global Font for 'fr'
        // Simulating "Slide Drag" or "Override Button Click"
        await act(async () => {
            result.current.updateLanguageSpecificSetting('g1', 'fr', 'scale', 120);
        });

        // ASSERT:
        // 1. Should have 2 fonts (Global + Clone)
        expect(result.current.fonts).toHaveLength(2);

        const clone = result.current.fonts.find(f => f.id !== 'g1');
        expect(clone).toBeDefined();
        expect(clone.isClone).toBe(true);
        expect(clone.scale).toBe(120);

        // 2. Override Map should point g1 -> cloneId
        const overrides = result.current.fallbackFontOverrides;
        expect(overrides['fr']).toBeDefined();
        // It might be object or string based on legacy check? Current logic uses object map for languages.
        // Actually the code handles both, but usually writes object `langOverrides[originalFontId] = newFontId`.
        // Wait, `nextOverrides[langId] = langOverrides`.

        const frMap = overrides['fr'];
        expect(frMap['g1']).toBe(clone.id);
    });

    it('updates existing clone directly (Recursive Fix Verification)', async () => {
        const initialState = {
            fontStyles: {
                primary: {
                    fonts: [{
                        id: 'g1',
                        name: 'Global Font',
                        type: 'fallback'
                    }],
                    fallbackFontOverrides: {},
                    fontScales: { active: 100, fallback: 100 }
                }
            }
        };
        PersistenceService.PersistenceService.loadConfig.mockResolvedValue(initialState);

        const wrapper = ({ children }) => <TypoProvider>{children}</TypoProvider>;
        const { result } = renderHook(() => useTypo(), { wrapper });

        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        // 1. Create Clone
        await act(async () => {
            result.current.updateLanguageSpecificSetting('g1', 'fr', 'scale', 120);
        });

        const cloneId = result.current.fallbackFontOverrides['fr']['g1'];
        const firstClone = result.current.fonts.find(f => f.id === cloneId);
        expect(firstClone.scale).toBe(120);
        expect(result.current.fonts).toHaveLength(2);

        // 2. Update Clone Directly (Simulate Drag)
        // Pass CLONE ID as "originalFontId" because FontCard sees the clone now.
        await act(async () => {
            result.current.updateLanguageSpecificSetting(cloneId, 'fr', 'scale', 130);
        });

        // ASSERT:
        // Should NOT create a 3rd font.
        expect(result.current.fonts).toHaveLength(2);

        // Clone should be updated
        const updatedClone = result.current.fonts.find(f => f.id === cloneId);
        expect(updatedClone.scale).toBe(130);
    });
});
