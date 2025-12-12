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
    const [fallbackFontOverrides, setFallbackFontOverrides] = useState({});
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

    // Add a new fallback font
    const addFallbackFont = (fontData) => {
        setFonts(prev => [...prev, fontData]);
    };

    // Remove a fallback font
    const removeFallbackFont = (fontId) => {
        setFonts(prev => prev.filter(f => f.id !== fontId));
        // If the removed font was active, switch to primary
        if (activeFont === fontId) {
            setActiveFont('primary');
        }
    };

    // Reorder fonts (move a font from oldIndex to newIndex)
    const reorderFonts = (oldIndex, newIndex) => {
        setFonts(prev => {
            const newFonts = [...prev];
            // Find primary font index (should always be first, but be safe)
            const primaryIndex = newFonts.findIndex(f => f.type === 'primary');
            
            // Don't allow reordering if trying to move primary or move to primary position
            if (oldIndex === primaryIndex || newIndex === primaryIndex) {
                return prev;
            }
            
            // Only allow reordering fallback fonts
            if (newFonts[oldIndex].type !== 'fallback' || (newIndex > 0 && newFonts[newIndex]?.type === 'primary')) {
                return prev;
            }
            
            const [movedFont] = newFonts.splice(oldIndex, 1);
            newFonts.splice(newIndex, 0, movedFont);
            return newFonts;
        });
    };

    // Get the active font object
    const getActiveFont = () => fonts.find(f => f.id === activeFont);

    // Update a fallback font's override settings
    const updateFallbackFontOverride = (fontId, field, value) => {
        setFonts(prev => prev.map(f => 
            f.id === fontId 
                ? { ...f, [field]: value }
                : f
        ));
    };

    // Reset a fallback font's overrides to use global settings
    const resetFallbackFontOverrides = (fontId) => {
        setFonts(prev => prev.map(f => 
            f.id === fontId && f.type === 'fallback'
                ? { 
                    ...f, 
                    baseFontSize: undefined,
                    scale: undefined,
                    lineHeight: undefined
                }
                : f
        ));
    };

    // Get effective settings for a font (uses overrides if available, otherwise global)
    const getEffectiveFontSettings = (fontId) => {
        const font = fonts.find(f => f.id === fontId);
        if (!font) return null;

        if (font.type === 'primary') {
            return {
                baseFontSize,
                scale: fontScales.active,
                lineHeight
            };
        } else {
            // Fallback font: use overrides if set, otherwise use global fallback scale
            return {
                baseFontSize: font.baseFontSize ?? baseFontSize,
                scale: font.scale ?? fontScales.fallback,
                lineHeight: font.lineHeight ?? lineHeight
            };
        }
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

    const updateFallbackScaleOverride = (langId, value) => {
        setFallbackScaleOverrides(prev => ({
            ...prev,
            [langId]: value
        }));
    };

    const resetAllFallbackScaleOverrides = () => {
        setFallbackScaleOverrides({});
    };

    // Per-locale fallback font overrides
    const setFallbackFontOverride = (langId, fontId) => {
        setFallbackFontOverrides(prev => ({
            ...prev,
            [langId]: fontId
        }));
    };

    const clearFallbackFontOverride = (langId) => {
        setFallbackFontOverrides(prev => {
            const next = { ...prev };
            delete next[langId];
            return next;
        });
    };

    const resetAllFallbackFontOverrides = () => {
        setFallbackFontOverrides({});
    };

    // Get the fallback font to use for a specific language
    // Returns fontId if overridden, or null to use cascade
    const getFallbackFontForLanguage = (langId) => {
        return fallbackFontOverrides[langId] || null;
    };

    return (
        <TypoContext.Provider value={{
            // NEW: Multi-font system
            fonts,
            setFonts,
            activeFont,
            setActiveFont,
            getPrimaryFont,
            getActiveFont,
            addFallbackFont,
            removeFallbackFont,
            reorderFonts,
            updateFallbackFontOverride,
            resetFallbackFontOverrides,
            getEffectiveFontSettings,

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
            fallbackFontOverrides,
            setFallbackFontOverride,
            clearFallbackFontOverride,
            resetAllFallbackFontOverrides,
            getFallbackFontForLanguage,
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
