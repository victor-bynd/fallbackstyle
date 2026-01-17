import { useTypo } from '../../../shared/context/useTypo';
import InfoTooltip from '../../../shared/components/InfoTooltip';

const SidebarHeaderConfig = ({ onBack }) => {
    const {
        headerStyles,
        updateHeaderStyle,
        headerOverrides,
        resetHeaderStyleProperty,
        resetAllHeaderStyles,
        baseRem,
        setBaseRem
    } = useTypo();

    const handleScaleChange = (tag, value) => {
        updateHeaderStyle(tag, 'scale', parseFloat(value));
    };

    const handlePxChange = (tag, pxValue) => {
        const newRem = parseFloat(pxValue) / baseRem;
        if (!isNaN(newRem) && newRem > 0) {
            updateHeaderStyle(tag, 'scale', newRem);
        }
    };

    const handleLineHeightChange = (tag, value) => {
        updateHeaderStyle(tag, 'lineHeight', parseFloat(value));
    };

    const handleLetterSpacingChange = (tag, value) => {
        updateHeaderStyle(tag, 'letterSpacing', parseFloat(value));
    };

    const hasAnyOverride = Object.values(headerOverrides).some(overrides => Object.keys(overrides).length > 0);

    return (
        <div className="w-80 flex flex-col gap-4 p-4 h-full overflow-y-auto bg-white animate-fade-in">
            {/* Header / Back Button */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        HEADER STYLES
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetAllHeaderStyles}
                        className={`text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-md transition-colors ${hasAnyOverride ? '' : 'invisible pointer-events-none'}`}
                    >
                        Reset All
                    </button>
                    <button
                        onClick={onBack}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                        <span>Close</span>
                    </button>
                </div>
            </div>

            {/* Base REM Setting */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Base REM Size</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={baseRem}
                            onChange={(e) => setBaseRem(Number(e.target.value))}
                            className="w-12 text-right font-bold text-indigo-600 focus:outline-none bg-transparent border-b border-indigo-200 focus:border-indigo-500 py-1"
                        />
                        <span className="text-xs text-slate-400 font-medium">px</span>
                    </div>
                </div>
                <input
                    type="range"
                    min="8"
                    max="64"
                    step="1"
                    value={baseRem}
                    onChange={(e) => setBaseRem(Number(e.target.value))}
                    className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
            </div>

            <div className="space-y-6">
                {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => {
                    const style = headerStyles[tag];
                    const pxValue = Math.round(style.scale * baseRem);
                    const tagOverrides = headerOverrides?.[tag] || {};

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
                                                className="w-14 text-right font-mono text-slate-400 focus:text-indigo-600 focus:outline-none bg-transparent"
                                            />
                                            <span className="text-slate-300">rem</span>
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
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-between w-[88px] shrink-0">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold whitespace-nowrap">Font Size</span>
                                    {tagOverrides.scale && (
                                        <button
                                            onClick={() => resetHeaderStyleProperty(tag, 'scale')}
                                            className="text-[10px] text-rose-500 hover:text-rose-700"
                                            title="Reset Font Size"
                                            type="button"
                                        >
                                            ↺
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max={tag === 'h1' ? "10.0" : "8.0"}
                                    step="0.05"
                                    value={style.scale}
                                    onChange={(e) => handleScaleChange(tag, e.target.value)}
                                    className="flex-1 min-w-0 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="w-16 text-right font-mono text-[10px] text-slate-400">{pxValue}px</span>
                            </div>

                            {/* Line Height Control */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-between w-[88px] shrink-0">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold whitespace-nowrap">Line Height</span>
                                    {tagOverrides.lineHeight && (
                                        <button
                                            onClick={() => resetHeaderStyleProperty(tag, 'lineHeight')}
                                            className="text-[10px] text-rose-500 hover:text-rose-700"
                                            title="Reset Line Height"
                                            type="button"
                                        >
                                            ↺
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="2.3"
                                    step="0.01"
                                    value={style.lineHeight}
                                    onChange={(e) => handleLineHeightChange(tag, e.target.value)}
                                    className="flex-1 min-w-0 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="w-16 flex items-center justify-end gap-2">
                                    {!tagOverrides.lineHeight && (
                                        <span className="text-[10px] font-bold text-slate-400">Auto</span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-400">{style.lineHeight}</span>
                                </div>
                            </div>

                            {/* Letter Spacing Control */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-between w-[88px] shrink-0">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold whitespace-nowrap">Spacing</span>
                                    {tagOverrides.letterSpacing && (
                                        <button
                                            onClick={() => resetHeaderStyleProperty(tag, 'letterSpacing')}
                                            className="text-[10px] text-rose-500 hover:text-rose-700"
                                            title="Reset Letter Spacing"
                                            type="button"
                                        >
                                            ↺
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="range"
                                    min="-0.5"
                                    max="0.5"
                                    step="0.01"
                                    value={style.letterSpacing}
                                    onChange={(e) => handleLetterSpacingChange(tag, e.target.value)}
                                    className="flex-1 min-w-0 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="w-16 flex items-center justify-end gap-2">
                                    {!tagOverrides.letterSpacing && (
                                        <span className="text-[10px] font-bold text-slate-400">Auto</span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-400">{Number(style.letterSpacing).toFixed(2)}em</span>
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
