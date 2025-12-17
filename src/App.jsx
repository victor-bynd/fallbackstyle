import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TypoProvider } from './context/TypoContext';
import { useTypo } from './context/useTypo';
import FontUploader from './components/FontUploader';
import Controller from './components/Controller';
import LanguageCard from './components/LanguageCard';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import ErrorBoundary from './components/ErrorBoundary';
import TextCasingSelector from './components/TextCasingSelector';
import ViewModeSelector from './components/ViewModeSelector';
import MissingFontsModal from './components/MissingFontsModal';
import { useConfigImport } from './hooks/useConfigImport';

const MainContent = ({ sidebarMode, setSidebarMode }) => {
  const { fontObject, fontStyles, gridColumns, setGridColumns, visibleLanguages, visibleLanguageIds, languages, showFallbackColors, setShowFallbackColors, showAlignmentGuides, toggleAlignmentGuides } = useTypo();
  const { importConfig, missingFonts, resolveMissingFonts, cancelImport } = useConfigImport();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showListSettings, setShowListSettings] = useState(false);
  const listSettingsRef = useRef(null);
  const toolbarRef = useRef(null);
  const buttonRef = useRef(null);
  const [buttonX, setButtonX] = useState(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

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
        rootMargin: "0px" // Trigger when it leaves the viewport completely
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

  const fontFaceStyles = useMemo(() => {
    return ['primary', 'secondary']
      .map(styleId => {
        const style = fontStyles?.[styleId];
        if (!style) return '';

        const primary = style.fonts?.find(f => f.type === 'primary');
        const primaryRule = primary?.fontUrl
          ? `
          @font-face {
            font-family: 'UploadedFont-${styleId}';
            src: url('${primary.fontUrl}');
          }
        `
          : '';

        const fallbackRules = (style.fonts || [])
          .filter(f => f.type === 'fallback' && f.fontUrl)
          .map(font => `
            @font-face {
              font-family: 'FallbackFont-${styleId}-${font.id}';
              src: url('${font.fontUrl}');
            }
          `)
          .join('');

        return `${primaryRule}${fallbackRules}`;
      })
      .join('');
  }, [fontStyles]);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen relative">
      {/* Dynamic Style Injection for uploaded fonts */}
      <style>{fontFaceStyles}</style>

      {/* Fixed Edit Styles Button (Active State Replica) */}
      {/* Position matches the toolbar padding (p-8 md:p-10) -> top-8 left-8 md:top-10 md:left-10 */}
      {/* We use exact same styling as the active toolbar button to prevent visual jump */}
      {fontObject && sidebarMode === 'headers' && buttonX !== null && (
        <div
          className="fixed top-8 md:top-10 z-50 transition-none"
          style={{ left: buttonX }}
        >
          <button
            onClick={() => setSidebarMode('main')}
            className="bg-white border border-transparent text-indigo-700 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px] ring-2 ring-indigo-500 shadow-sm"
            type="button"
            title="Done editing header styles"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Done</span>
          </button>
        </div>
      )}

      {/* Fixed Settings Button */}
      {fontObject && (
        <div
          className={`fixed top-8 right-8 md:top-10 md:right-10 z-50 transition-all duration-300 ${!isToolbarVisible ? 'translate-y-0' : ''}`}
          ref={listSettingsRef}
        >
          <button
            onClick={() => setShowListSettings(v => !v)}
            className={`p-1 rounded-lg border flex items-center justify-center w-[42px] h-[42px] text-slate-600 hover:text-indigo-600 transition-all duration-300 ${isToolbarVisible
              ? 'bg-white border-gray-200 hover:bg-slate-50 shadow-none'
              : 'bg-white/90 backdrop-blur border-slate-200 shadow-xl hover:bg-white'
              }`}
            title="List settings"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9.75-6H13.5m0 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-6.75 0H10.5" />
            </svg>
          </button>

          {showListSettings && (
            <div className={`absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl p-3 shadow-xl origin-top-right transition-all duration-200 animate-in fade-in zoom-in-95`}>
              {/* Adaptive Controls: Show only when toolbar is scrolled out */}
              {(!isToolbarVisible) && (
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
              )}

              <button
                onClick={() => {
                  setShowLanguageSelector(true);
                  setShowListSettings(false);
                }}
                className="w-full bg-white border border-gray-200 flex items-center justify-between px-3 h-[42px] text-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors rounded-lg"
                title="Show/hide languages"
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

              {/* Fallback Color Toggle */}
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
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`${showFallbackColors ? 'translate-x-[18px]' : 'translate-x-0.5'
                      } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {/* Alignment Guides Toggle (Dropdown) */}
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Visual Guides</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAlignmentGuides}
                  onClick={toggleAlignmentGuides}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showAlignmentGuides ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`${showAlignmentGuides ? 'translate-x-[18px]' : 'translate-x-0.5'
                      } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
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
            className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 min-h-[42px]"
          >
            <div className={`flex items-center gap-3 transition-opacity duration-300 ${isToolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

              {/* When active, we show the FIXED button above, so we hide this one but keep layout space */}
              <button
                ref={buttonRef}
                onClick={() => setSidebarMode(sidebarMode === 'headers' ? 'main' : 'headers')}
                className={`bg-white border border-gray-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px] ${sidebarMode === 'headers' ? 'opacity-0 pointer-events-none' : ''}`}
                type="button"
                title="Edit header styles"
                aria-hidden={sidebarMode === 'headers'}
              >
                <span className="text-xs font-serif italic">Aa</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Edit Styles</span>
              </button>
            </div>

            <div className={`flex flex-col sm:flex-row gap-4 items-center transition-opacity duration-300 ${isToolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <TextCasingSelector />
              <ViewModeSelector />
              {/* Alignment Guides Toggle */}
              <button
                onClick={toggleAlignmentGuides}
                className={`bg-white border border-gray-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-2 h-[42px] ${showAlignmentGuides ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-400'}`}
                type="button"
                title="Toggle visual alignment guides"
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
              {/* Spacer for Fixed Settings Button */}
              <div className="w-[42px] h-[42px] hidden sm:block shrink-0" aria-hidden="true" />
            </div>
          </div>
          <div className="grid gap-4 transition-all duration-300 ease-in-out" style={{ gridTemplateColumns: `repeat(${fontObject ? gridColumns : 1}, minmax(0, 1fr))` }}>
            {visibleLanguages.map(lang => (
              <LanguageCard key={lang.id} language={lang} />
            ))}
          </div>
        </div>
      )}

      {
        showLanguageSelector && (
          <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
        )
      }

      {
        missingFonts && (
          <MissingFontsModal
            missingFonts={missingFonts}
            onResolve={resolveMissingFonts}
            onCancel={cancelImport}
          />
        )
      }
    </div >
  );
};

function App() {
  const [sidebarMode, setSidebarMode] = useState('main');

  return (
    <ErrorBoundary>
      <TypoProvider>
        <div className="flex min-h-screen w-full">
          <Controller sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />
          <MainContent sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />
        </div>
      </TypoProvider>
    </ErrorBoundary>
  );
}

export default App;
