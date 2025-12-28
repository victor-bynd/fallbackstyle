import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTypo } from '../context/useTypo';

import { parseFontFile, createFontUrl } from '../services/FontLoader';
import { TsImportService } from '../services/TsImportService';
import FontLanguageModal from './FontLanguageModal';
import LanguageSetupModal from './LanguageSetupModal';

const FontUploader = ({ importConfig }) => {
    const {
        loadFont,
        batchAddConfiguredLanguages,
        batchAddFontsAndAssignments,
        fontObject,
        addFallbackFonts,
        addLanguageSpecificPrimaryFontFromId,
        addLanguageSpecificFallbackFont
    } = useTypo();

    // Removed internal useConfigImport to use prop from App.jsx

    const [pendingFonts, setPendingFonts] = useState([]);
    const [prefilledAssignments, setPrefilledAssignments] = useState({});
    const [importedLanguages, setImportedLanguages] = useState(null);

    const fileInputRef = useRef(null);
    const configInputRef = useRef(null);

    const handleFiles = useCallback(async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const fontFiles = [];
        const jsonFiles = [];

        // Separate JSON/TS and Font files
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.fall')) {
                jsonFiles.push(file);
            } else if (file.name.toLowerCase().endsWith('.ts')) {
                // Treat TS files as "JSON" candidates but parse differently
                jsonFiles.push(file);
            } else {
                fontFiles.push(file);
            }
        }

        // Process JSON/TS Configuration
        if (jsonFiles.length > 0) {
            for (const file of jsonFiles) {
                try {
                    const text = await file.text();
                    let data;

                    if (file.name.endsWith('.ts')) {
                        data = TsImportService.parseTsContent(text);
                    } else {
                        data = JSON.parse(text);
                    }

                    // DETECT TYPE: Lang List vs Full Config
                    // Full Config usually has 'fontStyles' or 'activeFontStyleId'
                    // OR it's a versioned config with 'metadata' and 'data'
                    if (data.fontStyles || data.activeFontStyleId || (data.metadata && data.data)) {
                        // Extract assignments for pre-populating the modal
                        const configData = data.data || data;
                        const extractedAssignments = {};

                        if (configData.fontStyles?.primary) {
                            const style = configData.fontStyles.primary;
                            // Helper map: fontId -> { fileName, name }
                            const idsToInfo = {};
                            (style.fonts || []).forEach(f => {
                                if (f.id) {
                                    idsToInfo[f.id] = {
                                        fileName: f.fileName,
                                        name: f.name
                                    };
                                }
                            });

                            const addAssignment = (fontId, langId) => {
                                const info = idsToInfo[fontId];
                                if (!info) return;

                                if (info.fileName) extractedAssignments[info.fileName] = langId;
                                if (info.name) extractedAssignments[info.name] = langId;
                                // We could also store by ID, but the pending fonts don't have stable IDs yet (they get new ones)
                            };

                            // Process Fallback Overrides
                            if (style.fallbackFontOverrides) {
                                Object.entries(style.fallbackFontOverrides).forEach(([langId, val]) => {
                                    if (typeof val === 'string') {
                                        addAssignment(val, langId);
                                    } else if (typeof val === 'object' && val !== null) {
                                        Object.values(val).forEach(targetId => {
                                            addAssignment(targetId, langId);
                                        });
                                    }
                                });
                            }

                            // Process Primary Overrides
                            if (style.primaryFontOverrides) {
                                Object.entries(style.primaryFontOverrides).forEach(([langId, fontId]) => {
                                    addAssignment(fontId, langId);
                                });
                            }
                        }

                        if (Object.keys(extractedAssignments).length > 0) {
                            setPrefilledAssignments(prev => ({ ...prev, ...extractedAssignments }));
                        }

                        // Delegate to full config import
                        // We need to pass a File object that works for importConfig (which expects JSON)
                        // If it was a TS file, we already parsed it. 
                        // But importConfig reads the file text again. 
                        // So we should construct a JSON File wrapper around the parsed data.

                        if (file.name.endsWith('.ts')) {
                            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                            const jsonFile = new File([blob], "imported-ts-config.json", { type: "application/json" });
                            importConfig(jsonFile);
                        } else {
                            importConfig(file);
                        }

                        // If it's a full config, we usually stop processing this file as a list
                        // But if multiple files are dropped, we continue loop
                        continue;
                    }

                    // Otherwise, treat as Language List
                    let langIds = [];
                    if (data.languages && Array.isArray(data.languages)) {
                        langIds = data.languages.map(l => l.code).filter(c => typeof c === 'string');
                    } else if (Array.isArray(data) && data.some(i => typeof i === 'string')) {
                        langIds = data.filter(i => typeof i === 'string');
                    } else if (typeof data === 'object' && data !== null) {
                        const keys = Object.keys(data);
                        if (keys.length > 0) langIds = keys;
                    }

                    if (langIds.length > 0) {
                        setImportedLanguages(langIds);
                        // Note: If multiple JSON lists are uploaded, the last one wins current implementation
                    }
                } catch (err) {
                    console.error(`Error parsing config ${file.name}: `, err);
                    alert(`Failed to parse config file: ${file.name}`);
                }
            }
        }

        if (fontFiles.length === 0) return;

        const processedFonts = [];
        let errorCount = 0;

        for (const file of fontFiles) {
            try {
                const { font, metadata } = await parseFontFile(file);
                const url = createFontUrl(file);
                processedFonts.push({ font, metadata, url, file });
            } catch (err) {
                console.error(`Error parsing font ${file.name}: `, err);
                errorCount++;
            }
        }

        if (processedFonts.length > 0) {
            setPendingFonts(prev => [...prev, ...processedFonts]);
        }

        if (errorCount > 0) {
            alert(`Failed to parse ${errorCount} font file(s).`);
        }
    }, [batchAddConfiguredLanguages, importConfig]);

    const handleSetupConfirm = async (setupMap, pooledFonts = [], primarySelection = null) => {
        if (importedLanguages) {
            // 1. Gather Unique Files (Pool + Overrides + Primary)
            const uniqueFiles = new Map(); // filename -> fileObj

            // Add from Pool
            pooledFonts.forEach(f => uniqueFiles.set(f.name, f));

            // Add from Assignments
            Object.values(setupMap).forEach(state => {
                if ((state.type === 'upload' || state.type === 'pool') && state.file) {
                    uniqueFiles.set(state.file.name, state.file);
                }
            });

            // Add from Primary Selection
            if (primarySelection && (primarySelection.type === 'upload' || primarySelection.type === 'pool') && primarySelection.file) {
                uniqueFiles.set(primarySelection.file.name, primarySelection.file);
            }

            // 2. Load Fonts into System Objects
            const loadedFontsRegister = [];
            // We need to know which loaded font corresponds to the Primary Selection
            let primaryLoadedData = null;

            for (const [filename, file] of uniqueFiles.entries()) {
                try {
                    const { font, metadata } = await parseFontFile(file);
                    const url = createFontUrl(file);
                    const id = `uploaded-setup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    const fontData = {
                        id,
                        type: 'fallback',
                        fontObject: font,
                        fontUrl: url,
                        fileName: file.name,
                        name: file.name,
                        axes: metadata.axes,
                        isVariable: metadata.isVariable,
                        staticWeight: metadata.staticWeight ?? null
                    };

                    loadedFontsRegister.push(fontData);

                    // Check if this is our selected primary font
                    // Note: file.name is reliable here because uniqueFiles uses it as key
                    if (primarySelection && primarySelection.file && primarySelection.file.name === filename) {
                        primaryLoadedData = fontData;
                    }

                } catch (e) {
                    console.error("Failed to load font " + filename, e);
                }
            }

            // 3. Handle Primary Assignment First
            // If explicit primary selection made
            if (primarySelection && primarySelection.type !== 'current' && primaryLoadedData) {
                const metadata = {
                    axes: primaryLoadedData.axes,
                    isVariable: primaryLoadedData.isVariable,
                    staticWeight: primaryLoadedData.staticWeight
                };
                loadFont(primaryLoadedData.fontObject, primaryLoadedData.fontUrl, primaryLoadedData.name, metadata);
            }
            // Fallback: If NO primary exists at all (empty state) and no explicit choice, pick first from pool if available.
            // This prevents "Empty App" state if user just verified a pool.
            else if (!fontObject && loadedFontsRegister.length > 0 && primarySelection.type !== 'current') {
                const primaryCandidate = loadedFontsRegister[0];
                const metadata = {
                    axes: primaryCandidate.axes,
                    isVariable: primaryCandidate.isVariable,
                    staticWeight: primaryCandidate.staticWeight
                };
                loadFont(primaryCandidate.fontObject, primaryCandidate.fontUrl, primaryCandidate.name, metadata);
            }

            // 4. Prepare Assignments map
            const assignments = {};
            Object.entries(setupMap).forEach(([langId, state]) => {
                if ((state.type === 'upload' || state.type === 'pool') && state.file) {
                    assignments[langId] = state.file.name;
                }
            });

            // 5. Batch Update
            if (loadedFontsRegister.length > 0 || Object.keys(assignments).length > 0) {
                batchAddFontsAndAssignments({
                    fonts: loadedFontsRegister,
                    assignments: assignments,
                    languageIds: importedLanguages // PASS ALL IMPORTED LANGUAGES
                });
            } else {
                // If no fonts, just enable languages
                batchAddConfiguredLanguages(importedLanguages);
            }
        }
        setImportedLanguages(null);
    };

    const handleModalConfirm = ({ assignments, orderedFonts }) => {
        // ... existing logic ...
        const autoFonts = [];
        const primaryItem = orderedFonts[0];

        // Use the ordered list from the modal
        orderedFonts.forEach((item, index) => {
            if (index === 0) return; // Skip primary

            const Target = assignments[item.file.name];
            if (Target === 'auto') {
                autoFonts.push(item);
            } else {
                // Language specific fallback Target
                addLanguageSpecificFallbackFont(
                    item.font,
                    item.url,
                    item.file.name,
                    item.metadata,
                    Target
                );
            }
        });

        // Load the designated Primary font first
        if (primaryItem) {
            loadFont(primaryItem.font, primaryItem.url, primaryItem.file.name, primaryItem.metadata);
        }

        // Remaining auto fonts become Fallbacks in the order they were in orderedFonts
        if (autoFonts.length > 0) {
            const fallbacks = autoFonts.map(item => {
                return {
                    id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'fallback',
                    fontObject: item.font,
                    fontUrl: item.url,
                    fileName: item.file.name,
                    name: item.file.name,
                    axes: item.metadata.axes,
                    isVariable: item.metadata.isVariable,
                    staticWeight: item.metadata.staticWeight ?? null
                };
            });
            addFallbackFonts(fallbacks);
        }

        setPendingFonts([]);
        setPrefilledAssignments({});
    };

    const handleModalCancel = () => {
        setPendingFonts([]);
        setPrefilledAssignments({});
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const droppedFiles = Array.from(e.dataTransfer.files);
        const fontFiles = [];
        const configFiles = [];

        droppedFiles.forEach(file => {
            if (file.name.toLowerCase().endsWith('.json') ||
                file.name.toLowerCase().endsWith('.fall') ||
                file.name.toLowerCase().endsWith('.ts')) {
                configFiles.push(file);
            } else {
                fontFiles.push(file);
            }
        });

        if (configFiles.length > 0) {
            alert("Configuration files (.fall, .json, .ts) cannot be dropped here. Please use the 'Import Configuration' button.");
        }

        if (fontFiles.length > 0) {
            handleFiles(fontFiles);
        }
    }, [handleFiles]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const onInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const onConfigInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const triggerConfigImport = () => {
        configInputRef.current?.click();
    };

    const tsInputRef = useRef(null);

    const triggerTsImport = () => {
        tsInputRef.current?.click();
    };

    return (
        <>
            <div
                className={clsx(
                    "group relative overflow-hidden",
                    "border-2 border-dashed border-slate-300 rounded-xl p-12",
                    "bg-white",
                    "flex flex-col items-center justify-center text-center",
                    "transition-all duration-300 ease-in-out",
                    "hover:border-indigo-500 hover:bg-slate-50/50 hover:shadow-lg hover:shadow-indigo-500/10",
                    "cursor-pointer"
                )}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-16 h-16 mb-4 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-slate-400 group-hover:text-indigo-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1 group-hover:text-indigo-600 transition-colors">
                    Drop Font Files
                </h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto mb-4">
                    Supports .ttf, .otf, .woff, .woff2
                </p>

                <div className="relative">
                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full group-hover:bg-indigo-100 transition-colors">
                        Browse Fonts
                    </span>
                </div>
            </div>

            {/* Config Import Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); triggerConfigImport(); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div className="text-left">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-600">Import Config</span>
                        <span className="block text-[10px] text-slate-400">.fall / .json</span>
                    </div>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); triggerTsImport(); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-50 text-[10px] font-bold text-indigo-600">TS</span>
                    <div className="text-left">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-600">Import TypeScript</span>
                        <span className="block text-[10px] text-slate-400">typography.types.ts</span>
                    </div>
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".ttf,.otf,.woff,.woff2"
                onChange={onInputChange}
            />

            <input
                type="file"
                ref={configInputRef}
                className="hidden"
                accept=".json,.fall"
                onChange={onConfigInputChange}
            />

            <input
                type="file"
                ref={tsInputRef}
                className="hidden"
                accept=".ts"
                onChange={onConfigInputChange}
            />

            {pendingFonts.length > 0 && (
                <FontLanguageModal
                    pendingFonts={pendingFonts}
                    initialAssignments={prefilledAssignments}
                    onConfirm={handleModalConfirm}
                    onCancel={handleModalCancel}
                />
            )}

            {importedLanguages && (
                <LanguageSetupModal
                    languageIds={importedLanguages}
                    onConfirm={handleSetupConfirm}
                    onCancel={() => setImportedLanguages(null)}
                />
            )}
        </>
    );
};

export default FontUploader;
