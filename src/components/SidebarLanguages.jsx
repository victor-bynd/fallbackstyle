import React from 'react';
import { useTypo } from '../context/useTypo';
import LanguageGroupFilter from './LanguageGroupFilter';
import SidebarLanguageList from './SidebarLanguageList';

const SidebarLanguages = ({
    selectedGroup,
    onSelectGroup,
    onAddLanguage,
    highlitLanguageId,
    setHighlitLanguageId,
    onManageLanguages,
    onOpenSettings,
    onResetApp
}) => {
    const {
        activeConfigTab,
        setActiveConfigTab,
        configuredLanguages,
        primaryFontOverrides,
        fallbackFontOverrides,
        removeConfiguredLanguage,
        supportedLanguageIds,
        targetedLanguageIds,
        supportedLanguages,
        languages,
        primaryLanguages // New
    } = useTypo();

    const [showSettings, setShowSettings] = React.useState(false);
    const settingsRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-64 flex flex-col h-full border-r border-gray-100 bg-white">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {/* Language Filter */}
                <div className="overflow-x-hidden">
                    <div className="flex items-center justify-between mb-4 mt-2">
                        <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                            LANGUAGE - REGION
                        </div>
                        <button
                            onClick={onManageLanguages}
                            className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Manage Languages"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        GROUPS
                    </div>
                    <LanguageGroupFilter
                        selectedGroup={selectedGroup}
                        onSelectGroup={(group) => {
                            onSelectGroup(group);
                            setActiveConfigTab('ALL');
                        }}
                        supportedLanguages={supportedLanguages}
                        targetedLanguages={languages?.filter(l => targetedLanguageIds?.includes(l.id))}
                        configuredLanguages={configuredLanguages}
                        primaryFontOverrides={primaryFontOverrides}
                        fallbackFontOverrides={fallbackFontOverrides}
                        onAddLanguage={onAddLanguage}
                    />
                </div>

                {/* Language List */}
                <SidebarLanguageList
                    activeTab={activeConfigTab}
                    setActiveTab={setActiveConfigTab}
                    selectedGroup={selectedGroup}
                    supportedLanguageIds={supportedLanguageIds}
                    targetedLanguageIds={targetedLanguageIds}
                    configuredLanguages={configuredLanguages}
                    primaryFontOverrides={primaryFontOverrides}
                    fallbackFontOverrides={fallbackFontOverrides}
                    removeConfiguredLanguage={removeConfiguredLanguage}
                    onAddLanguage={onAddLanguage}
                    highlitLanguageId={highlitLanguageId}
                    setHighlitLanguageId={setHighlitLanguageId}
                    onManageLanguages={onManageLanguages}
                    primaryLanguages={primaryLanguages}
                />
            </div>

            {/* Settings Footer */}
            <div className="p-4 border-t border-gray-100 bg-white" ref={settingsRef}>
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
                        </div>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${showSettings
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <div className={`p-1 rounded-md transition-colors ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.047 7.047 0 010-2.228l-1.267-1.113a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-sm font-semibold">Settings</div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidebarLanguages;
