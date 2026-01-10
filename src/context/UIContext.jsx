
import React, { createContext, useContext, useState, useMemo } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    // Application View State
    const [viewMode, setViewMode] = useState('h1');
    const [textCase, setTextCase] = useState('none');
    const [gridColumns, setGridColumns] = useState(1);

    // Sidebar / Navigation State
    const [activeConfigTab, setActiveConfigTab] = useState('ALL');

    // Visual Guides & Debugging
    const [showFallbackColors, setShowFallbackColors] = useState(true);
    const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
    const [showBrowserGuides, setShowBrowserGuides] = useState(false);
    const [showFallbackOrder, setShowFallbackOrder] = useState(false);

    // Theme / Colors (Global UI colors, not font-specific)
    const [colors, setColors] = useState({
        primary: '#0f172a'
    });

    const value = useMemo(() => ({
        viewMode, setViewMode,
        textCase, setTextCase,
        gridColumns, setGridColumns,
        activeConfigTab, setActiveConfigTab,
        showFallbackColors, setShowFallbackColors,
        showAlignmentGuides, setShowAlignmentGuides,
        showBrowserGuides, setShowBrowserGuides,
        showFallbackOrder, setShowFallbackOrder,
        colors, setColors
    }), [
        viewMode, textCase, gridColumns, activeConfigTab,
        showFallbackColors, showAlignmentGuides, showBrowserGuides, showFallbackOrder,
        colors
    ]);

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
