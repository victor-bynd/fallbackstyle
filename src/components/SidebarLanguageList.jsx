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
    setHighlitLanguageId,
    primaryLanguages = [] // New prop
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

    // 1. Get all configured languages (sorted with Primary first)
    const languagesToList = useMemo(() => {
        const list = (configuredLanguages || [])
            .map(id => languagesData.find(l => l.id === id))
            .filter(Boolean);

        return list.sort((a, b) => {
            const aIsPrimary = primaryLanguages.includes(a.id) || (primaryLanguages.length === 0 && a.id === 'en-US');
            const bIsPrimary = primaryLanguages.includes(b.id) || (primaryLanguages.length === 0 && b.id === 'en-US');
            if (aIsPrimary && !bIsPrimary) return -1;
            if (!aIsPrimary && bIsPrimary) return 1;
            return 0;
        });
    }, [configuredLanguages, primaryLanguages]);

    // 2. Filter logic is now Visual Only inside the render loop
    // But we need to update the filteredLanguages memo if we want to keep it or just remove it.
    // The render loop now uses languagesToList directly.
    // 2. Filter logic: Now we filter BEFORE rendering to strictly show/hide items
    const filteredList = useMemo(() => {
        return (languagesToList || []).filter(lang => {
            const isPrimary = primaryLanguages.includes(lang.id) || (primaryLanguages.length === 0 && lang.id === 'en-US');
            const isTargeted = targetedLanguageIds?.includes(lang.id);
            const group = getLanguageGroup(lang);

            if (selectedGroup === 'ALL') return true;
            if (selectedGroup === 'ALL_TARGETED') return isTargeted || isPrimary;
            return group === selectedGroup;
        });
    }, [languagesToList, selectedGroup, targetedLanguageIds, primaryLanguages]);

    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Targeted
                </span>
            </div>

            <div className="flex flex-col gap-1">
                {filteredList.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic px-2 py-1">
                        No languages in this group
                    </div>
                )}
                {/* Always show all targeted languages */}
                {filteredList.map(lang => {
                    const isPrimary = primaryLanguages.includes(lang.id) || (primaryLanguages.length === 0 && lang.id === 'en-US');
                    const hasOverrides = primaryFontOverrides?.[lang.id] || fallbackFontOverrides?.[lang.id];
                    const isSelected = activeTab === lang.id || (activeTab === 'primary' && isPrimary);
                    const isHighlighted = highlitLanguageId === lang.id || (highlitLanguageId === 'primary' && isPrimary);
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
                                        setActiveTab(isPrimary ? 'primary' : lang.id);
                                    }
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
                                <span className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate">
                                        {formatLanguageName(lang.name)}
                                    </span>
                                    {isPrimary && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400 shrink-0">
                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                        </svg>
                                    )}
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
