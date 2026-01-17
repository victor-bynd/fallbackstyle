import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewModeSelector from '../../shared/components/ViewModeSelector';
import { useUI } from '../../shared/context/UIContext';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../context/UIContext');

describe('ViewModeSelector', () => {
    const mockSetViewMode = vi.fn();

    beforeEach(() => {
        useUI.mockReturnValue({
            viewMode: 'all',
            setViewMode: mockSetViewMode
        });
        mockSetViewMode.mockClear();
    });

    it('should render all options', () => {
        render(<ViewModeSelector />);
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('H1')).toBeInTheDocument();
        expect(screen.getByText('H6')).toBeInTheDocument();
    });

    it('should call setViewMode on change', () => {
        render(<ViewModeSelector />);
        const select = screen.getByRole('combobox');

        fireEvent.change(select, { target: { value: 'h1' } });

        expect(mockSetViewMode).toHaveBeenCalledWith('h1');
    });

    it('should render simple variant correctly', () => {
        const { container } = render(<ViewModeSelector variant="simple" />);
        // Simple variant doesn't have the "Display" label wrapper
        expect(screen.queryByText('Display')).not.toBeInTheDocument();
        expect(container.querySelector('select')).toBeInTheDocument();
    });
});
