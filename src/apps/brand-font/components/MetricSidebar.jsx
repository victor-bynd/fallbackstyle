import React from 'react';
import MetricControls from './MetricControls';

const MetricSidebar = ({
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
    fontColors = {}
}) => {
    return (
        <div className="w-80 flex flex-col h-screen border-r border-slate-100 bg-white overflow-hidden text-slate-900 sticky top-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]">
            {/* Header Section */}
            <div className="h-16 flex items-center px-6 border-b border-slate-50 bg-white shrink-0">
                <div className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    Metrics Configuration
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <MetricControls
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
                    // Pass a prop to indicate sidebar mode if needed for styling adjustments
                    isSidebar={true}
                    fontColors={fontColors}
                />
            </div>
        </div>
    );
};

export default MetricSidebar;
