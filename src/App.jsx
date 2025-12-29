import { useEffect, useRef, useState } from 'react';
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
import ConfigActionsModal from './components/ConfigActionsModal';
import { parseFontFile, createFontUrl } from './services/FontLoader';
import { useConfigImport } from './hooks/useConfigImport';
import { TsExportService } from './services/TsExportService';
import { useFontFaceStyles } from './hooks/useFontFaceStyles';
import { getLanguageGroup } from './utils/languageUtils';
import { PersistenceService } from './services/PersistenceService';
import ResetConfirmModal from './components/ResetConfirmModal';

const MainContent = ({
  sidebarMode,
  setSidebarMode,
  selectedGroup,
  // setSelectedGroup - UNUSED
  // onAddLanguage - UNUSED
  showLanguageModal,
  setShowLanguageModal,
  addLanguageGroupFilter,
  // setAddLanguageGroupFilter - UNUSED
  highlitLanguageId,
  setHighlitLanguageId,
  activeConfigModal,
  setActiveConfigModal
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
    // isLanguageTargeted - UNUSED
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

  const visibleLanguagesList = (() => {
    if (selectedGroup === 'ALL_TARGETED') {
      return languages.filter(l =>
        targetedLanguageIds.includes(l.id) ||
        primaryLanguages.includes(l.id) ||
        (primaryLanguages.length === 0 && l.id === 'en-US')
      );
    }
    if (selectedGroup === 'ALL') {
      return supportedLanguages;
    }
    const visible = supportedLanguages.filter(lang =>
      getLanguageGroup(lang) === selectedGroup || primaryLanguages.includes(lang.id)
    );
    return Array.from(new Set(visible.map(l => l.id)))
      .map(id => visible.find(l => l.id === id));
  })();

  const visibleCount = visibleLanguagesList.length;
  const totalCount = supportedLanguages.length;
  const isFiltered = visibleCount < totalCount;

  const { importConfig, missingFonts, existingFiles, resolveMissingFonts, cancelImport, parsedAssignments } = useConfigImport();
  // Removed local showLanguageSelector state
  const [showListSettings, setShowListSettings] = useState(false);
  const [pendingFonts, setPendingFonts] = useState([]);
  const [pendingFileMap, setPendingFileMap] = useState(null);

  // Sync highlitLanguageId with activeConfigTab to prevent double selection
  useEffect(() => {
    if (activeConfigTab === 'ALL') {
      if (highlitLanguageId !== null) {
        setHighlitLanguageId(null);
      }
    } else {
      const primaryLangId = primaryLanguages[0] || 'en-US';
      const targetId = activeConfigTab === 'primary' ? primaryLangId : activeConfigTab;
      if (highlitLanguageId !== targetId) {
        setHighlitLanguageId(targetId);
      }
    }
  }, [activeConfigTab, highlitLanguageId, setHighlitLanguageId, primaryLanguages]);

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
    a.download = `config-${timestamp}.json`;
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
      importConfig(file);
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



  const listSettingsRef = useRef(null);
  const toolbarRef = useRef(null);
  // const [buttonX, setButtonX] = useState(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const fontFaceStyles = useFontFaceStyles();

  // Measure button position for fixed overlay


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
      if (e.key === 'Escape') {
        setShowListSettings(false);
      }
    };

    const onMouseDown = (e) => {
      const el = listSettingsRef.current;
      if (!el) return;
      if (!el.contains(e.target)) {
        setShowListSettings(false);
      }
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
          className="pt-4 px-8 md:px-10 min-h-screen cursor-default"
          onClick={() => {
            setActiveConfigTab('ALL');
            if (setHighlitLanguageId) setHighlitLanguageId(null);
          }}
        >
          <div
            ref={toolbarRef}
            className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4 min-h-[42px]"
          >
            {/* LEFT: Live Demo Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">
                TYPE DEMO
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{visibleCount}</span>
                {isFiltered && (
                  <>
                    <span className="opacity-50">/</span>
                    <span className="opacity-70">{totalCount}</span>
                  </>
                )}
                <span className="ml-0.5 opacity-50">Languages</span>
              </div>
            </div>

            {/* RIGHT: Controls */}
            <div className={`flex items-center gap-2 transition-all duration-300 ${isToolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {/* Guides Dropdown */}
              <div className="relative group">
                <button
                  className="bg-white border border-gray-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 h-[42px] shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
                    <path d="m15 5 4 4"></path>
                  </svg>
                  <span className="font-bold tracking-wider text-[10px]">Guides</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-50">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Guides Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl origin-top-right invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50 p-1">
                  <button
                    onClick={() => toggleAlignmentGuides()}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${showAlignmentGuides ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>Type Grid</span>
                    {showAlignmentGuides && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                  </button>
                  <button
                    onClick={() => toggleBrowserGuides()}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${showBrowserGuides ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>Browser Render</span>
                    {showBrowserGuides && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                  </button>
                  <button
                    onClick={() => setShowFallbackColors(!showFallbackColors)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${showFallbackColors ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>Fallback Colors</span>
                    {showFallbackColors && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                  </button>
                </div>
              </div>
              <div className="w-[42px] h-[42px] hidden sm:block shrink-0" aria-hidden="true" />
            </div>
          </div>

          {/* Fixed Settings Button - Moved here to escape opacity transition */}
          {sidebarMode !== 'headers' && (
            <div className="fixed top-4 right-8 md:top-4 md:right-10 z-[100]" ref={listSettingsRef}>
              <button
                onClick={() => setShowListSettings(!showListSettings)}
                className={`
                    p-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 w-[42px] h-[42px] shadow-sm
                    ${showListSettings
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-gray-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-slate-50'
                  }
                `}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </button>

              {showListSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-slate-200/50 origin-top-right z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2">
                  <div className="p-4 space-y-5">
                    {/* Interface Section */}
                    <div>
                      <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                        <span>Interface</span>
                        <div className="h-px flex-1 bg-slate-100 ml-3" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 ml-1">Grid</label>
                          <div className="relative">
                            <select
                              value={gridColumns}
                              onChange={(e) => setGridColumns(parseInt(e.target.value))}
                              className="w-full py-1.5 pl-3 pr-8 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-bold text-slate-700 tracking-tight transition-all"
                            >
                              {[1, 2, 3, 4].map(num => (
                                <option key={num} value={num}>{num} Col</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 ml-1">Display</label>
                          <ViewModeSelector variant="simple" />
                        </div>
                      </div>
                    </div>

                    {/* Typography Section */}
                    <div>
                      <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                        <span>Typography</span>
                        <div className="h-px flex-1 bg-slate-100 ml-3" />
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-1">
                        <TextCasingSelector variant="simple" />
                      </div>
                    </div>

                    {/* Tools Section */}
                    <div>
                      <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                        <span>Tools</span>
                        <div className="h-px flex-1 bg-slate-100 ml-3" />
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSidebarMode(sidebarMode === 'headers' ? 'main' : 'headers');
                            setShowListSettings(false);
                          }}
                          className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all border
                            ${sidebarMode === 'headers'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                            }
                          `}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className={`font-serif italic text-sm ${sidebarMode === 'headers' ? 'text-white' : 'text-slate-400'}`}>Aa</span>
                            <span>Edit Header Styles</span>
                          </span>
                          {sidebarMode === 'headers' && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setPreviewMode(true);
                            setShowListSettings(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          Live Website Preview
                        </button>
                      </div>
                    </div>

                    {/* Guides Section (Only visible when main toolbar is not visible) */}
                    {!isToolbarVisible && (
                      <div>
                        <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Guides</span>
                          <div className="h-px flex-1 bg-slate-100 ml-3" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-1 grid grid-cols-1 gap-1">
                          {[
                            { label: 'Type Grid', active: showAlignmentGuides, toggle: toggleAlignmentGuides },
                            { label: 'Browser Render', active: showBrowserGuides, toggle: toggleBrowserGuides },
                            { label: 'Fallback Colors', active: showFallbackColors, toggle: () => setShowFallbackColors(!showFallbackColors) }
                          ].map((guide) => (
                            <button
                              key={guide.label}
                              onClick={guide.toggle}
                              className={`
                                flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all
                                ${guide.active
                                  ? 'bg-white text-indigo-600 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                }
                              `}
                            >
                              <span>{guide.label}</span>
                              {guide.active && <div className="w-1 h-1 rounded-full bg-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 transition-all duration-300 ease-in-out" style={{ gridTemplateColumns: `repeat(${fontObject ? gridColumns : 1}, minmax(0, 1fr))` }}>
            {visibleLanguagesList.map(lang => (
              <LanguageCard
                key={lang.id}
                language={lang}
                isHighlighted={highlitLanguageId === lang.id || (highlitLanguageId === 'primary' && primaryLanguages.includes(lang.id))}
              />
            ))}
          </div>
        </div>
      )}

      {showLanguageModal && (
        <AddLanguageModal
          onClose={() => setShowLanguageModal(false)}
          onConfirm={(langId, fontId) => {
            addConfiguredLanguage(langId);
            if (fontId && fontId !== 'inherit') addLanguageSpecificPrimaryFontFromId(fontId, langId);
            setActiveConfigTab(langId);
            setShowLanguageModal(false);
          }}
          configuredLanguages={configuredLanguages}
          filterGroup={addLanguageGroupFilter}
        />
      )}

      {missingFonts && (
        <MissingFontsModal missingFonts={missingFonts} existingFiles={existingFiles} onResolve={handleResolve} onCancel={cancelImport} />
      )}

      {pendingFonts.length > 0 && (
        <FontLanguageModal
          pendingFonts={pendingFonts}
          initialAssignments={parsedAssignments}
          onConfirm={handleAssignmentsConfirm}
          onCancel={() => { setPendingFonts([]); setPendingFileMap(null); cancelImport(); }}
        />
      )}

      {activeConfigModal && (
        <ConfigActionsModal
          mode={activeConfigModal}
          onClose={() => setActiveConfigModal(null)}
          onImport={handleImport}
          onExport={handleExport}
          onTsExport={handleTsExport}
        />
      )}


    </div>
  );
};

function App() {
  const [sidebarMode, setSidebarMode] = useState('main');
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [highlitLanguageId, setHighlitLanguageId] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [addLanguageGroupFilter, setAddLanguageGroupFilter] = useState(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [activeConfigModal, setActiveConfigModal] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Live Preview Mode
  if (previewMode) {
    return <LivePreview onClose={() => setPreviewMode(false)} />;
  }

  const handleAddLanguage = (group) => {
    setAddLanguageGroupFilter(group);
    setShowLanguageModal(true);
  };

  const handleResetApp = async () => {
    await PersistenceService.clear();
    window.location.reload();
  };

  return (
    <ErrorBoundary>
      <TypoProvider>
        <div className="flex min-h-screen w-full">
          {/* LEFT SIDEBAR: Show only when NOT in header mode */}
          {sidebarMode !== 'headers' && (
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
              onOpenSettings={(mode) => setActiveConfigModal(mode)}
              onResetApp={() => setShowResetConfirm(true)}
            />
          )}

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
            activeConfigModal={activeConfigModal}
            setActiveConfigModal={setActiveConfigModal}
          // showResetConfirm and setShowResetConfirm are no longer needed here as App handles the modal
          />

          {/* RIGHT SIDEBAR: Show only when IN header mode */}
          {sidebarMode === 'headers' && (
            <SideBar
              sidebarMode={sidebarMode}
              setSidebarMode={setSidebarMode} // Pass same props
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
              onAddLanguage={handleAddLanguage}
              highlitLanguageId={highlitLanguageId}
              setHighlitLanguageId={setHighlitLanguageId}
              onManageLanguages={() => setShowLanguageSelector(true)}
              onOpenSettings={(mode) => setActiveConfigModal(mode)}
              onResetApp={() => setShowResetConfirm(true)}
            />
          )}
        </div>

        {showLanguageSelector && (
          <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
        )}

        <ResetConfirmModal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={handleResetApp}
        />
      </TypoProvider>
    </ErrorBoundary>
  );
}

export default App;
