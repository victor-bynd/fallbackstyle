import { useState, useRef } from 'react';
import { useTypo } from '../context/useTypo';
import FontUploader from './FontUploader';
import LanguageList from './LanguageList';
import LanguageSetupModal from './LanguageSetupModal';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import ResetConfirmModal from './ResetConfirmModal';

const InitialOptionCard = ({ icon, title, description, onClick, primary = false }) => (
    <button
        onClick={onClick}
        className={`
            group relative flex flex-col items-center justify-start p-8 rounded-2xl border-2 transition-all duration-300 w-full text-center
            ${primary
                ? 'bg-white border-indigo-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10'
                : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-lg'
            }
        `}
    >
        <div className={`
            w-16 h-16 mb-4 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110
            ${primary ? 'bg-indigo-50 text-indigo-500' : 'bg-white text-slate-400 group-hover:text-slate-600'}
        `}>
            {icon}
        </div>
        <h3 className={`text-lg font-bold mb-2 ${primary ? 'text-indigo-900 group-hover:text-indigo-600' : 'text-slate-700'}`}>
            {title}
        </h3>
        <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">
            {description}
        </p>

        {primary && (
            <div className="mt-6 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                Get Started
            </div>
        )}
    </button>
);

const LandingPage = ({ importConfig }) => {
    const [step, setStep] = useState('initial'); // 'initial' | 'languages' | 'upload'
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [droppedFiles, setDroppedFiles] = useState([]);
    const [setupData, setSetupData] = useState(null);
    const [primaryLanguages, setPrimaryLanguages] = useState(['en-US']);
    const [showResetModal, setShowResetModal] = useState(false);

    const {
        loadFont,
        batchAddConfiguredLanguages,
        batchAddFontsAndMappings,
        // Unused context values removed
        fontObject,
        togglePrimaryLanguage
    } = useTypo();

    const toggleLanguage = (id) => {
        setSelectedLanguages(prev => {
            const next = prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id];

            // If we are deselecting the active primary language
            if (primaryLanguages.includes(id) && !next.includes(id)) {
                // If we have other languages, make the first one primary, otherwise empty (or keep en-US if likely to be re-added?)
                // Strategy: Just remove it. Sidebar handles fallback.
                setPrimaryLanguages(prevPrim => prevPrim.filter(p => p !== id));
            }
            return next;
        });
    };

    const handleTogglePrimary = (id) => {
        // Enforce single primary language for this flow
        setPrimaryLanguages([id]);
    };

    const handleReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Ref references for invisible inputs
    const configInputRef = useRef(null);
    const fontInputRef = useRef(null);

    const handleFontSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            console.log("LandingPage: handleFontSelect", e.target.files);
            setDroppedFiles(Array.from(e.target.files));
            // Don't change step, stay on initial page but let FontUploader handle it
            e.target.value = ''; // Reset input to allow re-selection
        }
    };

    const handleSetupReady = ({ languages, fonts }) => {
        setSetupData({ languages, fonts });
        setStep('setup');
    };

    const handleSetupConfirm = async (setupMap, pooledFonts = [], primarySelection = null, globalFallback = null) => {
        const { languages: importedLanguages } = setupData;

        if (importedLanguages) {
            // 1. Gather Unique Files (Pool + Overrides + Primary + Global Fallback)
            const uniqueFiles = new Map(); // filename -> fileObj

            // Add from Pool
            pooledFonts.forEach(f => uniqueFiles.set(f.name, f));

            // Add from Mappings
            Object.values(setupMap).forEach(state => {
                if ((state.type === 'upload' || state.type === 'pool') && state.file) {
                    uniqueFiles.set(state.file.name, state.file);
                }
            });

            // Add from Primary Selection
            if (primarySelection && (primarySelection.type === 'upload' || primarySelection.type === 'pool') && primarySelection.file) {
                uniqueFiles.set(primarySelection.file.name, primarySelection.file);
            }

            // Add from Global Fallback
            if (globalFallback && (globalFallback.type === 'upload' || globalFallback.type === 'pool') && globalFallback.file) {
                uniqueFiles.set(globalFallback.file.name, globalFallback.file);
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

            // 3. Handle Primary Mapping First
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

            // 6. Set Primary Language
            if (primaryLanguages.length > 0) {
                // We assume single primary selection
                togglePrimaryLanguage(primaryLanguages[0]);
            }
        }
        setSetupData(null);
        setStep('initial'); // Or consider 'done' / redirect? Usually App state change causes rerender elsewhere.
    };

    const onConfigInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            importConfig(e.target.files[0]);
        }
    };

    if (step === 'setup' && setupData) {
        return (
            <LanguageSetupModal
                languageIds={setupData.languages}
                primaryLanguages={primaryLanguages} // Pass primary languages
                onConfirm={handleSetupConfirm}
                onCancel={() => {
                    setSetupData(null);
                    setStep('languages'); // Go back to languages step
                }}
                forcedPrimaryFont={setupData.fonts.length === 1 ? setupData.fonts[0] : null}
            />
        );
    }

    // Upload step removed for "Start with Languages" flow.
    // It is now combined into the Setup Modal.

    if (step === 'languages') {
        return (
            <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden h-full max-h-[800px]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Select Languages</h2>
                                <p className="text-sm text-slate-500 mt-1">Which languages does your project need to support?</p>
                            </div>
                        </div>

                        {/* Language List */}
                        <div className="flex-1 min-h-0">
                            <LanguageList
                                selectedIds={selectedLanguages}
                                onSelect={toggleLanguage}
                                mode="multi"
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                primaryLanguages={primaryLanguages}
                                onTogglePrimary={handleTogglePrimary}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            <button
                                onClick={() => setStep('initial')}
                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-slate-400">
                                    {selectedLanguages.length} selected
                                </span>
                                <button
                                    onClick={() => handleSetupReady({ languages: selectedLanguages, fonts: [] })}
                                    disabled={selectedLanguages.length === 0}
                                    className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    Next: Configure Fonts →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: Initial Landing Options
    return (
        <div className="h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                        Fallback Styles
                    </h1>
                    <p className="text-lg text-slate-500 max-w-xl mx-auto">
                        Stress-test your typography across languages and fallback fonts.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                    {/* Option 2: Start with Languages (Primary) */}
                    <InitialOptionCard
                        primary={true}
                        onClick={() => setStep('languages')}
                        title="Start with Languages"
                        description="Add the countries/regions you want to support then add fonts as you go."
                        icon={(
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                            </svg>
                        )}
                    />

                    {/* Option 1: Start with Fonts (Secondary) - Drag & Drop Area */}
                    <div
                        className="group relative flex flex-col items-center justify-start p-8 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition-all duration-300 w-full text-center hover:bg-white hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                console.log("LandingPage: onDrop", e.dataTransfer.files);
                                setDroppedFiles(Array.from(e.dataTransfer.files));
                            }
                        }}
                        onClick={() => fontInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 mb-4 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-indigo-50 text-indigo-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2 group-hover:text-indigo-600">
                            Start with Fonts
                        </h3>
                        <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed mb-4">
                            Drag & drop your fonts here then map country/regions.
                        </p>
                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full group-hover:bg-indigo-100 transition-colors">
                            Supports .ttf, .otf, .woff2
                        </span>
                    </div>

                    <input
                        type="file"
                        ref={fontInputRef}
                        className="hidden"
                        multiple
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={handleFontSelect}
                    />
                </div>

                {/* Option 3: Import Config (Tertiary) */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-50 px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Or Import Config</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => configInputRef.current?.click()}
                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Config File (.json)
                        </button>
                    </div>
                </div>

                {/* Headless Font Uploader for Start with Fonts flow */}
                <FontUploader
                    importConfig={importConfig}
                    preselectedLanguages={null}
                    initialFiles={droppedFiles}
                    renderDropzone={false}
                />


                <input
                    type="file"
                    ref={configInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={onConfigInputChange}
                />


            </div >

            {/* Discreet Reset Button */}
            <button
                onClick={() => setShowResetModal(true)}
                className="absolute bottom-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-50"
                title="Reset Application"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
            </button>


            <ResetConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleReset}
            />

            <div className="absolute bottom-4 left-6 text-xs font-bold text-slate-300 select-none pointer-events-none">
                v{__APP_VERSION__}
            </div>
        </div >

    );
};

export default LandingPage;
