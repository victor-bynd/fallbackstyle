import { useTypo } from '../context/useTypo';

const SidebarHeaderConfig = ({ onBack }) => {
    const { headerStyles, updateHeaderStyle, fontSizes, headerFontStyleMap, setHeaderFontStyle } = useTypo();

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
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <button
                    onClick={onBack}
                    className="p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h3 className="font-bold text-slate-800 text-sm">Header Styles</h3>
            </div>

            <div className="space-y-6">
                {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => {
                    const style = headerStyles[tag];
                    const pxValue = Math.round(style.scale * fontSizes.active);
                    const currentStyle = headerFontStyleMap?.[tag] || 'primary';

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

                                {/* Tab-like Style Switcher */}
                                <div className="bg-slate-100 p-0.5 rounded-md flex">
                                    <button
                                        onClick={() => setHeaderFontStyle(tag, 'primary')}
                                        className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all ${currentStyle === 'primary'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Primary
                                    </button>
                                    <button
                                        onClick={() => setHeaderFontStyle(tag, 'secondary')}
                                        className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all ${currentStyle === 'secondary'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Secondary
                                    </button>
                                </div>
                            </div>

                            {/* Font Size Slider */}
                            <input
                                type="range"
                                min="0.1"
                                max="2.0"
                                step="0.05"
                                value={style.scale}
                                onChange={(e) => handleScaleChange(tag, e.target.value)}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />

                            {/* Line Height Control */}
                            <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>Line Height</span>
                                    <span className="font-mono text-slate-400">{style.lineHeight}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.8"
                                    max="3.0"
                                    step="0.1"
                                    value={style.lineHeight}
                                    onChange={(e) => handleLineHeightChange(tag, e.target.value)}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SidebarHeaderConfig;
