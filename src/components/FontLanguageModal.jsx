import React, { useState } from 'react';
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
import { useTypo } from '../context/useTypo';
import LanguageList from './LanguageList';
import SortableFontRow from './SortableFontRow';

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

    const handleOpenLanguagePicker = (fontId) => {
        const font = fonts.find(f => f.id === fontId);
        if (font) {
            setPickingForFont(font.file.name);
            setView('picker');
        }
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
                                    : <span>Assigning language for <strong>{pickingForFont}</strong></span>}
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
