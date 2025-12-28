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
    onManageLanguages
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
        languages
    } = useTypo();



    return (
        <div className="w-64 flex flex-col gap-4 p-4 border-r border-gray-100 overflow-y-auto">




            {/* Language Filter */}
            <div className="overflow-x-hidden">
                <div className="flex items-center justify-between mb-4 mt-2">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        LANGUAGES
                    </div>
                    <button
                        onClick={onManageLanguages}
                        className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
                        // Make sure we select 'ALL' config tab if switching groups to reset view focus
                        // unless we want to keep the selected font visible if it belongs to group
                        setActiveConfigTab('ALL');
                    }}
                    supportedLanguages={supportedLanguages}
                    targetedLanguages={languages?.filter(l => targetedLanguageIds?.includes(l.id))}
                    configuredLanguages={configuredLanguages} // Fallback
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
            />


        </div>
    );
};

export default SidebarLanguages;
