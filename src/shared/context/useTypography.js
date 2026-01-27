import { createContext, useContext } from 'react';

export const TypographyContext = createContext(null);

/**
 * Hook to access typography context
 * @returns {Object} Typography state and methods
 * @throws {Error} If used outside TypographyProvider
 */
export const useTypography = () => {
    const context = useContext(TypographyContext);

    if (!context) {
        throw new Error('useTypography must be used within a TypographyProvider');
    }

    return context;
};
