import React, { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTypo } from '../context/useTypo';
import LanguageList from './LanguageList';

const SortableFontRow = ({ item, isPrimary, assignments, onOpenLanguagePicker, onSetPrimary, languages }) => {
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

    const assignedLangId = assignments[item.file.name];
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
                            <span className="font-bold text-slate-800 text-sm truncate">{item.file.name}</span>
                            {isPrimary && (
                                <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Primary
                                </span>
                            )}
                            {!isPrimary && (
                                <button
                                    onClick={() => onSetPrimary(item.id)}
                                    className="opacity-0 group-hover:opacity-100 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
                                >
                                    Set Primary
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-slate-200/50">
                                {item.file.name.split('.').pop()}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200/50">
                                {item.metadata.isVariable ? 'Variable' : 'Static'}
                            </span>
                            {item.metadata.axes?.weight ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-200/50">
                                    Wght {item.metadata.axes.weight.min}–{item.metadata.axes.weight.max}
                                </span>
                            ) : item.metadata.staticWeight ? (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200/50">
                                    Weight {item.metadata.staticWeight}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Language Badge */}
                    <button
                        onClick={() => !isPrimary && onOpenLanguagePicker(item.file.name)}
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
                </div>
            </div>
        </div>
    );
};

const FontLanguageModal = ({ pendingFonts, onConfirm, onCancel }) => {
    const { languages } = useTypo();
    const [fonts, setFonts] = useState(() =>
        pendingFonts.map((f, i) => ({ ...f, id: `pending-${i}` }))
    );
    const [assignments, setAssignments] = useState(() => {
        const initial = {};
        pendingFonts.forEach(f => {
            initial[f.file.name] = 'auto';
        });
        return initial;
    });

    const [view, setView] = useState('list'); // 'list' or 'picker'
    const [pickingForFont, setPickingForFont] = useState(null);
    const [pickerSearchTerm, setPickerSearchTerm] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setFonts((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    };

    const handleSetPrimary = (id) => {
        setFonts((items) => {
            const index = items.findIndex((i) => i.id === id);
            if (index <= 0) return items;
            const newOrder = [...items];
            const [item] = newOrder.splice(index, 1);
            newOrder.unshift(item);
            return newOrder;
        });
    };

    const handleLanguageSelect = (langId) => {
        if (!pickingForFont) return;

        setAssignments(prev => ({
            ...prev,
            [pickingForFont]: langId
        }));
        setView('list');
        setPickingForFont(null);
        setPickerSearchTerm('');
    };

    const handleOpenLanguagePicker = (fontName) => {
        setPickingForFont(fontName);
        setView('picker');
    };

    const handleConfirm = () => {
        onConfirm({
            orderedFonts: fonts,
            assignments
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        {view === 'picker' && (
                            <button
                                onClick={() => setView('list')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {view === 'list' ? 'Fallback Order and Language Assignments' : 'Select Language'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {view === 'list'
                                    ? 'Drag to reorder. Assign fonts to specific languages if needed.'
                                    : `Assigning language for ${pickingForFont}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-auto flex-1 p-6 custom-scrollbar bg-white min-h-0">
                    {view === 'list' ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={fonts.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {fonts.map((font, index) => (
                                    <SortableFontRow
                                        key={font.id}
                                        item={font}
                                        isPrimary={index === 0}
                                        assignments={assignments}
                                        onOpenLanguagePicker={handleOpenLanguagePicker}
                                        onSetPrimary={handleSetPrimary}
                                        languages={languages}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="h-full flex flex-col">
                            <LanguageList
                                selectedIds={assignments[pickingForFont]}
                                onSelect={handleLanguageSelect}
                                searchTerm={pickerSearchTerm}
                                onSearchChange={setPickerSearchTerm}
                                mode="single"
                                showAuto={true}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
                    {view === 'list' ? (
                        <>
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md shadow-indigo-100"
                            >
                                Confirm Assignments
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setView('list')}
                            className="px-6 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                        >
                            Back to List
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FontLanguageModal;
