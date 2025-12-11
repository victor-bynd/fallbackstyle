import { useTypo, TypoProvider } from './context/TypoContext';
import FontUploader from './components/FontUploader';
import Controller from './components/Controller';
import LanguageCard from './components/LanguageCard';
import languages from './data/languages.json';

const MainContent = () => {
  const { fontObject, fontUrl, gridColumns, setGridColumns, viewMode, setViewMode, textCase, setTextCase } = useTypo();

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'h1', label: 'H1' },
    { id: 'h2', label: 'H2' },
    { id: 'h3', label: 'H3' },
    { id: 'h4', label: 'H4' },
    { id: 'h5', label: 'H5' },
    { id: 'h6', label: 'H6' },
  ];

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      {/* Dynamic Style Injection for the uploaded font */}
      {fontUrl && (
        <style>{`
          @font-face {
            font-family: 'UploadedFont';
            src: url('${fontUrl}');
          }
        `}</style>
      )}

      {!fontObject ? (
        <div className="h-screen flex flex-col items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Localize Type</h1>
            <p className="text-center text-gray-500 mb-8">Localization Stress-Testing for Fonts</p>
            <FontUploader />
          </div>
        </div>
      ) : (
        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-800">Visualization Matrix</h1>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Text Casing Dropdown */}
              <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center px-3 h-[42px]">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Casing:</span>
                <select
                  value={textCase}
                  onChange={(e) => setTextCase(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 font-medium focus:outline-none cursor-pointer min-w-[80px]"
                >
                  <option value="none">Normal</option>
                  <option value="lowercase">Lowercase</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="capitalize">Capitalize</option>
                </select>
              </div>

              {/* Grid Control */}
              <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center px-3 h-[42px]">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Columns:</span>
                <select
                  value={gridColumns}
                  onChange={(e) => setGridColumns(parseInt(e.target.value))}
                  className="bg-transparent text-sm text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center overflow-x-auto max-w-full h-[42px]">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${viewMode === tab.id
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:bg-gray-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 transition-all duration-300 ease-in-out" style={{ gridTemplateColumns: `repeat(${fontObject ? gridColumns : 1}, minmax(0, 1fr))` }}>
            {languages.map(lang => (
              <LanguageCard key={lang.id} language={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <TypoProvider>
      <div className="flex min-h-screen w-full">
        <Controller />
        <MainContent />
      </div>
    </TypoProvider>
  );
}

export default App;
