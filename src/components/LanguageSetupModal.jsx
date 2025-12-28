import React, { useState, useRef, useCallback } from 'react';
import { useTypo } from '../context/useTypo';

const LanguageSetupRow = ({ langId, state, onChange, pooledFonts = [] }) => {
    const { languages } = useTypo();
    const fileInputRef = useRef(null);
    const { type, file, poolRef } = state || { type: 'inherit', file: null, poolRef: null };

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

    return (
        <tr className="hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-0 group">
            <td className="px-5 py-3 align-middle">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase shrink-0">
                        {langId.substring(0, 2)}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">{language.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{langId}</div>
                    </div>
                </div>
            </td>
            <td className="px-5 py-3 align-middle">
                <div className="flex items-center gap-2">
                    <select
                        className={`w-full text-xs font-medium rounded-lg py-2 px-2.5 border outline-none transition-all
                            ${type === 'inherit'
                                ? 'bg-white border-gray-200 text-slate-500 hover:border-indigo-300'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                            }
                        `}
                        value={type === 'pool' && poolRef ? `pool:${poolRef.name}` : type}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'inherit') {
                                onChange({ type: 'inherit', file: null, poolRef: null });
                            } else if (val === 'upload') {
                                fileInputRef.current?.click();
                            } else if (val.startsWith('pool:')) {
                                const fname = val.split('pool:')[1];
                                const font = pooledFonts.find(f => f.name === fname);
                                if (font) {
                                    onChange({ type: 'pool', file: font, poolRef: font });
                                }
                            }
                        }}
                    >
                        <option value="inherit">Inherit Primary</option>

                        {pooledFonts.length > 0 && (
                            <optgroup label="Batch Uploaded Fonts">
                                {pooledFonts.map((f, i) => (
                                    <option key={`p-${i}`} value={`pool:${f.name}`}>
                                        Use Pool: {f.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        <option value="upload">Upload file...</option>
                    </select>

                    {type === 'upload' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded truncate max-w-[100px]" title={file?.name}>
                                {file?.name}
                            </span>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-slate-400 hover:text-indigo-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                </svg>
                            </button>
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

const LanguageSetupModal = ({ languageIds, onConfirm, onCancel }) => {
    const [pooledFonts, setPooledFonts] = useState([]);
    const [setupMap, setSetupMap] = useState(() => {
        const initial = {};
        languageIds.forEach(id => {
            initial[id] = { type: 'inherit', file: null, poolRef: null };
        });
        return initial;
    });

    const [primarySelection, setPrimarySelection] = useState({ type: 'current', file: null, poolRef: null });
    const primaryFileInputRef = useRef(null);
    const batchFileInputRef = useRef(null);

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

    const handlePrimaryFileSelect = (e) => {
        if (e.target.files?.[0]) {
            setPrimarySelection({ type: 'upload', file: e.target.files[0], poolRef: null });
        }
    };

    const handleRowChange = (langId, newState) => {
        setSetupMap(prev => ({
            ...prev,
            [langId]: newState
        }));
    };

    const handleConfirm = () => {
        onConfirm(setupMap, pooledFonts, primarySelection);
    };

    const unassignedCount = pooledFonts.length - Object.values(setupMap).filter(s => s.type === 'pool').length - (primarySelection.type === 'pool' ? 1 : 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800 mb-1">Configure Imported Languages</h2>
                    <p className="text-sm text-slate-500">
                        Setup fonts for {languageIds.length} new languages.
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* SECTION 1: BATCH UPLOAD */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-700">1. Bulk Font Upload (Optional)</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Upload a folder of fonts to create a pool. You can then assign them below.
                                </p>
                            </div>
                            <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                                {pooledFonts.length} files in pool
                            </span>
                        </div>

                        <div
                            className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-indigo-400 hover:bg-white transition-colors cursor-pointer"
                            onDrop={handleBatchDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => batchFileInputRef.current?.click()}
                        >
                            <p className="text-sm text-slate-600 mb-2">Drag & Drop font files here</p>
                            <span className="text-xs font-bold text-indigo-600 hover:underline">
                                or click to browse
                            </span>
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

                    {/* SECTION 2: PRIMARY FONT */}
                    <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-indigo-900">2. Primary Font (Base)</h3>
                                <p className="text-xs text-indigo-600/80 mt-1">
                                    The default font used when a language inherits settings.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <select
                                className="flex-1 text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                                value={primarySelection.type === 'pool' && primarySelection.poolRef
                                    ? `pool:${primarySelection.poolRef.name}`
                                    : primarySelection.type}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'current') {
                                        setPrimarySelection({ type: 'current', file: null, poolRef: null });
                                    } else if (val === 'upload') {
                                        primaryFileInputRef.current?.click();
                                    } else if (val.startsWith('pool:')) {
                                        const fname = val.split('pool:')[1];
                                        const font = pooledFonts.find(f => f.name === fname);
                                        if (font) {
                                            setPrimarySelection({ type: 'pool', file: font, poolRef: font });
                                        }
                                    }
                                }}
                            >
                                <option value="current">Keep Current / System Default</option>
                                <option disabled>────── Pool ──────</option>
                                {pooledFonts.map((f, i) => (
                                    <option key={`p-${i}`} value={`pool:${f.name}`}>
                                        Use Pool: {f.name}
                                    </option>
                                ))}
                                <option disabled>────── Upload ──────</option>
                                <option value="upload">Upload New File...</option>
                            </select>

                            {primarySelection.type === 'upload' && (
                                <div className="text-xs text-slate-600 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                                    <span className="truncate max-w-[200px]">{primarySelection.file?.name || 'No file selected'}</span>
                                    <button onClick={() => primaryFileInputRef.current?.click()} className="text-indigo-600 font-bold hover:underline">
                                        Change
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={primaryFileInputRef}
                                className="hidden"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={handlePrimaryFileSelect}
                            />
                        </div>
                    </div>

                    {/* SECTION 3: LANGUAGE LIST */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div>
                                <h3 className="font-bold text-slate-800">3. Language Assignments</h3>
                                <p className="text-xs text-slate-500">
                                    Configure font needed for each language.
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-slate-500">
                                    {unassignedCount > 0
                                        ? `${unassignedCount} fonts will be loaded as unassigned fallbacks`
                                        : 'All pool fonts assigned'}
                                </p>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Language</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600 w-[50%]">Font Assignment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {languageIds.map(langId => (
                                        <LanguageSetupRow
                                            key={langId}
                                            langId={langId}
                                            state={setupMap[langId]}
                                            onChange={(s) => handleRowChange(langId, s)}
                                            pooledFonts={pooledFonts}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-slate-50 flex justify-end gap-3 z-10">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-gray-200/50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
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
