import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddLanguageModal from '../../apps/multi-language/components/AddLanguageModal';
import { useTypo } from '../../shared/context/useTypo';
import { useUI } from '../../shared/context/UIContext';
import { vi } from 'vitest';
import { mockUseTypo } from '../test-utils';

// Mock dependencies
vi.mock('../../shared/context/useTypo');
vi.mock('../../shared/context/UIContext');

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }) => <>{children}</>
}));

describe('AddLanguageModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        useTypo.mockReturnValue(mockUseTypo());
        useUI.mockReturnValue({});
    });

    it('should render the modal when open', () => {
        render(<AddLanguageModal isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
        // Check for title loosely or specifically
        expect(screen.getByRole('heading', { name: /add language/i })).toBeInTheDocument();
    });

    it('should call onConfirm when a language is selected and confirmed', () => {
        const onConfirm = vi.fn();

        render(<AddLanguageModal onClose={mockOnClose} onConfirm={onConfirm} />);

        const frenchOption = screen.getByText('French');
        fireEvent.click(frenchOption);

        const addButton = screen.getByRole('button', { name: 'Add Language' });
        expect(addButton).toBeEnabled();
        fireEvent.click(addButton);

        expect(onConfirm).toHaveBeenCalledWith('fr-FR', 'inherit');
    });
});
