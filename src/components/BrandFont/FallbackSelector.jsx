
import React from 'react';
import systemFonts from '../../constants/systemFonts.json';
import clsx from 'clsx';

import { useState } from 'react';

const FallbackSelector = ({ selectedFontId, onSelect, customFonts = [], onAddCustomFont }) => {
    const [newFontName, setNewFontName] = useState('');

    const allFonts = [...systemFonts, ...customFonts];

    const handleAdd = () => {
        if (!newFontName.trim()) return;
        onAddCustomFont(newFontName.trim());
        setNewFontName('');
    };

    return (
        <div className="w-full flex flex-col h-full">
            <label className="block text-sm font-semibold text-slate-900 mb-3">
                Select Fallback Font
            </label>

            <div className="space-y-1 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {allFonts.map((font) => (
                    <button
                        key={font.id}
                        onClick={() => onSelect(font)}
                        className={clsx(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-all text-xs",
                            selectedFontId === font.id
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={clsx(
                                "w-1.5 h-1.5 rounded-full",
                                selectedFontId === font.id ? "bg-indigo-500" : "bg-slate-300"
                            )}></div>
                            <div>
                                <span className={clsx(
                                    "block font-medium truncate max-w-[120px]",
                                    font.isCustom && "italic"
                                )}>
                                    {font.name}
                                </span>
                                {font.isCustom && <span className="text-[10px] text-slate-400 block -mt-0.5">Custom</span>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Add Custom Font Section */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Add System Font</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newFontName}
                        onChange={(e) => setNewFontName(e.target.value)}
                        placeholder="e.g. Comic Sans MS"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newFontName.trim()}
                        className="px-3 py-2 bg-slate-900 text-white rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Add
                    </button>
                </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
                Standard metrics are used unless customized.
            </p>
        </div>
    );
};

export default FallbackSelector;
