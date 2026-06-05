import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SideBar from '../../apps/brand-font/components/SideBar';

// Mock system fonts to have predictable data
vi.mock('../../shared/constants/systemFonts.json', () => ({
    default: [
        { id: 'arial', name: 'Arial', isCustom: false },
        { id: 'times', name: 'Times New Roman', isCustom: false }
    ]
}));

vi.mock('../../shared/components/InfoTooltip', () => ({
    default: () => <span data-testid="info-tooltip" />
}));

const renderSideBar = (props = {}) => render(
    <SideBar
        primaryFont={{ fileName: 'Brand.ttf' }}
        selectedFallback={{ id: 'arial', name: 'Arial', isCustom: false }}
        onSelectFallback={vi.fn()}
        customFonts={[]}
        onAddCustomFont={vi.fn()}
        onRemoveFallback={vi.fn()}
        onCopyOverrides={vi.fn()}
        onResetApp={vi.fn()}
        onReplacePrimaryFont={vi.fn()}
        fontColors={{ primary: '#00000059', arial: '#11111159', times: '#22222259' }}
        onUpdateFontColor={vi.fn()}
        onExport={vi.fn()}
        {...props}
    />
);

describe('Brand Font SideBar fallback selection', () => {
    it('renders system fonts', () => {
        renderSideBar();
        expect(screen.getByText('Arial')).toBeInTheDocument();
        expect(screen.getByText('Times New Roman')).toBeInTheDocument();
    });

    it('highlights selected font', () => {
        renderSideBar();
        const arialButton = screen.getByText('Arial').closest('[role="button"]');
        expect(arialButton.className).toContain('bg-indigo-50');

        const timesButton = screen.getByText('Times New Roman').closest('[role="button"]');
        expect(timesButton.className).not.toContain('bg-indigo-50');
    });

    it('calls onSelect when a font is clicked', () => {
        const handleSelect = vi.fn();
        renderSideBar({ onSelectFallback: handleSelect });

        fireEvent.click(screen.getByText('Times New Roman'));

        expect(handleSelect).toHaveBeenCalledTimes(1);
        expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'times', name: 'Times New Roman' }));
    });

    it('renders custom fonts', () => {
        const customFonts = [{ id: 'custom-1', name: 'MyFont', isCustom: true }];
        renderSideBar({ customFonts });

        expect(screen.getByText('MyFont')).toBeInTheDocument();
        expect(screen.getByText('SYSTEM FALLBACKS')).toBeInTheDocument();
    });

    it('allows adding a custom font', () => {
        const handleAddCustom = vi.fn();
        renderSideBar({ onAddCustomFont: handleAddCustom });

        const input = screen.getByPlaceholderText('e.g. Comic Sans');
        const addButton = screen.getByText('Add');

        // Button should be disabled initially
        expect(addButton).toBeDisabled();

        // Type name
        fireEvent.change(input, { target: { value: ' My New Font ' } });
        expect(addButton).not.toBeDisabled();

        fireEvent.click(addButton);

        expect(handleAddCustom).toHaveBeenCalledWith('My New Font');

        // Input should clear (mocking state change if component controlled, but here component controls local state)
        // Since we are observing the component's internal state update via re-render?
        // Wait, `setNewFontName('')` happens inside `handleAdd`.
        // So the input value should become empty.
        expect(input.value).toBe('');
    });
});
