import { vi } from 'vitest';

export const mockUseTypo = (overrides = {}) => ({
    fonts: [],
    primaryLanguages: ['en-US'],
    configuredLanguages: ['en-US'],
    languages: [
        { id: 'en-US', name: 'English (US)', sampleSentence: 'Hello', dir: 'ltr' },
        { id: 'fr-FR', name: 'French', sampleSentence: 'Bonjour', dir: 'ltr' }
    ],
    visibleLanguageIds: ['en-US'], // Added for LanguageSelectorModal
    supportedLanguages: [
        { id: 'en-US', name: 'English (US)', sampleSentence: 'Hello', dir: 'ltr' },
        { id: 'fr-FR', name: 'French', sampleSentence: 'Bonjour', dir: 'ltr' }
    ],
    mappedLanguageIds: [],
    hiddenLanguageIds: [],
    textOverrides: {}, // Added for LanguageCard
    addConfiguredLanguage: vi.fn(),
    removeConfiguredLanguage: vi.fn(),
    updateLanguageConfig: vi.fn(),
    getLanguageGroup: vi.fn(),
    toggleLanguageVisibility: vi.fn(),
    showAllLanguages: vi.fn(),
    hideAllLanguages: vi.fn(),
    togglePrimaryLanguage: vi.fn(),
    ...overrides
});

export const mockUseUI = (overrides = {}) => ({
    viewMode: 'paragraph',
    setViewMode: vi.fn(),
    showBrowserGuides: false,
    setShowBrowserGuides: vi.fn(),
    activeConfigTab: 'ALL',
    setActiveConfigTab: vi.fn(),
    ...overrides
});
