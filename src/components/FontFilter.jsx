import React, { useMemo, useState, useRef, useEffect } from 'react';

const FontFilter = ({
    fonts,
    primaryFontOverrides,
    fallbackFontOverrides,
    selectedFilter,
    onSelectFilter,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // 1. Derive unique mapped fonts
    // 1. Derive unique mapped fonts
    const mappedFonts = useMemo(() => {
        const fontUsage = new Map(); // Name -> { font, langIds: Set() }

        // Helper to process a font ID
        const processFontId = (fontId, langId) => {
            const font = fonts.find(f => f.id === fontId);
            if (font) {
                // Use fileName for uploaded fonts, name for system fonts
                const name = font.fileName || font.name;
                if (name) {
                    if (!fontUsage.has(name)) {
                        fontUsage.set(name, { font, langIds: new Set() });
                    }
                    if (langId) fontUsage.get(name).langIds.add(langId);
                }
            }
        };

        // Scan Primary Overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            processFontId(fontId, langId);
        });

        // Scan Fallback Overrides
        Object.entries(fallbackFontOverrides || {}).forEach(([langId, val]) => {
            if (typeof val === 'string') {
                processFontId(val, langId);
            } else if (typeof val === 'object') {
                Object.values(val).forEach(fontId => processFontId(fontId, langId));
            }
        });

        return Array.from(fontUsage.keys()).sort().map(name => ({
            name,
            font: fontUsage.get(name).font,
            count: fontUsage.get(name).langIds.size
        }));
    }, [fonts, primaryFontOverrides, fallbackFontOverrides]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handleToggle = (name) => {
        if (selectedFilter.includes(name)) {
            onSelectFilter(selectedFilter.filter(n => n !== name));
        } else {
            onSelectFilter([...selectedFilter, name]);
        }
    };

    if (mappedFonts.length === 0) return null;

    return (
        <div className="relative z-50" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    ${compact
                        ? 'px-2.5 h-[34px] rounded-md text-[9px] border'
                        : 'px-3 h-[34px] rounded-lg text-[10px] border'
                    }
                    font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2
                    ${selectedFilter.length > 0 || isOpen
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                        : compact
                            ? 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                            : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                    }
                `}
            >
                <span>
                    <div className="flex items-center gap-1.5">
                        <span>{selectedFilter.length > 0 ? `FONTS (${selectedFilter.length})` : 'FONTS'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 opacity-70">
                            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 opacity-50">
                            {isOpen ? (
                                <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                            ) : (
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            )}
                        </svg>
                    </div>
                </span>
                {selectedFilter.length > 0 && (
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectFilter([]);
                        }}
                        className="p-0.5 hover:bg-indigo-100 rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="p-1 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => {
                                onSelectFilter([]);
                                // Keep open or close? Let's keep open if multiselect behavior, but "Clear" usually resets.
                                // If I want to close on clear, uncomment: setIsOpen(false);
                            }}
                            className={`
                                w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-between
                                ${selectedFilter.length === 0
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                }
                            `}
                        >
                            <span>All Fonts</span>
                            {selectedFilter.length === 0 && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-600">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        {mappedFonts.map(({ name, count }) => {
                            const isSelected = selectedFilter.includes(name);
                            return (
                                <button
                                    key={name}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleToggle(name);
                                    }}
                                    className={`
                                        w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-between group
                                        ${isSelected
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center min-w-0 flex-1 mr-2">
                                        <span className="truncate">{name}</span>
                                        {count > 0 && (
                                            <span className={`ml-1.5 shrink-0 opacity-60 font-normal ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                                                ({count})
                                            </span>
                                        )}
                                    </div>
                                    {/* Checkbox-like UI */}
                                    <div className={`
                                        w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0
                                        ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'border-slate-300 bg-white group-hover:border-indigo-400'
                                        }
                                    `}>
                                        {isSelected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

};

export default FontFilter;
