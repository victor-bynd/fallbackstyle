import { createContext, useContext, useState } from 'react';

const TypoContext = createContext();

export const TypoProvider = ({ children }) => {
    const [fontObject, setFontObject] = useState(null);
    const [fontUrl, setFontUrl] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [fallbackFont, setFallbackFont] = useState('sans-serif');

    // New Scaling State
    const [baseFontSize, setBaseFontSize] = useState(60);
    const [fontScales, setFontScales] = useState({ active: 100, fallback: 100 });
    const [isFallbackLinked, setIsFallbackLinked] = useState(true);

    const [headerScales, setHeaderScales] = useState({
        h1: 1.0, h2: 0.8, h3: 0.6, h4: 0.5, h5: 0.4, h6: 0.3
    });

    // Content Overrides
    const [textOverrides, setTextOverrides] = useState({});

    const setTextOverride = (langId, text) => {
        setTextOverrides(prev => ({
            ...prev,
            [langId]: text
        }));
    };

    const resetTextOverride = (langId) => {
        setTextOverrides(prev => {
            const next = { ...prev };
            delete next[langId];
            return next;
        });
    };

    // Derived value for backward compatibility with components expecting pixels
    const fontSizes = {
        active: Math.round(baseFontSize * (fontScales.active / 100)),
        fallback: Math.round(baseFontSize * (fontScales.fallback / 100))
    };

    const [lineHeight, setLineHeight] = useState(1.5);
    const [textCase, setTextCase] = useState('none');
    const [viewMode, setViewMode] = useState('h1');
    const [gridColumns, setGridColumns] = useState(1);
    const [lineHeightOverrides, setLineHeightOverrides] = useState({});
    const [colors, setColors] = useState({
        primary: '#0f172a',
        missing: '#ff0000',
        missingBg: '#ffecec'
    });

    const fallbackOptions = [
        { label: 'System Sans', value: 'system-ui, sans-serif' },
        { label: 'System Serif', value: 'ui-serif, serif' },
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Times New Roman', value: '"Times New Roman", serif' },
        { label: 'Noto Sans', value: '"Noto Sans", sans-serif' },
    ];

    const loadFont = (font, url, name) => {
        setFontObject(font);
        setFontUrl(url);
        setFileName(name);
    };

    const updateLineHeightOverride = (langId, value) => {
        setLineHeightOverrides(prev => ({
            ...prev,
            [langId]: value
        }));
    };

    const resetAllLineHeightOverrides = () => {
        setLineHeightOverrides({});
    };

    return (
        <TypoContext.Provider value={{
            fontObject,
            fontUrl,
            fileName,
            loadFont,
            fallbackFont,
            setFallbackFont,
            colors,
            setColors,
            fontSizes, // Derived
            baseFontSize,
            setBaseFontSize,
            fontScales,
            setFontScales,
            lineHeight,
            setLineHeight,
            lineHeightOverrides,
            updateLineHeightOverride,
            resetAllLineHeightOverrides,
            gridColumns,
            setGridColumns,
            textCase,
            setTextCase,
            viewMode,
            setViewMode,
            fallbackOptions,
            isFallbackLinked,
            setIsFallbackLinked,
            headerScales,
            setHeaderScales,
            textOverrides,
            setTextOverride,
            resetTextOverride
        }}>
            {children}
        </TypoContext.Provider>
    );
};

export const useTypo = () => {
    const context = useContext(TypoContext);
    if (!context) {
        throw new Error('useTypo must be used within a TypoProvider');
    }
    return context;
};
