import React, { useMemo } from 'react';
import languagesData from '../data/languages.json';
import { getGroupedLanguages, getLanguageGroup } from '../utils/languageUtils';

const SidebarLanguageList = ({
    activeTab,
    setActiveTab,
    selectedGroup,
    configuredLanguages,
    primaryFontOverrides,
    fallbackFontOverrides,
    removeConfiguredLanguage,
    onAddLanguage,
    highlitLanguageId,
    setHighlitLanguageId
}) => {
    // 1. Get all relevant language objects
    const languageObjects = useMemo(() => {
        return (configuredLanguages || [])
            .map(id => languagesData.find(l => l.id === id))
            .filter(Boolean);
    }, [configuredLanguages]);

    // 2. Filter languages based on selectedGroup
    const filteredLanguages = useMemo(() => {
        if (selectedGroup === 'ALL' || selectedGroup === 'ALL_TARGETED') {
            return languageObjects;
        }
        return languageObjects.filter(lang => getLanguageGroup(lang) === selectedGroup);
    }, [selectedGroup, languageObjects]);


    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Languages
                </span>
                <button
                    onClick={() => onAddLanguage((selectedGroup === 'ALL' || selectedGroup === 'ALL_TARGETED') ? null : selectedGroup)}
                    className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-col gap-1">
                {filteredLanguages.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic px-2 py-1">
                        No languages in this group
                    </div>
                )}
                {filteredLanguages.map(lang => {
                    const isSystemDefault = lang.id === 'en-US';
                    const hasOverrides = primaryFontOverrides?.[lang.id] || fallbackFontOverrides?.[lang.id];
                    const isSelected = activeTab === lang.id || (activeTab === 'primary' && lang.id === 'en-US');
                    const isHighlighted = highlitLanguageId === lang.id || (highlitLanguageId === 'primary' && lang.id === 'en-US');
                    const isActive = isSelected || isHighlighted;

                    return (
                        <div key={lang.id} className="group relative flex items-center">
                            <button
                                onClick={() => {
                                    const target = document.getElementById('language-card-' + lang.id);
                                    if (target) {
                                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }

                                    if (setHighlitLanguageId) setHighlitLanguageId(lang.id);

                                    setActiveTab(lang.id === 'en-US' ? 'primary' : lang.id);
                                }}
                                className={`
                                    w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border
                                    flex items-center justify-between
                                    ${isActive
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm'
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600'
                                    }
                                `}
                            >
                                <span className={isSystemDefault && !isActive ? 'text-indigo-600' : ''}>
                                    {lang.name}
                                </span>
                                {hasOverrides && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-600' : 'bg-indigo-400 opacity-60'}`}></span>
                                )}
                            </button>
                            {/* Remove button (skip for en-US) */}
                            {!isSystemDefault && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Remove overrides for ${lang.name}?`)) {
                                            removeConfiguredLanguage(lang.id);
                                        }
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all bg-white shadow-sm rounded-md border border-slate-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SidebarLanguageList;
