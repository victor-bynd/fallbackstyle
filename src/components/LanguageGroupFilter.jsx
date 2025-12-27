import React, { useMemo } from 'react';
import languagesData from '../data/languages.json'; // Make sure path is correct relative to this file
import { getGroupedLanguages, LANGUAGE_GROUP_SHORT_NAMES } from '../utils/languageUtils';

const LanguageGroupFilter = ({
    selectedGroup,
    onSelectGroup,
    configuredLanguages,
    primaryFontOverrides,
    fallbackFontOverrides,
    onAddLanguage
}) => {
    // 1. Get all relevant language objects (Same logic as valid languages)
    const languageObjects = useMemo(() => {
        return (configuredLanguages || [])
            .map(id => languagesData.find(l => l.id === id))
            .filter(Boolean);
    }, [configuredLanguages]);

    // 2. Group them
    const groups = useMemo(() => {
        return getGroupedLanguages(languageObjects);
    }, [languageObjects]);

    return (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {/* ALL Tab */}
            <button
                onClick={() => onSelectGroup('ALL')}
                className={`
                    px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                    ${selectedGroup === 'ALL'
                        ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-900'
                        : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                    }
                `}
            >
                ALL
            </button>

            {/* ALL TARGETTED Tab */}
            <button
                onClick={() => onSelectGroup('ALL_TARGETED')}
                className={`
                    px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                    ${selectedGroup === 'ALL_TARGETED'
                        ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-900'
                        : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                    }
                `}
            >
                ALL TARGETTED
            </button>

            {groups.map((group) => {
                const isActive = group.key === selectedGroup;
                return (
                    <button
                        key={group.key}
                        onClick={() => onSelectGroup(group.key)}
                        className={`
                            px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                            ${isActive
                                ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-900'
                                : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                            }
                        `}
                    >
                        {LANGUAGE_GROUP_SHORT_NAMES[group.key] || group.key}
                    </button>
                );
            })}
            <button
                onClick={() => onAddLanguage(null)}
                className="ml-1 w-6 h-6 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100 shrink-0"
                title="Add Language Group"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
            </button>
        </div>
    );
};

export default LanguageGroupFilter;
