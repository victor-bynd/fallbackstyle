import { useTypo } from '../context/useTypo';
import React from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import SidebarLanguages from './SidebarLanguages';
import SidebarFonts from './SidebarFonts';

const SideBar = ({ sidebarMode, setSidebarMode, selectedGroup, onSelectGroup, onAddLanguage, highlitLanguageId, setHighlitLanguageId, onManageLanguages, searchQuery, setSearchQuery, fontFilter, ...props }) => {
    const { fontObject } = useTypo();

    if (!fontObject) return null;

    return (
        <div className={`
            flex h-screen sticky top-0 bg-white z-0 border-gray-200 transition-all duration-300 overflow-hidden
            ${sidebarMode === 'headers'
                ? 'border-l shadow-[-4px_0_24px_-4px_rgba(0,0,0,0.05)]'
                : 'border-r shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]'
            }
        `}>
            {sidebarMode === 'main' && (
                <>
                    <SidebarLanguages
                        selectedGroup={selectedGroup}
                        onSelectGroup={onSelectGroup}
                        onAddLanguage={onAddLanguage}
                        highlitLanguageId={highlitLanguageId}
                        setHighlitLanguageId={setHighlitLanguageId}
                        onManageLanguages={onManageLanguages}
                        onOpenSettings={props.onOpenSettings}
                        onResetApp={props.onResetApp}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        expandedGroups={props.expandedGroups}
                        setExpandedGroups={props.setExpandedGroups}
                        fontFilter={fontFilter}
                    />
                    <SidebarFonts
                        selectedGroup={selectedGroup}
                        setHighlitLanguageId={setHighlitLanguageId}
                    />
                </>
            )}

            {/* Header Editor - Full Replacement (Occupies full sidebar width) */}
            {sidebarMode === 'headers' && (
                <SidebarHeaderConfig onBack={() => setSidebarMode('main')} />
            )}
        </div>
    );
};

export default SideBar;
