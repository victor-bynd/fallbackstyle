import React, { useMemo } from 'react';
import languagesData from '../data/languages.json';
import { getGroupedLanguages, getLanguageGroup } from '../utils/languageUtils';

const SidebarLanguageList = ({
    activeTab,
    setActiveTab,
    selectedGroup,
    configuredLanguages,
    supportedLanguageIds, // New
    targetedLanguageIds, // New
    primaryFontOverrides,
    fallbackFontOverrides,

    onAddLanguage,
    onManageLanguages,
    highlitLanguageId,
    setHighlitLanguageId
}) => {
    // Helper to format language name: removes native script part if present and non-Latin-1
    const formatLanguageName = (name) => {
        const parts = name.split(' - ');
        if (parts.length < 2) return name;

        // Check if the first part contains characters outside Latin-1 (ISO-8859-1)
        // This covers most Western European languages. Anything outside (CJK, Cyrillic, etc., 
        // and even Latin Extended like Polish/Czech) will use the English part (2nd part) 
        // which is usually cleaner for the user.
        const isLatin1 = /^[\u0000-\u00FF\s]+$/.test(parts[0]);

        if (!isLatin1) {
            return parts[1];
        }
        return name;
    };

    // 1. Get all configured languages (STATIC LIST)
    const languagesToList = useMemo(() => {
        return (configuredLanguages || [])
            .map(id => languagesData.find(l => l.id === id))
            .filter(Boolean);
    }, [configuredLanguages]);

    // 2. Filter logic is now Visual Only inside the render loop
    // But we need to update the filteredLanguages memo if we want to keep it or just remove it.
    // The render loop now uses languagesToList directly.
    const filteredLanguages = languagesToList; // Kept for variable name compatibility if needed, or better just remove.



    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Targeted
                </span>

            </div>

            <div className="flex flex-col gap-1">
                {filteredLanguages.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic px-2 py-1">
                        No languages in this group
                    </div>
                )}
                {/* Always show all targeted languages */}
                {(languagesToList || []).map(lang => {
                    // Check if this language belongs to the currently selected group
                    const isVisibleInCurrentView =
                        selectedGroup === 'ALL' ||
                        (selectedGroup === 'ALL_TARGETED' && targetedLanguageIds?.includes(lang.id)) ||
                        getLanguageGroup(lang) === selectedGroup;

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

                                    const isCurrentlyActive = isActive; // isActive is calculated above: isSelected || isHighlighted

                                    if (isCurrentlyActive) {
                                        // Toggle off
                                        if (setHighlitLanguageId) setHighlitLanguageId(null);
                                        setActiveTab('ALL');
                                    } else {
                                        // Standard select
                                        if (setHighlitLanguageId) setHighlitLanguageId(lang.id);
                                        setActiveTab(lang.id === 'en-US' ? 'primary' : lang.id);
                                    }
                                }}
                                className={`
                                    w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border
                                    flex items-center justify-between
                                    ${isActive
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm'
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600'
                                    }
                                    ${!isVisibleInCurrentView ? 'opacity-40 grayscale' : ''}
                                `}
                            >
                                <span className={isSystemDefault && !isActive ? 'text-indigo-600' : ''}>
                                    {formatLanguageName(lang.name)}
                                </span>
                            </button>

                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SidebarLanguageList;
