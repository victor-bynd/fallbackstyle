import { useCallback, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { useTypo } from '../context/useTypo';

import { parseFontFile, createFontUrl } from '../services/FontLoader';

import FontLanguageModal from './FontLanguageModal';
import LanguageSetupModal from './LanguageSetupModal';

const FontUploader = ({ importConfig, preselectedLanguages = null, initialFiles = [], renderDropzone = true, onSetupReady = null }) => {
    const {
        loadFont,
        batchAddConfiguredLanguages,
        batchAddFontsAndMappings,
        // Unused context values removed
        fonts,
        normalizeFontName,
        addPrimaryLanguageOverrides,
        primaryLanguages,
        fontObject,
        togglePrimaryLanguage
    } = useTypo();

    // Removed internal useConfigImport to use prop from App.jsx
    const [pendingFonts, setPendingFonts] = useState([]);
    const [prefilledMappings, setPrefilledMappings] = useState({});
    const [importedLanguages, setImportedLanguages] = useState(preselectedLanguages); // Initialize with prop

    const fontsRef = useRef(fonts);
    const pendingFontsRef = useRef(pendingFonts);

    useEffect(() => {
        fontsRef.current = fonts;
    }, [fonts]);

    useEffect(() => {
        pendingFontsRef.current = pendingFonts;
    }, [pendingFonts]);

    const fileInputRef = useRef(null);
    const configInputRef = useRef(null);

    // Effect: Handle initial files passed via props (e.g. dropped on landing page)

    const handleFiles = useCallback(async (fileList) => {
        console.log("handleFiles called with:", fileList);
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const fontFiles = [];
        const jsonFiles = [];

        // Separate JSON/TS and Font files
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.json')) {
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
                    const data = JSON.parse(text);

                    // DETECT TYPE: Lang List vs Full Config
                    // Full Config usually has 'fontStyles' or 'activeFontStyleId'
                    // OR it's a versioned config with 'metadata' and 'data'
                    if (data.fontStyles || data.activeFontStyleId || (data.metadata && data.data)) {
                        // Extract mappings for pre-populating the modal
                        const configData = data.data || data;
                        const extractedMappings = {};

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

                            const addMapping = (fontId, langId) => {
                                const info = idsToInfo[fontId];
                                if (!info) return;

                                if (info.fileName) extractedMappings[info.fileName] = langId;
                                if (info.name) extractedMappings[info.name] = langId;
                                // We could also store by ID, but the pending fonts don't have stable IDs yet (they get new ones)
                            };

                            // Process Fallback Overrides
                            if (style.fallbackFontOverrides) {
                                Object.entries(style.fallbackFontOverrides).forEach(([langId, val]) => {
                                    if (typeof val === 'string') {
                                        addMapping(val, langId);
                                    } else if (typeof val === 'object' && val !== null) {
                                        Object.values(val).forEach(mapId => {
                                            addMapping(mapId, langId);
                                        });
                                    }
                                });
                            }

                            // Process Primary Overrides
                            if (style.primaryFontOverrides) {
                                Object.entries(style.primaryFontOverrides).forEach(([langId, fontId]) => {
                                    addMapping(fontId, langId);
                                });
                            }
                        }

                        if (Object.keys(extractedMappings).length > 0) {
                            setPrefilledMappings(prev => ({ ...prev, ...extractedMappings }));
                        }

                        // Delegate to full config import
                        // We need to pass a File object that works for importConfig (which expects JSON)
                        // If it was a TS file, we already parsed it. 
                        // But importConfig reads the file text again. 
                        // So we should construct a JSON File wrapper around the parsed data.

                        importConfig(file);

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

        // Also verify if we are trying to add a font that is ALREADY pending (in case user drops twice before confirming)
        const pendingFontNames = new Set(
            pendingFontsRef.current.map(f => normalizeFontName(f.file.name))
        );

        for (const file of fontFiles) {
            const normalizedName = normalizeFontName(file.name);

            // 1. Check if it's already in the system
            // We only consider it a valid duplicate if it has a fontObject (actually loaded)
            // If it's a "ghost" font (name only, no data), we ALLOW upload to fix it.
            const existingFont = (fontsRef.current || []).find(f =>
                normalizeFontName(f.fileName || f.name) === normalizedName
            );

            if (existingFont && existingFont.fontObject) {
                console.log(`[FontUploader] Skipping duplicate upload (already installed): ${file.name}`);
                continue;
            }

            // 2. Check if it's already pending
            if (pendingFontNames.has(normalizedName)) {
                console.log(`[FontUploader] Skipping duplicate upload (already pending): ${file.name}`);

                continue;
            }

            try {
                const { font, metadata } = await parseFontFile(file);
                // 3. Double Check: Check if internal font name matches an existing one?
                // This is stricter. Sometimes filenames differ but font is same. 
                // Let's rely on Filename for now as per user request "prevent uploading the same font more than once".
                // But if we wanted to be super smart, we could check font.names.fontFamily.en...

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
    }, [importConfig, normalizeFontName]); // Removed fonts and pendingFonts to break loop

    // Effect: Handle initial files passed via props (e.g. dropped on landing page)
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            console.log("FontUploader: Received initialFiles", initialFiles);
            // Use short timeout to ensure state is ready if mounting
            setTimeout(() => handleFiles(initialFiles), 0);
        }
    }, [initialFiles, handleFiles]);

    // Effect: If we have preselected languages (wizard mode) and pending fonts arrive,
    // we should consider auto-triggering the setup logic or at least be ready.
    // Actually, importedLanguages state handles this.
    // The existing logic waits for LanguageSetupModal to be confirmed via UI?
    // Wait, the existing code renders LanguageSetupModal if importedLanguages is set.
    // So if we pass preselectedLanguages, it sets importedLanguages, and Modal appears immediately?
    // Yes. BUT we only want it to appear *after* a font is dropped for the "Primary Font" step.
    // If we just setImportedLanguages(preselectedLanguages), the modal shows up BEFORE font drop?
    // Let's check where LanguageSetupModal is rendered.
    // It's rendered at the bottom: {importedLanguages && <LanguageSetupModal ... />}
    // We DON'T want that modal to show until we have a font if we are in "Wizard Mode".
    // OR: Maybe treating it as importedLanguages is wrong because that implies "Ready to Configure".
    // In Wizard Mode, we want to hold the languages, wait for font, THEN configure.

    // Better approach:
    // Only trigger the "Setup" flow when we have BOTH languages AND a font.
    // Allow `importedLanguages` to be null initially?
    // No, let's keep it simple.
    // If preselectedLanguages is set, we are in "Wizard Mode".
    // We want the user to drop a font.
    // When they drop a font, `handleFiles` adds it to `pendingFonts`.
    // THEN we want to combine them?

    // Let's modify the render condition for LanguageSetupModal/FontLanguageModal.

    useEffect(() => {
        if (importedLanguages && pendingFonts.length > 0 && onSetupReady) {
            onSetupReady({
                languages: importedLanguages,
                fonts: pendingFonts
            });
            // Clear local state so we don't keep triggering
            setTimeout(() => {
                setImportedLanguages(null);
                setPendingFonts([]);
            }, 0);
        }
    }, [importedLanguages, pendingFonts, onSetupReady]);


    const handleSetupConfirm = async (setupMap, pooledFonts = [], primarySelection = null) => {
        try {
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

                // 4. Prepare Mappings map
                const mappings = {};
                Object.entries(setupMap).forEach(([langId, state]) => {
                    if ((state.type === 'upload' || state.type === 'pool') && state.file) {
                        mappings[langId] = state.file.name;
                    }
                });

                // 5. Batch Update
                if (loadedFontsRegister.length > 0 || Object.keys(mappings).length > 0) {
                    batchAddFontsAndMappings({
                        fonts: loadedFontsRegister,
                        mappings: mappings,
                        languageIds: importedLanguages // PASS ALL IMPORTED LANGUAGES
                    });
                } else {
                    // If no fonts, just enable languages
                    batchAddConfiguredLanguages(importedLanguages);
                }
            }
        } catch (error) {
            console.error("Error in setup confirm:", error);
            alert("An error occurred during setup. Please try again.");
        } finally {
            setImportedLanguages(null);
            setPendingFonts([]);
        }
    };

    const handleModalConfirm = ({ mappings, orderedFonts, primaryLanguages: selectedPrimaryLanguages }) => {
        try {
            const fontObjectsToRegister = [];
            const languageMappings = {};
            const languageIdsToConfigure = new Set();

            // Handle Primary Language Selection from Modal
            if (selectedPrimaryLanguages && selectedPrimaryLanguages.length > 0) {
                // We assume single selection as enforced in modal
                const pLangId = selectedPrimaryLanguages[0];
                togglePrimaryLanguage(pLangId);
            }

            const primaryItem = orderedFonts[0];
            const autoFonts = [];

            // 1. Process All Fonts
            orderedFonts.forEach((item, index) => {
                // if (index === 0) return; // FIX: Don't skip primary font for language gathering

                const fontData = {
                    id: `uploaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'fallback',
                    fontObject: item.font,
                    fontUrl: item.url,
                    fileName: item.file.name,
                    name: item.file.name,
                    axes: item.metadata.axes,
                    isVariable: item.metadata.isVariable,
                    staticWeight: item.metadata.staticWeight ?? null
                };

                if (index > 0) {
                    fontObjectsToRegister.push(fontData);
                }

                const Mapping = mappings[item.file.name];
                if ((Mapping === 'auto' || (Array.isArray(Mapping) && Mapping.length === 0)) && index > 0) {
                    // Only treat as auto-font if it's not the primary (primary is handled via loadFont)
                    autoFonts.push(item);
                } else if (Array.isArray(Mapping)) {
                    Mapping.forEach(langId => {
                        if (langId === 'auto') {
                            if (index > 0) autoFonts.push(item);
                        } else {
                            // Always add to configure set (so it shows up in sidebar)
                            languageIdsToConfigure.add(langId);

                            // Only map override if NOT primary
                            if (index > 0) {
                                languageMappings[langId] = item.file.name;
                            }
                        }
                    });
                } else if (Mapping && Mapping !== 'auto') {
                    // Always add to configure set
                    languageIdsToConfigure.add(Mapping);

                    // Only map override if NOT primary
                    if (index > 0) {
                        languageMappings[Mapping] = item.file.name;
                    }
                }
            });

            // 2. Load the designated Primary font first (Special handling currently)
            if (primaryItem) {
                loadFont(primaryItem.font, primaryItem.url, primaryItem.file.name, primaryItem.metadata);
                // Also ensure primary language is mapped (usually handled by addPrimaryLanguageOverrides)
            }

            // 3. Batch Add Fallbacks and Mappings
            // This consolidated call handles deduplication and inheritance triggers
            batchAddFontsAndMappings({
                fonts: fontObjectsToRegister,
                mappings: languageMappings,
                languageIds: Array.from(languageIdsToConfigure)
            });

            // 4. Ensure Primary Language is mapped to Primary Font
            if (selectedPrimaryLanguages && selectedPrimaryLanguages.length > 0) {
                addPrimaryLanguageOverrides(selectedPrimaryLanguages);
                selectedPrimaryLanguages.forEach(id => languageIdsToConfigure.add(id));
            }

            // 5. Ensure at least en-US if nothing else
            setTimeout(() => {
                if (languageIdsToConfigure.size === 0) {
                    batchAddConfiguredLanguages(['en-US']);
                    if (!primaryLanguages || primaryLanguages.length === 0) {
                        togglePrimaryLanguage('en-US');
                    }
                } else {
                    batchAddConfiguredLanguages(Array.from(languageIdsToConfigure));
                }
            }, 50);

        } catch (error) {
            console.error("Error in font modal confirm:", error);
            alert("An error occurred while processing fonts. Please try again.");
        } finally {
            setPendingFonts([]);
            setPrefilledMappings({});
        }
    };

    const handleModalCancel = () => {
        setPendingFonts([]);
        setPrefilledMappings({});
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const droppedFiles = Array.from(e.dataTransfer.files);
        const fontFiles = [];
        const configFiles = [];

        droppedFiles.forEach(file => {
            if (file.name.toLowerCase().endsWith('.json')) {
                configFiles.push(file);
            } else {
                fontFiles.push(file);
            }
        });

        if (configFiles.length > 0) {
            alert("Configuration files (.json) cannot be dropped here. Please use the 'Import Configuration' button.");
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





    return (
        <>
            {renderDropzone && (
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

                    {/* Config Import Buttons - Hide if in Wizard Mode (preselectedLanguages) */}
                    {!preselectedLanguages && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                        </div>
                    )}
                </>
            )}

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
                accept=".json"
                onChange={onConfigInputChange}
            />



            {
                importedLanguages && (pendingFonts.length > 0) && (
                    onSetupReady ? (
                        // If onSetupReady is provided, we delegate control and do NOT render the modal here
                        // We use an effect or immediate call to trigger the parent
                        (() => {
                            // This is inside render, which is not ideal for side effects.
                            // Better to do this in an effect.
                            return null;
                        })()
                    ) : (
                        <LanguageSetupModal
                            languageIds={importedLanguages}
                            onConfirm={handleSetupConfirm}
                            onCancel={() => setImportedLanguages(null)}
                            forcedPrimaryFont={pendingFonts.length === 1 ? pendingFonts[0] : null} // Allow automatic selection if single font drop
                        />
                    )
                )
            }

            {
                !importedLanguages && pendingFonts.length > 0 && (
                    <FontLanguageModal
                        pendingFonts={pendingFonts}
                        initialMappings={prefilledMappings}
                        onConfirm={handleModalConfirm}
                        onCancel={handleModalCancel}
                    />
                )
            }
        </>

    );
};

export default FontUploader;
