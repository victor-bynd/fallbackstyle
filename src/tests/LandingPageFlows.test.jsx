import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from '../App';
import { TypoProvider } from '../context/TypoContext';
import * as FontLoader from '../services/FontLoader';
import { PersistenceService } from '../services/PersistenceService';

// Mocks
vi.mock('../services/FontLoader');
vi.mock('../services/PersistenceService');
vi.mock('../services/OpentypeWorkerService', () => ({
    default: {
        parse: vi.fn(),
    },
}));

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

describe('Landing Page Flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock IntersectionObserver
        global.IntersectionObserver = class IntersectionObserver {
            constructor() { }
            observe() { }
            unobserve() { }
            disconnect() { }
        };

        PersistenceService.loadConfig.mockResolvedValue(null);
        FontLoader.parseFontFile.mockResolvedValue({
            font: { names: { fontFamily: { en: 'MockFont' } } },
            metadata: { axes: [], isVariable: false }
        });
        FontLoader.createFontUrl.mockReturnValue('blob:mock-font-url');
    });

    const renderApp = () => {
        return render(
            <TypoProvider>
                <App />
            </TypoProvider>
        );
    };

    it('Scenario 1: Start with Languages Flow -> Main Content', async () => {
        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Start with languages/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Start with languages/i));

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Search languages/i)).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        const nextButton = screen.getByText(/Next: Configure Fonts/i);
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(screen.getByText(/Configure Languages/i)).toBeInTheDocument();
        });

        const confirmButton = screen.getByText(/Confirm Setup/i);
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(screen.getByText(/Primary Font/i)).toBeInTheDocument();
            expect(screen.queryByText(/Start with languages/i)).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Import Config with Ghost Font + No Languages -> Main Content', async () => {
        const ghostConfig = {
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    configuredLanguages: [],
                    fonts: [{ name: 'GhostFont', fileName: 'ghost.ttf', type: 'primary' }]
                }
            }
        };

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Start with languages/i)).toBeInTheDocument();
        });

        const file = new File([JSON.stringify({ data: ghostConfig, metadata: { version: 1 } })], 'config.json', { type: 'application/json' });

        const inputs = document.querySelectorAll('input[type="file"]');
        const configInput = Array.from(inputs).find(i => i.accept && i.accept.includes('.json'));

        Object.defineProperty(configInput, 'files', {
            value: [file]
        });
        fireEvent.change(configInput);

        await waitFor(() => {
            expect(screen.getByText(/Missing Fonts/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Continue with missing fonts/i));

        await waitFor(() => {
            expect(screen.getByText(/Primary Font/i)).toBeInTheDocument();
            expect(screen.queryByText(/Start with languages/i)).not.toBeInTheDocument();
        });
    });
});
