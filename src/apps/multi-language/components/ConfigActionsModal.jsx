import React from 'react';

const ConfigActionsModal = ({ mode, onClose, onImport, onExport }) => {
    const isImport = mode === 'import';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${isImport ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                            {isImport ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                            )}
                        </div>
                        <h3 className="font-bold text-slate-800">
                            {isImport ? 'Restore Session' : 'Export Session'}
                        </h3>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-500 mb-6">
                        {isImport
                            ? 'Upload a configuration file to resume your work. This will restore all your font mappings, enabled languages, and specific typography adjustments.'
                            : 'Save your current setup to a file. You can import this later to continue working or share your configuration with others.'}
                    </p>

                    <div className="grid gap-3">
                        {/* Option 1: TypeScript (Export Only) */}


                        {/* Option 2: Config JSON */}
                        {isImport ? (
                            <label className="group relative flex items-center p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-slate-50 cursor-pointer transition-all">
                                <div className="absolute inset-x-0 bottom-0 top-auto h-1 bg-amber-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-b-xl opac"></div>
                                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 mr-4 group-hover:bg-amber-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Configuration (JSON)</div>
                                    <div className="text-xs text-slate-500">Restores all your custom font assignments and language settings</div>
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={(e) => {
                                        onImport(e);
                                        onClose();
                                    }}
                                />
                            </label>
                        ) : (
                            <>
                                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 flex gap-3 items-start mb-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                                        <strong className="font-bold">Important:</strong> The configuration file contains settings and mappings, but not the font files. To collaborate, ensure you also share the original font files with others.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        onExport();
                                        onClose();
                                    }}
                                    className="group relative flex items-center p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-left transition-all"
                                >
                                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 mr-4 group-hover:bg-amber-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Download Configuration</div>
                                        <div className="text-xs text-slate-500">Includes all font mappings, language selections, and style overrides</div>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigActionsModal;
