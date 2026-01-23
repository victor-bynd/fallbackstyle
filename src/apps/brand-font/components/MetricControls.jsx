import React from 'react';
import BufferedInput from '../../../shared/components/BufferedInput';
import InfoTooltip from '../../../shared/components/InfoTooltip';

const MetricControls = ({
    configMode,
    handleConfigModeChange,
    limitToSizeAdjust,
    setLimitToSizeAdjust,
    overrides,
    handleManualUpdate,
    selectedFallback,
    primaryMetrics,
    calculateOverrides,
    setOverrides,
    isSidebar = false, // New prop
    fontColors = {}
}) => {
    const fallbackColor = (selectedFallback && fontColors[selectedFallback.id]) ? fontColors[selectedFallback.id].slice(0, 7) : '#6366f1';

    return (
        <div className={isSidebar ? 'flex flex-col h-full' : 'bg-white rounded-2xl border transition-all duration-500 shadow-sm p-4 space-y-5 border-slate-200'}>
            <div className={`${isSidebar ? 'p-6 pb-2 space-y-6' : 'p-2 space-y-5'} flex-1`}>
                {/* Controls Header Row */}
                <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100`}>
                    <div className="flex flex-col">
                        {!isSidebar && (
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Metrics Configuration</h3>
                        )}
                        <div className="flex items-center gap-2">
                            <p className={`text-[10px] font-black tracking-[0.2em] px-2 py-0.5 rounded transition-all ${configMode === 'manual'
                                ? 'bg-indigo-50 text-indigo-700'
                                : configMode === 'auto'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-50 text-slate-500'
                                }`}>
                                {configMode === 'auto' ? 'AUTO-CALCULATED' :
                                    configMode === 'default' ? 'NATIVE DEFAULT' : 'MANUAL CONTROL'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center gap-3 w-full">
                            {/* Mode Toggles */}
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm w-full">
                                <button
                                    type="button"
                                    onClick={() => handleConfigModeChange('default')}
                                    disabled={selectedFallback?.isCustom}
                                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${configMode === 'default' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${selectedFallback?.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Default
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfigModeChange('auto')}
                                    disabled={selectedFallback?.isCustom}
                                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${configMode === 'auto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${selectedFallback?.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Auto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfigModeChange('manual')}
                                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${configMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Manual
                                </button>
                            </div>
                        </div>

                        {/* View Toggles */}
                        <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm flex-1">
                                <button
                                    type="button"
                                    onClick={() => setLimitToSizeAdjust(false)}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${!limitToSizeAdjust ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                    All Metrics
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLimitToSizeAdjust(true)}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${limitToSizeAdjust ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Safari
                                </button>
                            </div>
                            <InfoTooltip content="Size-adjust has the most browser support. Safari does not support ascent, descent, or line-gap overrides." />
                        </div>
                    </div>
                </div>

                {overrides && (
                    <div className={`grid gap-x-8 gap-y-6 transition-all duration-300 ${isSidebar ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} ${configMode !== 'manual' ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
                        {/* Size Adjust */}
                        <div className="group space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Size Adjust</label>
                                    <button
                                        onClick={() => handleManualUpdate('sizeAdjust', 1.0)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                                        title="Reset to 100%"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={Math.round((overrides.sizeAdjust || 0) * 10000) / 100}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('sizeAdjust', val / 100);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
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
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>

                        {/* Ascent Override */}
                        <div className={`group space-y-2 transition-all duration-300 ${limitToSizeAdjust ? 'hidden' : ''}`}>
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Ascent</label>
                                    <button
                                        onClick={() => handleManualUpdate('ascentOverride', 0)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                                        title="Reset to 0%"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={Math.round((overrides.ascentOverride || 0) * 10000) / 100}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('ascentOverride', val / 100);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
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
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>

                        {/* Descent Override */}
                        <div className={`group space-y-2 transition-all duration-300 ${limitToSizeAdjust ? 'hidden' : ''}`}>
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Descent</label>
                                    <button
                                        onClick={() => handleManualUpdate('descentOverride', 0)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                                        title="Reset to 0%"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={Math.round((overrides.descentOverride || 0) * 10000) / 100}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('descentOverride', val / 100);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
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
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>

                        {/* Line Gap */}
                        <div className={`group space-y-2 transition-all duration-300 ${limitToSizeAdjust ? 'hidden' : ''}`}>
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Line Gap</label>
                                    <button
                                        onClick={() => handleManualUpdate('lineGapOverride', 0)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                                        title="Reset to 0%"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={Math.round((overrides.lineGapOverride || 0) * 10000) / 100}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('lineGapOverride', val / 100);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
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
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>

                        {/* Letter Spacing */}
                        <div className="group space-y-2 transition-all duration-300">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Letter Spacing</label>
                                    <button
                                        onClick={() => handleManualUpdate('letterSpacing', 0)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                                        title="Reset to 0em"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={Math.round((overrides.letterSpacing || 0) * 1000) / 1000}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('letterSpacing', val);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
                                    />
                                    <span className="text-[10px] font-bold text-slate-300">em</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="-0.75"
                                max="0.75"
                                step="0.001"
                                value={overrides.letterSpacing || 0}
                                onChange={(e) => handleManualUpdate('letterSpacing', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>

                        {/* Word Spacing */}
                        <div className="group space-y-2 transition-all duration-300">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Word Spacing</label>
                                    <button
                                        onClick={() => handleManualUpdate('wordSpacing', 0)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                                        title="Reset to 0em"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={Math.round((overrides.wordSpacing || 0) * 1000) / 1000}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('wordSpacing', val);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
                                    />
                                    <span className="text-[10px] font-bold text-slate-300">em</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="-0.75"
                                max="0.75"
                                step="0.005"
                                value={overrides.wordSpacing || 0}
                                onChange={(e) => handleManualUpdate('wordSpacing', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>

                        {/* Line Height */}
                        <div className="group space-y-2 transition-all duration-300">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Line Height</label>
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 shadow-sm ml-1">
                                        <button
                                            type="button"
                                            onClick={() => handleManualUpdate('lineHeight', 'normal')}
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${overrides.lineHeight === 'normal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Normal
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-slate-200 group-focus-within:bg-white transition-all">
                                    <BufferedInput
                                        type="number"
                                        value={overrides.lineHeight === 'normal' ? '' : overrides.lineHeight}
                                        placeholder={overrides.lineHeight === 'normal' ? 'Normal' : ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) handleManualUpdate('lineHeight', val);
                                        }}
                                        className="w-14 bg-transparent text-right outline-none font-mono text-[12px] font-bold"
                                        style={{ color: fallbackColor }}
                                    />
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="3.0"
                                step="0.01"
                                value={overrides.lineHeight === 'normal' ? 1.5 : overrides.lineHeight}
                                onChange={(e) => handleManualUpdate('lineHeight', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                style={{ accentColor: fallbackColor }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {!isSidebar && (
                <div className="border-t border-slate-50 p-6 pt-4 text-[10px] text-slate-400 text-center italic font-medium tracking-wide">
                    Font loading strategy can now be configured in the simulation toolbar above.
                </div>
            )}
        </div>
    );
};

export default MetricControls;
