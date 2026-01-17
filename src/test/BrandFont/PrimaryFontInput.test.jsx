import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import PrimaryFontInput from '../../apps/brand-font/components/PrimaryFontInput';
import * as FontLoader from '../../shared/services/FontLoader';

// Mock FontLoader
vi.mock('../../shared/services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn()
}));

// Mock InfoTooltip to avoid issues if deeply nested
vi.mock('../../shared/components/InfoTooltip', () => ({
    default: ({ text }) => <div data-testid="info-tooltip">{text}</div>
}));

describe('PrimaryFontInput', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<PrimaryFontInput />);
        expect(screen.getByText(/Upload Brand Font/i)).toBeInTheDocument();
        expect(screen.getByText(/Drag & drop your font file/i)).toBeInTheDocument();
    });

    it('shows error for unsupported file type', async () => {
        render(<PrimaryFontInput />);

        const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });

        // Note: The input is hidden, so we need to target it carefully or trigger change directly.
        // It renders with className="hidden" and ref.
        // Let's use fireEvent on the input found by type file.
        // But getByLabelText might not work if no label points to it.
        // Selector approach:
        const fileInput = document.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/Unsupported file format/i)).toBeInTheDocument();
        });
    });

    it('calls onFontLoaded when valid file is uploaded', async () => {
        const mockOnFontLoaded = vi.fn();

        // Mock successful parse
        const mockFont = { unitsPerEm: 1000 };
        const mockMetadata = { family: 'Test' };
        FontLoader.parseFontFile.mockResolvedValue({ font: mockFont, metadata: mockMetadata });
        FontLoader.createFontUrl.mockReturnValue('blob:url');

        render(<PrimaryFontInput onFontLoaded={mockOnFontLoaded} />);

        const file = new File(['(binary)'], 'test.ttf', { type: 'font/ttf' });
        const fileInput = document.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(FontLoader.parseFontFile).toHaveBeenCalledWith(file);
            expect(mockOnFontLoaded).toHaveBeenCalledWith({
                font: mockFont,
                metadata: mockMetadata,
                url: 'blob:url',
                file: file,
                fileName: 'test.ttf'
            });
        });

        // Error should be gone/not present
        expect(screen.queryByText(/Failed to parse/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Unsupported file/i)).not.toBeInTheDocument();
    });

    it('handles parse errors gracefully', async () => {
        const mockOnFontLoaded = vi.fn();
        FontLoader.parseFontFile.mockRejectedValue(new Error('Parse error'));

        render(<PrimaryFontInput onFontLoaded={mockOnFontLoaded} />);

        const file = new File(['(binary)'], 'corrupt.ttf', { type: 'font/ttf' });
        const fileInput = document.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/Parse error/i)).toBeInTheDocument();
        });
        expect(mockOnFontLoaded).not.toHaveBeenCalled();
    });
});
