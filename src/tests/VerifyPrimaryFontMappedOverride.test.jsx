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

// Robust Mocks (Inlined)
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
                    configuredLanguages: ['en-US', 'en-GB'],
                    primaryLanguages: ['en-US']
                }
            },
            configuredLanguages: ['en-US', 'en-GB'],
            primaryLanguages: ['en-US']
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getFont: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'font/ttf' })),
        saveFont: vi.fn().mockResolvedValue(true),
        getFontKeys: vi.fn().mockResolvedValue([]),
        deleteFont: vi.fn().mockResolvedValue(true)
    }
}));

describe('Primary Font Mapped Override Verification', () => {
    it('creates correct override clone for mapped primary font', async () => {
        const { container } = render(
            <TypoProvider>
                <App />
            </TypoProvider>
        );

        // 1. Find "English - UK"
        // Based on debug output, it renders exactly "English - UK"
        const enGbTab = await screen.findByText('English - UK', { selector: 'button *' }, { timeout: 4000 });

        // 2. Click it
        fireEvent.click(enGbTab.closest('button'));

        // 3. Find Primary Font Card
        const primaryLabel = await screen.findAllByText((content, element) => {
            return element.tagName.toLowerCase() === 'span' && content.includes('Primary Font');
        });
        expect(primaryLabel.length).toBeGreaterThan(0);

        // 4. Adjust Line Height Slider
        const lhLabel = await screen.findByText('Line Height');
        const lhContainer = lhLabel.closest('div').parentElement;
        const lhSlider = lhContainer.querySelector('input[type="range"]');

        expect(lhSlider).toBeInTheDocument();
        expect(lhSlider).not.toBeDisabled();

        // Move slider to 150 (1.5)
        fireEvent.change(lhSlider, { target: { value: '150' } });

        // 5. Verify Persistence
        await waitFor(() => {
            const displayValue = lhContainer.querySelector('input[type="number"]');
            if (displayValue) {
                expect(displayValue.value).toBe('150');
            }
        }, { timeout: 3000 });

        await new Promise(r => setTimeout(r, 200));
        expect(lhContainer.querySelector('input[type="number"]').value).toBe('150');

        console.log('Verification Passed: Slider value persisted.');
    });
});
