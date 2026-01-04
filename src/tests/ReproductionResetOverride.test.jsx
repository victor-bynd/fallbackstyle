
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import App from '../App';
import { TypoProvider } from '../context/TypoContext';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
};

// Robust Mocks
vi.mock('../services/SafeFontLoader', () => ({
    safeParseFontFile: vi.fn().mockResolvedValue({
        font: {
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            tables: {
                name: { get: () => ({ fontFamily: 'TestFont' }) },
                os2: { sxHeight: 500, sCapHeight: 700, sTypoLineGap: 0 }
            },
            outlinesFormat: 'truetype',
            names: { fontFamily: { en: 'TestFont' } },
            charToGlyphIndex: vi.fn().mockReturnValue(1),
            getEnglishName: vi.fn().mockReturnValue('TestFont')
        },
        metadata: {
            axes: [],
            isVariable: false,
            staticWeight: 400
        }
    })
}));

vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn().mockResolvedValue({
        font: {
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            tables: {
                name: { get: () => ({ fontFamily: 'TestFont' }) },
                os2: { sxHeight: 500, sCapHeight: 700, sTypoLineGap: 0 }
            },
            outlinesFormat: 'truetype',
            names: { fontFamily: { en: 'TestFont' } },
            charToGlyphIndex: vi.fn().mockReturnValue(1),
            getEnglishName: vi.fn().mockReturnValue('TestFont')
        },
        metadata: {
            axes: [],
            isVariable: false,
            staticWeight: 400
        }
    }),
    createFontUrl: vi.fn().mockReturnValue('url(test.woff2)'),
    createFontFaceState: vi.fn().mockReturnValue({ fontFamily: 'TestFont', src: 'url(test.woff2)' })
}));

vi.mock('../services/PersistenceService', () => ({
    PersistenceService: {
        loadConfig: vi.fn().mockResolvedValue({
            activeFontStyleId: 'primary',
            fontStyles: {
                primary: {
                    fonts: [
                        {
                            id: 'primary-font-id',
                            type: 'primary',
                            name: 'Test Primary Font',
                            fileName: 'TestFont.ttf',
                            fontUrl: 'url(test)',
                            isHidden: false,
                            color: '#000000'
                        }
                    ],
                    activeFont: 'primary',
                    baseFontSize: 60,
                    weight: 400,
                    fontScales: { active: 100, fallback: 100 },
                    isFallbackLinked: true,
                    lineHeight: 'normal',
                    letterSpacing: 0,
                    fallbackFont: 'sans-serif',
                    lineHeightOverrides: {},
                    fallbackScaleOverrides: {},
                    fallbackFontOverrides: {},
                    primaryFontOverrides: {},
                    systemFallbackOverrides: {},
                    baseRem: 16,
                    configuredLanguages: ['en-US', 'fr-FR'],
                    primaryLanguages: ['en-US']
                }
            },
            configuredLanguages: ['en-US', 'fr-FR'],
            primaryLanguages: ['en-US']
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getFont: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'font/ttf' })),
        saveFont: vi.fn().mockResolvedValue(true),
        getFontKeys: vi.fn().mockResolvedValue([]),
        deleteFont: vi.fn().mockResolvedValue(true)
    }
}));

describe('Reset Override Button Reproduction', () => {
    it('should reset the primary font override when clicked', async () => {
        render(
            <TypoProvider>
                <App />
            </TypoProvider>
        );

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Loading Application/i)).not.toBeInTheDocument();
        }, { timeout: 5000 });



        // 1. Find "French" or "fr-FR" tab
        const frTabs = await screen.findAllByText(/French/i, {}, { timeout: 4000 });
        const frTab = frTabs[0];
        fireEvent.click(frTab.closest('button'));

        // 2. Override the primary font by changing Line Height
        const lhLabel = await screen.findByText('Line Height');
        const lhContainer = lhLabel.closest('div').parentElement;
        const lhSlider = lhContainer.querySelector('input[type="range"]');

        // Change value to trigger override
        fireEvent.change(lhSlider, { target: { value: '150' } });

        // 3. Check if Reset Button appears
        // Look for button with title "Unmap font" inside the Primary Font Card
        // We know Primary Font Card is the first one or labeled "Primary Font"
        const primarySection = await screen.findByText('Primary Font');
        const primaryCard = primarySection.closest('div').parentElement.querySelector('.bg-white'); // Rough finding or better selector

        // Wait for usage of waitFor as state update is async
        await waitFor(() => {
            const resetButton = screen.queryByTitle('Unmap font');
            expect(resetButton).toBeInTheDocument();
        });

        const resetButton = screen.getByTitle('Unmap font');

        // 4. Click Reset
        fireEvent.click(resetButton);

        // 5. Verify Reset Button disappears (meaning override is gone)
        await waitFor(() => {
            const resetButtonAfter = screen.queryByTitle('Unmap font');
            expect(resetButtonAfter).not.toBeInTheDocument();
        });

        console.log('Test Finished');
    });
});
