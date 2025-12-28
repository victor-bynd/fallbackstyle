import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import { getGroupedLanguages } from '../utils/languageUtils';

const LanguageList = ({
    selectedIds = [],
    onSelect,
    mode = 'single',
    showAuto = false,
    searchTerm = '',
    onSearchChange,
    primaryLanguages = [],
    onTogglePrimary,
    filterGroup = null
}) => {
    const { languages } = useTypo();

    const groups = useMemo(() => {
        const grouped = getGroupedLanguages(languages, searchTerm);
        if (filterGroup) {
            return grouped.filter(g => g.key === filterGroup);
        }
        return grouped;
    }, [languages, searchTerm, filterGroup]);

    const isSelected = (id) => {
        if (mode === 'single') return selectedIds === id;
        if (Array.isArray(selectedIds)) return selectedIds.includes(id);
        if (selectedIds instanceof Set) return selectedIds.has(id);
        return false;
    };

    const handleSelect = (id) => {
        onSelect(id);
    };

    const isPrimary = (id) => primaryLanguages.includes(id);

    return (
        <div className="flex flex-col flex-1 overflow-hidden h-full">
            {onSearchChange && (
                <div className="p-3 border-gray-100 bg-white shrink-0">
                    <input
                        type="text"
                        placeholder="Search languages..."
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            <div className="overflow-auto flex-1 custom-scrollbar">
                <div className="p-2 space-y-4">
                    {showAuto && (!searchTerm || "auto".includes(searchTerm.toLowerCase()) || "fallback".includes(searchTerm.toLowerCase())) && (
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 px-2">
                                Default
                            </div>
                            <button
                                onClick={() => handleSelect('auto')}
                                className={`
                                    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border text-left
                                    ${isSelected('auto')
                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10'
                                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                                    }
                                `}
                            >
                                <div className="min-w-0">
                                    <div className={`text-sm font-bold ${isSelected('auto') ? 'text-indigo-900' : 'text-slate-700'}`}>
                                        Auto (Fallback)
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        Follow sequence defined by font order
                                    </div>
                                </div>
                                {isSelected('auto') && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-600">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}

                    {groups.map((group) => (
                        <div key={group.key}>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 px-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                                {group.key}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {group.items.map((lang) => {
                                    const selected = isSelected(lang.id);
                                    const primary = isPrimary(lang.id);
                                    return (
                                        <div key={lang.id} className="relative group">
                                            <button
                                                onClick={() => handleSelect(lang.id)}
                                                className={`
                                                    w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border text-left
                                                    ${selected
                                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10'
                                                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                                                    }
                                                `}
                                            >
                                                <div className="min-w-0 flex items-center gap-3">
                                                    {mode === 'multi' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            readOnly
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className={`text-sm font-bold truncate ${selected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {lang.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono font-medium">
                                                            {lang.id}
                                                        </div>
                                                    </div>
                                                </div>

                                            </button>

                                            {/* Primary Toggle - Overlay */}
                                            {onTogglePrimary && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTogglePrimary(lang.id);
                                                    }}
                                                    className={`
                                                        absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all
                                                        ${primary
                                                            ? 'text-amber-400 hover:text-amber-500'
                                                            : 'text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                                                        }
                                                    `}
                                                    title={primary ? "Remove from Primary Languages" : "Add to Primary Languages"}
                                                >
                                                    {primary ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && searchTerm && (
                        <div className="text-center py-12 px-4 whitespace-normal">
                            <div className="text-slate-300 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <p className="text-slate-500 font-medium">No languages found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

LanguageList.propTypes = {
    selectedIds: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.instanceOf(Set)
    ]),
    onSelect: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['single', 'multi']),
    showAuto: PropTypes.bool,
    searchTerm: PropTypes.string,
    onSearchChange: PropTypes.func,
    filterGroup: PropTypes.string
};

export default LanguageList;
