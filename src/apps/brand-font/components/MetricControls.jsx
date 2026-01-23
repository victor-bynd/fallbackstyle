import React from 'react';
import BufferedInput from '../../../shared/components/BufferedInput';
import InfoTooltip from '../../../shared/components/InfoTooltip';

const MetricControls = ({
    configMode,
    setConfigMode,
    limitToSizeAdjust,
    setLimitToSizeAdjust,
    overrides,
    handleManualUpdate,
    selectedFallback,
    primaryMetrics,
    calculateOverrides,
    setOverrides,
    isSidebar = false // New prop
}) => {
    return (
        <div className={`${isSidebar ? 'space-y-6' : 'bg-white rounded-2xl border transition-all duration-500 shadow-sm p-4 space-y-5'} ${!isSidebar && (configMode === 'manual' ? 'border-indigo-200 ring-4 ring-indigo-50/50' : 'border-slate-200')
            }`}>
            {/* Controls Row */}
            <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100`}>
                <div className="flex flex-col">
                    {!isSidebar && (
                        <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider mb-1">Metrics Configuration</h3>
                    )}
                    <div className="flex items-center gap-2">
                        <p className={`text-[10px] font-bold tracking-tight px-2 py-0.5 rounded-md transition-all ${configMode === 'manual'
                            ? 'bg-indigo-50 text-indigo-700'
                            : configMode === 'auto'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-50 text-slate-500'
                            }`}>
                            {configMode === 'auto' ? 'AUTO-CALCULATED' :
                                configMode === 'default' ? 'NATIVE DEFAULT' : 'MANUAL CONTROL'}
                        </p>
                        <div className={`p-1 rounded-full transition-all ${configMode === 'manual' ? 'text-indigo-600' : 'text-slate-300'}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className={`w-3.5 h-3.5 ${configMode === 'manual' ? 'invisible' : ''}`}
                            >
                                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full">
                    <div className="flex items-center gap-3 w-full">
                        {/* Mode Toggles */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedFallback?.isCustom) return;
                                    setConfigMode('default');
                                    setOverrides({ sizeAdjust: 1.0, ascentOverride: 0, descentOverride: 0, lineGapOverride: 0, letterSpacing: 0, wordSpacing: 0 });
                                }}
                                disabled={selectedFallback?.isCustom}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${configMode === 'default' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${selectedFallback?.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                Default
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedFallback?.isCustom) return;
                                    setConfigMode('auto');
                                    if (primaryMetrics && selectedFallback) setOverrides(calculateOverrides(primaryMetrics, selectedFallback));
                                }}
                                disabled={selectedFallback?.isCustom}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${configMode === 'auto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${selectedFallback?.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                Auto
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfigMode('manual')}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${configMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Manual
                            </button>
                        </div>
                    </div>

                    {/* View Toggles */}
                    <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setLimitToSizeAdjust(false)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${!limitToSizeAdjust ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                All Metrics
                            </button>
                            <button
                                type="button"
                                onClick={() => setLimitToSizeAdjust(true)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${limitToSizeAdjust ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Safari Support
                            </button>
                        </div>
                        <InfoTooltip content="Size-adjust has the most browser support. Safari does not support ascent, descent, or line-gap overrides." />
                    </div>

                    {configMode === 'manual' && !isSidebar && (
                        <button
                            type="button"
                            onClick={() => setOverrides({ sizeAdjust: 1.0, ascentOverride: 0, descentOverride: 0, lineGapOverride: 0, letterSpacing: 0, wordSpacing: 0 })}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 hidden md:block"
                            title="Reset to Defaults"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {overrides && (
                <div className={`grid gap-x-8 gap-y-6 transition-all duration-300 ${isSidebar ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} ${configMode !== 'manual' ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                    <div className="group space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Size Adjust</label>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
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

                    <div className={`group space-y-2 transition-all duration-300 ${limitToSizeAdjust ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Ascent Override</label>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
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

                    <div className={`group space-y-2 transition-all duration-300 ${limitToSizeAdjust ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Descent Override</label>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
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

                    <div className={`group space-y-2 transition-all duration-300 ${limitToSizeAdjust ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Line Gap Override</label>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
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

                    <div className="group space-y-2 transition-all duration-300">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Letter Spacing</label>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
                                <BufferedInput
                                    type="number"
                                    value={Math.round((overrides.letterSpacing || 0) * 1000) / 1000}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) handleManualUpdate('letterSpacing', val);
                                    }}
                                    className="w-14 bg-transparent text-right outline-none text-indigo-600 font-mono text-[12px] font-bold"
                                />
                                <span className="text-[10px] font-bold text-slate-300">em</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="-0.25"
                            max="0.25"
                            step="0.001"
                            value={overrides.letterSpacing || 0}
                            onChange={(e) => handleManualUpdate('letterSpacing', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                        />
                    </div>

                    <div className="group space-y-2 transition-all duration-300">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Word Spacing</label>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 group-focus-within:bg-white transition-all">
                                <BufferedInput
                                    type="number"
                                    value={Math.round((overrides.wordSpacing || 0) * 1000) / 1000}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) handleManualUpdate('wordSpacing', val);
                                    }}
                                    className="w-14 bg-transparent text-right outline-none text-indigo-600 font-mono text-[12px] font-bold"
                                />
                                <span className="text-[10px] font-bold text-slate-300">em</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="-0.5"
                            max="0.5"
                            step="0.005"
                            value={overrides.wordSpacing || 0}
                            onChange={(e) => handleManualUpdate('wordSpacing', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                        />
                    </div>
                </div>
            )}

            <div className="border-t border-slate-100 pt-8 text-[11px] text-slate-400 text-center italic">
                Font loading strategy can now be configured in the simulation toolbar above.
            </div>
        </div>
    );
};

export default MetricControls;
