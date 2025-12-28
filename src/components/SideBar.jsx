import { useTypo } from '../context/useTypo';
import React from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import SidebarLanguages from './SidebarLanguages';
import SidebarFonts from './SidebarFonts';

const SideBar = ({ sidebarMode, setPreviewMode, selectedGroup, onSelectGroup, onAddLanguage, highlitLanguageId, setHighlitLanguageId, onManageLanguages }) => {
    const { fontObject } = useTypo();

    if (!fontObject) return null;

    return (
        <div className="flex h-screen sticky top-0 bg-white z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)] border-r border-gray-200">
            {sidebarMode === 'main' && (
                <>
                    <SidebarLanguages
                        selectedGroup={selectedGroup}
                        onSelectGroup={onSelectGroup}
                        onAddLanguage={onAddLanguage}
                        highlitLanguageId={highlitLanguageId}
                        setHighlitLanguageId={setHighlitLanguageId}
                        onManageLanguages={onManageLanguages}
                    />
                    <SidebarFonts />
                </>
            )}

            {/* Header Editor - Full Replacement (Occupies full sidebar width) */}
            {sidebarMode === 'headers' && (
                <SidebarHeaderConfig />
            )}
        </div>
    );
};

export default SideBar;
