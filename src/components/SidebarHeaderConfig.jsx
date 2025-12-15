import { useTypo } from '../context/useTypo';

const SidebarHeaderConfig = () => {
    const { headerStyles, updateHeaderStyle, fontSizes, headerOverrides, resetHeaderLineHeightOverride } = useTypo();

    const handleScaleChange = (tag, value) => {
        updateHeaderStyle(tag, 'scale', parseFloat(value));
    };

    const handlePxChange = (tag, pxValue) => {
        const newScale = parseFloat(pxValue) / fontSizes.active;
        if (!isNaN(newScale) && newScale > 0) {
            updateHeaderStyle(tag, 'scale', newScale);
        }
    };

    const handleLineHeightChange = (tag, value) => {
        updateHeaderStyle(tag, 'lineHeight', parseFloat(value));
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header / Back Button */}
            <div className="flex items-center gap-2 pb-4">
                <h3 className="font-bold text-slate-800 text-sm">Header Styles</h3>
            </div>

            <div className="space-y-6">
                {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => {
                    const style = headerStyles[tag];
                    const pxValue = Math.round(style.scale * fontSizes.active);

                    return (
                        <div key={tag} className="space-y-3">
                            {/* Header Tag + Style Tabs + Values */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{tag}</span>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex items-center">
                                            <input
                                                type="number"
                                                min="0.1"
                                                max="10"
                                                step="0.05"
                                                value={style.scale}
                                                onChange={(e) => handleScaleChange(tag, e.target.value)}
                                                className="w-10 text-right font-mono text-slate-400 focus:text-indigo-600 focus:outline-none bg-transparent"
                                            />
                                            <span className="text-slate-300">em</span>
                                        </div>
                                        <span className="text-slate-200">|</span>
                                        <div className="flex items-center">
                                            <input
                                                type="number"
                                                value={pxValue}
                                                onChange={(e) => handlePxChange(tag, e.target.value)}
                                                className="w-10 text-right font-bold text-indigo-600 focus:outline-none bg-transparent"
                                            />
                                            <span className="text-slate-400 font-medium">px</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Style selector hidden (primary/secondary UI removed) */}
                            </div>

                            {/* Font Size Slider */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider w-20 whitespace-nowrap">Font Size</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="2.0"
                                    step="0.05"
                                    value={style.scale}
                                    onChange={(e) => handleScaleChange(tag, e.target.value)}
                                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="w-14 text-right font-mono text-[10px] text-slate-400">{pxValue}px</span>
                            </div>



                            {/* Line Height Control */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider w-20 whitespace-nowrap">Line Height</span>
                                <input
                                    type="range"
                                    min="0.8"
                                    max="3.0"
                                    step="0.1"
                                    value={style.lineHeight}
                                    onChange={(e) => handleLineHeightChange(tag, e.target.value)}
                                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="w-14 flex items-center justify-end gap-2">
                                    {headerOverrides?.[tag]?.lineHeight ? (
                                        <button
                                            onClick={() => resetHeaderLineHeightOverride(tag)}
                                            className="text-[10px] font-bold text-slate-400 hover:text-indigo-600"
                                            type="button"
                                            title="Follow main line height"
                                        >
                                            Reset
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400">Auto</span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-400">{style.lineHeight}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SidebarHeaderConfig;
