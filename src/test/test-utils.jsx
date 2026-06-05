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

export const mockUseFontManagement = (overrides = {}) => ({
    fonts: [],
    fontObject: null,
    activeFontStyleId: 'primary',
    fontStyles: {
        primary: {
            fonts: [],
            configuredLanguages: [],
            primaryLanguages: [],
            primaryFontOverrides: {},
            fallbackFontOverrides: {}
        }
    },
    updateStyleState: vi.fn(),
    setFonts: vi.fn(),
    loadFont: vi.fn(),
    addFallbackFont: vi.fn(),
    addFallbackFonts: vi.fn(),
    getPrimaryFont: vi.fn(),
    getPrimaryFontFromStyle: vi.fn(),
    getFontsForStyle: vi.fn(),
    getActiveFont: vi.fn(),
    ...overrides
});

export const mockUseLanguageMapping = (overrides = {}) => ({
    primaryLanguages: ['en-US'],
    configuredLanguages: ['en-US'],
    visibleLanguageIds: ['en-US'],
    supportedLanguages: [
        { id: 'en-US', name: 'English (US)', sampleSentence: 'Hello', dir: 'ltr' },
        { id: 'fr-FR', name: 'French', sampleSentence: 'Bonjour', dir: 'ltr' }
    ],
    mappedLanguageIds: [],
    hiddenLanguageIds: [],
    addConfiguredLanguage: vi.fn(),
    removeConfiguredLanguage: vi.fn(),
    mapLanguageToFont: vi.fn(),
    unmapLanguage: vi.fn(),
    getPrimaryFontOverrideForStyle: vi.fn(),
    getFallbackFontOverrideForStyle: vi.fn(),
    setFallbackFontOverrideForStyle: vi.fn(),
    toggleLanguageVisibility: vi.fn(),
    showAllLanguages: vi.fn(),
    hideAllLanguages: vi.fn(),
    togglePrimaryLanguage: vi.fn(),
    isLanguageVisible: vi.fn(() => true),
    batchAddConfiguredLanguages: vi.fn(),
    batchAddFontsAndMappings: vi.fn(),
    addLanguageSpecificFallbackFont: vi.fn(),
    ...overrides
});

export const mockUseTypography = (overrides = {}) => ({
    headerStyles: {},
    textOverrides: {},
    setTextOverride: vi.fn(),
    resetTextOverride: vi.fn(),
    headerFontStyleMap: {},
    getEffectiveFontSettingsForStyle: vi.fn(() => ({ lineHeight: 'normal' })),
    ...overrides
});

export const mockUsePersistence = (overrides = {}) => ({
    isSessionLoading: false,
    isAppResetting: false,
    saveSession: vi.fn(),
    loadSession: vi.fn(),
    getExportConfiguration: vi.fn(),
    resetApp: vi.fn(),
    ...overrides
});

export const mockUseUI = (overrides = {}) => ({
    viewMode: 'paragraph',
    setViewMode: vi.fn(),
    showBrowserGuides: false,
    setShowBrowserGuides: vi.fn(),
    showAlignmentGuides: false,
    setShowAlignmentGuides: vi.fn(),
    showFallbackOrder: false,
    setShowFallbackOrder: vi.fn(),
    showFallbackColors: false,
    setShowFallbackColors: vi.fn(),
    activeConfigTab: 'ALL',
    setActiveConfigTab: vi.fn(),
    gridColumns: 1,
    setGridColumns: vi.fn(),
    ...overrides
});
