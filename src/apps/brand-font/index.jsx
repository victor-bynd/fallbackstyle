
import React, { useState, useMemo, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';

import Onboarding from './components/Onboarding';
import BrandFontPreview from './components/BrandFontPreview';

import SideBar from './components/SideBar';
import MetricSidebar from './components/MetricSidebar';

import { calculateOverrides, extractFontMetrics } from '../../shared/utils/MetricCalculator';
import { parseFontFile, createFontUrl } from '../../shared/services/FontLoader';
import systemFonts from '../../shared/constants/systemFonts.json';
import { usePersistence } from '../../shared/context/usePersistence';
import ResetConfirmModal from '../../shared/components/ResetConfirmModal';
import ResetLoadingScreen from '../../shared/components/ResetLoadingScreen';
import ErrorBoundary from '../../shared/components/ErrorBoundary';

// High-contrast palette for easy distinction with 35% alpha (#RRGGBB59)
const HIGH_CONTRAST_PALETTE = [
    '#EF444459', // Red-500
    '#3B82F659', // Blue-500
    '#8B5CF659', // Purple-500
    '#F59E0B59', // Yellow-500
    '#10B98159', // Emerald-500
    '#EA580C59', // Orange-600
    '#DB277759', // Rose-600
    '#0D948859', // Teal-600
    '#F43F5E59', // Rose-500
    '#6366F159', // Indigo-500
    '#D946EF59', // Fuchsia-500
    '#06B6D459', // Cyan-500
    '#84CC1659', // Lime-500
    '#EAB30859', // Yellow-500
    '#A855F759', // Purple-500
    '#EC489959', // Pink-500
    '#22C55E59', // Green-500
    '#0EA5E959', // Sky-500
    '#F9731659', // Orange-500
    '#14B8A659', // Teal-500
    '#71717A59', // Zinc-500
    '#64748B59'  // Slate-500
];

const getNextUniqueColor = (currentColors) => {
    const usedColors = new Set(Object.values(currentColors));
    // Find first color from HIGH_CONTRAST_PALETTE that isn't used
    for (let i = 0; i < HIGH_CONTRAST_PALETTE.length; i++) {
        const color = HIGH_CONTRAST_PALETTE[i];
        if (!usedColors.has(color)) return color;
    }
    // Fallback: Generate a random color with 35% alpha if palette exhausted
    const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    return `#${hex}59`;
};

const getInitialFontColors = () => {
    const colors = {
        primary: '#00000059' // Black @ 35% alpha
    };
    // Assign unique colors to all system fonts in order
    systemFonts.forEach(font => {
        colors[font.id] = getNextUniqueColor(colors);
    });
    return colors;
};

const BrandFontFallback = () => {
    const { resetApp, isAppResetting } = usePersistence();
    const [primaryFont, setPrimaryFont] = useState(null);
    const [primaryMetrics, setPrimaryMetrics] = useState(null);
    const [selectedFallback, setSelectedFallback] = useState(systemFonts.find(f => f.id === 'arial'));
    const [customFonts, setCustomFonts] = useState([]);
    const [overrides, setOverrides] = useState(null);
    // Replace isAuto with configMode: 'auto' | 'default' | 'manual'
    const [configMode, setConfigMode] = useState('default');
    const [showBrowserGuides, setShowBrowserGuides] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showPrimaryGuides, setShowPrimaryGuides] = useState(false);
    const [limitToSizeAdjust, setLimitToSizeAdjust] = useState(false);

    const [isInitialized, setIsInitialized] = useState(false);
    const [fontColors, setFontColors] = useState(getInitialFontColors());
    const [fontDisplay, setFontDisplay] = useState('swap');
    // New: Persistence map for per-fallback settings
    const [fallbackConfigs, setFallbackConfigs] = useState({});

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
                            setConfigMode('default');
                            const defaultFallback = systemFonts.find(f => f.id === 'arial');
                            if (defaultFallback) {
                                setOverrides({
                                    sizeAdjust: 1.0,
                                    ascentOverride: 0,
                                    descentOverride: 0,
                                    lineGapOverride: 0,
                                    letterSpacing: 0,
                                    wordSpacing: 0,
                                    lineHeight: 'normal'
                                });
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
                    // Restore Fallback Configs Map
                    const restoredFallbackConfigs = config.fallbackConfigs || {};
                    setFallbackConfigs(restoredFallbackConfigs);

                    // Restore Fallback
                    let validFallback = null;
                    if (config.selectedFallbackId) {
                        let fallback = systemFonts.find(f => f.id === config.selectedFallbackId);
                        if (!fallback && config.customFonts) {
                            fallback = config.customFonts.find(f => f.id === config.selectedFallbackId);
                        }
                        // Fallback to arial if saved fallback not found but others exist
                        if (!fallback) fallback = systemFonts.find(f => f.id === 'arial');

                        if (fallback) {
                            setSelectedFallback(fallback);
                            validFallback = fallback;
                        }
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

                    // Restore Overrides and Mode for the selected fallback
                    // Priority: config.overrides (legacy/current session) -> fallbackConfigs[id] (new) -> Default
                    // Actually, if we have fallbackConfigs, we should prefer that for consistency? 
                    // But if user just refreshed, config.overrides is the exact last state.

                    if (config.overrides) setOverrides(config.overrides);

                    // Restore Config Mode (migration from isAuto)
                    if (config.configMode) {
                        setConfigMode(config.configMode);
                    } else if (typeof config.isAuto === 'boolean') {
                        // Migrate old isAuto
                        setConfigMode(config.isAuto ? 'auto' : 'manual');
                    }

                    // Sync initial fallback config if missing
                    if (validFallback && !restoredFallbackConfigs[validFallback.id] && config.overrides && config.configMode) {
                        // Only if we have explicit legacy overrides, maybe we should seed the map?
                        // Let's rely on the effect to populate it after mount.
                    }

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

    // Color Consistency: Ensure all fonts have unique colors, especially after adding new system fonts
    useEffect(() => {
        if (!isInitialized) return;

        setFontColors(prev => {
            let hasChanged = false;
            const nextColors = { ...prev };

            // 1. Ensure all system fonts have colors
            systemFonts.forEach(font => {
                if (!nextColors[font.id]) {
                    nextColors[font.id] = getNextUniqueColor(nextColors);
                    hasChanged = true;
                }
            });

            // 2. Ensure all custom fonts have colors
            customFonts.forEach(font => {
                if (!nextColors[font.id]) {
                    nextColors[font.id] = getNextUniqueColor(nextColors);
                    hasChanged = true;
                }
            });

            // 3. Detection of duplicates and re-assignment
            const seenColors = new Set();
            const duplicates = [];

            Object.entries(nextColors).forEach(([id, color]) => {
                if (seenColors.has(color)) {
                    duplicates.push(id);
                } else {
                    seenColors.add(color);
                }
            });

            if (duplicates.length > 0) {
                duplicates.forEach(id => {
                    nextColors[id] = getNextUniqueColor(nextColors);
                });
                hasChanged = true;
            }

            return hasChanged ? nextColors : prev;
        });
    }, [isInitialized, customFonts]); // Removed fontColors from dependencies

    // Persistence: Save Config (Debounced)
    useEffect(() => {
        if (!isInitialized) return;

        const saveConfig = () => {
            const config = {
                customFonts,
                selectedFallbackId: selectedFallback?.id,
                overrides,
                configMode, // Persist configMode
                showBrowserGuides,
                showPrimaryGuides,
                limitToSizeAdjust,
                fontColors,
                fontDisplay,
                fallbackConfigs // Persist map
            };
            localStorage.setItem('brand-font-config', JSON.stringify(config));
        };

        const timeoutId = setTimeout(saveConfig, 800); // 800ms debounce
        return () => {
            clearTimeout(timeoutId);
            saveConfig(); // Flush on unmount to avoid data loss
        };
    }, [isInitialized, customFonts, selectedFallback, overrides, configMode, showBrowserGuides, showPrimaryGuides, limitToSizeAdjust, fontColors, fontDisplay, fallbackConfigs]);

    // Internal Persistence: Sync current settings to fallbackConfigs map
    useEffect(() => {
        if (!isInitialized || !selectedFallback?.id) return;

        setFallbackConfigs(prev => {
            const current = prev[selectedFallback.id];

            // Determine if we should update manualOverrides
            const nextManualOverrides = configMode === 'manual' ? overrides : current?.manualOverrides;

            const shallowEqual = (a, b) => {
                if (a === b) return true;
                if (!a || !b) return false;
                const keysA = Object.keys(a);
                const keysB = Object.keys(b);
                if (keysA.length !== keysB.length) return false;
                return keysA.every(k => a[k] === b[k]);
            };

            if (current &&
                current.configMode === configMode &&
                current.limitToSizeAdjust === limitToSizeAdjust &&
                shallowEqual(current.overrides, overrides) &&
                shallowEqual(current.manualOverrides, nextManualOverrides)
            ) {
                return prev;
            }

            return {
                ...prev,
                [selectedFallback.id]: {
                    configMode,
                    limitToSizeAdjust,
                    overrides,
                    manualOverrides: nextManualOverrides
                }
            };
        });
    }, [configMode, limitToSizeAdjust, overrides, selectedFallback, isInitialized]);

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
        setConfigMode('auto'); // Reset to auto on new font

        // Save to IDB immediately (no debounce needed for single file event)
        // Check size again just in case, though useEffect handles it too. 
        // We let useEffect handle the actual save to keep it centralized.

        // Calculate immediately if we have a fallback
        if (selectedFallback && !selectedFallback.isCustom) {
            setOverrides(calculateOverrides(newMetrics, selectedFallback));
        }
    };

    const handleConfigModeChange = (newMode) => {
        if (selectedFallback?.isCustom && newMode !== 'manual') return;

        setConfigMode(newMode);

        if (newMode === 'default') {
            setOverrides({ sizeAdjust: 1.0, ascentOverride: 0, descentOverride: 0, lineGapOverride: 0, letterSpacing: 0, wordSpacing: 0 });
        } else if (newMode === 'auto') {
            if (primaryMetrics && selectedFallback) {
                setOverrides(calculateOverrides(primaryMetrics, selectedFallback));
            }
        } else if (newMode === 'manual') {
            // Restore manual overrides if we have them for this font
            const saved = fallbackConfigs[selectedFallback?.id];
            if (saved && saved.manualOverrides) {
                setOverrides(saved.manualOverrides);
            }
            // else: keep current overrides (from auto/default) as the starting point for manual
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

        // Restore configuration for this fallback if available
        if (fallbackConfigs[fallbackFont.id]) {
            const savedConfig = fallbackConfigs[fallbackFont.id];
            const mode = savedConfig.configMode || 'default';
            setConfigMode(mode);
            setLimitToSizeAdjust(!!savedConfig.limitToSizeAdjust);

            if (mode === 'manual' && savedConfig.manualOverrides) {
                setOverrides(savedConfig.manualOverrides);
            } else if (mode === 'auto') {
                if (primaryMetrics) {
                    setOverrides(calculateOverrides(primaryMetrics, fallbackFont));
                } else if (savedConfig.overrides) {
                    setOverrides(savedConfig.overrides);
                }
            } else {
                setOverrides({
                    sizeAdjust: 1.0,
                    ascentOverride: 0,
                    descentOverride: 0,
                    lineGapOverride: 0,
                    letterSpacing: 0,
                    wordSpacing: 0,
                    lineHeight: 'normal'
                });
            }
            return;
        }

        // Otherwise (first time selecting this fallback)
        if (fallbackFont.isCustom) {
            setConfigMode('manual');
            setOverrides({
                sizeAdjust: 1.0,
                ascentOverride: 0,
                descentOverride: 0,
                lineGapOverride: 0,
                letterSpacing: 0,
                wordSpacing: 0,
                lineHeight: 'normal'
            });
        } else {
            // Default to "Default" metrics (no overrides) as per user request
            setConfigMode('default');
            setOverrides({
                sizeAdjust: 1.0,
                ascentOverride: 0,
                descentOverride: 0,
                lineGapOverride: 0,
                letterSpacing: 0,
                wordSpacing: 0,
                lineHeight: 'normal'
            });
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

    const handleResetApp = async () => {
        await resetApp('brand-font'); // Reset only brand-font tool
    };



    const handleUpdateFontColor = (id, color) => {
        setFontColors(prev => ({
            ...prev,
            [id]: color
        }));
    };

    const handleManualUpdate = (key, value) => {
        // If updating manually, switch to manual mode if not already
        if (configMode === 'auto' || configMode === 'default') { // But wait, default implies no overrides?
            // Actually, if we update manually, we should switch to manual.
            // If we were default, and we touch a slider, we become manual.
            setConfigMode('manual');
        }

        setOverrides(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleCopyOverrides = (sourceFont) => {
        if (!primaryMetrics || !sourceFont) return;
        setOverrides(calculateOverrides(primaryMetrics, sourceFont));
        setConfigMode('manual'); // was setIsAuto(false)
    };

    // Format CSS for display
    // Format CSS for display (Export All)
    const cssOutput = useMemo(() => {
        if (!primaryFont || !primaryMetrics) return '';

        let css = '/* --- Font Face Definitions --- */\n\n';
        const pct = (n) => `${(n * 100).toFixed(2)}%`;
        const primaryFamily = primaryFont.fileName.replace(/\.[^/.]+$/, "");

        // 0. Primary Font Definition (Reference)
        css += `/* Primary Font: ${primaryFont.fileName} */\n`;
        css += `@font-face {\n`;
        css += `  font-family: '${primaryFamily}';\n`;
        css += `  src: url('[INSERT_FONT_URL_HERE]'); /* Update with your actual font path */\n`;
        css += `  font-display: ${fontDisplay};\n`;
        if (primaryFont.metadata?.staticWeight) {
            css += `  font-weight: ${primaryFont.metadata.staticWeight};\n`;
        }
        css += `}\n\n`;

        // Helper to get effective overrides for a font
        const getEffectiveOverrides = (font) => {
            // Priority:
            // 1. Currently active overrides state (if this is the selected font)
            if (selectedFallback?.id === font.id) {
                if (configMode === 'manual') return overrides;
                if (configMode === 'default') return { sizeAdjust: 1.0, letterSpacing: 0, wordSpacing: 0 };
            }

            // 2. Persisted config in fallbackConfigs
            const persisted = fallbackConfigs[font.id];
            if (persisted && persisted.configMode === 'manual') {
                return persisted.overrides;
            }

            // 3. Fallback to auto-calculated (or default 1.0)
            const auto = calculateOverrides(primaryMetrics, font) || { sizeAdjust: 1.0 };
            return {
                ...auto,
                letterSpacing: 0,
                wordSpacing: 0
            };
        };

        // Helper to generate @font-face block for fallbacks
        const generateFontFaceBlock = (fallbackName, familyName, ov) => {
            const hasOverriddenVerticals = !limitToSizeAdjust && (ov.ascentOverride || ov.descentOverride || ov.lineGapOverride);
            const hasSizeAdjust = ov.sizeAdjust !== undefined && Math.abs(ov.sizeAdjust - 1) > 0.0001;

            if (!hasSizeAdjust && !hasOverriddenVerticals) return '';

            let block = `/* Fallback Override for: ${fallbackName} */\n`;
            block += `@font-face {\n`;
            block += `  font-family: '${familyName}';\n`;
            block += `  src: local('${fallbackName}');\n`;

            if (hasSizeAdjust) {
                block += `  size-adjust: ${pct(ov.sizeAdjust)};\n`;
            }
            if (!limitToSizeAdjust) {
                if (ov.ascentOverride) block += `  ascent-override: ${pct(ov.ascentOverride)};\n`;
                if (ov.descentOverride) block += `  descent-override: ${pct(ov.descentOverride)};\n`;
                if (ov.lineGapOverride) block += `  line-gap-override: ${pct(ov.lineGapOverride)};\n`;
            }
            block += `  font-display: ${fontDisplay};\n`;
            block += `}\n\n`;

            // Also provide spacing as comments in the @font-face block for visibility
            const ls = ov.letterSpacing || 0;
            const ws = ov.wordSpacing || 0;
            if (ls !== 0 || ws !== 0) {
                block += `/* Recommended spacing for this fallback: */\n`;
                if (ls !== 0) block += `/* letter-spacing: ${ls}em; */\n`;
                if (ws !== 0) block += `/* word-spacing: ${ws}em; */\n\n`;
            }

            return block;
        };

        // Helper to generate usage class
        const generateUsageClass = (suffix, fallbackName, familyName, ov) => {
            const ls = ov.letterSpacing || 0;
            const ws = ov.wordSpacing || 0;
            const lh = ov.lineHeight || 'normal';
            const fontFaceBlock = generateFontFaceBlock(fallbackName, familyName, ov);

            // Only generate class if there are overrides OR a specific fallback font-face exists
            if (ls === 0 && ws === 0 && lh === 'normal' && !fontFaceBlock) return '';

            let block = `/* Usage for ${fallbackName} */\n`;
            block += `.font-with-fallback-${suffix.toLowerCase()} {\n`;
            // If the @font-face matches the system default (no block), we use the system name directly
            const familyToUse = fontFaceBlock ? familyName : fallbackName;
            block += `  font-family: '${primaryFamily}', '${familyToUse}', sans-serif;\n`;

            if (ls !== 0 || ws !== 0) {
                block += `  /* Spacing adjustments to match character widths */\n`;
                if (ls !== 0) block += `  letter-spacing: ${ls}em;\n`;
                if (ws !== 0) block += `  word-spacing: ${ws}em;\n`;
            }

            if (lh !== 'normal') {
                block += `  /* Custom line height */\n`;
                block += `  line-height: ${lh};\n`;
            }

            block += `}\n\n`;
            return block;
        };

        let fontFaceBlocks = '';
        let usageClasses = `/* Standard Usage */\n.font-primary {\n  font-family: '${primaryFamily}', sans-serif;\n}\n\n`;

        // 1. Simulated Fallbacks (System Fonts)
        systemFonts.forEach(font => {
            const ov = getEffectiveOverrides(font);
            if (ov) {
                const suffix = font.name.replace(/\s+/g, '');
                const familyName = `${primaryFamily} Fallback ${suffix}`;
                fontFaceBlocks += generateFontFaceBlock(font.name, familyName, ov);
                usageClasses += generateUsageClass(suffix, font.name, familyName, ov);
            }
        });

        // 2. Custom Fonts
        customFonts.forEach(font => {
            const ov = getEffectiveOverrides(font);
            if (ov) {
                const suffix = font.name.replace(/\s+/g, '');
                const familyName = `${primaryFamily} Fallback ${suffix}`;
                fontFaceBlocks += generateFontFaceBlock(font.name, familyName, ov);
                usageClasses += generateUsageClass(suffix, font.name, familyName, ov);
            }
        });

        css += fontFaceBlocks;
        css += '\n/* --- Usage Classes --- */\n\n';
        css += usageClasses;

        return css.trim();
    }, [overrides, selectedFallback, primaryFont, limitToSizeAdjust, fontDisplay, primaryMetrics, customFonts, configMode, fallbackConfigs]);

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
                onResetApp={() => setShowResetModal(true)}
                onReplacePrimaryFont={handleFontLoaded}
                fontColors={fontColors}
                onUpdateFontColor={handleUpdateFontColor}
                onExport={() => setIsModalOpen(true)}
            />

            <MetricSidebar
                configMode={configMode}
                handleConfigModeChange={handleConfigModeChange}
                limitToSizeAdjust={limitToSizeAdjust}
                setLimitToSizeAdjust={setLimitToSizeAdjust}
                overrides={overrides}
                handleManualUpdate={handleManualUpdate}
                selectedFallback={selectedFallback}
                primaryMetrics={primaryMetrics}
                calculateOverrides={calculateOverrides}
                setOverrides={setOverrides}
                fontColors={fontColors}
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
                                        navigator.clipboard.writeText(cssOutput).catch(() => {});
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

            <ResetConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleResetApp}
            />

            {isAppResetting && <ResetLoadingScreen />}
        </div>
    );
};

const BrandFontFallbackWithBoundary = () => (
    <ErrorBoundary>
        <BrandFontFallback />
    </ErrorBoundary>
);

export default BrandFontFallbackWithBoundary;
