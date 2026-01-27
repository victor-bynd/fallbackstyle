import { createContext, useContext } from 'react';

export const LanguageMappingContext = createContext(null);

/**
 * Hook to access language mapping context
 * @returns {Object} Language mapping state and methods
 * @throws {Error} If used outside LanguageMappingProvider
 */
export const useLanguageMapping = () => {
    const context = useContext(LanguageMappingContext);

    if (!context) {
        throw new Error('useLanguageMapping must be used within a LanguageMappingProvider');
    }

    return context;
};
