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
import { useConfigImport } from './hooks/useConfigImport';

import { useFontFaceStyles } from './hooks/useFontFaceStyles';
import { getLanguageGroup } from './utils/languageUtils';

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
  highlitLanguageId
}) => {
  const {
    fontObject,
    gridColumns,
    setGridColumns,
    visibleLanguages,
    visibleLanguageIds,
    languages,
    showFallbackColors,
    setShowFallbackColors,
    showAlignmentGuides,
    toggleAlignmentGuides,
    showBrowserGuides,
    toggleBrowserGuides,
    activeConfigTab,
    setActiveConfigTab,
    configuredLanguages,
    removeConfiguredLanguage,
    primaryFontOverrides,
    fallbackFontOverrides,
    addConfiguredLanguage,
    addLanguageSpecificPrimaryFontFromId
  } = useTypo();

  const { importConfig, missingFonts, resolveMissingFonts, cancelImport } = useConfigImport();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showListSettings, setShowListSettings] = useState(false);

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
              </div>

              <button
                onClick={() => {
                  setShowLanguageSelector(true);
                  setShowListSettings(false);
                }}
                className="w-full bg-white border border-gray-200 flex items-center justify-between px-3 h-[42px] text-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors rounded-lg"
                type="button"
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Languages</span>
                <span className="font-mono text-xs text-slate-500">{visibleLanguageIds.length}/{languages.length}</span>
              </button>

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
            <FontUploader />

            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center">
              <label className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Import Configuration</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      importConfig(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 md:p-10">
          <div
            ref={toolbarRef}
            className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4 min-h-[42px]"
          >
            <div className="w-full md:w-auto overflow-hidden">
              <LanguageGroupFilter
                selectedGroup={selectedGroup}
                onSelectGroup={(group) => {
                  setSelectedGroup(group);
                  setActiveConfigTab('ALL');
                }}
                configuredLanguages={configuredLanguages}
                primaryFontOverrides={primaryFontOverrides}
                fallbackFontOverrides={fallbackFontOverrides}
                onAddLanguage={onAddLanguage}
              />
            </div>

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
                onClick={() => setShowLanguageSelector(true)}
                className="bg-white border border-gray-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px]"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m-15.686 0A11.953 11.953 0 0112 10.5c2.998 0 5.74-1.1 7.843-2.918m-15.686 0A8.959 8.959 0 013 12c0 .778.099 1.533.284 2.253" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Languages</span>
                <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 ml-1">{visibleLanguageIds.length}</span>
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
            {visibleLanguages.filter(lang => {
              if (selectedGroup === 'ALL') return true;
              if (!selectedGroup) return true;
              return getLanguageGroup(lang) === selectedGroup;
            }).map(lang => (
              <LanguageCard
                key={lang.id}
                language={lang}
                isHighlighted={highlitLanguageId === lang.id || (highlitLanguageId === 'primary' && lang.id === 'en-US')}
              />
            ))}
          </div>
        </div>
      )}

      {showLanguageSelector && (
        <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
      )}

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
          onResolve={resolveMissingFonts}
          onCancel={cancelImport}
        />
      )}
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
            onAddLanguage={handleAddLanguage}
            highlitLanguageId={highlitLanguageId}
            setHighlitLanguageId={setHighlitLanguageId}
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
          />
        </div>
      </TypoProvider>
    </ErrorBoundary>
  );
}

export default App;
