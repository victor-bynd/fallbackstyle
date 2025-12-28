import React, { useMemo } from 'react';
import languagesData from '../data/languages.json'; // Make sure path is correct relative to this file
import { getGroupedLanguages, LANGUAGE_GROUP_SHORT_NAMES } from '../utils/languageUtils';

const LanguageGroupFilter = ({
    selectedGroup,
    onSelectGroup,
    configuredLanguages,
    primaryFontOverrides,
    fallbackFontOverrides,
    onAddLanguage,
    supportedLanguages,
    targetedLanguages
}) => {
    // 1. Get all relevant language objects (Same logic as valid languages)
    // Deprecated inner calculation, preferring props, but fallback for safety
    const languageObjects = useMemo(() => {
        if (supportedLanguages) return supportedLanguages;
        return (configuredLanguages || [])
            .map(id => languagesData.find(l => l.id === id))
            .filter(Boolean);
    }, [configuredLanguages, supportedLanguages]);

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

            {/* ALL TARGETED Tab */}
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
                ALL TARGETED
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

        </div>
    );
};

export default LanguageGroupFilter;
