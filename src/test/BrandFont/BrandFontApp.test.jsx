import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { get, set, del } from 'idb-keyval';
import { usePersistence } from '../../shared/context/usePersistence';
import BrandFontFallback from '../../apps/brand-font/index';

vi.mock('idb-keyval', () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn()
}));

vi.mock('../../shared/context/usePersistence');

vi.mock('../../apps/brand-font/components/Onboarding', () => ({
    default: ({ onFontLoaded }) => (
        <div>
            <h1>Brand Font Fallback</h1>
            <button
                data-testid="mock-upload-btn"
                onClick={() => onFontLoaded({
                    font: {
                        unitsPerEm: 1000,
                        tables: {
                            hhea: { ascender: 800, descender: -200, lineGap: 0 },
                            os2: { sxHeight: 500 }
                        },
                        charToGlyph: () => ({ yMax: 500 })
                    },
                    metadata: { staticWeight: 400 },
                    file: new File(['font'], 'MyBrandFont.ttf', { type: 'font/ttf' }),
                    fileName: 'MyBrandFont.ttf'
                })}
            >
                Upload Mock Font
            </button>
        </div>
    )
}));

vi.mock('../../apps/brand-font/components/SideBar', () => ({
    default: ({ primaryFont, onExport, onResetApp }) => (
        <aside>
            <div>{primaryFont.fileName}</div>
            <button onClick={onExport}>Export CSS</button>
            <button onClick={onResetApp}>Reset App</button>
        </aside>
    )
}));

vi.mock('../../apps/brand-font/components/MetricSidebar', () => ({
    default: () => <div>Metrics Configuration</div>
}));

vi.mock('../../apps/brand-font/components/BrandFontPreview', () => ({
    default: () => <div data-testid="brand-font-preview">Preview Area</div>
}));

const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined)
};

const createLocalStorageMock = () => {
    let store = {};

    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
};

const renderApp = () => render(
    <MemoryRouter>
        <BrandFontFallback />
    </MemoryRouter>
);

describe('BrandFontFallback App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const localStorageMock = createLocalStorageMock();
        Object.defineProperty(globalThis, 'localStorage', {
            value: localStorageMock,
            configurable: true
        });
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            configurable: true
        });
        get.mockResolvedValue(null);
        set.mockResolvedValue(undefined);
        del.mockResolvedValue(undefined);
        usePersistence.mockReturnValue({
            resetApp: vi.fn().mockResolvedValue(undefined),
            isAppResetting: false
        });
        Object.defineProperty(navigator, 'clipboard', {
            value: mockClipboard,
            configurable: true
        });
    });

    it('renders initial state correctly', async () => {
        renderApp();

        expect(screen.getByText('Brand Font Fallback')).toBeInTheDocument();
        expect(screen.getByTestId('mock-upload-btn')).toBeInTheDocument();
        expect(screen.queryByTestId('brand-font-preview')).not.toBeInTheDocument();
        await waitFor(() => {
            expect(get).toHaveBeenCalledWith('brand-font-file');
        });
    });

    it('transitions to editor when font is loaded', async () => {
        renderApp();

        fireEvent.click(screen.getByTestId('mock-upload-btn'));

        expect(await screen.findByText('MyBrandFont.ttf')).toBeInTheDocument();
        expect(screen.getByTestId('brand-font-preview')).toBeInTheDocument();
        expect(screen.getByText('Metrics Configuration')).toBeInTheDocument();
    });

    it('opens CSS modal and copies generated CSS', async () => {
        renderApp();

        fireEvent.click(screen.getByTestId('mock-upload-btn'));
        await screen.findByText('MyBrandFont.ttf');

        fireEvent.click(screen.getByRole('button', { name: /Export CSS/i }));

        expect(screen.getByText('CSS Code')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Copy Code/i }));
        await waitFor(() => {
            expect(mockClipboard.writeText).toHaveBeenCalled();
        });
    });

    it('opens reset confirmation from the sidebar', async () => {
        renderApp();

        fireEvent.click(screen.getByTestId('mock-upload-btn'));
        await screen.findByText('MyBrandFont.ttf');

        fireEvent.click(screen.getByRole('button', { name: /Reset App/i }));

        expect(screen.getByText('Reset Application?')).toBeInTheDocument();
    });
});
