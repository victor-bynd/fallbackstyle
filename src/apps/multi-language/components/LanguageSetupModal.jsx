import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useLanguageMapping } from '../../../shared/context/useLanguageMapping';

const LanguageSetupRow = ({ langId, state, onChange, pooledFonts = [], isPrimaryLanguage = false }) => {
    const { supportedLanguages: languages } = useLanguageMapping();
    const fileInputRef = useRef(null);
    const { type, file } = state || { type: 'inherit', file: null };

    // Find language details
    const language = languages.find(l => l.id === langId) || { id: langId, name: `Unknown (${langId})` };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onChange({
                type: 'upload',
                file: e.target.files[0],
                poolRef: null
            });
        }
    };

    const isSelected = type === 'upload' || type === 'pool';

    const clearSelection = () => {
        if (isPrimaryLanguage) {
            onChange({ type: 'current', file: null, poolRef: null });
        } else {
            onChange({ type: 'inherit', file: null, poolRef: null });
        }
    };

    return (
        <tr className={`transition-colors border-b border-gray-50 last:border-0 group ${isPrimaryLanguage ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
            <td className="px-5 py-3 align-middle">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${isPrimaryLanguage ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {langId.substring(0, 2)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isPrimaryLanguage ? 'text-indigo-900' : 'text-slate-800'}`}>{language.name}</span>
                            {isPrimaryLanguage && (
                                <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Primary</span>
                            )}
                        </div>
                        <div className={`text-[10px] font-mono ${isPrimaryLanguage ? 'text-indigo-400' : 'text-slate-400'}`}>{langId}</div>
                    </div>
                </div>
            </td>
            <td className="px-5 py-3 align-middle text-right">
                <div className="flex items-center justify-end gap-2">

                    {!isSelected ? (
                        <>
                            {/* Default State Labels */}
                            <span className="text-xs text-slate-400 font-medium mr-2">
                                {isPrimaryLanguage ? 'System Default' : 'Inherit Primary'}
                            </span>

                            {/* Upload Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm whitespace-nowrap"
                            >
                                Upload Font
                            </button>

                            {/* Pool Selection (only if fonts exist) */}
                            {pooledFonts.length > 0 && (
                                <div className="relative">
                                    <select
                                        className="appearance-none cursor-pointer px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value=""
                                        onChange={(e) => {
                                            const fname = e.target.value;
                                            const font = pooledFonts.find(f => f.name === fname);
                                            if (font) {
                                                onChange({ type: 'pool', file: font, poolRef: font });
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select from Pool</option>
                                        {pooledFonts.map((f, i) => (
                                            <option key={`p-${i}`} value={f.name}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Selected State */
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-xs font-bold truncate max-w-[200px]" title={file?.name}>
                                    {file?.name}
                                </span>
                                <button
                                    onClick={clearSelection}
                                    className="text-indigo-400 hover:text-indigo-900 transition-colors ml-1"
                                    title="Remove font"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={handleFileChange}
                    />
                </div>
            </td>
        </tr>
    );
};

const LanguageSetupModal = ({ languageIds, primaryLanguages = [], onConfirm, onCancel, forcedPrimaryFont = null }) => {
    const [pooledFonts, setPooledFonts] = useState(() => {
        if (forcedPrimaryFont) {
            return [forcedPrimaryFont.file];
        }
        return [];
    });

    const [setupMap, setSetupMap] = useState(() => {
        const initial = {};
        languageIds.forEach(id => {
            // If primary, default to current/system (or forced if available? No, usually explicit).
            // Actually, if forcedPrimaryFont exists, user probably dragged it in "Start with Fonts"
            // So we might want to default the Primary Language to that font if it matches?
            const isPrimary = primaryLanguages.includes(id);
            if (isPrimary && forcedPrimaryFont) {
                initial[id] = { type: 'pool', file: forcedPrimaryFont.file, poolRef: forcedPrimaryFont.file };
            } else if (isPrimary) {
                initial[id] = { type: 'current', file: null, poolRef: null };
            } else {
                initial[id] = { type: 'inherit', file: null, poolRef: null };
            }
        });
        return initial;
    });

    // New Global Fallback State
    const [globalFallback, setGlobalFallback] = useState({ type: 'none', file: null, poolRef: null });

    const batchFileInputRef = useRef(null);
    const globalFallbackInputRef = useRef(null);

    const handleBatchDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length === 0) return;

        setPooledFonts(prev => [...prev, ...files]);
    }, []);

    const handleBatchSelect = (e) => {
        if (e.target.files?.length) {
            setPooledFonts(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const handleRowChange = (langId, newState) => {
        setSetupMap(prev => ({
            ...prev,
            [langId]: newState
        }));
    };

    const handleConfirm = () => {
        // Derive primarySelection from the Primary Language's row
        const primaryLangId = primaryLanguages[0] || languageIds[0];
        const primaryState = setupMap[primaryLangId];

        onConfirm(setupMap, pooledFonts, primaryState, globalFallback);
    };

    // Sort languages: Primary first, then others
    const sortedLanguageIds = useMemo(() => {
        return [...languageIds].sort((a, b) => {
            const aPrimary = primaryLanguages.includes(a);
            const bPrimary = primaryLanguages.includes(b);
            if (aPrimary && !bPrimary) return -1;
            if (!aPrimary && bPrimary) return 1;
            return 0;
        });
    }, [languageIds, primaryLanguages]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">

                {/* Modern Header with Pool Only */}
                <div className="p-6 border-b border-slate-100 bg-white z-10 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Configure Languages</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Setup fonts for <strong className="text-slate-700">{languageIds.length} languages</strong>.
                        </p>
                    </div>

                    {/* Mini Drop Zone for Pool */}
                    <div
                        className="flex items-center gap-2 group cursor-pointer"
                        title="Drag & Drop extra fonts here"
                        onClick={() => batchFileInputRef.current?.click()}
                        onDrop={handleBatchDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm flex items-center gap-2 group-hover:border-indigo-300 group-hover:shadow transition-all">
                            <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600">
                                Batch Upload Fonts <span className="text-slate-900 font-bold group-hover:text-indigo-700">({pooledFonts.length})</span>
                            </span>
                            <span className="text-slate-300 text-sm group-hover:text-indigo-400">+</span>
                        </div>
                        <input
                            type="file"
                            ref={batchFileInputRef}
                            multiple
                            accept=".ttf,.otf,.woff,.woff2"
                            className="hidden"
                            onChange={handleBatchSelect}
                        />
                    </div>
                </div>

                {/* Scrollable Language List */}
                <div className="flex-1 overflow-y-auto p-0 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Language</th>
                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Font Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedLanguageIds.map(langId => (
                                <LanguageSetupRow
                                    key={langId}
                                    langId={langId}
                                    state={setupMap[langId]}
                                    onChange={(s) => handleRowChange(langId, s)}
                                    pooledFonts={pooledFonts}
                                    isPrimaryLanguage={primaryLanguages.includes(langId)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Global Fallback Section */}
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">Global Fallback Font</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">Optional</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Used when no other font supports the character.</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        {globalFallback.type === 'none' ? (
                            <>
                                <button
                                    onClick={() => {
                                        globalFallbackInputRef.current?.click();
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    Upload Fallback
                                </button>
                                {pooledFonts.length > 0 && (
                                    <div className="relative">
                                        <select
                                            className="appearance-none cursor-pointer px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            value=""
                                            onChange={(e) => {
                                                const fname = e.target.value;
                                                const font = pooledFonts.find(f => f.name === fname);
                                                if (font) {
                                                    setGlobalFallback({ type: 'pool', file: font, poolRef: font });
                                                }
                                            }}
                                        >
                                            <option value="" disabled>Select from Pool</option>
                                            {pooledFonts.map((f, i) => (
                                                <option key={`gf-${i}`} value={f.name}>
                                                    {f.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-slate-700 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-xs font-bold truncate max-w-[200px]" title={globalFallback.file?.name}>
                                    {globalFallback.file?.name}
                                </span>
                                <button
                                    onClick={() => setGlobalFallback({ type: 'none', file: null, poolRef: null })}
                                    className="text-slate-500 hover:text-slate-900 transition-colors ml-1"
                                    title="Remove font"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={globalFallbackInputRef}
                            className="hidden"
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    setGlobalFallback({
                                        type: 'upload',
                                        file: e.target.files[0],
                                        poolRef: null
                                    });
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 z-10">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <span>Confirm Setup</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LanguageSetupModal;
