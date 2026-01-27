import { createContext, useContext } from 'react';

export const PersistenceContext = createContext(null);

/**
 * Hook to access persistence context
 * @returns {Object} Persistence state and methods
 * @throws {Error} If used outside PersistenceProvider
 */
export const usePersistence = () => {
    const context = useContext(PersistenceContext);

    if (!context) {
        throw new Error('usePersistence must be used within a PersistenceProvider');
    }

    return context;
};
