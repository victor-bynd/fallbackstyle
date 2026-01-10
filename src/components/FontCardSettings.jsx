import PropTypes from 'prop-types';
import BufferedInput from './BufferedInput';

const FontCardSettings = ({
    isPrimary,
    font,
    editScope,
    baseRem,
    setBaseRem,
    readOnly,
    scopeFont,
    scopeFontId,
    globalLineHeight,
    handleScopedUpdate,
    getEffectiveFontSettings,
    weightOptions,
    resolvedWeight,
    isInherited,
    scopeFontSettings,
    isReference,
    toggleFontVisibility,
    showAdvanced,
    setShowAdvanced
}) => {
    // console.log('[FontCardSettings] Condition Check', { isPrimary, isPrimaryOverride: font.isPrimaryOverride, editScope });
    return (
        <div className="space-y-2">
            {/* Size Control: Show ONLY for global primary or primary overrides */}
            {(isPrimary || font.isPrimaryOverride) && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Size (Base REM)</span>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    value={editScope === 'ALL' ? baseRem : (scopeFontSettings?.baseFontSize || baseRem)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) return;
                                        if (editScope === 'ALL') setBaseRem?.(val);
                                        else handleScopedUpdate('baseFontSize', val);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                />
                                <span className="text-[9px]">px</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    step="0.125"
                                    value={(editScope === 'ALL' ? baseRem : (scopeFontSettings?.baseFontSize || baseRem)) / 16}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (isNaN(val)) return;
                                        const px = Math.round(val * 16);
                                        if (editScope === 'ALL') setBaseRem?.(px);
                                        else handleScopedUpdate('baseFontSize', px);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                />
                                <span className="text-[9px]">rem</span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="8"
                        max="32"
                        step="1"
                        value={editScope === 'ALL' ? baseRem : (scopeFontSettings?.baseFontSize || baseRem)}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (editScope === 'ALL') setBaseRem?.(val);
                            else handleScopedUpdate('baseFontSize', val);
                        }}
                        disabled={readOnly}
                        className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                    />
                </div>
            )}

            {(isPrimary || font.isPrimaryOverride) && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Line Height</span>
                        <div className="flex gap-2 items-center">
                            {(() => {
                                const lh = scopeFont.isPrimaryOverride
                                    ? (scopeFont.lineHeight !== undefined && scopeFont.lineHeight !== null ? scopeFont.lineHeight : globalLineHeight)
                                    : globalLineHeight;
                                const isNormal = lh === 'normal';

                                if (!isNormal) {
                                    return (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleScopedUpdate('lineHeight', 'normal');
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                                            title="Reset to Normal"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    step="1"
                                    value={(() => {
                                        const settings = getEffectiveFontSettings(scopeFontId);
                                        const lh = settings.lineHeight;
                                        const val = lh === 'normal' ? 1.2 : lh;
                                        return Math.round(val * baseRem);
                                    })()}
                                    onChange={(e) => {
                                        const px = parseFloat(e.target.value);
                                        if (!isNaN(px)) handleScopedUpdate('lineHeight', px / baseRem);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                />
                                <span className="text-[9px]">px</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    step="5"
                                    value={(() => {
                                        const settings = getEffectiveFontSettings(scopeFontId);
                                        const lh = settings.lineHeight;
                                        return lh === 'normal' ? 120 : Math.round(lh * 100);
                                    })()}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) handleScopedUpdate('lineHeight', val / 100);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                />
                                <span className="text-[9px]">%</span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="50"
                        max="300"
                        step="5"
                        value={(() => {
                            const settings = getEffectiveFontSettings(scopeFontId);
                            const lh = settings.lineHeight;
                            return lh === 'normal' ? 120 : lh * 100;
                        })()}
                        onChange={(e) => handleScopedUpdate('lineHeight', parseFloat(e.target.value) / 100)}
                        disabled={isInherited && editScope !== 'ALL'}
                        className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                    />
                </div>
            )}

            {(isPrimary || font.isPrimaryOverride) && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Letter Spacing</span>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    step="0.1"
                                    value={(() => {
                                        const settings = getEffectiveFontSettings(scopeFontId);
                                        const ls = settings.letterSpacing;
                                        return Math.round((ls || 0) * baseRem * 10) / 10;
                                    })()}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) handleScopedUpdate('letterSpacing', val / baseRem);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                />
                                <span className="text-[9px]">px</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    step="0.01"
                                    value={(() => {
                                        const settings = getEffectiveFontSettings(scopeFontId);
                                        const ls = settings.letterSpacing;
                                        return ls || 0;
                                    })()}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) handleScopedUpdate('letterSpacing', val);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-indigo-600 font-mono border-b border-indigo-200 focus:border-indigo-500"
                                />
                                <span className="text-[9px]">em</span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="-0.1"
                        max="0.5"
                        step="0.01"
                        value={(() => {
                            const ls = getEffectiveFontSettings(scopeFontId).letterSpacing;
                            return ls || 0;
                        })()}
                        onChange={(e) => handleScopedUpdate('letterSpacing', parseFloat(e.target.value))}
                        disabled={isInherited && editScope !== 'ALL' || readOnly}
                        className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-indigo-600`}
                    />
                </div>
            )}

            {(isPrimary || font.isPrimaryOverride) && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider h-6">
                        <span>Weight</span>
                        <div className="relative">
                            <select
                                value={resolvedWeight}
                                onChange={(e) => handleScopedUpdate('weight', parseInt(e.target.value))}
                                disabled={isInherited && editScope !== 'ALL' || readOnly}
                                className={`bg-transparent text-right outline-none text-indigo-600 font-mono text-[11px] appearance-none pr-3 cursor-pointer ${isInherited && editScope !== 'ALL' || readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ backgroundImage: 'none' }}
                            >
                                {weightOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {!readOnly && (!isInherited || editScope === 'ALL') && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {(!isPrimary && !font.isPrimaryOverride) && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Size-Adjust</span>
                        <div className="flex items-center">
                            {/* Reset Button for Size-Adjust */}
                            {Math.abs((scopeFontSettings?.scale || 100) - 100) > 0.01 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleScopedUpdate('scale', 100);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                                    title="Reset to 100%"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                            <div className="flex items-center gap-1">
                                <BufferedInput
                                    type="number"
                                    value={Math.round(scopeFontSettings?.scale || 100)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) handleScopedUpdate('scale', val);
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-slate-600 font-mono border-b border-slate-200 focus:border-indigo-500"
                                />
                                <span className="text-slate-600 font-mono text-[9px]">%</span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="20"
                        max="500"
                        value={scopeFontSettings?.scale || 100}
                        onChange={(e) => handleScopedUpdate('scale', parseInt(e.target.value))}
                        disabled={isReference || (isInherited && editScope !== 'ALL') || readOnly}
                        className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${(isInherited && editScope !== 'ALL') || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-slate-400`}
                    />
                </div>
            )}

            {/* Toggle Visibility Button */}
            {!isPrimary && !font.isPrimaryOverride && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFontVisibility(font.id);
                    }}
                    className={`absolute bottom-3 right-3 p-1 rounded-md transition-colors ${font.hidden
                        ? 'text-red-500 hover:text-red-700 bg-red-50'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                    title={font.hidden ? "Show Font" : "Hide Font"}
                >
                    {font.hidden ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                            <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            )}

            {font.fontObject && (
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.1em] hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                    <span>Advanced Settings</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            {showAdvanced && (
                <div className="mt-2 grid grid-cols-1 gap-2 pt-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {['ascentOverride', 'descentOverride', 'lineGapOverride'].map((field) => (
                        <div key={field} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                <span>{field.replace('Override', '').replace(/([A-Z])/g, ' $1')}</span>
                                <div className="flex items-center">
                                    {/* Reset Button for Advanced Settings */}
                                    {Math.abs((scopeFont[field] || 0)) > 0.001 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleScopedUpdate(field, undefined);
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                                            title="Reset to Auto"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H12.42a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={Math.round((scopeFontSettings?.[field] || 0) * 100)}
                                            onChange={(e) => handleScopedUpdate(field, parseInt(e.target.value) / 100)}
                                            className="w-12 bg-transparent text-right outline-none text-slate-600 font-mono border-b border-slate-200 focus:border-indigo-500"
                                        />
                                        <span className="text-slate-600 font-mono text-[9px]">%</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                step="5"
                                value={(scopeFontSettings?.[field] || 0) * 100}
                                onChange={(e) => handleScopedUpdate(field, parseInt(e.target.value) / 100)}
                                disabled={isInherited && editScope !== 'ALL' || readOnly}
                                className={`w-full h-1 bg-slate-100 rounded-lg appearance-none ${isInherited && editScope !== 'ALL' || readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} accent-slate-400`}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

FontCardSettings.propTypes = {
    isPrimary: PropTypes.bool.isRequired,
    font: PropTypes.object.isRequired,
    editScope: PropTypes.string.isRequired,
    baseRem: PropTypes.number,
    setBaseRem: PropTypes.func,
    readOnly: PropTypes.bool,
    scopeFont: PropTypes.object.isRequired,
    scopeFontId: PropTypes.string.isRequired,
    globalLineHeight: PropTypes.any,
    handleScopedUpdate: PropTypes.func.isRequired,
    getEffectiveFontSettings: PropTypes.func.isRequired,
    weightOptions: PropTypes.array.isRequired,
    resolvedWeight: PropTypes.number,
    isInherited: PropTypes.bool,
    scopeFontSettings: PropTypes.object,
    isReference: PropTypes.bool,
    toggleFontVisibility: PropTypes.func,
    showAdvanced: PropTypes.bool,
    setShowAdvanced: PropTypes.func
};

export default FontCardSettings;
