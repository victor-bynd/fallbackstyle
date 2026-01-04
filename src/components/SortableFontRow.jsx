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

const SortableFontRow = ({ item, isPrimary, mappings = {}, onOpenLanguagePicker, onSetPrimary, languages, onRemove, onToggleGlobal, onReplace }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
    };

    const font = normalizeFontData(item);

    // Targets map is key -> [langId]. 
    // Key might be id (for live fonts) or filename (for pending fonts).
    const mappedIds = mappings[font.fileName] || mappings[font.name] || mappings[font.id];
    const mappedIdArray = Array.isArray(mappedIds) ? mappedIds : (mappedIds ? [mappedIds] : []);

    let displayLabel = 'None';
    if (mappedIdArray.length === 1) {
        const lang = languages.find(l => l.id === mappedIdArray[0]);
        displayLabel = lang ? lang.name : mappedIdArray[0];
    } else if (mappedIdArray.length > 1) {
        displayLabel = `${mappedIdArray.length} Languages`;
    }

    const hasMapping = mappedIdArray.length > 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative bg-white border rounded-lg p-2 mb-1.5 transition-all
                ${isDragging ? 'shadow-xl ring-2 ring-indigo-500/20 border-indigo-200 z-50' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}
                ${isPrimary ? 'bg-indigo-50/30' : ''}
            `}
        >
            <div className="flex items-center gap-3">
                {/* Drag Handle or Index */}
                {!isPrimary ? (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded"
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5 4h2V2H5v2zm0 5h2V7H5v2zm0 5h2v-2H5v2zm4-10h2V2H9v2zm0 5h2V7H9v2zm0 5h2v-2H9v2z" />
                        </svg>
                    </div>
                ) : (
                    <div
                        {...attributes}
                        {...listeners}
                        className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded bg-opacity-70 cursor-grab active:cursor-grabbing"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14" />
                        </svg>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm truncate" title={font.name}>
                                {font.name}
                            </span>
                            {isPrimary && (
                                <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                    Primary
                                </span>
                            )}
                            {isPrimary && onReplace && (
                                <button
                                    onClick={onReplace}
                                    className="opacity-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded transition-all whitespace-nowrap shrink-0 flex items-center gap-1"
                                    title="Replace primary font"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                    </svg>
                                    Replace
                                </button>
                            )}
                            {!isPrimary && onSetPrimary && (
                                <button
                                    onClick={() => onSetPrimary(item.id)}
                                    className="opacity-0 group-hover:opacity-100 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-[9px] font-bold px-2 py-0.5 rounded transition-all whitespace-nowrap shrink-0"
                                >
                                    Set Primary
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                            {font.ext && (
                                <span className="text-[9px] bg-slate-50 text-slate-400 px-1 py-0 rounded font-mono uppercase border border-slate-100">
                                    {font.ext}
                                </span>
                            )}
                            {font.isSystem ? (
                                <span className="text-[9px] bg-slate-50 text-slate-400 px-1 py-0 rounded uppercase border border-slate-100">
                                    System
                                </span>
                            ) : (
                                <>
                                    <span className="text-[9px] bg-slate-50 text-slate-400 px-1 py-0 rounded uppercase border border-slate-100">
                                        {font.isVariable ? 'Var' : 'Static'}
                                    </span>
                                    {font.axes?.weight ? (
                                        <span className="text-[9px] bg-emerald-50/50 text-emerald-600 px-1 py-0 rounded uppercase border border-emerald-100">
                                            {font.axes.weight.min}–{font.axes.weight.max}
                                        </span>
                                    ) : font.staticWeight ? (
                                        <span className="text-[9px] bg-amber-50/50 text-amber-600 px-1 py-0 rounded uppercase border border-amber-100">
                                            {font.staticWeight}
                                        </span>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Stacked Controls: Global Toggle & Map Button */}
                    <div className="flex flex-col gap-1 items-end">
                        {/* Toggle Global Status Logic */}
                        {onToggleGlobal && !isPrimary && (
                            <>
                                {item.isLangSpecific ? (
                                    <button
                                        onClick={() => onToggleGlobal(item.id)}
                                        className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-[9px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
                                    >
                                        Set as global fallback
                                    </button>
                                ) : hasMapping && (
                                    <button
                                        onClick={() => onToggleGlobal(item.id)}
                                        className="grid grid-cols-1 items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 text-[9px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap group/global"
                                        title="Click to remove from global fallback list"
                                    >
                                        <span className="col-start-1 row-start-1 flex items-center gap-1 opacity-100 group-hover/global:opacity-0 transition-opacity">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                            Global Fallback Active
                                        </span>
                                        <span className="col-start-1 row-start-1 text-emerald-700 opacity-0 group-hover/global:opacity-100 transition-opacity">
                                            Remove from global
                                        </span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* Language Badge */}
                        {onOpenLanguagePicker && (
                            <button
                                onClick={() => onOpenLanguagePicker(font.id)}
                                className={`
                                    min-w-[120px] w-full justify-between items-center
                                    px-2 py-0.5 rounded-md text-[9px] font-bold transition-all border flex gap-1.5 group/map
                                    ${hasMapping
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 shadow-sm'
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }
                                `}
                                title={hasMapping ? mappedIdArray.join(', ') : "Map to a specific language"}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="uppercase tracking-wider opacity-70 hidden sm:inline-block shrink-0">Map:</span>
                                    <span className="truncate max-w-[140px]">
                                        {displayLabel}
                                    </span>
                                </div>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${hasMapping ? "text-indigo-400" : "text-slate-300"}`}>
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Delete Action */}
                    {onRemove && (
                        <button
                            onClick={() => onRemove(item.id)}
                            className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors rounded hover:bg-rose-50"
                            title="Remove font"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
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
