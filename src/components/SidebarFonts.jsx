import React, { useState } from 'react';
import FontManagerModal from './FontManagerModal';
import { useTypo } from '../context/useTypo';
import { useUI } from '../context/UIContext';
import FontCards from './FontCards';
import OverridesManager from './OverridesManager';
import InfoTooltip from './InfoTooltip';


const SidebarFonts = ({ selectedGroup, highlitLanguageId, setHighlitLanguageId, fontFilter, setFontFilter }) => {
    const { activeConfigTab } = useUI();
    const activeTab = activeConfigTab;
    const [showFontManager, setShowFontManager] = useState(false);

    return (
        <div className="w-80 flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50">
            <div className="flex items-center justify-between">
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    FONT STACK
                </div>
                <div className="flex items-center gap-2">
                    <InfoTooltip content="Override Manager: Audit and reset scale, weight, and metric adjustments.">
                        <OverridesManager iconMode={true} />
                    </InfoTooltip>

                    <InfoTooltip content="Manage Fonts: Upload and configure available fonts.">
                        <button
                            onClick={() => setShowFontModal(true)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                            </svg>
                        </button>
                    </InfoTooltip>
                </div>
            </div>
            {/* FontCards */}
            <FontCards
                activeTab={activeTab}
                selectedGroup={selectedGroup}
                highlitLanguageId={highlitLanguageId}
                setHighlitLanguageId={setHighlitLanguageId}
                readOnly={false}
                fontFilter={fontFilter}
                setFontFilter={setFontFilter}
            />

            <div className="flex-1"></div>

            {showFontManager && (
                <FontManagerModal onClose={() => setShowFontManager(false)} />
            )}
        </div>
    );
};

export default SidebarFonts;
