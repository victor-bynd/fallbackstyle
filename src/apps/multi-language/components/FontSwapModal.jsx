import React, { useState } from 'react';
import { useFontManagement } from '../../../shared/context/useFontManagement';

const FontSwapModal = ({ isOpen, onClose, onSelect }) => {
    const { fonts } = useFontManagement();
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const validFonts = fonts.filter(f => !f.hidden);

    const filteredFonts = validFonts.filter(font => {
        if (!searchQuery) return true;
        const name = font.fileName || font.name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <h2 className="text-lg font-bold text-slate-800">Swap Font</h2>
                    <input
                        type="text"
                        placeholder="Search fonts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2 max-h-[50vh]">
                    <div className="space-y-1">
                        {filteredFonts.map(font => (
                            <button
                                key={font.id}
                                onClick={() => {
                                    onSelect(font.id);
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-slate-50 hover:border-slate-100 text-left group"
                            >
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">
                                        {font.fileName?.replace(/\.[^/.]+$/, '') || font.name || 'Unnamed Font'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        {font.id} {font.type === 'primary' && '• Primary'}
                                    </div>
                                </div>
                            </button>
                        ))}
                        {filteredFonts.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs">
                                No fonts found
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FontSwapModal;
