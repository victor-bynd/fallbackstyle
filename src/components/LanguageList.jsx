import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';

const LanguageList = ({
    selectedIds = [],
    onSelect,
    mode = 'single',
    showAuto = false,
    searchTerm = '',
    onSearchChange
}) => {
    const { languages, isLanguageVisible, toggleLanguageVisibility } = useTypo();

    const groups = useMemo(() => {
        const grouped = {
            Latin: [],
            Greek: [],
            Cyrillic: [],
            RTL: [],
            Indic: [],
            'Southeast Asia': [],
            CJK: [],
            Other: []
        };

        const push = (key, lang) => {
            if (!grouped[key]) grouped.Other.push(lang);
            else grouped[key].push(lang);
        };

        languages.forEach((lang) => {
            // Filter by search term
            if (searchTerm &&
                !lang.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !lang.id.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }

            if (lang.id === 'en-US' && !searchTerm) {
                push('Latin', lang);
                return;
            }

            if (lang.dir === 'rtl') {
                push('RTL', lang);
                return;
            }

            if (lang.script === 'Latn') push('Latin', lang);
            else if (lang.script === 'Grek') push('Greek', lang);
            else if (lang.script === 'Cyrl') push('Cyrillic', lang);
            else if (['Deva', 'Beng', 'Knda', 'Telu', 'Gujr', 'Guru', 'Mlym', 'Taml'].includes(lang.script)) push('Indic', lang);
            else if (lang.script === 'Thai') push('Southeast Asia', lang);
            else if (['Hans', 'Hant', 'Jpan', 'Kore'].includes(lang.script)) push('CJK', lang);
            else push('Other', lang);
        });

        const order = ['Latin', 'Greek', 'Cyrillic', 'RTL', 'Indic', 'Southeast Asia', 'CJK', 'Other'];
        return order
            .map((key) => ({ key, items: grouped[key] }))
            .filter((g) => g.items.length > 0);
    }, [languages, searchTerm]);

    const isSelected = (id) => {
        if (mode === 'single') return selectedIds === id;
        if (Array.isArray(selectedIds)) return selectedIds.includes(id);
        if (selectedIds instanceof Set) return selectedIds.has(id);
        return false;
    };

    const handleSelect = (id) => {
        onSelect(id);
    };

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
                                    return (
                                        <button
                                            key={lang.id}
                                            onClick={() => handleSelect(lang.id)}
                                            className={`
                                                flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border text-left
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
                                            {mode === 'single' && selected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-600">
                                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
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
    showAuto: PropTypes.boolean,
    searchTerm: PropTypes.string,
    onSearchChange: PropTypes.func
};

export default LanguageList;
