import React, { useState } from 'react';
import { useTypo } from '../context/useTypo';

const FontComparisonSelectorModal = ({ isOpen, onClose, onCompare }) => {
    const { fonts } = useTypo();
    const [selectedFonts, setSelectedFonts] = useState([]);

    if (!isOpen) return null;

    // Filter out system fallbacks if needed, or just show everything.
    // Usually users want to compare their uploaded fonts or major system fonts.
    // Let's list all valid fonts.
    const validFonts = fonts.filter(f => f && !f.hidden);

    const handleToggle = (fontId) => {
        setSelectedFonts(prev => {
            if (prev.includes(fontId)) {
                return prev.filter(id => id !== fontId);
            }
            if (prev.length >= 4) {
                return prev; // Max 4
            }
            return [...prev, fontId];
        });
    };

    const handleConfirm = () => {
        onCompare(selectedFonts);
        setSelectedFonts([]); // Reset or keep? Resetting feels safer.
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="p-6 border-b border-slate-100 bg-white">
                    <h2 className="text-xl font-bold text-slate-800">Compare Fonts</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Select up to 4 fonts to compare side-by-side.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 max-h-[60vh]">
                    <div className="space-y-1">
                        {validFonts.map(font => {
                            const isSelected = selectedFonts.includes(font.id);
                            const isDisabled = !isSelected && selectedFonts.length >= 4;

                            return (
                                <label
                                    key={font.id}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                        ${isSelected
                                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20'
                                            : 'bg-white border-transparent hover:bg-slate-50'
                                        }
                                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={isSelected}
                                        onChange={() => !isDisabled && handleToggle(font.id)}
                                        disabled={isDisabled}
                                    />
                                    <div className="flex-1">
                                        <div className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {font.fileName?.replace(/\.[^/.]+$/, '') || font.name || 'Unnamed Font'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            {font.id} {font.type === 'primary' && '• Primary'}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedFonts.length < 1}
                        className={`
                            px-6 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all flex items-center gap-2
                            ${selectedFonts.length < 1
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
                            }
                        `}
                    >
                        <span>Compare {selectedFonts.length > 0 && `(${selectedFonts.length})`}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FontComparisonSelectorModal;
