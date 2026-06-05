import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddLanguageModal from '../../apps/multi-language/components/AddLanguageModal';
import { useFontManagement } from '../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../shared/context/useLanguageMapping';
import { vi } from 'vitest';
import { mockUseFontManagement, mockUseLanguageMapping } from '../test-utils';

// Mock dependencies
vi.mock('../../shared/context/useFontManagement');
vi.mock('../../shared/context/useLanguageMapping');

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }) => <>{children}</>
}));

describe('AddLanguageModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        useFontManagement.mockReturnValue(mockUseFontManagement());
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            supportedLanguages: [
                { id: 'en-US', name: 'English (US)', sampleSentence: 'Hello', dir: 'ltr' },
                { id: 'fr-FR', name: 'French', sampleSentence: 'Bonjour', dir: 'ltr' }
            ]
        }));
    });

    it('should render the modal when open', () => {
        render(<AddLanguageModal onClose={mockOnClose} onConfirm={vi.fn()} />);
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
