import React from 'react';
import MetricControls from './MetricControls';

const MetricSidebar = ({
    configMode,
    setConfigMode,
    limitToSizeAdjust,
    setLimitToSizeAdjust,
    overrides,
    handleManualUpdate,
    selectedFallback,
    primaryMetrics,
    calculateOverrides,
    setOverrides
}) => {
    return (
        <div className="w-80 flex flex-col h-screen border-r border-gray-100 bg-white overflow-hidden text-slate-900 sticky top-0">
            {/* Header Section */}
            <div className="h-14 flex items-center px-4 border-b border-gray-50 bg-white shrink-0">
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    METRICS CONFIGURATION
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <MetricControls
                    configMode={configMode}
                    setConfigMode={setConfigMode}
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
                />
            </div>
        </div>
    );
};

export default MetricSidebar;
