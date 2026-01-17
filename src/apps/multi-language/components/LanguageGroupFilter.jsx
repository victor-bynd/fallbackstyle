import React from 'react';

const LanguageGroupFilter = ({
    selectedGroup,
    onSelectGroup
}) => {

    return (
        <div className="relative">
            <div className="flex items-center gap-1 pl-1 pb-2 pr-1 flex-wrap">
                {/* ALL Tab */}
                <button
                    onClick={() => onSelectGroup('ALL')}
                    className={`
                    px-1.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                    ${selectedGroup === 'ALL'
                            ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-900'
                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                        }
                `}
                >
                    ALL
                </button>

                <button
                    onClick={() => onSelectGroup('MAPPED')}
                    className={`
                    px-1.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                    ${selectedGroup === 'MAPPED'
                            ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-900'
                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                        }
                `}
                >
                    MAPPED
                </button>

                {/* UNMAPPED Tab */}
                <button
                    onClick={() => onSelectGroup('UNMAPPED')}
                    className={`
                    px-1.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                    ${selectedGroup === 'UNMAPPED'
                            ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-900'
                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                        }
                `}
                >
                    UNMAPPED
                </button>
            </div>
        </div>
    );
};

export default LanguageGroupFilter;
