
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PrimaryFontInput from './components/PrimaryFontInput';
import FallbackSelector from './components/FallbackSelector';
import BrandFontPreview from './components/BrandFontPreview';
import BufferedInput from '../../shared/components/BufferedInput';
import { calculateOverrides, formatCSS, extractFontMetrics } from '../../shared/utils/MetricCalculator';
import systemFonts from '../../shared/constants/systemFonts.json';
import appVersion from './version.json';

const BrandFontFallback = () => {
    const [primaryFont, setPrimaryFont] = useState(null);
    const [primaryMetrics, setPrimaryMetrics] = useState(null);
    const [selectedFallback, setSelectedFallback] = useState(systemFonts.find(f => f.id === 'arial'));
    const [customFonts, setCustomFonts] = useState([]);
    const [overrides, setOverrides] = useState(null);
    const [isAuto, setIsAuto] = useState(true);
    const [showBrowserGuides, setShowBrowserGuides] = useState(false);
    const [showPrimaryGuides, setShowPrimaryGuides] = useState(false);

    // Extract metrics when primary font loads
    const handleFontLoaded = (fontData) => {
        setPrimaryFont(fontData);

        // Extract metrics using utility
        const newMetrics = extractFontMetrics(fontData.font);

        setPrimaryMetrics(newMetrics);
        console.log("Extracted Primary Metrics:", newMetrics.metrics);
        setIsAuto(true); // Reset to auto on new font

        // Calculate immediately if we have a fallback
        if (selectedFallback && !selectedFallback.isCustom) {
            setOverrides(calculateOverrides(newMetrics, selectedFallback));
        }
    };

    const handleFallbackSelect = (fallbackFont) => {
        setSelectedFallback(fallbackFont);

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
        const newFont = {
            id: `custom-${Date.now()}`,
            name: name,
            isCustom: true
        };
        setCustomFonts(prev => [...prev, newFont]);
        handleFallbackSelect(newFont);
    };



    const handleManualUpdate = (key, value) => {
        setOverrides(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Format CSS for display
    const cssOutput = useMemo(() => {
        if (!overrides || !selectedFallback || !primaryFont) return '';
        const fmt = formatCSS(overrides);

        return `@font-face {
  font-family: '${primaryFont.fileName}_Fallback';
  src: local('${selectedFallback.name}');
  size-adjust: ${fmt['size-adjust']};
  ascent-override: ${fmt['ascent-override']};
  descent-override: ${fmt['descent-override']};
  line-gap-override: ${fmt['line-gap-override']};
}`;
    }, [overrides, selectedFallback, primaryFont]);

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col p-8">
            <div className="max-w-7xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            to="/"
                            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-2"
                        >
                            ← Back to Home
                        </Link>
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                Brand Font Fallback
                            </h1>
                            <span className="text-xs font-bold text-slate-300">v{appVersion.version}</span>
                        </div>
                        <p className="text-slate-500 mt-1">
                            Match fallback font metrics to your brand typeface.
                        </p>
                    </div>

                    {/* Primary Font Info (Moved to Top Right) */}
                    {primaryFont && (
                        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex items-center space-x-6 shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-1a.75.75 0 000 1.5h1v5a.75.75 0 001.5 0v-5h1a.75.75 0 000-1.5h-1v-2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900">{primaryFont.fileName}</h3>
                                    <p className="text-xs text-slate-500">
                                        {primaryFont.metadata?.staticWeight || 400} • {primaryFont.metadata.isVariable ? 'Variable' : 'Static'}
                                    </p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <button
                                onClick={() => {
                                    setPrimaryFont(null);
                                    setPrimaryMetrics(null);
                                    setSelectedFallback(null);
                                    setOverrides(null);
                                }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                            >
                                Remove Font
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="space-y-8">
                    {!primaryFont ? (
                        <div className="max-w-xl mx-auto py-20">
                            <PrimaryFontInput onFontLoaded={handleFontLoaded} />
                        </div>
                    ) : (
                        <>
                            {/* TOP: Preview Area (Prominent) */}
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
                                    />
                                ) : (
                                    <div className="h-[300px] flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                                        <p>Select a fallback font below to see the preview.</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                {/* LEFT: Fallback Selection (Narrow) */}
                                <div className="lg:col-span-3 flex flex-col justify-between">
                                    <FallbackSelector
                                        selectedFontId={selectedFallback?.id}
                                        onSelect={handleFallbackSelect}
                                        customFonts={customFonts}
                                        onAddCustomFont={handleAddCustomFont}
                                    />
                                </div>

                                {/* RIGHT: Configuration & Action Area */}
                                <div className="lg:col-span-9 space-y-6">
                                    {/* Manual Overrides Panel */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-8">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <h3 className="font-semibold text-slate-900">Configuration</h3>
                                                <p className="text-xs text-slate-500">
                                                    {isAuto ? 'Automatically matched to brand font' : 'Manual override mode enabled'}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Reset Button (Manual Mode Only) */}
                                                {!isAuto && (
                                                    <button
                                                        onClick={() => setOverrides({
                                                            sizeAdjust: 1.0,
                                                            ascentOverride: 0,
                                                            descentOverride: 0,
                                                            lineGapOverride: 0
                                                        })}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group"
                                                        title="Reset to Defaults"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Auto/Manual Toggle - Segmented Control */}
                                                <div className="flex items-center bg-slate-100/50 p-1 rounded-lg border border-slate-200">
                                                    <button
                                                        onClick={() => {
                                                            if (selectedFallback?.isCustom) return; // Prevent enabling auto for custom fonts
                                                            setIsAuto(true);
                                                            if (primaryMetrics && selectedFallback) {
                                                                setOverrides(calculateOverrides(primaryMetrics, selectedFallback));
                                                            }
                                                        }}
                                                        disabled={selectedFallback?.isCustom}
                                                        className={`
                                                            px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border
                                                            ${isAuto
                                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm'
                                                                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                                            }
                                                            ${selectedFallback?.isCustom ? 'opacity-50 cursor-not-allowed' : ''}
                                                        `}
                                                    >
                                                        Auto
                                                    </button>
                                                    <button
                                                        onClick={() => setIsAuto(false)}
                                                        className={`
                                                            px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border
                                                            ${!isAuto
                                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm'
                                                                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                                            }
                                                        `}
                                                    >
                                                        Manual
                                                    </button>
                                                </div>

                                                {/* CSS Export Button */}
                                                <button
                                                    onClick={() => setIsModalOpen(true)}
                                                    disabled={!selectedFallback}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <span>Get CSS</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {overrides && (
                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 transition-opacity ${isAuto ? 'opacity-70 pointer-events-none slatescale' : 'opacity-100'}`}>
                                                {/* Size Adjust */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                                                        <span>Size Adjust</span>
                                                        <div className="flex items-center gap-1">
                                                            <BufferedInput
                                                                type="number"
                                                                value={Math.round((overrides.sizeAdjust || 0) * 10000) / 100}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) handleManualUpdate('sizeAdjust', val / 100);
                                                                }}
                                                                className="w-12 bg-transparent text-right outline-none text-blue-600 font-mono border-b border-blue-200 focus:border-blue-500"
                                                            />
                                                            <span className="text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="50"
                                                        max="150"
                                                        step="0.1"
                                                        value={(overrides.sizeAdjust || 0) * 100}
                                                        onChange={(e) => handleManualUpdate('sizeAdjust', parseFloat(e.target.value) / 100)}
                                                        className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>

                                                {/* Ascent Override */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                                                        <span>Ascent Override</span>
                                                        <div className="flex items-center gap-1">
                                                            <BufferedInput
                                                                type="number"
                                                                value={Math.round((overrides.ascentOverride || 0) * 10000) / 100}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) handleManualUpdate('ascentOverride', val / 100);
                                                                }}
                                                                className="w-12 bg-transparent text-right outline-none text-blue-600 font-mono border-b border-blue-200 focus:border-blue-500"
                                                            />
                                                            <span className="text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="150"
                                                        step="0.1"
                                                        value={(overrides.ascentOverride || 0) * 100}
                                                        onChange={(e) => handleManualUpdate('ascentOverride', parseFloat(e.target.value) / 100)}
                                                        className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>

                                                {/* Descent Override */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                                                        <span>Descent Override</span>
                                                        <div className="flex items-center gap-1">
                                                            <BufferedInput
                                                                type="number"
                                                                value={Math.round((overrides.descentOverride || 0) * 10000) / 100}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) handleManualUpdate('descentOverride', val / 100);
                                                                }}
                                                                className="w-12 bg-transparent text-right outline-none text-blue-600 font-mono border-b border-blue-200 focus:border-blue-500"
                                                            />
                                                            <span className="text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={(overrides.descentOverride || 0) * 100}
                                                        onChange={(e) => handleManualUpdate('descentOverride', parseFloat(e.target.value) / 100)}
                                                        className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>

                                                {/* Line Gap Override */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                                                        <span>Line Gap Override</span>
                                                        <div className="flex items-center gap-1">
                                                            <BufferedInput
                                                                type="number"
                                                                value={Math.round((overrides.lineGapOverride || 0) * 10000) / 100}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) handleManualUpdate('lineGapOverride', val / 100);
                                                                }}
                                                                className="w-12 bg-transparent text-right outline-none text-blue-600 font-mono border-b border-blue-200 focus:border-blue-500"
                                                            />
                                                            <span className="text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={(overrides.lineGapOverride || 0) * 100}
                                                        onChange={(e) => handleManualUpdate('lineGapOverride', parseFloat(e.target.value) / 100)}
                                                        className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}


                                    </div>
                                </div>
                            </div>
                        </>
                    )}
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
                                    // Could add toast here
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
    );
};

export default BrandFontFallback;
