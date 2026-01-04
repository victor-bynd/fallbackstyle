
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock ConfigService first
vi.mock('../services/ConfigService', () => ({
    ConfigService: {
        normalizeConfig: (c) => c.data || c,
        validateConfig: (c) => c,
        serializeConfig: (s) => ({ data: s, metadata: { version: 1 } })
    }
}));

// Mock PersistenceService
const mockStore = new Map();
const mockFonts = new Map();

vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        loadConfig: vi.fn(async () => {
            const val = mockStore.get('appState');
            console.log('MOCK LOAD CONFIG:', val);
            return val;
        }),
        saveConfig: vi.fn(async (config) => {
            console.log('MOCK SAVE CONFIG:', config);
            mockStore.set('appState', config);
        }),
        saveFont: vi.fn(async (id, blob) => {
            console.log('MOCK SAVE FONT:', id);
            mockFonts.set(id, blob);
        }),
        getFont: vi.fn(async (id) => {
            console.log('MOCK GET FONT:', id);
            return mockFonts.get(id);
        }),
        getFontKeys: vi.fn(async () => Array.from(mockFonts.keys())),
        deleteFont: vi.fn(),
        initDB: vi.fn()
    }
}));

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(async () => ({ font: { dummy: 'fontObject' }, metadata: {} })),
    createFontUrl: vi.fn(() => 'blob:mock-url')
}));

// Import AFTER mocks
import TypoContext from '../context/TypoContext';
import { TypoProvider } from '../context/TypoContext';

describe('OverridePersistence (Linkage Pass)', () => {

    it('should relink cloned overrides to source font during rehydration', async () => {
        // SCENARIO:
        // We have a saved state with 2 fonts:
        // 1. Primary (Upload): Has a Blob saved in PersistenceService using its ID.
        // 2. Override (Clone): Has NO Blob saved (because it's a clone), but shares fileName with Primary.
        //
        // EXPECTATION:
        // Upon load, Primary loads its blob. Override fails to find its own blob (Mock returns undefined),
        // BUT the Linkage Pass sees they share 'custom.ttf' and assigns Primary's fontObject to Override.

        // 1. Setup Mock Data
        const primaryId = 'font-primary-1';
        const overrideId = 'font-override-1';
        const fileName = 'custom.ttf';

        // Saved Config State (JSON)
        const savedState = {
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    baseFontSize: 16,
                    weight: 400,
                    lineHeight: 1.5,
                    letterSpacing: 0,
                    isFallbackLinked: true,
                    fontScales: { active: 100, fallback: 100 },
                    fonts: [
                        {
                            id: primaryId,
                            type: 'primary',
                            fileName: fileName,
                            name: 'My Font',
                            // In JSON, fontObject/fontUrl are missing
                        },
                        {
                            id: overrideId,
                            type: 'fallback',
                            isClone: true,
                            fileName: fileName, // Identity match
                            name: 'My Font',
                        }
                    ]
                }
            }
        };

        mockStore.set('appState', savedState);

        // Saved Blobs (Only Primary has one)
        mockFonts.set(primaryId, new Blob(['dummy font content']));
        // mockFonts.set(overrideId, ...); // OVERRIDE HAS NO BLOB SAVED

        // 2. Render Provider (triggers loadState)
        let contextValue;
        const TestComponent = () => {
            const ctx = React.useContext(TypoContext);
            contextValue = ctx;
            if (ctx.isSessionLoading) return <div>Loading...</div>;
            return <div>Loaded</div>;
        };

        render(
            <TypoProvider>
                <TestComponent />
            </TypoProvider>
        );

        // 3. Wait for load
        await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());

        // 4. Inspect State
        const fonts = contextValue.fonts;
        const primary = fonts.find(f => f.id === primaryId);
        const override = fonts.find(f => f.id === overrideId);

        console.log('Primary Object:', primary.fontObject);
        console.log('Override Object:', override.fontObject);

        // Primary should be hydrated normal way
        expect(primary.fontObject).toBeDefined();
        expect(primary.fontObject.dummy).toBe('fontObject');

        // Override should initially be undefined (no blob), but FIXED by Linkage Pass
        expect(override.fontObject).toBeDefined();
        expect(override.fontObject).toBe(primary.fontObject); // Should reference same object
    });
});
