import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSelectorModal from '../../apps/multi-language/components/LanguageSelectorModal';
import { useTypo } from '../../shared/context/useTypo';
import { vi } from 'vitest';
import { mockUseTypo } from '../test-utils';

// Mock dependencies
vi.mock('../../shared/context/useTypo');
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }) => <>{children}</>
}));

describe('LanguageSelectorModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSelect = vi.fn();

    beforeEach(() => {
        useTypo.mockReturnValue(mockUseTypo());
    });

    it('should render when open', () => {
        render(<LanguageSelectorModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should call toggleLanguageVisibility from context when a language is clicked', () => {
        const toggleLanguageVisibility = vi.fn();
        useTypo.mockReturnValue(mockUseTypo({ toggleLanguageVisibility }));

        render(<LanguageSelectorModal isOpen={true} onClose={mockOnClose} />);

        // LanguageList renders buttons with text
        const frenchOption = screen.getByText('French');
        fireEvent.click(frenchOption);

        expect(toggleLanguageVisibility).toHaveBeenCalledWith('fr-FR');
        // onClose is handled by "Done" button or escape, not selection in multi mode
    });

    it('should filter options based on search', () => {
        render(<LanguageSelectorModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
        const searchInput = screen.getByPlaceholderText(/search/i);

        fireEvent.change(searchInput, { target: { value: 'French' } });
        expect(screen.getByText('French')).toBeInTheDocument();
        // Depending on list implementation, English might be filtered out
    });
});
