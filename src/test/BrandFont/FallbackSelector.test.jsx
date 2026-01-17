import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FallbackSelector from '../../apps/brand-font/components/FallbackSelector';

// Mock system fonts to have predictable data
vi.mock('../../shared/constants/systemFonts.json', () => ({
    default: [
        { id: 'arial', name: 'Arial', isCustom: false },
        { id: 'times', name: 'Times New Roman', isCustom: false }
    ]
}));

describe('FallbackSelector', () => {
    it('renders system fonts', () => {
        render(<FallbackSelector selectedFontId="arial" onSelect={() => { }} />);
        expect(screen.getByText('Arial')).toBeInTheDocument();
        expect(screen.getByText('Times New Roman')).toBeInTheDocument();
    });

    it('highlights selected font', () => {
        render(<FallbackSelector selectedFontId="arial" onSelect={() => { }} />);
        // Tailwind classes hard to test perfectly, but we can check if it has the "active" style classes or unique indicator
        // In the code: selected has `bg-indigo-50`
        // We can look for the button containing "Arial" and check class.
        const arialButton = screen.getByText('Arial').closest('button');
        expect(arialButton.className).toContain('bg-indigo-50');

        const timesButton = screen.getByText('Times New Roman').closest('button');
        expect(timesButton.className).not.toContain('bg-indigo-50');
    });

    it('calls onSelect when a font is clicked', () => {
        const handleSelect = vi.fn();
        render(<FallbackSelector selectedFontId="arial" onSelect={handleSelect} />);

        fireEvent.click(screen.getByText('Times New Roman'));

        expect(handleSelect).toHaveBeenCalledTimes(1);
        expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'times', name: 'Times New Roman' }));
    });

    it('renders custom fonts', () => {
        const customFonts = [{ id: 'custom-1', name: 'MyFont', isCustom: true }];
        render(<FallbackSelector selectedFontId="arial" onSelect={() => { }} customFonts={customFonts} />);

        expect(screen.getByText('MyFont')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('allows adding a custom font', () => {
        const handleAddCustom = vi.fn();
        render(<FallbackSelector selectedFontId="arial" onSelect={() => { }} onAddCustomFont={handleAddCustom} />);

        const input = screen.getByPlaceholderText('e.g. Comic Sans MS');
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
