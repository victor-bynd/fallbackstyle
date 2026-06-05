import React from 'react';
import { render, screen } from '@testing-library/react';
import LanguageList from '../../apps/multi-language/components/LanguageList';
import { useLanguageMapping } from '../../shared/context/useLanguageMapping';
import { vi } from 'vitest';
import { mockUseLanguageMapping } from '../test-utils';

// Mock dependencies
vi.mock('../../shared/context/useLanguageMapping');

describe('LanguageList', () => {
    const languages = [
        { id: 'en-US', name: 'English (US)' },
        { id: 'fr-FR', name: 'French' }
    ];

    beforeEach(() => {
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            supportedLanguages: languages
        }));
    });

    it('should render a list of languages', () => {
        render(<LanguageList selectedIds={[]} onSelect={vi.fn()} />);

        expect(screen.getByText('English (US)')).toBeInTheDocument();
        expect(screen.getByText('French')).toBeInTheDocument();
    });

    it('should render empty state if no languages provided', () => {
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            supportedLanguages: []
        }));

        render(<LanguageList selectedIds={[]} onSelect={vi.fn()} searchTerm="zzz" />);
        expect(screen.queryByText('English (US)')).not.toBeInTheDocument();
        expect(screen.queryByText('French')).not.toBeInTheDocument();
    });
});
