import { createContext, useContext } from 'react';

export const FontManagementContext = createContext(null);

/**
 * Hook to access font management context
 * @returns {Object} Font management state and methods
 * @throws {Error} If used outside FontManagementProvider
 */
export const useFontManagement = () => {
    const context = useContext(FontManagementContext);

    if (!context) {
        throw new Error('useFontManagement must be used within a FontManagementProvider');
    }

    return context;
};
