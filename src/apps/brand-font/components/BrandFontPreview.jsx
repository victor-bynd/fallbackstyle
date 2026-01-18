
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import MetricGuidesOverlay from '../../../shared/components/MetricGuidesOverlay'; // Cross-component usage or move to Common?
// MetricGuidesOverlay was moved to MultiLanguage. If it is used here, we import it from there.
import { calculateNumericLineHeight } from '../../../shared/utils/fontUtils';
import StrategySelector from './StrategySelector'; // Import StrategySelector

const BrandFontPreview = ({
    primaryFont,
    fallbackFont,
    overrides,
    showBrowserGuides,
    setShowBrowserGuides,
    showPrimaryGuides,
    setShowPrimaryGuides,
    limitToSizeAdjust,
    fontColors = {},
    fontDisplay = 'auto',
    setFontDisplay
}) => {
    const [text, setText] = useState("The quick brown fox jumps over the lazy dog");
    const [fontSize, setFontSize] = useState(90);
    const [showGuides, setShowGuides] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // New state for config modal
    const [tempText, setTempText] = useState(text);

    // Simulation State
    const [simulationState, setSimulationState] = useState('idle'); // 'idle' | 'running' | 'finished'
    const [isLoading, setIsLoading] = useState(false);
    const [hasBlockTimeoutPassed, setHasBlockTimeoutPassed] = useState(false);
    const [loadDuration] = useState(0.7); // 0.7s + 0.3s delay = 1.0s Total
    const [elapsedTime, setElapsedTime] = useState(0);

    const isSimulating = simulationState !== 'idle'; // helper

    // Note: In a real environment, we'd need the @font-face to be active.
    // Since we can't easily inject dynamic @font-face here without a style tag,
    // we will simulate the visual effect or inject a style tag.
    // Injecting a style tag is better for accurate rendering.


    // We need to inject the @font-face into the document to see the overrides applied
    useEffect(() => {
        if (!primaryFont || !fallbackFont || !overrides) return;

        const styleId = 'brand-font-fallback-preview';
        let styleTag = document.getElementById(styleId);

        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        const pct = (n) => `${(n * 100).toFixed(4)}%`;

        const css = `
            @font-face {
                font-family: 'FallbackPreview-${fallbackFont.id}';
                src: ${fallbackFont.filename ? `url('/reference_fonts/${fallbackFont.filename}')` : `local('${fallbackFont.name}')`};
                size-adjust: ${pct(overrides.sizeAdjust)};
                ${!limitToSizeAdjust ? `
                ascent-override: ${pct(overrides.ascentOverride)};
                descent-override: ${pct(overrides.descentOverride)};
                line-gap-override: ${pct(overrides.lineGapOverride)};
                ` : ''}
            }
            
            @font-face {
                font-family: 'PrimaryPreview';
                src: url('${primaryFont.url}');
            }
        `;

        styleTag.textContent = css;

        return () => {
            // Cleanup? Maybe keep it for smooth transitions, but safer to remove if component unmounts
            // styleTag.remove(); 
        };
    }, [primaryFont, fallbackFont, overrides, limitToSizeAdjust]);

    const LINE_HEIGHT = 1.5;
    const numericLineHeight = calculateNumericLineHeight(LINE_HEIGHT, primaryFont?.font);

    const openEditModal = () => {
        setTempText(text);
        setIsEditModalOpen(true);
    };

    const saveText = () => {
        setText(tempText);
        setIsEditModalOpen(false);
    };

    const PAGE_LOAD_DELAY = 300; // ms

    const runSimulation = () => {
        if (simulationState === 'running') return;

        const strategy = fontDisplay === 'auto' ? 'block' : fontDisplay;

        setSimulationState('running');
        setIsLoading(true);
        setElapsedTime(0);
        // Instant swap for 'swap' strategy, otherwise wait for timeout
        setHasBlockTimeoutPassed(strategy === 'swap');

        // Define block period based on strategy
        let blockPeriod = 0;
        if (strategy === 'block') blockPeriod = 3000;
        else if (strategy === 'fallback' || strategy === 'optional') blockPeriod = 100;

        // Start Timer Interval
        const startTime = Date.now();
        const durationMs = (loadDuration * 1000) + PAGE_LOAD_DELAY;

        const timerInterval = setInterval(() => {
            const currentElapsed = Date.now() - startTime;
            if (currentElapsed >= durationMs) {
                setElapsedTime(durationMs / 1000); // cap at duration
                clearInterval(timerInterval);
            } else {
                setElapsedTime(currentElapsed / 1000);
            }
        }, 16); // ~60fps

        // Timer 1: Block Timeout
        let blockTimer = null;
        if (strategy !== 'swap') {
            blockTimer = setTimeout(() => {
                setHasBlockTimeoutPassed(true);
            }, blockPeriod + PAGE_LOAD_DELAY);
        }

        // Timer 2: "Network" Load Completion
        setTimeout(() => {
            setIsLoading(false);
            if (blockTimer) clearTimeout(blockTimer);
            clearInterval(timerInterval);
            setElapsedTime(durationMs / 1000);

            // Transition to 'finished' state
            setSimulationState('finished');
        }, durationMs);
    };

    const resetSimulation = () => {
        setSimulationState('idle');
        setIsLoading(false);
        setHasBlockTimeoutPassed(false);
        setElapsedTime(0);
    };

    // Derived Visual State Calculation
    const getLayoutMode = () => {
        // Default (Loaded/Idle)
        if (!isLoading) {
            // Optional Failure Simulation
            if (isSimulating && fontDisplay === 'optional' && (loadDuration * 1000) > 100) {
                return 'fallback';
            }
            // Simulation Completed (Network finished): Show Primary ("Loaded") - Persistent until reset
            if (simulationState === 'finished') {
                return 'primary';
            }
            // Not Simulating: Mixed (Overlay) Mode for tuning
            return 'mixed';
        }

        const strategy = fontDisplay === 'auto' ? 'block' : fontDisplay;

        // --- LOADING STATE ---

        // 0. Page Load Latency
        if (isSimulating && elapsedTime < (PAGE_LOAD_DELAY / 1000)) {
            return 'blank';
        }

        // 1. Block Period
        if (!hasBlockTimeoutPassed && strategy !== 'swap') {
            return 'invisible-primary';
        }

        // 2. Swap Period
        return 'fallback';
    };

    const layoutMode = getLayoutMode(); // 'primary' | 'fallback' | 'invisible-primary' | 'mixed'

    const primaryStyle = {
        opacity: layoutMode === 'invisible-primary' ? 0 : 1,
        transition: isSimulating ? 'none' : 'opacity 0.2s', // Snap during sim/finish, fade during tuning
        display: layoutMode === 'fallback' ? 'none' : 'block'
    };

    const fallbackStyle = {
        opacity: 1,
        transition: isSimulating ? 'none' : 'opacity 0.2s', // Snap during sim/finish, fade during tuning
        display: (layoutMode === 'primary' || layoutMode === 'invisible-primary') ? 'none' : 'block'
    };

    // Helper to get block period based on strategy
    const getBlockPeriod = (strat) => {
        if (strat === 'block') return 3000;
        if (strat === 'fallback' || strat === 'optional') return 100;
        return 0; // swap
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-4 bg-gray-50 border-b border-gray-200 gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Preview</span>
                    <button
                        onClick={openEditModal}
                        className="p-1.5 rounded-md bg-white border border-gray-300 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                        title="Edit Preview Text"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Size</label>
                        <input
                            type="range"
                            min="12"
                            max="200"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-24 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-500 w-8 tabular-nums">{fontSize}px</span>
                    </div>



                    <div className="flex items-center gap-2">
                        <button
                            onClick={simulationState === 'finished' ? resetSimulation : runSimulation}
                            disabled={simulationState === 'running'}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider",
                                simulationState === 'running' ? 'bg-slate-100 text-slate-400' :
                                    simulationState === 'finished' ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm' :
                                        'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                            )}
                            title={simulationState === 'finished' ? "Reset Preview" : "Simulate Loading"}
                        >
                            {simulationState === 'running' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 animate-spin">
                                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.451a.75.75 0 000-1.5H4.125a.75.75 0 00-.75.75v4.125a.75.75 0 001.5 0v-2.102l.312.312a7 7 0 0011.724-3.141.75.75 0 00-1.599-.309zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311h-2.451a.75.75 0 000 1.5h4.125a.75.75 0 00.75-.75V3.125a.75.75 0 00-1.5 0v2.102l-.312-.312A7 7 0 003.088 8.056a.75.75 0 101.599.309z" clipRule="evenodd" />
                                    </svg>
                                    <span>Running...</span>
                                </>
                            ) : simulationState === 'finished' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.451a.75.75 0 000-1.5H4.125a.75.75 0 00-.75.75v4.125a.75.75 0 001.5 0v-2.102l.312.312a7 7 0 0011.724-3.141.75.75 0 00-1.599-.309zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311h-2.451a.75.75 0 000 1.5h4.125a.75.75 0 00.75-.75V3.125a.75.75 0 00-1.5 0v2.102l-.312-.312A7 7 0 003.088 8.056a.75.75 0 101.599.309z" clipRule="evenodd" />
                                    </svg>
                                    <span>RESET</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z" clipRule="evenodd" />
                                    </svg>
                                    <span>SIMULATE LOAD</span>
                                </>
                            )}
                        </button>



                        {/* Strategy Settings Button */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all border border-slate-200 hover:border-indigo-200 flex items-center gap-2"
                                title="Configure Loading Strategy"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[10px] font-bold uppercase tracking-wider">LOAD STRATEGY</span>
                            </button>
                        </div>
                    </div>





                    <div className="h-6 w-px bg-gray-300"></div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowGuides(!showGuides)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border",
                                showGuides
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setShowPrimaryGuides(!showPrimaryGuides)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border",
                                showPrimaryGuides
                                    ? "bg-rose-50 border-rose-200 text-rose-600 ring-1 ring-rose-500/10 shadow-sm"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            BRAND LINEBOX
                        </button>
                        <button
                            onClick={() => setShowBrowserGuides(!showBrowserGuides)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border",
                                showBrowserGuides
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            FALLBACK LINEBOX
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="relative p-8 overflow-hidden flex flex-col items-start bg-white min-h-[300px]">

                {/* Simulation Visualization Overlay */}
                {(simulationState === 'running' || simulationState === 'finished') && (
                    <div className="absolute top-0 left-0 right-0 p-4 z-40 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none">
                        <div className="max-w-2xl mx-auto w-full flex flex-col gap-1">
                            {/* Timeline */}
                            <div className="relative h-1 bg-slate-100 rounded-full overflow-hidden w-full">
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-75 ease-linear"
                                    style={{ width: `${(elapsedTime / ((loadDuration) + (300 / 1000))) * 100}%` }}
                                ></div>
                            </div>

                            {/* Stage Indicators */}
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <div className={clsx("flex flex-col items-center transition-colors", elapsedTime >= 0 ? "text-slate-800" : "")}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current mb-0.5 ring-2 ring-white"></div>
                                    Start (0s)
                                </div>

                                {/* Page Load Marker */}
                                <div className="absolute left-0 w-full flex justify-center pointer-events-none" style={{
                                    paddingLeft: `${(PAGE_LOAD_DELAY / ((loadDuration * 1000) + PAGE_LOAD_DELAY)) * 100}%`,
                                    transform: 'translateX(-50%)'
                                }}>
                                    <div className={clsx("flex flex-col items-center transition-colors", elapsedTime >= (PAGE_LOAD_DELAY / 1000) ? "text-slate-600" : "")}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current mb-0.5 ring-2 ring-white"></div>
                                        Paint ({(PAGE_LOAD_DELAY / 1000).toFixed(1)}s)
                                    </div>
                                </div>

                                {/* Dynamic Middle Stage: Only if block period exists and is less than duration */}
                                {(() => {
                                    const totalDurationMs = (loadDuration * 1000) + PAGE_LOAD_DELAY;
                                    const blockPeriodMs = getBlockPeriod(fontDisplay === 'auto' ? 'block' : fontDisplay);

                                    // The Native Font becomes visible AFTER Page Load + Block Period
                                    const visibleAtMs = PAGE_LOAD_DELAY + blockPeriodMs;

                                    if (blockPeriodMs > 0 && visibleAtMs < totalDurationMs) {
                                        const isPastBlock = (elapsedTime * 1000) >= visibleAtMs;
                                        return (
                                            <div className="absolute left-0 w-full flex justify-center pointer-events-none" style={{
                                                paddingLeft: `${(visibleAtMs / totalDurationMs) * 100}%`,
                                                transform: 'translateX(-50%)'
                                            }}>
                                                <div className={clsx("flex flex-col items-center transition-colors", isPastBlock ? "text-orange-600" : "")}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current mb-0.5 ring-2 ring-white"></div>
                                                    Native Font Visible ({(visibleAtMs / 1000).toFixed(1)}s)
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                })()}

                                <div className={clsx("flex flex-col items-center transition-colors", simulationState === 'finished' ? "text-green-600" : "")}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current mb-0.5 ring-2 ring-white"></div>
                                    Webfont Loaded ({(loadDuration + (PAGE_LOAD_DELAY / 1000)).toFixed(1)}s)
                                </div>
                            </div>
                        </div>
                    </div>
                )}




                {/* Grid Background */}
                <div className={clsx("absolute inset-0 pointer-events-none transition-opacity duration-300", isSimulating ? "opacity-0" : "opacity-[0.03]")}
                    style={{
                        backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                ></div>

                <div className="grid grid-cols-1 grid-rows-1 items-baseline w-full" style={{ fontSize: `${fontSize}px`, lineHeight: LINE_HEIGHT }}>
                    {/* Primary Wrapper */}
                    {(layoutMode !== 'fallback' && layoutMode !== 'blank') && (
                        <div
                            className={clsx(
                                "col-start-1 row-start-1 relative pointer-events-none whitespace-normal break-words z-10 transition-all",
                                !isSimulating && "mix-blend-multiply"
                            )}
                            style={{
                                fontFamily: 'PrimaryPreview',
                                color: isSimulating ? '#000000' : (fontColors.primary || '#00000080'),
                            }}
                        >
                            <div style={{ ...primaryStyle, display: 'block' /* Force block as wrapper handles conditional */ }}>
                                {showPrimaryGuides && !isSimulating ? (
                                    text.split('').map((char, i) => (
                                        <span key={i} style={{
                                            outline: `1px solid ${fontColors.primary || '#EF4444'}`,
                                            backgroundColor: `${fontColors.primary || '#EF4444'}1A`, // 10% opacity hex
                                            borderRadius: '2px'
                                        }}>{char}</span>
                                    ))
                                ) : (
                                    text
                                )}
                                <MetricGuidesOverlay
                                    fontObject={primaryFont?.font}
                                    fontSizePx={fontSize}
                                    lineHeight={numericLineHeight}
                                    showAlignmentGuides={showGuides && !isSimulating}
                                    showBrowserGuides={showBrowserGuides && !isSimulating}
                                    fullWidth={true}
                                />
                            </div>
                        </div>
                    )}

                    {/* Fallback Wrapper */}
                    {(layoutMode !== 'primary' && layoutMode !== 'invisible-primary' && layoutMode !== 'blank') && (
                        <div
                            className={clsx(
                                "col-start-1 row-start-1 whitespace-normal break-words z-0 transition-all",
                                !isSimulating && "mix-blend-multiply"
                            )}
                            style={{
                                fontFamily: `FallbackPreview-${fallbackFont.id}`,
                                color: isSimulating ? '#000000' : (fontColors[fallbackFont.id] || '#3B82F680'),
                            }}
                        >
                            <div style={{ ...fallbackStyle, display: 'block' /* Force block as wrapper handles conditional */ }}>
                                {showBrowserGuides && !isSimulating ? (
                                    text.split('').map((char, i) => (
                                        <span key={i} style={{
                                            outline: `1px solid ${fontColors[fallbackFont.id] || '#3B82F6'}`,
                                            backgroundColor: `${fontColors[fallbackFont.id] || '#3B82F6'}1A`, // 10% opacity hex
                                            borderRadius: '2px'
                                        }}>{char}</span>
                                    ))
                                ) : (
                                    text
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Text Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                Edit Preview Text
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={tempText}
                                onChange={(e) => setTempText(e.target.value)}
                                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                                placeholder="Type your preview text here..."
                                autoFocus
                            />
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveText}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Save Text
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Strategy Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSettingsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                Font Loading Strategy
                            </h3>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <StrategySelector value={fontDisplay} onChange={(val) => {
                                setFontDisplay(val);
                                // Optional: close on select? No, let user explore options.
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandFontPreview;
