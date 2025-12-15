import { useEffect, useMemo, useRef, useState } from 'react';
import { TypoProvider } from './context/TypoContext';
import { useTypo } from './context/useTypo';
import FontUploader from './components/FontUploader';
import Controller from './components/Controller';
import LanguageCard from './components/LanguageCard';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import ErrorBoundary from './components/ErrorBoundary';

const MainContent = ({ sidebarMode, setSidebarMode }) => {
  const { fontObject, fontStyles, gridColumns, setGridColumns, viewMode, setViewMode, textCase, setTextCase, visibleLanguages, visibleLanguageIds, languages } = useTypo();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showListSettings, setShowListSettings] = useState(false);
  const listSettingsRef = useRef(null);

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

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'h1', label: 'H1' },
    { id: 'h2', label: 'H2' },
    { id: 'h3', label: 'H3' },
    { id: 'h4', label: 'H4' },
    { id: 'h5', label: 'H5' },
    { id: 'h6', label: 'H6' },
  ];

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
    <div className="flex-1 bg-slate-50 min-h-screen">
      {/* Dynamic Style Injection for uploaded fonts */}
      <style>{fontFaceStyles}</style>

      {!fontObject ? (
        <div className="h-screen flex flex-col items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Beautify Your Fallbacks</h1>
            <p className="text-center text-gray-500 mb-8">Stress-test fallback fonts for beautiful localized typography.</p>
            <FontUploader />
          </div>
        </div>
      ) : (
        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarMode(sidebarMode === 'headers' ? 'main' : 'headers')}
                className="bg-white border border-gray-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-2 h-[42px]"
                type="button"
                title={sidebarMode === 'headers' ? 'Done editing header styles' : 'Edit header styles'}
              >
                {sidebarMode === 'headers' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                ) : (
                  <span className="text-xs font-serif italic">Aa</span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">{sidebarMode === 'headers' ? 'Done' : 'Edit Styles'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Text Casing Dropdown */}
              <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center px-2 h-[42px] gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">CASING</span>
                {[
                  { id: 'none', label: '–' },
                  { id: 'lowercase', label: 'abc' },
                  { id: 'uppercase', label: 'ABC' },
                  { id: 'capitalize', label: 'Abc' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setTextCase(opt.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap min-w-[32px] ${textCase === opt.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-gray-50'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center px-2 h-[42px] gap-1 overflow-x-auto max-w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">DISPLAY</span>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${viewMode === tab.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-gray-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative" ref={listSettingsRef}>
                <button
                  onClick={() => setShowListSettings(v => !v)}
                  className="bg-white p-1 rounded-lg border border-gray-200 flex items-center justify-center w-[42px] h-[42px] text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                  title="List settings"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9.75-6H13.5m0 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0m-6.75 0H10.5" />
                  </svg>
                </button>

                {showListSettings && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl p-3 z-20">
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
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-4 transition-all duration-300 ease-in-out" style={{ gridTemplateColumns: `repeat(${fontObject ? gridColumns : 1}, minmax(0, 1fr))` }}>
            {visibleLanguages.map(lang => (
              <LanguageCard key={lang.id} language={lang} />
            ))}
          </div>
        </div>
      )}

      {showLanguageSelector && (
        <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
      )}
    </div>
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
