import { useTypo } from '../context/useTypo';

const ViewModeSelector = ({ mode = 'tabs' }) => {
    const { viewMode, setViewMode } = useTypo();

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'h1', label: 'H1' },
        { id: 'h2', label: 'H2' },
        { id: 'h3', label: 'H3' },
        { id: 'h4', label: 'H4' },
        { id: 'h5', label: 'H5' },
        { id: 'h6', label: 'H6' },
    ];

    if (mode === 'dropdown') {
        return (
            <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 w-12">DISPLAY</span>
                <div className="relative flex-1">
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                    >
                        {tabs.map(tab => (
                            <option key={tab.id} value={tab.id}>{tab.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    return (
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
    );
};

export default ViewModeSelector;
