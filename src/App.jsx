import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TypoProvider } from './context/TypoContext';
import { useTypo } from './context/useTypo';
import FontUploader from './components/FontUploader';
import SideBar from './components/SideBar';
import LanguageCard from './components/LanguageCard';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import ErrorBoundary from './components/ErrorBoundary';
import TextCasingSelector from './components/TextCasingSelector';
import ViewModeSelector from './components/ViewModeSelector';
import MissingFontsModal from './components/MissingFontsModal';
import LanguageGroupFilter from './components/LanguageGroupFilter';
import AddLanguageModal from './components/AddLanguageModal';
import FontLanguageModal from './components/FontLanguageModal';
import { parseFontFile, createFontUrl } from './services/FontLoader';

import { useConfigImport } from './hooks/useConfigImport';
import { TsExportService } from './services/TsExportService';
import { TsImportService } from './services/TsImportService';

import { useFontFaceStyles } from './hooks/useFontFaceStyles';
import { getLanguageGroup } from './utils/languageUtils';
import { PersistenceService } from './services/PersistenceService';
import ResetConfirmModal from './components/ResetConfirmModal';

const MainContent = ({
  sidebarMode,
  setSidebarMode,
  selectedGroup,
  setSelectedGroup,
  onAddLanguage,
  showLanguageModal,
  setShowLanguageModal,
  addLanguageGroupFilter,
  setAddLanguageGroupFilter,
  highlitLanguageId,
  setHighlitLanguageId,
  setPreviewMode
}) => {
  const {
    fontObject,
    fontStyles,
    headerStyles,
    gridColumns,
    setGridColumns,
    primaryFontOverrides,
    fallbackFontOverrides,
    addConfiguredLanguage,
    addLanguageSpecificPrimaryFontFromId,
    isLanguageTargeted,
    supportedLanguages, // New export
    targetedLanguageIds,
    languages,
    configuredLanguages,
    primaryLanguages, // New

    // Restore missing variables
    showFallbackColors,
    setShowFallbackColors,
    showAlignmentGuides,
    toggleAlignmentGuides,
    showBrowserGuides,
    toggleBrowserGuides,

    setActiveConfigTab,
    activeConfigTab
  } = useTypo();

  const { importConfig, missingFonts, existingFiles, resolveMissingFonts, cancelImport, parsedAssignments } = useConfigImport();
  // Removed local showLanguageSelector state
  const [showListSettings, setShowListSettings] = useState(false);
  const [pendingFonts, setPendingFonts] = useState([]);
  const [pendingFileMap, setPendingFileMap] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);



  // Sync highlitLanguageId with activeConfigTab to prevent double selection
  useEffect(() => {
    if (activeConfigTab === 'ALL') {
      if (highlitLanguageId !== null) {
        setHighlitLanguageId(null);
      }
    } else {
      const targetId = activeConfigTab === 'primary' ? 'en-US' : activeConfigTab;
      if (highlitLanguageId !== targetId) {
        setHighlitLanguageId(targetId);
      }
    }
  }, [activeConfigTab, highlitLanguageId, setHighlitLanguageId]);

  const { getExportConfiguration, addLanguageSpecificFallbackFont, loadFont } = useTypo();

  const handleExport = () => {
    const config = getExportConfiguration();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    // Month is 0-indexed, so +1
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);

    const timestamp = `${month}-${day}-${year}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `config-${timestamp}.fall`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTsExport = () => {
    // fontStyles, headerStyles, primaryFontOverrides, fallbackFontOverrides are available in scope
    const tsContent = TsExportService.generateTsContent({
      fontStyles,
      headerStyles,
      primaryFontOverrides,
      fallbackFontOverrides
    });

    const blob = new Blob([tsContent], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typography.types.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };





  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.ts')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const config = TsImportService.parseTsContent(event.target.result);
            // We fake a wrapper for the importConfig to consume?
            // importConfig expects the raw structure (which supports normalization).
            // TsImportService returns a structure compatible with 'normalizedConfig'.
            // But useConfigImport.importConfig normally reads the file itself. 
            // We should expose a method on useConfigImport to 'loadRawConfig(data)' or similar?
            // Or we can just call the internal validator if we had access?
            // useConfigImport returns 'importConfig(file)'.

            // Let's modify useConfigImport to allow passing an object directly? 
            // Or we create a Blob/File from the JSON string of our parsed config and pass that?
            // Creating a config blob is safer integration-wise.

            const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
            const jsonFile = new File([blob], "imported-config.json", { type: "application/json" });
            importConfig(jsonFile);

          } catch (err) {
            console.error(err);
            alert(err.message);
          }
        };
        reader.readAsText(file);
      } else {
        importConfig(file);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const handleResolve = async (fileMap) => {
    const files = Object.values(fileMap);
    const processed = [];

    for (const file of files) {
      try {
        const { font, metadata } = await parseFontFile(file);
        const url = createFontUrl(file);
        processed.push({ font, metadata, url, file });
      } catch (err) {
        console.error("Error parsing during import resolution:", err);
      }
    }

    if (processed.length > 0) {
      setPendingFonts(processed);
      setPendingFileMap(fileMap);
    } else {
      resolveMissingFonts(fileMap);
    }
  };

  const handleAssignmentsConfirm = async ({ assignments, orderedFonts }) => {
    // First restore the main config
    await resolveMissingFonts(pendingFileMap);

    // Load the designated Primary font to ensure it's the main session font
    // We do this AFTER restoration because restoreConfiguration overwrites fontStyles
    const primaryItem = orderedFonts[0];
    if (primaryItem) {
      loadFont(
        primaryItem.font,
        primaryItem.url,
        primaryItem.file.name,
        primaryItem.metadata
      );
    }

    // Then apply the language fallback overrides for the newly uploaded fonts, respecting the user's order
    orderedFonts.forEach((item, index) => {
      if (index === 0) return; // Skip primary

      const target = assignments[item.file.name];
      if (target !== 'auto') {
        addLanguageSpecificFallbackFont(
          item.font,
          item.url,
          item.file.name,
          item.metadata,
          target
        );
      }
    });

    setPendingFonts([]);
    setPendingFileMap(null);
  };

  const handleResetApp = async () => {
    await PersistenceService.clear();
    window.location.reload();
  };

  const listSettingsRef = useRef(null);
  const toolbarRef = useRef(null);
  const buttonRef = useRef(null);
  const [buttonX, setButtonX] = useState(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const fontFaceStyles = useFontFaceStyles();

  // Measure button position for fixed overlay
  useLayoutEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonX(rect.left);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [sidebarMode, isToolbarVisible]);

  // Scroll detection for toolbar
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsToolbarVisible(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px"
      }
    );

    const currentToolbarRef = toolbarRef.current;
    if (currentToolbarRef) {
      observer.observe(currentToolbarRef);
    }

    return () => {
      if (currentToolbarRef) {
        observer.unobserve(currentToolbarRef);
      }
    };
  }, [fontObject]);

  useEffect(() => {
    if (!showListSettings) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowListSettings(false);
    };

    const onMouseDown = (e) => {
      const el = listSettingsRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setShowListSettings(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [showListSettings]);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen relative">
      <style>{fontFaceStyles}</style>

      {fontObject && sidebarMode === 'headers' && buttonX !== null && (
        <div
          className="fixed top-8 md:top-10 z-50 transition-none"
          style={{ left: buttonX }}
        >
          <button
            onClick={() => setSidebarMode('main')}
            className="bg-white border border-transparent text-indigo-700 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px] ring-2 ring-indigo-500 shadow-sm"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Done</span>
          </button>
        </div>
      )}

      {fontObject && (
        <div
          className={`fixed top-8 right-8 md:top-10 md:right-10 z-50 transition-all duration-300 ${!isToolbarVisible ? 'translate-y-0' : ''} `}
          ref={listSettingsRef}
        >
          <button
            onClick={() => setShowListSettings(v => !v)}
            className={`p-1 rounded-lg border flex items-center justify-center w-[42px] h-[42px] text-slate-600 hover:text-indigo-600 transition-all duration-300 ${isToolbarVisible
              ? 'bg-white border-gray-200 hover:bg-slate-50 shadow-none'
              : 'bg-white/90 backdrop-blur border-slate-200 shadow-xl hover:bg-white'
              } `}
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9.75-6H13.5m0 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-6.75 0H10.5" />
            </svg>
          </button>

          {showListSettings && (
            <div className={`absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl p-3 shadow-xl origin-top-right transition-all duration-200 animate-in fade-in zoom-in-95`}>
              <div className="mb-3 space-y-3 pb-3 border-b border-gray-100">
                <div>
                  <div className="border border-gray-100 rounded-lg p-1 bg-slate-50">
                    <TextCasingSelector />
                  </div>
                </div>
                <div>
                  <div className="border border-gray-100 rounded-lg p-1 bg-slate-50 overflow-x-auto">
                    <ViewModeSelector />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Import Config */}
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg cursor-pointer transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Import</span>
                    <input
                      type="file"
                      accept=".json,.fall"
                      className="hidden"
                      onChange={handleImport}
                    />
                  </label>

                  {/* Export Config */}
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-lg transition-all shadow-sm shadow-indigo-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Export</span>
                  </button>

                  {/* Import TS */}
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg cursor-pointer transition-all">
                    <span className="font-mono text-[10px]">TS</span>
                    <span>Import</span>
                    <input
                      type="file"
                      accept=".ts"
                      className="hidden"
                      onChange={handleImport}
                    />
                  </label>

                  {/* Export TS */}
                  <button
                    onClick={handleTsExport}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all"
                  >
                    <span className="font-mono text-[10px]">TS</span>
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="mb-3 pb-3 border-b border-gray-100">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                  <span>Reset App State</span>
                </button>
              </div>

              {/* REMOVED: Language button inside dropdown */}
              {/* <button ... Languages ... /> */}

              <div className="mt-3">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Columns</div>
                <div className="relative">
                  <select
                    value={gridColumns}
                    onChange={(e) => setGridColumns(parseInt(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-700 font-medium focus:outline-none cursor-pointer appearance-none"
                  >
                    {[1, 2, 3, 4].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fallback Colors</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showFallbackColors}
                  onClick={() => setShowFallbackColors(!showFallbackColors)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showFallbackColors ? 'bg-indigo-600' : 'bg-slate-200'
                    } `}
                >
                  <span
                    aria-hidden="true"
                    className={`${showFallbackColors ? 'translate-x-[18px]' : 'translate-x-0.5'
                      } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {(!isToolbarVisible) && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Guides</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-700 font-medium">Type Grid</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showAlignmentGuides}
                      onClick={toggleAlignmentGuides}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${showAlignmentGuides ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <span className={`${showAlignmentGuides ? 'translate-x-[18px]' : 'translate-x-0.5'} inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 font-medium">Browser Render</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showBrowserGuides}
                      onClick={toggleBrowserGuides}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${showBrowserGuides ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <span className={`${showBrowserGuides ? 'translate-x-[18px]' : 'translate-x-0.5'} inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-700 font-medium">Live Website Preview</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMode(true);
                        setShowListSettings(false);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Open
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!fontObject ? (
        <div className="h-screen flex flex-col items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Fallback Styles</h1>
            <p className="text-center text-gray-500 mb-8">Stress-test fallback fonts for beautiful localized typography.</p>
            <FontUploader importConfig={importConfig} />


          </div>
        </div>
      ) : (
        <div
          className="p-8 md:p-10 min-h-screen cursor-default"
          onClick={() => {
            // Background click to unselect
            setActiveConfigTab('ALL');
            if (setHighlitLanguageId) setHighlitLanguageId(null);
            // useTypo context handles this generally, but we might need to reset highlight if it was passed down differently?
            // Actually MainContent props has highlitLanguageId, but activeConfigTab is in context.
            // Let's assume activeConfigTab is the main "selection" state.
            // If the user meant "highlight" in sidebar also clears, we might need a prop callback or context usage.
            // The sidebar handles setHighlitLanguageId locally/via prop. MainContent receives it.
            // So to clear highlight, we might need to call a prop function if it existed?
            // Wait, App.jsx manages setHighlitLanguageId. MainContent receives highlitLanguageId but not setHighlitLanguageId?
            // MainContent definition: const MainContent = ({ ... highlitLanguageId, ... })
            // It clearly doesn't receive setHighlitLanguageId in destructuring at line 30.
            // Ah, wait. I should check if I can modify setHighlitLanguageId from here or if clearConfigTab is enough.
          }}
        >
          <div
            ref={toolbarRef}
            className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4 min-h-[42px]"
          >
            {/* LanguageGroupFilter moved to SideBar */}

            <div className={`flex flex-col sm:flex-row gap-4 items-center transition-opacity duration-300 ${isToolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'} `}>
              <button
                ref={buttonRef}
                onClick={() => setSidebarMode(sidebarMode === 'headers' ? 'main' : 'headers')}
                className={`bg-white border border-gray-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px] ${sidebarMode === 'headers' ? 'opacity-0 pointer-events-none' : ''} `}
                type="button"
              >
                <span className="text-xs font-serif italic">Aa</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Edit Styles</span>
              </button>

              <button
                onClick={() => setPreviewMode(true)}
                className="bg-white border border-gray-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px]"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.66 9.336 6.41.147.481.147.974 0 1.455C18.201 14.66 14.257 17.335 10 17.335s-8.201-2.675-9.336-6.745zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Live Website Preview</span>
              </button>

              <div className="relative group">
                <button
                  className={`bg-white border border-gray-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-2 h-[42px] ${(showAlignmentGuides || showBrowserGuides) ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-400'} `}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                    <path d="m14.5 12.5 2-2" />
                    <path d="m11.5 9.5 2-2" />
                    <path d="m8.5 6.5 2-2" />
                    <path d="m17.5 15.5 2-2" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Guides</span>
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl p-2 shadow-xl origin-top-right transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible z-50">
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleAlignmentGuides()}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${showAlignmentGuides ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'} `}
                    >
                      <span>Type Grid</span>
                    </button>
                    <button
                      onClick={() => toggleBrowserGuides()}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${showBrowserGuides ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'} `}
                    >
                      <span>Browser Render</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-[42px] h-[42px] hidden sm:block shrink-0" aria-hidden="true" />
            </div>
          </div>
          <div className="grid gap-4 transition-all duration-300 ease-in-out" style={{ gridTemplateColumns: `repeat(${fontObject ? gridColumns : 1}, minmax(0, 1fr))` }}>
            {(() => {
              if (selectedGroup === 'ALL_TARGETED') {
                // Filter full DB languages by targeted IDs
                return languages.filter(l => targetedLanguageIds.includes(l.id));
              }

              if (selectedGroup === 'ALL') {
                return supportedLanguages;
              }

              // For specific groups, we filter supportedLanguages
              // For specific groups, we filter supportedLanguages AND include primaryLanguages
              const visible = supportedLanguages.filter(lang =>
                getLanguageGroup(lang) === selectedGroup || primaryLanguages.includes(lang.id)
              );
              // De-duplicate in case a primary language is also in the group
              return Array.from(new Set(visible.map(l => l.id)))
                .map(id => visible.find(l => l.id === id));
            })().map(lang => (
              <LanguageCard
                key={lang.id}
                language={lang}
                isHighlighted={highlitLanguageId === lang.id || (highlitLanguageId === 'primary' && lang.id === 'en-US')}
              />
            ))}
          </div>
        </div>
      )}

      {/* REMOVED: LanguageSelectorModal moved to App */}
      {/* 
      {showLanguageSelector && (
        <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
      )}
      */}

      {showLanguageModal && (
        <AddLanguageModal
          onClose={() => setShowLanguageModal(false)}
          onConfirm={(langId, fontId) => {
            addConfiguredLanguage(langId);
            if (fontId && fontId !== 'inherit') {
              addLanguageSpecificPrimaryFontFromId(fontId, langId);
            }
            setActiveConfigTab(langId);
            setShowLanguageModal(false);
          }}
          configuredLanguages={configuredLanguages}
          filterGroup={addLanguageGroupFilter}
        />
      )}

      {missingFonts && (
        <MissingFontsModal
          missingFonts={missingFonts}
          existingFiles={existingFiles}
          onResolve={handleResolve}
          onCancel={cancelImport}
        />
      )}

      {pendingFonts.length > 0 && (
        <FontLanguageModal
          pendingFonts={pendingFonts}
          initialAssignments={parsedAssignments}
          onConfirm={handleAssignmentsConfirm}
          onCancel={() => {
            setPendingFonts([]);
            setPendingFileMap(null);
            cancelImport();
          }}
        />
      )}

      <ResetConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetApp}
      />
    </div>
  );
};

