import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import FontLanguageModal from '../components/FontLanguageModal';
import { useTypo } from '../context/useTypo';

// Mock TypoContext
vi.mock('../context/useTypo');

describe('FontLanguageModal Primary Selection', () => {
    const mockLanguages = [
        { id: 'en-US', name: 'English (US)' },
        { id: 'fr-FR', name: 'French (France)' },
        { id: 'es-ES', name: 'Spanish (Spain)' }
    ];

    const mockPendingFonts = [
        {
            file: { name: 'MyFont.ttf' },
            fileName: 'MyFont.ttf',
            font: {},
            metadata: {},
            url: 'blob:url',
            id: 'mock-font-id'
        }
    ];

    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        useTypo.mockReturnValue({
            languages: mockLanguages
        });
        mockOnConfirm.mockClear();
    });

    test('should allow toggling a primary language and pass it to onConfirm', async () => {
        render(
            <FontLanguageModal
                pendingFonts={mockPendingFonts}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        // 1. Open Language Picker for the font
        // The "Map: auto" button triggers the picker.
        // It's the button showing the current mapping.
        const mapBtn = screen.getByText(/Map:/i);
        fireEvent.click(mapBtn);

        // 2. We are now in Picker View.
        // Check for "Select Language" header
        const header = await screen.findByText(/Select Language/i);
        expect(header).toBeInTheDocument();

        // 3. Find "Make Primary" button for a language (e.g. en-US)
        // LanguageList renders "Make Primary" button if onTogglePrimary is passed.
        // We need to find the button associated with 'en-US'.
        // It helps if we can target it.
        // The button has title "Add to Primary Languages" or "Make Primary" text.
        const makePrimaryBtns = screen.getAllByText(/Make Primary/i);
        expect(makePrimaryBtns.length).toBeGreaterThan(0);

        // Click the first one (English)
        fireEvent.click(makePrimaryBtns[0]);

        // 4. Verify it changed to "Primary"
        // The text should change to "Primary"
        expect(screen.getAllByText('Primary')[0]).toBeInTheDocument();

        // 5. Click Confirm Selection (to go back to list)
        fireEvent.click(screen.getByText('Confirm Selection'));

        // 6. Click Confirm Mappings (to finish)
        fireEvent.click(screen.getByText('Confirm Mappings'));

        // 7. Verify onConfirm was called with primaryLanguages
        expect(mockOnConfirm).toHaveBeenCalledWith(expect.objectContaining({
            primaryLanguages: expect.arrayContaining(['en-US'])
        }));
    });
});
