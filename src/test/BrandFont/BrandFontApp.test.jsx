import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BrandFontFallback from '../../apps/brand-font/index';

// Mock child components to isolate App logic
vi.mock('../../apps/brand-font/components/PrimaryFontInput', () => ({
    default: ({ onFontLoaded }) => (
        <button
            data-testid="mock-upload-btn"
            onClick={() => onFontLoaded({
                font: {
                    unitsPerEm: 1000,
                    tables: { hhea: { ascender: 800, descender: -200, lineGap: 0 } },
                    charToGlyph: () => ({ yMax: 500 }) // mock x-height lookup
                },
                metadata: { staticWeight: 400 },
                fileName: 'MyBrandFont.ttf'
            })}
        >
            Upload Mock Font
        </button>
    )
}));

vi.mock('../../apps/brand-font/components/BrandFontPreview', () => ({
    default: ({ showBrowserGuides, showPrimaryGuides }) => (
        <div data-testid="brand-font-preview">
            Preview Area
            {showBrowserGuides && <span>Browser Guides On</span>}
            {showPrimaryGuides && <span>Primary Guides On</span>}
        </div>
    )
}));

vi.mock('../../apps/brand-font/components/FallbackSelector', () => ({
    default: ({ selectedFontId, onSelect, onAddCustomFont }) => (
        <div data-testid="fallback-selector">
            <button onClick={() => onSelect({ id: 'arial', name: 'Arial', isCustom: false })}>Select Arial</button>
            <button onClick={() => onSelect({ id: 'custom-new', name: 'New Custom', isCustom: true })}>Select Custom</button>
            <button onClick={() => onAddCustomFont('Brand New Custom')}>Add Custom</button>
            <div data-testid="selected-font-id">{selectedFontId}</div>
        </div>
    )
}));

// Mock clipboard
const mockClipboard = {
    writeText: vi.fn(),
};
global.navigator.clipboard = mockClipboard;

describe('BrandFontFallback App', () => {
    it('renders initial state correctly', () => {
        render(
            <MemoryRouter>
                <BrandFontFallback />
            </MemoryRouter>
        );

        expect(screen.getByText('Brand Font Fallback')).toBeInTheDocument();
        expect(screen.getByTestId('mock-upload-btn')).toBeInTheDocument();
        // Preview should not be visible yet
        expect(screen.queryByTestId('brand-font-preview')).not.toBeInTheDocument();
    });

    it('transitions to editor when font is loaded', async () => {
        render(
            <MemoryRouter>
                <BrandFontFallback />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByTestId('mock-upload-btn'));

        await waitFor(() => {
            expect(screen.getByText('MyBrandFont.ttf')).toBeInTheDocument();
        });

        // Preview should be visible
        expect(screen.getByTestId('brand-font-preview')).toBeInTheDocument();
        expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('handles manual override toggle', async () => {
        render(
            <MemoryRouter>
                <BrandFontFallback />
            </MemoryRouter>
        );

        // Load font
        fireEvent.click(screen.getByTestId('mock-upload-btn'));
        await screen.findByText('MyBrandFont.ttf');

        // Check if Auto is active (default)
        // Auto button logic: checking class names or disabled state of manual inputs
        const autoButton = screen.getByRole('button', { name: /Auto/i });
        // It's hard to check style, but we can check if manual inputs are disabled/less opaque
        // Index.jsx: <div className={`... ${isAuto ? 'opacity-70 pointer-events-none' : ...}`}>

        // Switch to Manual
        const manualButton = screen.getByRole('button', { name: /Manual/i });
        fireEvent.click(manualButton);

        // Check if reset button appears (it only appears in manual mode)
        expect(screen.getByTitle('Reset to Defaults')).toBeInTheDocument();

        // Switch back to Auto
        fireEvent.click(autoButton);
        expect(screen.queryByTitle('Reset to Defaults')).not.toBeInTheDocument();
    });

    it('opens CSS modal', async () => {
        render(
            <MemoryRouter>
                <BrandFontFallback />
            </MemoryRouter>
        );

        // Load font
        fireEvent.click(screen.getByTestId('mock-upload-btn'));
        await screen.findByText('MyBrandFont.ttf');

        // Click Get CSS
        const getCssBtn = screen.getByRole('button', { name: /Get CSS/i });
        fireEvent.click(getCssBtn);

        expect(screen.getByText('CSS Code')).toBeInTheDocument();

        // Verify Copy Code
        const copyBtn = screen.getByRole('button', { name: /Copy Code/i });
        fireEvent.click(copyBtn);
        expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it('removes font and resets state', async () => {
        render(
            <MemoryRouter>
                <BrandFontFallback />
            </MemoryRouter>
        );

        // Load font
        fireEvent.click(screen.getByTestId('mock-upload-btn'));
        await screen.findByText('MyBrandFont.ttf');

        // Click Remove Font
        const removeBtn = screen.getByRole('button', { name: /Remove Font/i });
        fireEvent.click(removeBtn);

        // Should return to initial state
        expect(screen.getByTestId('mock-upload-btn')).toBeInTheDocument();
        expect(screen.queryByText('MyBrandFont.ttf')).not.toBeInTheDocument();
    });
});
