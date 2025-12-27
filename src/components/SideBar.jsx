import { useTypo } from '../context/useTypo';
import React, { useState } from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontCards, { SortableFontCard } from './FontCards';
import SidebarLanguageList from './SidebarLanguageList';
import ConfigManager from './ConfigManager';
import OverridesManager from './OverridesManager';
import FontManagerModal from './FontManagerModal';

const SideBar = ({ sidebarMode, setPreviewMode, selectedGroup, onAddLanguage, highlitLanguageId, setHighlitLanguageId }) => {
    const {
        fontObject,
        activeConfigTab,
        setActiveConfigTab,
        configuredLanguages,
        primaryFontOverrides,
        fallbackFontOverrides,
        removeConfiguredLanguage
    } = useTypo();

    const activeTab = activeConfigTab;
    const setActiveTab = setActiveConfigTab;
    const [showFontManager, setShowFontManager] = useState(false);

    if (!fontObject) return null;

    return (
        <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 h-screen sticky top-0 overflow-y-auto z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
            {sidebarMode === 'main' && (
                <>
                    {/* Static Header */}
                    <div className="pb-4">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Typography</h2>
                        <button
                            onClick={() => setPreviewMode(true)}
                            className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.66 9.336 6.41.147.481.147.974 0 1.455C18.201 14.66 14.257 17.335 10 17.335s-8.201-2.675-9.336-6.745zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                            </svg>
                            Live Website Preview
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">

                        {/* Manage Fonts Button */}
                        <button
                            onClick={() => setShowFontManager(true)}
                            className="w-full py-2 px-4 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            Manage Font Stack
                        </button>

                        <SidebarLanguageList
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            selectedGroup={selectedGroup}
                            configuredLanguages={configuredLanguages}
                            primaryFontOverrides={primaryFontOverrides}
                            fallbackFontOverrides={fallbackFontOverrides}
                            removeConfiguredLanguage={removeConfiguredLanguage}
                            onAddLanguage={onAddLanguage}
                            highlitLanguageId={highlitLanguageId}
                            setHighlitLanguageId={setHighlitLanguageId}
                        />

                        {/* FontCards - Now below language list for detailed font management */}
                        <FontCards
                            activeTab={activeTab}
                            readOnly={activeTab !== 'ALL' && activeTab !== 'primary'}
                        />
                    </div>

                    {/* Overrides Manager */}
                    <OverridesManager />

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1"></div>

                    {/* Export CSS Button - Bottom of Sidebar */}
                    {/* Config Manager - Import/Export */}
                    <ConfigManager />

                    {showFontManager && (
                        <FontManagerModal onClose={() => setShowFontManager(false)} />
                    )}
                </>
            )}

            {/* Header Editor - Full Replacement */}
            {sidebarMode === 'headers' && (
                <SidebarHeaderConfig />
            )}
        </div>
    );
};

export default SideBar;
