import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiLanguageFallback from '../../apps/multi-language/index';
import { useFontManagement } from '../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../shared/context/useLanguageMapping';
import { usePersistence } from '../../shared/context/usePersistence';
import { useUI } from '../../shared/context/UIContext';
import { useConfigImport } from '../../shared/hooks/useConfigImport';
import { useFontFaceStyles } from '../../shared/hooks/useFontFaceStyles';
import { vi } from 'vitest';
import { mockUseFontManagement, mockUseLanguageMapping, mockUsePersistence, mockUseUI } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';

// Mock the JSON data modules
vi.mock('../../shared/data/languages.json', () => ({
    default: [
        { id: 'en-US', name: 'English (US)', sampleSentence: 'Hello' }
    ]
}));
vi.mock('../../shared/data/languageCharacters', () => ({
    languageCharacters: {}
}));

// Mock all contexts and hooks used by the page
vi.mock('../../shared/context/useFontManagement');
vi.mock('../../shared/context/useLanguageMapping');
vi.mock('../../shared/context/usePersistence');
vi.mock('../../shared/context/UIContext');
vi.mock('../../shared/hooks/useConfigImport');
vi.mock('../../shared/hooks/useFontFaceStyles');
vi.mock('../../shared/services/PersistenceService', () => ({
    PersistenceService: {
        saveSession: vi.fn(),
        loadSession: vi.fn()
    }
}));
vi.mock('../../shared/services/SafeFontLoader', () => ({
    safeParseFontFile: vi.fn()
}));

// Mock child components that are complex or not focus of this test
vi.mock('../../apps/landing/index', () => ({
    default: () => <div>Landing Page</div>
}));
vi.mock('../../apps/multi-language/components/SideBar', () => ({
    default: () => <div>Sidebar</div>
}));
vi.mock('../../apps/multi-language/components/LanguageCard', () => ({
    default: ({ language }) => <div>Card: {language.name}</div>
}));
// Mock modals if they auto-render
vi.mock('../../apps/multi-language/components/LanguageSelectorModal', () => ({
    default: () => <div>Language Selector Modal</div>
}));
vi.mock('../../shared/components/LoadingScreen', () => ({
    default: () => <div>Loading...</div>
}));

describe('MultiLanguageFallback Page', () => {
    beforeEach(() => {
        useFontManagement.mockReturnValue(mockUseFontManagement({
            fontObject: { familyName: 'Test Font' },
            fontStyles: {
                primary: {
                    fonts: [{ name: 'Test Font' }],
                    configuredLanguages: ['en-US'],
                    primaryLanguages: [],
                    primaryFontOverrides: {},
                    fallbackFontOverrides: {}
                }
            }
        }));
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            configuredLanguages: ['en-US'],
            primaryLanguages: ['en-US'],
        }));
        usePersistence.mockReturnValue(mockUsePersistence({
            isSessionLoading: false
        }));

        useUI.mockReturnValue(mockUseUI());
        useConfigImport.mockReturnValue({
            importConfig: vi.fn()
        });
        useFontFaceStyles.mockReturnValue('');
    });

    it('should render main content when data is loaded', () => {
        render(
            <MemoryRouter>
                <MultiLanguageFallback />
            </MemoryRouter>
        );
        expect(screen.getByText('TYPE DEMO')).toBeInTheDocument();
        expect(screen.getByText('Sidebar')).toBeInTheDocument();
        expect(screen.getByText('Card: English (US)')).toBeInTheDocument();
    });

    it('should render loading screen when session is loading', () => {
        usePersistence.mockReturnValue(mockUsePersistence({ isSessionLoading: true }));
        render(
            <MemoryRouter>
                <MultiLanguageFallback />
            </MemoryRouter>
        );
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render LandingPage when no fonts or languages configured', () => {
        useFontManagement.mockReturnValue(mockUseFontManagement({
            fontObject: null,
            fontStyles: { primary: { fonts: [] } }
        }));
        useLanguageMapping.mockReturnValue(mockUseLanguageMapping({
            configuredLanguages: [],
        }));
        usePersistence.mockReturnValue(mockUsePersistence({
            isSessionLoading: false
        }));

        render(
            <MemoryRouter>
                <MultiLanguageFallback />
            </MemoryRouter>
        );
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });
});
