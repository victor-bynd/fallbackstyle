import React from 'react';
import { render, screen } from '@testing-library/react';
import LanguageList from '../../apps/multi-language/components/LanguageList';
import { useTypo } from '../../shared/context/useTypo';
import { useUI } from '../../shared/context/UIContext';
import { vi } from 'vitest';
import { mockUseTypo, mockUseUI } from '../test-utils';

// Mock dependencies
vi.mock('../../shared/context/useTypo');
vi.mock('../../shared/context/UIContext');

// Mock LanguageCard as it's tested separately
vi.mock('../../components/MultiLanguage/LanguageCard', () => ({
    default: ({ language }) => <div data-testid={`language-card-${language.id}`}>{language.name}</div>
}));

describe('LanguageList', () => {
    beforeEach(() => {
        useTypo.mockReturnValue(mockUseTypo({
            configuredLanguages: ['en-US', 'fr-FR']
        }));
        useUI.mockReturnValue(mockUseUI());
    });

    it('should render a list of languages', () => {
        const languages = [
            { id: 'en-US', name: 'English (US)' },
            { id: 'fr-FR', name: 'French' }
        ];

        render(<LanguageList languages={languages} />);

        expect(screen.getByText('English (US)')).toBeInTheDocument();
        expect(screen.getByText('French')).toBeInTheDocument();
    });

    it('should render empty state if no languages provided', () => {
        render(<LanguageList languages={[]} />);
        expect(screen.queryByTestId(/language-card/)).not.toBeInTheDocument();
        // Depending on implementation, it might show a message or just nothing.
        // Adjust expectation if there's a specific empty state message.
    });
});
