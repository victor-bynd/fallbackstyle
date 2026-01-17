import PropTypes from 'prop-types';

const FontCardTabs = ({
    languageTags,
    editScope,
    onSetScope,
    setActiveConfigTab,
    setHighlitLanguageId,
    primaryLanguages,
    idsToCheck,
    primaryFontOverrides,
    fallbackFontOverrides,
    fonts,
    getOverrideState,
    mapLanguageToFont,
    font,
    onMap,
    activeTab
}) => {
    // Determine available tabs
    const showTabs = languageTags && languageTags.length > 0;

    return (
        <>
            {showTabs && (
                <div className="flex items-center gap-1 mt-2 mb-0 overflow-x-auto no-scrollbar mask-linear-fade">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSetScope('ALL');
                            setActiveConfigTab('ALL');
                            if (setHighlitLanguageId) setHighlitLanguageId(null);
                        }}
                        className={`
                            px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wide transition-all border-b-2
                            ${editScope === 'ALL'
                                ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50'
                                : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
                            }
                        `}
                    >
                        GLOBAL
                    </button>

                    {languageTags.map(langId => {
                        const isSelected = editScope === langId;
                        // Resolve Target Font Logic
                        const isPrimaryCard = font.type === 'primary' || font.isPrimaryOverride;
                        const pId = primaryFontOverrides?.[langId];
                        const fOverrides = fallbackFontOverrides?.[langId];

                        let fId = null;
                        if (typeof fOverrides === 'object' && fOverrides !== null) {
                            const matchedBaseId = idsToCheck.find(id => fOverrides[id]);
                            if (matchedBaseId) fId = fOverrides[matchedBaseId];
                            else fId = idsToCheck.find(id => Object.values(fOverrides).includes(id));
                        } else if (typeof fOverrides === 'string') {
                            fId = fOverrides;
                        }

                        const targetId = isPrimaryCard ? pId : fId;
                        const targetFont = targetId ? fonts.find(f => f.id === targetId) : null;

                        const hasOverride = getOverrideState(langId);

                        return (
                            <button
                                key={langId}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSetScope(langId);
                                    const isPrimary = primaryLanguages?.includes(langId);
                                    setActiveConfigTab(isPrimary ? 'primary' : langId);
                                    if (setHighlitLanguageId) setHighlitLanguageId(langId);
                                }}
                                className={`
                                    relative px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wide transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5
                                    ${isSelected
                                        ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50'
                                        : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {langId}
                                {hasOverride && (
                                    <div
                                        className="group ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Reset logic: Map back to the BASE font of this card (or parent of clone)
                                            // This removes the "dirty" clone but keeps the mapping to the font family.
                                            const baseId = targetFont?.parentId || font.id;
                                            mapLanguageToFont(langId, baseId);
                                        }}
                                        title="Reset to global"
                                        role="button"
                                        aria-label={`Reset ${langId} override`}
                                    >
                                        {/* Dot (default) */}
                                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-300'} group-hover:hidden transition-opacity`} />

                                        {/* Reset Icon (hover) */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="w-2.5 h-2.5 text-slate-500 hidden group-hover:block"
                                        >
                                            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.061.025z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {(onMap && (!languageTags || languageTags.length === 0) && (activeTab === 'ALL' || activeTab === 'primary')) && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMap(font.id);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors uppercase tracking-wider"
                    >
                        <span>+ Map Language</span>
                    </button>
                </div>
            )}
        </>
    );
};

FontCardTabs.propTypes = {
    languageTags: PropTypes.array,
    editScope: PropTypes.string.isRequired,
    onSetScope: PropTypes.func.isRequired,
    setActiveConfigTab: PropTypes.func.isRequired,
    setHighlitLanguageId: PropTypes.func,
    primaryLanguages: PropTypes.array,
    idsToCheck: PropTypes.array.isRequired,
    primaryFontOverrides: PropTypes.object,
    fallbackFontOverrides: PropTypes.object,
    fonts: PropTypes.array.isRequired,
    getOverrideState: PropTypes.func.isRequired,
    mapLanguageToFont: PropTypes.func.isRequired,
    font: PropTypes.object.isRequired,
    onMap: PropTypes.func,
    activeTab: PropTypes.string
};

export default FontCardTabs;
