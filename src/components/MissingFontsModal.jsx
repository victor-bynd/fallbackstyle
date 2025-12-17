import React, { useState } from 'react';

const MissingFontsModal = ({ missingFonts, existingFiles = [], onResolve, onCancel }) => {
    const [files, setFiles] = useState(existingFiles);

    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const isResolved = (filename) => {
        return files.some(f => f.name === filename);
    };

    const allResolved = missingFonts.every(isResolved);

    const handleConfirm = () => {
        // Create map of filename -> file
        const fileMap = {};
        files.forEach(f => {
            fileMap[f.name] = f;
        });
        onResolve(fileMap);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800">Missing Fonts</h3>
                </div>

                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-slate-600 mb-4">
                        The configuration you are importing references the following font files.
                        Please upload them to continue.
                    </p>

                    <div className="space-y-2 mb-6">
                        {missingFonts.map(fontName => {
                            const found = isResolved(fontName);
                            return (
                                <div key={fontName} className={`flex items-center justify-between p-3 rounded-lg border ${found ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${found ? 'text-green-700' : 'text-amber-700'}`}>
                                            {fontName}
                                        </span>
                                    </div>
                                    <div className="text-xs font-bold">
                                        {found ? (
                                            <span className="text-green-600 flex items-center gap-1">
                                                ✓ Found
                                            </span>
                                        ) : (
                                            <span className="text-amber-600">Missing</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            multiple
                            accept=".ttf,.otf,.woff,.woff2"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <div className="space-y-2 pointer-events-none">
                            <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            </div>
                            <div className="text-sm font-medium text-slate-900">
                                Click or drag files here
                            </div>
                            <div className="text-xs text-slate-500">
                                Supports TTF, OTF, WOFF
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!allResolved}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm
                            ${allResolved
                                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                : 'bg-slate-300 cursor-not-allowed'}
                        `}
                    >
                        Finish Import
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissingFontsModal;
