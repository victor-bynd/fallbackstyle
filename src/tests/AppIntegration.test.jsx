import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from '../App';
import { TypoProvider } from '../context/TypoContext';
import * as SafeFontLoader from '../services/SafeFontLoader';
import * as FontLoader from '../services/FontLoader';
import { useConfigImport } from '../hooks/useConfigImport';

// Mock dependencies
vi.mock('../services/SafeFontLoader', () => ({
    safeParseFontFile: vi.fn(),
    resetWorker: vi.fn()
}));

vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        loadConfig: vi.fn().mockResolvedValue(null),
        saveConfig: vi.fn(),
        clear: vi.fn(),
        loadFonts: vi.fn().mockResolvedValue([]),
        saveFonts: vi.fn(),
        initDB: vi.fn().mockResolvedValue(true)
    }
}));

// Mock child components to simplify tree
vi.mock('../components/LandingPage', () => ({
    default: ({ importConfig }) => (
        <div data-testid="landing-page">
            <button onClick={() => importConfig(new File(['{}'], 'config.json'))}>Import</button>
        </div>
    )
}));

vi.mock('../components/MissingFontsModal', () => ({
    default: ({ onResolve }) => (
        <div data-testid="missing-fonts-modal">
            <button onClick={() => onResolve({ 'test.ttf': new File(['foo'], 'test.ttf') })}>
                Resolve
            </button>
        </div>
    )
}));

vi.mock('../components/FontLanguageModal', () => ({
    default: () => <div data-testid="font-language-modal">Mapping</div>
}));

// Mock hooks
vi.mock('../hooks/useConfigImport', () => ({
    useConfigImport: vi.fn()
}));

describe('App Integration - Font Import', () => {
    // Capture setter from the hook
    let triggerMissingFonts;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock IntersectionObserver as a class
        window.IntersectionObserver = class {
            constructor() {
                this.observe = vi.fn();
                this.unobserve = vi.fn();
                this.disconnect = vi.fn();
            }
        };

        // Mock useConfigImport to use internal state ensuring re-renders
        useConfigImport.mockImplementation(() => {
            const [missingFonts, setMissingFonts] = React.useState(null);

            // Expose setter to test scope
            triggerMissingFonts = setMissingFonts;

            return {
                importConfig: vi.fn(),
                validateAndRestore: vi.fn(),
                missingFonts,
                setMissingFonts,
                isConfigImporting: false,
                configImportState: { isImporting: false },
                cancelImport: vi.fn()
            };
        });

        // Setup SafeFontLoader mock
        SafeFontLoader.safeParseFontFile.mockResolvedValue({
            font: { names: { fontFamily: { en: 'TestFont' } } },
            metadata: { axes: [] }
        });
    });

    it('uses safeParseFontFile and hides MissingFontsModal when resolving', async () => {
        render(
            <TypoProvider>
                <App />
            </TypoProvider>
        );

        // Wait for persistence load and ensure no loading screen
        await waitFor(() => expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument());

        // 1. Simulate state where missing fonts are detected via our captured hook setter
        await act(async () => {
            if (triggerMissingFonts) triggerMissingFonts(['test.ttf']);
        });

        // 2. Verify MissingFontsModal is shown
        expect(screen.getByTestId('missing-fonts-modal')).toBeInTheDocument();
        expect(screen.queryByTestId('font-language-modal')).not.toBeInTheDocument();

        // 3. Trigger resolution (simulate user upload/confirm)
        // This invokes App's handleResolve which calls safeParseFontFile
        await act(async () => {
            screen.getByText('Resolve').click();
        });

        // 4. Verify safeParseFontFile was used
        expect(SafeFontLoader.safeParseFontFile).toHaveBeenCalled();
        // And NOT the unsafe one
        expect(FontLoader.parseFontFile).not.toHaveBeenCalled();

        // 5. Verify Modal Overlap Fix:
        // App sets pendingFonts (which we can't easily see directly, but we see the effect)
        // Effect: MissingFontsModal disappears AND FontLanguageModal appears
        await waitFor(() => {
            expect(screen.queryByTestId('missing-fonts-modal')).not.toBeInTheDocument();
            expect(screen.getByTestId('font-language-modal')).toBeInTheDocument();
        });
    });
});
