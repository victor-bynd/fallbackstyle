
import React, { useState, useMemo, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';

import Onboarding from './components/Onboarding';
import BrandFontPreview from './components/BrandFontPreview';

import SideBar from './components/SideBar';

import BufferedInput from '../../shared/components/BufferedInput';
import { calculateOverrides, extractFontMetrics } from '../../shared/utils/MetricCalculator';
import { parseFontFile, createFontUrl } from '../../shared/services/FontLoader';
import systemFonts from '../../shared/constants/systemFonts.json';
import InfoTooltip from '../../shared/components/InfoTooltip';
// import { DEFAULT_PALETTE } from '../../shared/data/constants'; // This import is no longer needed

// High-contrast palette for easy distinction with 35% alpha (#RRGGBB59)
const HIGH_CONTRAST_PALETTE = [
    '#EF444459', // Red-500 @ 35%
    '#3B82F659', // Blue-500 @ 35%
    '#8B5CF659', // Purple-500 @ 35%
    '#F59E0B59', // Yellow-500 @ 35%
    '#10B98159', // Emerald-500 @ 35%
    '#EA580C59', // Orange-600 @ 35%
    '#DB277759', // Rose-600 @ 35%
    '#0D948859', // Teal-600 @ 35%
];

const getPaletteColor = (index) => HIGH_CONTRAST_PALETTE[index % HIGH_CONTRAST_PALETTE.length];

const getInitialFontColors = () => {
    const colors = {
        primary: '#00000059' // Black @ 35% alpha
    };
    // Assign colors to all system fonts in order
    systemFonts.forEach((font, index) => {
        // Use high contrast palette for fallbacks
        colors[font.id] = getPaletteColor(index);
    });
    return colors;
};

const BrandFontFallback = () => {
    const [primaryFont, setPrimaryFont] = useState(null);
    const [primaryMetrics, setPrimaryMetrics] = useState(null);
    const [selectedFallback, setSelectedFallback] = useState(systemFonts.find(f => f.id === 'arial'));
    const [customFonts, setCustomFonts] = useState([]);
    const [overrides, setOverrides] = useState(null);
    const [isAuto, setIsAuto] = useState(true);
    const [showBrowserGuides, setShowBrowserGuides] = useState(false);
    const [showPrimaryGuides, setShowPrimaryGuides] = useState(false);
    const [limitToSizeAdjust, setLimitToSizeAdjust] = useState(false);

    const [isInitialized, setIsInitialized] = useState(false);
    const [fontColors, setFontColors] = useState(getInitialFontColors());
    const [fontDisplay, setFontDisplay] = useState('swap');

    // Persistence: Load State
    useEffect(() => {
        const loadState = async () => {
            try {
                const [savedFile, savedConfigStr] = await Promise.all([
                    get('brand-font-file'),
                    localStorage.getItem('brand-font-config')
                ]);

                let config = null;
                if (savedConfigStr) {
                    try {
                        config = JSON.parse(savedConfigStr);
                    } catch (e) {
                        console.error("Failed to parse config", e);
                        localStorage.removeItem('brand-font-config');
                    }
                }

                // 1. Restore Custom Fonts
                if (config?.customFonts && Array.isArray(config.customFonts)) {
                    setCustomFonts(config.customFonts);
                }

                // 2. Restore Font File
                let fontData = null;
                let metrics = null;

                // Validate saved file is a valid Blob/File and not empty
                if (savedFile && savedFile instanceof Blob && savedFile.size > 0) {
                    try {
                        const { font, metadata } = await parseFontFile(savedFile);
                        const url = createFontUrl(savedFile);
                        fontData = {
                            font,
                            metadata,
                            url,
                            file: savedFile,
                            fileName: savedFile.name
                        };
                        setPrimaryFont(fontData);

                        metrics = extractFontMetrics(font);
                        setPrimaryMetrics(metrics);

                        // Default logic if no config but file exists
                        if (!config) {
                            setIsAuto(true);
                            const defaultFallback = systemFonts.find(f => f.id === 'arial');
                            if (defaultFallback) {
                                setOverrides(calculateOverrides(metrics, defaultFallback));
                                setSelectedFallback(defaultFallback);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to parse saved font file", err);
                        // Corrupt file, delete it
                        del('brand-font-file');
                    }
                } else if (savedFile) {
                    // Invalid file object found in IDB
                    console.warn("Invalid file found in storage, clearing.");
                    del('brand-font-file');
                }

                // 3. Restore Config State
                if (config) {
                    // Restore Fallback
                    if (config.selectedFallbackId) {
                        let fallback = systemFonts.find(f => f.id === config.selectedFallbackId);
                        if (!fallback && config.customFonts) {
                            fallback = config.customFonts.find(f => f.id === config.selectedFallbackId);
                        }
                        // Fallback to arial if saved fallback not found but others exist
                        if (!fallback) fallback = systemFonts.find(f => f.id === 'arial');

                        if (fallback) setSelectedFallback(fallback);
                    }

                    // Restore Colors
                    if (config.fontColors) {
                        setFontColors(prev => ({
                            ...prev,
                            ...config.fontColors
                        }));
                    } else {
                        // Ensure we have defaults if migrating
                        setFontColors(getInitialFontColors());
                    }

                    // Restore Overrides
                    if (config.overrides) setOverrides(config.overrides);
                    if (typeof config.isAuto === 'boolean') setIsAuto(config.isAuto);

                    // Guides
                    if (typeof config.showBrowserGuides === 'boolean') setShowBrowserGuides(config.showBrowserGuides);
                    if (typeof config.showPrimaryGuides === 'boolean') setShowPrimaryGuides(config.showPrimaryGuides);
                    if (typeof config.limitToSizeAdjust === 'boolean') setLimitToSizeAdjust(config.limitToSizeAdjust);
                    if (config.fontDisplay) {
                        // Migration: Default changed from 'auto' to 'swap'.
                        // If saved value is 'auto', likely it was just the old default. Update to 'swap'.
                        if (config.fontDisplay === 'auto') {
                            setFontDisplay('swap');
                        } else {
                            setFontDisplay(config.fontDisplay);
                        }
                    }
                }

            } catch (error) {
                console.error("Error loading persisted state:", error);
            } finally {
                setIsInitialized(true);
            }
        };

        loadState();
    }, []);

    // Persistence: Save Config (Debounced)
    useEffect(() => {
        if (!isInitialized) return;

        const saveConfig = () => {
            const config = {
                customFonts,
                selectedFallbackId: selectedFallback?.id,
                overrides,
                isAuto,
                showBrowserGuides,
                showPrimaryGuides,
                limitToSizeAdjust,
                fontColors,
                fontDisplay
            };
            localStorage.setItem('brand-font-config', JSON.stringify(config));
        };

        const timeoutId = setTimeout(saveConfig, 800); // 800ms debounce
        return () => clearTimeout(timeoutId);
    }, [isInitialized, customFonts, selectedFallback, overrides, isAuto, showBrowserGuides, showPrimaryGuides, limitToSizeAdjust, fontColors, fontDisplay]);

    // Persistence: Save Font File
    useEffect(() => {
        if (!isInitialized) return;

        if (primaryFont?.file) {
            // Guard: Size limit (e.g. 50MB) to prevent IDB quota issues
            const MAX_SIZE = 50 * 1024 * 1024;
            if (primaryFont.file.size > MAX_SIZE) {
                console.warn("Font file too large to persist (>50MB). Skipping save.");
                return;
            }

            set('brand-font-file', primaryFont.file).catch(err => {
                console.error("Failed to save font to IDB", err);
            });
        }
    }, [isInitialized, primaryFont]);



    // Extract metrics when primary font loads
    const getNextUniqueColor = (currentColors) => {
        const usedColors = new Set(Object.values(currentColors));
        // Find first color from HIGH_CONTRAST_PALETTE that isn't used
        for (let i = 0; i < HIGH_CONTRAST_PALETTE.length; i++) {
            const color = HIGH_CONTRAST_PALETTE[i];
            if (!usedColors.has(color)) return color;
        }
        // Fallback to cycling if all are used
        return HIGH_CONTRAST_PALETTE[usedColors.size % HIGH_CONTRAST_PALETTE.length];
    };

    const handleFontLoaded = (fontData) => {
        setPrimaryFont(fontData);

        // Assign unique color if not set
        setFontColors(prev => {
            if (prev.primary) return prev;
            return {
                ...prev,
                primary: getNextUniqueColor(prev)
            };
        });

        // Extract metrics using utility
        const newMetrics = extractFontMetrics(fontData.font);

        setPrimaryMetrics(newMetrics);
        // console.log("Extracted Primary Metrics:", newMetrics.metrics);
        setIsAuto(true); // Reset to auto on new font

        // Save to IDB immediately (no debounce needed for single file event)
        // Check size again just in case, though useEffect handles it too. 
        // We let useEffect handle the actual save to keep it centralized.

        // Calculate immediately if we have a fallback
        if (selectedFallback && !selectedFallback.isCustom) {
            setOverrides(calculateOverrides(newMetrics, selectedFallback));
        }
    };

    const handleFallbackSelect = (fallbackFont) => {
        setSelectedFallback(fallbackFont);

        // Assign unique color if not set
        setFontColors(prev => {
            if (prev[fallbackFont.id]) return prev;
            return {
                ...prev,
                [fallbackFont.id]: getNextUniqueColor(prev)
            };
        });

        if (fallbackFont.isCustom) {
            setIsAuto(false);
            setOverrides({
                sizeAdjust: 1.0,
                ascentOverride: 0,
                descentOverride: 0,
                lineGapOverride: 0
            });
        } else {
            setIsAuto(true);
            if (primaryMetrics) {
                setOverrides(calculateOverrides(primaryMetrics, fallbackFont));
            }
        }
    };

    const handleAddCustomFont = (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Guard: Prevent duplicates
        const exists = customFonts.some(f => f.name.toLowerCase() === trimmedName.toLowerCase());
        if (exists) {
            // Optionally could alert user, but for now just ignore
            return;
        }

        const newFont = {
            id: `custom-${Date.now()}`,
            name: trimmedName,
            isCustom: true
        };
        setCustomFonts(prev => [...prev, newFont]);
        handleFallbackSelect(newFont);
    };

    const handleRemoveCustomFont = (id) => {
        setCustomFonts(prev => prev.filter(f => f.id !== id));
        if (selectedFallback?.id === id) {
            handleFallbackSelect(systemFonts.find(f => f.id === 'arial'));
        }
    };

    const handleResetApp = () => {
        setPrimaryFont(null);
        setPrimaryMetrics(null);
        setSelectedFallback(systemFonts.find(f => f.id === 'arial'));
        setCustomFonts([]);
        setOverrides(null);
        setIsAuto(true);
        setShowBrowserGuides(false);
        setShowPrimaryGuides(false);
        setLimitToSizeAdjust(false);

        setFontColors(getInitialFontColors());
        setFontDisplay('auto');

        // Clear Persistence
        del('brand-font-file');
        localStorage.removeItem('brand-font-config');
    }



    const handleUpdateFontColor = (id, color) => {
        setFontColors(prev => ({
            ...prev,
            [id]: color
        }));
    };

    const handleManualUpdate = (key, value) => {
        setOverrides(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleCopyOverrides = (sourceFont) => {
        if (!primaryMetrics || !sourceFont) return;
        setOverrides(calculateOverrides(primaryMetrics, sourceFont));
        setIsAuto(false);
    };

    // Format CSS for display
    // Format CSS for display (Export All)
    const cssOutput = useMemo(() => {
        if (!primaryFont || !primaryMetrics) return '';

        let css = '';
        const pct = (n) => `${(n * 100).toFixed(2)}%`;

        // Helper to generate block
        const generateBlock = (fallbackName, familyName, ov) => {
            let block = `/* Fallback: ${fallbackName} */\n`;
            block += `@font-face {\n`;
            block += `  font-family: '${familyName}';\n`;
            block += `  src: local('${fallbackName}');\n`;
            block += `  size-adjust: ${pct(ov.sizeAdjust)};\n`;
            if (!limitToSizeAdjust) {
                block += `  ascent-override: ${pct(ov.ascentOverride)};\n`;
                block += `  descent-override: ${pct(ov.descentOverride)};\n`;
                block += `  line-gap-override: ${pct(ov.lineGapOverride)};\n`;
            }
            block += `  font-display: ${fontDisplay};\n`;
            block += `}\n\n`;
            return block;
        };

        // 1. Simulated Fallbacks (System Fonts)
        systemFonts.forEach(font => {
            let ov;
            // If this is the currently selected font and we are in manual mode, use manual overrides
            if (selectedFallback?.id === font.id && !isAuto) {
                ov = overrides;
            } else {
                // Otherwise calculate auto overrides
                ov = calculateOverrides(primaryMetrics, font);
            }
            if (ov) {
                // Use family name convention: Primary_Fallback_FallbackName
                // Clean up spaces in family name
                const suffix = font.name.replace(/\s+/g, '');
                const familyName = `${primaryFont.fileName.replace(/\.[^/.]+$/, "")} Fallback ${suffix}`;
                css += generateBlock(font.name, familyName, ov);
            }
        });

        // 2. Custom Fonts
        customFonts.forEach(font => {
            let ov;
            if (selectedFallback?.id === font.id) {
                ov = overrides;
            } else {
                // Default for custom fonts not currently selected (since we don't persist unselected custom config yet)
                ov = { sizeAdjust: 1.0, ascentOverride: 0, descentOverride: 0, lineGapOverride: 0 };
            }

            if (ov) {
                const suffix = font.name.replace(/\s+/g, '');
                const familyName = `${primaryFont.fileName.replace(/\.[^/.]+$/, "")} Fallback ${suffix}`;
                css += generateBlock(font.name, familyName, ov);
            }
        });

        return css.trim();
    }, [overrides, selectedFallback, primaryFont, limitToSizeAdjust, fontDisplay, primaryMetrics, customFonts, isAuto]);

    const [isModalOpen, setIsModalOpen] = useState(false);

    // If no primary font is selected, show the Onboarding screen (full page)
    if (!primaryFont) {
        return <Onboarding onFontLoaded={handleFontLoaded} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row font-sans">
            <SideBar
                primaryFont={primaryFont}
                selectedFallback={selectedFallback}
                onSelectFallback={handleFallbackSelect}
                customFonts={customFonts}
                onAddCustomFont={handleAddCustomFont}
                onRemoveFallback={handleRemoveCustomFont}
                onCopyOverrides={handleCopyOverrides}
                onResetApp={handleResetApp}
                onReplacePrimaryFont={handleFontLoaded}
                fontColors={fontColors}
                onUpdateFontColor={handleUpdateFontColor}
                onExport={() => setIsModalOpen(true)}
            />

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-4">
                    <div className="max-w-6xl mx-auto space-y-8 pb-12">
                        {/* Preview Area */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {selectedFallback ? (
                                <BrandFontPreview
                                    primaryFont={primaryFont}
                                    fallbackFont={selectedFallback}
                                    overrides={overrides}
                                    showBrowserGuides={showBrowserGuides}
                                    setShowBrowserGuides={setShowBrowserGuides}
                                    showPrimaryGuides={showPrimaryGuides}
                                    setShowPrimaryGuides={setShowPrimaryGuides}
                                    limitToSizeAdjust={limitToSizeAdjust}
                                    fontColors={fontColors}
                                    fontDisplay={fontDisplay}
                                    setFontDisplay={setFontDisplay}
                                />
                            ) : (
                                <div className="h-[300px] flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                                    <p>Select a fallback font from the sidebar to see the preview.</p>
                                </div>
                            )}
                        </div>

                        {/* Configuration Area */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
                            {/* Controls Row */}
                            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-100">
                                <div className="flex flex-col">
                                    <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Metrics Configuration</h3>
                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">
                                        {isAuto ? 'CALCULATED AUTOMATICALLY' : 'MANUAL OVERRIDE ACTIVE'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm">
                                                <button
                                                    onClick={() => setLimitToSizeAdjust(false)}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!limitToSizeAdjust ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                                    All
                                                </button>
                                                <button
                                                    onClick={() => setLimitToSizeAdjust(true)}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${limitToSizeAdjust ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                                    Size Only
                                                </button>
                                            </div>
                                            <InfoTooltip content="Size-adjust has the most browser support. Safari does not support ascent, descent, or line-gap overrides." />
                                        </div>

                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm">
                                            <button
                                                onClick={() => {
                                                    if (selectedFallback?.isCustom) return;
                                                    setIsAuto(true);
                                                    if (primaryMetrics && selectedFallback) setOverrides(calculateOverrides(primaryMetrics, selectedFallback));
                                                }}
                                                disabled={selectedFallback?.isCustom}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isAuto ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${selectedFallback?.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setIsAuto(false)}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!isAuto ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                                Manual
                                            </button>
                                        </div>

                                        {!isAuto && (
                                            <button
                                                onClick={() => setOverrides({ sizeAdjust: 1.0, ascentOverride: 0, descentOverride: 0, lineGapOverride: 0 })}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                                title="Reset to Defaults"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>


                                </div>
                            </div>

                            {overrides && (
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 transition-all duration-300 ${isAuto ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                                    <div className="group space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Size Adjust</label>
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
                                                <BufferedInput
                                                    type="number"
                                                    value={Math.round((overrides.sizeAdjust || 0) * 10000) / 100}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val)) handleManualUpdate('sizeAdjust', val / 100);
                                                    }}
                                                    className="w-14 bg-transparent text-right outline-none text-indigo-600 font-mono text-[12px] font-bold"
                                                />
                                                <span className="text-[10px] font-bold text-slate-300">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            step="0.1"
                                            value={(overrides.sizeAdjust || 0) * 100}
                                            onChange={(e) => handleManualUpdate('sizeAdjust', parseFloat(e.target.value) / 100)}
                                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                        />
                                    </div>

                                    <div className={`group space-y-4 transition-all duration-300 ${limitToSizeAdjust ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Ascent Override</label>
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
                                                <BufferedInput
                                                    type="number"
                                                    value={Math.round((overrides.ascentOverride || 0) * 10000) / 100}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val)) handleManualUpdate('ascentOverride', val / 100);
                                                    }}
                                                    className="w-14 bg-transparent text-right outline-none text-indigo-600 font-mono text-[12px] font-bold"
                                                />
                                                <span className="text-[10px] font-bold text-slate-300">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="150"
                                            step="0.1"
                                            value={(overrides.ascentOverride || 0) * 100}
                                            onChange={(e) => handleManualUpdate('ascentOverride', parseFloat(e.target.value) / 100)}
                                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                        />
                                    </div>

                                    <div className={`group space-y-4 transition-all duration-300 ${limitToSizeAdjust ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Descent Override</label>
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
                                                <BufferedInput
                                                    type="number"
                                                    value={Math.round((overrides.descentOverride || 0) * 10000) / 100}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val)) handleManualUpdate('descentOverride', val / 100);
                                                    }}
                                                    className="w-14 bg-transparent text-right outline-none text-indigo-600 font-mono text-[12px] font-bold"
                                                />
                                                <span className="text-[10px] font-bold text-slate-300">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="150"
                                            step="0.1"
                                            value={(overrides.descentOverride || 0) * 100}
                                            onChange={(e) => handleManualUpdate('descentOverride', parseFloat(e.target.value) / 100)}
                                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                        />
                                    </div>

                                    <div className={`group space-y-4 transition-all duration-300 ${limitToSizeAdjust ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Line Gap Override</label>
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
                                                <BufferedInput
                                                    type="number"
                                                    value={Math.round((overrides.lineGapOverride || 0) * 10000) / 100}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val)) handleManualUpdate('lineGapOverride', val / 100);
                                                    }}
                                                    className="w-14 bg-transparent text-right outline-none text-indigo-600 font-mono text-[12px] font-bold"
                                                />
                                                <span className="text-[10px] font-bold text-slate-300">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={(overrides.lineGapOverride || 0) * 100}
                                            onChange={(e) => handleManualUpdate('lineGapOverride', parseFloat(e.target.value) / 100)}
                                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-100 pt-8 text-[11px] text-slate-400 text-center italic">
                                Font loading strategy can now be configured in the simulation toolbar above.
                            </div>
                        </div>
                    </div>
                </div>

                {/* CSS Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-500">
                                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                    </svg>
                                    CSS Code
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-0 overflow-auto max-h-[60vh] bg-slate-900">
                                <pre className="p-6 text-sm font-mono text-blue-100">
                                    <code>{cssOutput}</code>
                                </pre>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(cssOutput);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25H6.75" />
                                    </svg>
                                    Copy Code
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrandFontFallback;
