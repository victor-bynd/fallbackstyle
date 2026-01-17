import { useContext } from 'react';
import { TypoContext } from './TypoContextDefinition';

export const useTypo = () => {
    const context = useContext(TypoContext);
    if (!context) {
        throw new Error('useTypo must be used within a TypoProvider');
    }
    return context;
};
