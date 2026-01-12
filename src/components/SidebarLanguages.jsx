import React from 'react';
import { useTypo } from '../context/useTypo';
import { useUI } from '../context/UIContext';
import languagesData from '../data/languages.json';
import { getLanguageGroup } from '../utils/languageUtils';
import LanguageGroupFilter from './LanguageGroupFilter';
import SidebarLanguageList from './SidebarLanguageList';
import pkg from '../../package.json';

const SidebarLanguages = ({
    selectedGroup,
    onSelectGroup,
    onAddLanguage,
    highlitLanguageId,
    setHighlitLanguageId,
    onManageLanguages,
    onOpenSettings,
    onResetApp,
    searchQuery,
    setSearchQuery,
    expandedGroups,
    setExpandedGroups,
    fontFilter // New prop
}) => {
    const {
        configuredLanguages,
        primaryFontOverrides,
        fallbackFontOverrides,
        removeConfiguredLanguage,
        supportedLanguageIds, // Adding this if it was missing or just keeping context clean
        mappedLanguageIds,
        supportedLanguages,
        languages,
        primaryLanguages, // New
        fonts // Needed for font filter check
    } = useTypo();

    const { activeConfigTab, setActiveConfigTab } = useUI();

    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const settingsRef = React.useRef(null);
    const searchInputRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    const displayedCount = React.useMemo(() => {
        if (!configuredLanguages) return 0;

        // If searching, count is total matching
        if (searchQuery) { // searchQuery comes from props
            return configuredLanguages.filter(langId => {
                const lang = languagesData.find(l => l.id === langId);
                if (!lang) return false;
                return lang.name.toLowerCase().includes(searchQuery.toLowerCase());
            }).length;
        }

        return configuredLanguages.filter(langId => {
            const lang = languagesData.find(l => l.id === langId);
            if (!lang) return false;

            const isPrimary = primaryLanguages?.includes(lang.id) || (primaryLanguages?.length === 0 && lang.id === 'en-US');
            const isTargeted = mappedLanguageIds?.includes(lang.id);
            const group = getLanguageGroup(lang);
            const isGroupExpanded = expandedGroups[group] ?? true;

            // Check Font Filter
            if (fontFilter && fontFilter.length > 0) {
                const langPrimary = primaryFontOverrides?.[lang.id];
                const langFallback = fallbackFontOverrides?.[lang.id];

                const getIds = (val) => {
                    if (!val) return [];
                    if (typeof val === 'string') return [val];
                    if (typeof val === 'object') return Object.values(val);
                    return [];
                };

                const allIds = [...getIds(langPrimary), ...getIds(langFallback)];
                const hasMatch = allIds.some(fid => {
                    const f = fonts.find(font => font && font.id === fid);
                    return f && (f.fileName || f.name) && fontFilter.includes(f.fileName || f.name);
                });

                if (!hasMatch) return false;
            }

            // Respect collapse state for count, unless searching
            const shouldCheckCollapse = !searchQuery && ['ALL', 'MAPPED', 'UNMAPPED'].includes(selectedGroup);
            if (shouldCheckCollapse && !isGroupExpanded) return false;

            if (selectedGroup === 'ALL') return true;
            if (selectedGroup === 'MAPPED') return isTargeted || isPrimary;
            if (selectedGroup === 'UNMAPPED') return !isTargeted && !isPrimary;
            return group === selectedGroup;
        }).length;
    }, [configuredLanguages, selectedGroup, mappedLanguageIds, primaryLanguages, searchQuery, expandedGroups]);

    const totalCount = configuredLanguages?.length || 0;

    return (
        <div className="w-64 flex flex-col h-full border-r border-gray-100 bg-white overflow-hidden">
            {/* Fixed Header Section */}
            <div className="p-4 pb-2 border-b border-gray-50 bg-white shrink-0">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        LANGUAGES
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                if (isSearchOpen) {
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                } else {
                                    setIsSearchOpen(true);
                                }
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isSearchOpen
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                }`}
                            title={isSearchOpen ? "Close Search" : "Search Languages"}
                        >
                            {isSearchOpen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={onManageLanguages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Manage Languages"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="text-[10px] font-bold text-slate-400 mt-0.5 mb-4">
                    <span>
                        <span className="text-slate-400">
                            {isSearchOpen ? 'SEARCHING' : 'COUNTRY–REGION'}
                        </span>
                        <span className="text-slate-600"> {displayedCount}</span>
                        {displayedCount < totalCount && (
                            <>
                                <span className="text-slate-300"> / </span>
                                <span className="text-slate-400">{totalCount}</span>
                            </>
                        )}
                    </span>
                </div>

                {
                    isSearchOpen ? (
                        <div className="relative mb-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name..."
                                className="w-full h-8 px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ) : (
                        <LanguageGroupFilter
                            selectedGroup={selectedGroup}
                            onSelectGroup={(group) => {
                                onSelectGroup(group);
                                setActiveConfigTab('ALL');
                                if (setHighlitLanguageId) setHighlitLanguageId(null);
                            }}
                            supportedLanguages={supportedLanguages}
                            mappedLanguages={languages?.filter(l => mappedLanguageIds?.includes(l.id))}
                            configuredLanguages={configuredLanguages}
                            primaryFontOverrides={primaryFontOverrides}
                            fallbackFontOverrides={fallbackFontOverrides}
                            onAddLanguage={onAddLanguage}
                        />
                    )
                }

            </div >

            {/* Scrollable List Section */}
            < div className="flex-1 overflow-y-auto min-h-0 p-4 pt-2 custom-scrollbar" >
                <SidebarLanguageList
                    activeTab={activeConfigTab}
                    setActiveTab={setActiveConfigTab}
                    selectedGroup={selectedGroup}
                    supportedLanguageIds={supportedLanguageIds}
                    mappedLanguageIds={mappedLanguageIds}
                    configuredLanguages={configuredLanguages}
                    primaryFontOverrides={primaryFontOverrides}
                    fallbackFontOverrides={fallbackFontOverrides}
                    removeConfiguredLanguage={removeConfiguredLanguage}
                    onAddLanguage={onAddLanguage}
                    highlitLanguageId={highlitLanguageId}
                    setHighlitLanguageId={setHighlitLanguageId}
                    onManageLanguages={onManageLanguages}
                    primaryLanguages={primaryLanguages}
                    searchQuery={searchQuery}
                    expandedGroups={expandedGroups}
                    setExpandedGroups={setExpandedGroups}
                    fontFilter={fontFilter} // Pass down
                    fonts={fonts} // Pass fonts for resolution
                />
            </div >

            {/* Settings Footer */}
            < div className="p-2 border-t border-gray-100 bg-white" ref={settingsRef} >
                <div className="relative">
                    {showSettings && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 origin-bottom-left z-50">
                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        onOpenSettings('import');
                                        setShowSettings(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.965 3.129V2.75z" />
                                        <path d="M5.5 17a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z" />
                                    </svg>
                                    Import Configuration
                                </button>
                                <button
                                    onClick={() => {
                                        onOpenSettings('export');
                                        setShowSettings(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                                        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                                    </svg>
                                    Export Configuration
                                </button>
                                <button
                                    onClick={() => {
                                        onOpenSettings('export-css');
                                        setShowSettings(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                                        <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                                    </svg>
                                    Export CSS
                                </button>
                            </div>
                            <div className="border-t border-gray-100 p-1 bg-slate-50/50">
                                <button
                                    onClick={() => {
                                        onResetApp();
                                        setShowSettings(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-75">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                    Reset App State
                                </button>
                            </div>
                            <div className="border-t border-gray-100 py-1.5 bg-slate-50 text-center">
                                <span className="text-[10px] font-medium text-slate-400">
                                    v{pkg.version}
                                </span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg border transition-all ${showSettings
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <div className={`p-1 rounded-md transition-colors ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.047 7.047 0 010-2.228l-1.267-1.113a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-xs font-semibold">Settings</div>
                    </button>
                </div>
            </div >
        </div >
    );
};

export default SidebarLanguages;