import LivePreview from './components/LivePreview';

function App() {
  const [sidebarMode, setSidebarMode] = useState('main');
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [highlitLanguageId, setHighlitLanguageId] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [addLanguageGroupFilter, setAddLanguageGroupFilter] = useState(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const handleAddLanguage = (group) => {
    setAddLanguageGroupFilter(group);
    setShowLanguageModal(true);
  };

  return (
    <ErrorBoundary>
      <TypoProvider>
        {previewMode && (
          <LivePreview onClose={() => setPreviewMode(false)} />
        )}
        <div className="flex min-h-screen w-full">
          <SideBar
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            onAddLanguage={handleAddLanguage}
            highlitLanguageId={highlitLanguageId}
            setHighlitLanguageId={setHighlitLanguageId}
            onManageLanguages={() => setShowLanguageSelector(true)}
          />
          <MainContent
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            onAddLanguage={handleAddLanguage}
            showLanguageModal={showLanguageModal}
            setShowLanguageModal={setShowLanguageModal}
            addLanguageGroupFilter={addLanguageGroupFilter}
            setAddLanguageGroupFilter={setAddLanguageGroupFilter}
            highlitLanguageId={highlitLanguageId}
            setHighlitLanguageId={setHighlitLanguageId}
            setPreviewMode={setPreviewMode}
          />
        </div>
        {showLanguageSelector && (
          <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
        )}
      </TypoProvider>
    </ErrorBoundary>
  );
}

export default App;
