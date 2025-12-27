
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper to normalize font data from different sources
const normalizeFontData = (item) => {
    // If it's a "pending" font (from drag-drop upload flow)
    if (item.file) {
        return {
            id: item.id,
            name: item.file.name,
            fileName: item.file.name,
            ext: item.file.name.split('.').pop(),
            isVariable: item.metadata?.isVariable,
            axes: item.metadata?.axes,
            staticWeight: item.metadata?.staticWeight,
            isSystem: false // Assumed web font if file exists
        };
    }

    // If it's a "live" font (from useTypo / FontManager)
    return {
        id: item.id,
        name: item.name || item.fileName || 'Untitled',
        fileName: item.fileName,
        ext: item.fileName ? item.fileName.split('.').pop() : '',
        isVariable: item.isVariable,
        axes: item.axes,
        staticWeight: item.staticWeight,
        isSystem: !item.fontObject && !item.fileName // If no file, it's system (unless refined logic exists)
    };
};

const SortableFontRow = ({ item, isPrimary, assignments, onOpenLanguagePicker, onSetPrimary, languages, onRemove }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        disabled: isPrimary
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
    };

    const font = normalizeFontData(item);

    // Assignments map is key -> langId. 
    // Key might be id (for live fonts) or filename (for pending fonts).
    // We try both for robustness.
    const assignedLangId = assignments[font.id] || assignments[font.fileName] || assignments[font.name];
    const assignedLang = languages.find(l => l.id === assignedLangId);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative bg-white border rounded-xl p-3 mb-2 transition-all
                ${isDragging ? 'shadow-xl ring-2 ring-indigo-500/20 border-indigo-200 z-50' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}
                ${isPrimary ? 'bg-indigo-50/30' : ''}
            `}
        >
            <div className="flex items-center gap-4">
                {/* Drag Handle or Index */}
                {!isPrimary ? (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5 4h2V2H5v2zm0 5h2V7H5v2zm0 5h2v-2H5v2zm4-10h2V2H9v2zm0 5h2V7H9v2zm0 5h2v-2H9v2z" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14" />
                        </svg>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm truncate">{font.name}</span>
                            {isPrimary && (
                                <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Primary
                                </span>
                            )}
                            {!isPrimary && onSetPrimary && (
                                <button
                                    onClick={() => onSetPrimary(item.id)}
                                    className="opacity-0 group-hover:opacity-100 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
                                >
                                    Set Primary
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {font.ext && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-slate-200/50">
                                    {font.ext}
                                </span>
                            )}
                            {font.isSystem ? (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200/50">
                                    System
                                </span>
                            ) : (
                                <>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200/50">
                                        {font.isVariable ? 'Variable' : 'Static'}
                                    </span>
                                    {font.axes?.weight ? (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-200/50">
                                            Wght {font.axes.weight.min}–{font.axes.weight.max}
                                        </span>
                                    ) : font.staticWeight ? (
                                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200/50">
                                            Weight {font.staticWeight}
                                        </span>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Language Badge (Only if not primary, or if we want primary overrides?) */}
                    {onOpenLanguagePicker && (
                        <button
                            onClick={() => !isPrimary && onOpenLanguagePicker(font.id)} // Pass ID usually
                            disabled={isPrimary}
                            className={`
                                px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-2 group/assign
                                ${isPrimary
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed invisible'
                                    : assignedLangId && assignedLangId !== 'auto'
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 shadow-sm'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                                }
                            `}
                        >
                            <span className="text-slate-400 group-hover/assign:text-slate-500 transition-colors uppercase tracking-wider text-[8px] font-black">Assign Language:</span>
                            <span className="truncate max-w-[100px] text-xs">
                                {isPrimary ? 'Default' : assignedLang ? assignedLang.name : 'Auto (Fallback)'}
                            </span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover/assign:text-indigo-500 transition-colors">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {/* Delete Action - Only for Manager Mode (has onRemove) */}
                    {onRemove && (
                        <button
                            onClick={() => onRemove(item.id)}
                            className="text-slate-300 hover:text-rose-500 p-2 transition-colors rounded-lg hover:bg-rose-50"
                            title="Remove font"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SortableFontRow;
