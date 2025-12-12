import { createContext, useContext, useState } from 'react';

const TypoContext = createContext();

export const TypoProvider = ({ children }) => {
    const [fontObject, setFontObject] = useState(null);
    const [fontUrl, setFontUrl] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [fallbackFont, setFallbackFont] = useState('sans-serif');

    // NEW: Multi-font system state (alongside existing state for now)
    const [fonts, setFonts] = useState([
        {
            id: 'primary',
            type: 'primary',
            fontObject: null,
            fontUrl: null,
            fileName: null,
            baseFontSize: 60,
            scale: 100,
            lineHeight: 1.2
        }
    ]);
    const [activeFont, setActiveFont] = useState('primary');

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

    const [lineHeight, setLineHeight] = useState(1.2);
    const [textCase, setTextCase] = useState('none');
    const [viewMode, setViewMode] = useState('h1');
    const [gridColumns, setGridColumns] = useState(1);
    const [lineHeightOverrides, setLineHeightOverrides] = useState({});
    const [fallbackScaleOverrides, setFallbackScaleOverrides] = useState({});
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
        // Update old state (for backward compatibility)
        setFontObject(font);
        setFontUrl(url);
        setFileName(name);

        // Update new fonts array
        setFonts(prev => prev.map(f =>
            f.type === 'primary'
                ? { ...f, fontObject: font, fontUrl: url, fileName: name }
                : f
        ));
    };

    // Helper to get primary font from fonts array
    const getPrimaryFont = () => fonts.find(f => f.type === 'primary');

    const updateLineHeightOverride = (langId, value) => {
        setLineHeightOverrides(prev => ({
            ...prev,
            [langId]: value
        }));
    };

    const resetAllLineHeightOverrides = () => {
        setLineHeightOverrides({});
    };

    const updateFallbackScaleOverride = (langId, value) => {
        setFallbackScaleOverrides(prev => ({
            ...prev,
            [langId]: value
        }));
    };

    const resetAllFallbackScaleOverrides = () => {
        setFallbackScaleOverrides({});
    };

    return (
        <TypoContext.Provider value={{
            // NEW: Multi-font system
            fonts,
            setFonts,
            activeFont,
            setActiveFont,
            getPrimaryFont,

            // Existing values
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
            fallbackScaleOverrides,
            updateFallbackScaleOverride,
            resetAllFallbackScaleOverrides,
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
