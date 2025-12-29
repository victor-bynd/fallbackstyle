import { useTypo } from '../context/useTypo';

const ViewModeSelector = ({ variant = 'default' }) => {
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

    if (variant === 'simple') {
        return (
            <div className="relative">
                <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="w-full py-1 pl-2 pr-6 text-[10px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none appearance-none font-bold text-slate-700"
                >
                    {tabs.map(tab => (
                        <option key={tab.id} value={tab.id}>{tab.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center px-3 h-[42px] gap-2">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider shrink-0">Display</span>
            <div className="relative">
                <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer appearance-none pr-5 py-1"
                >
                    {tabs.map(tab => (
                        <option key={tab.id} value={tab.id}>{tab.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default ViewModeSelector;
