import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useContext, useEffect } from 'react';
import { TypoProvider } from '../context/TypoContext';
import { TypoContext } from '../context/TypoContextDefinition';

// Helper component
const TestConsumer = ({ onContext }) => {
    const context = useContext(TypoContext);
    useEffect(() => {
        onContext(context);
    }, [context, onContext]);
    return null;
};

// Mocks
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        loadConfig: vi.fn().mockResolvedValue(null),
        saveConfig: vi.fn(),
        clear: vi.fn()
    }
}));

describe('ConfigImport Reproduction', () => {
    it('updates configuredLanguages when restoring config with missing fonts', async () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        // Wait for session loading
        await waitFor(() => {
            expect(contextValues.isSessionLoading).toBe(false);
        });

        const mockConfig = {
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    configuredLanguages: ['fr-FR', 'de-DE'],
                    fonts: [
                        { type: 'primary', name: 'GhostFont', fileName: 'ghost.ttf' } // Missing file
                    ]
                }
            }
        };

        await act(async () => {
            // Pass empty map for files
            await contextValues.restoreConfiguration(mockConfig, {});
        });

        expect(contextValues.configuredLanguages).toContain('fr-FR');
        expect(contextValues.configuredLanguages).toContain('de-DE');
        expect(contextValues.fontObject).toBeNull();
    });

    it('handles ghost font with no configured languages', async () => {
        let contextValues;
        render(
            <TypoProvider>
                <TestConsumer onContext={(ctx) => (contextValues = ctx)} />
            </TypoProvider>
        );

        await waitFor(() => {
            expect(contextValues.isSessionLoading).toBe(false);
        });

        const mockConfig = {
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    configuredLanguages: [], // Empty
                    fonts: [
                        { type: 'primary', name: 'GhostFontOnly', fileName: 'ghost.ttf' }
                    ]
                }
            }
        };

        await act(async () => {
            // Pass empty map for files
            await contextValues.restoreConfiguration(mockConfig, {});
        });

        expect(contextValues.configuredLanguages).toHaveLength(0);
        expect(contextValues.fontObject).toBeNull();

        // Check if we can identify the ghost font name
        // Use optional chaining or check existence
        const fonts = contextValues.fontStyles.primary.fonts;
        expect(fonts).toBeDefined();
        expect(fonts.length).toBeGreaterThan(0);
        expect(fonts[0].name).toBe('GhostFontOnly');
    });
});
