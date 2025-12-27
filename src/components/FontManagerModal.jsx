
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useTypo } from '../context/useTypo';
import FallbackFontAdder from './FallbackFontAdder';
import SortableFontRow from './SortableFontRow';
import LanguageList from './LanguageList';

const FontManagerModal = ({ onClose }) => {
    const {
        fonts,
        reorderFonts,
        removeFallbackFont,
        languages,
        fallbackFontOverrides,
        primaryFontOverrides,
        updateFallbackFontOverride,
        addLanguageSpecificPrimaryFont
    } = useTypo();

    const [activeId, setActiveId] = useState(null);
    const [view, setView] = useState('list'); // 'list' or 'picker'
    const [pickingForFontId, setPickingForFontId] = useState(null);
    const [pickerSearchTerm, setPickerSearchTerm] = useState('');

    const pickingFont = useMemo(() => {
        if (!pickingForFontId) return null;
        return fonts.find(f => f.id === pickingForFontId);
    }, [fonts, pickingForFontId]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Compute assignments map: fontId -> langId (just for visualization component compatibility)
    // But SortableFontRow expects a map of overrides? 
    // Actually, we need to reverse match: which language is using this font as an override?
    const assignments = useMemo(() => {
        const map = {};
        // Check fallback overrides
        Object.entries(fallbackFontOverrides || {}).forEach(([langId, overrides]) => {
            if (typeof overrides === 'object') {
                Object.entries(overrides).forEach(([baseFontId, overrideFontId]) => {
                    // This is complex: fallbackFontOverrides maps langId -> { baseFontId: overrideFontId }
                    // If we want to show "Assigned to Japan", we need to know if this font IS the override.
                    // But the UI pattern in Initial Import implies a simpler "This font is intended for Language X"
                    // For now, let's look for "Global Fallback" logic vs "Language Specific".
                    // If a font is purely a language specific font, it might be in the list but not global fallback?
                    // Let's simplified assumption: If this font ID is used as an override value for any language, map it.
                    if (overrideFontId) map[overrideFontId] = langId;
                });
            } else if (typeof overrides === 'string') {
                // Legacy or simple map
                map[overrides] = langId;
            }
        });

        // Check primary overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (fontId) map[fontId] = langId;
        });

        return map;
    }, [fallbackFontOverrides, primaryFontOverrides]);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = fonts.findIndex((f) => f.id === active.id);
            const newIndex = fonts.findIndex((f) => f.id === over.id);

            // Check if System Font becoming Primary
            if (newIndex === 0) {
                const movedFont = fonts[oldIndex];
                if (movedFont.name && !movedFont.fontObject && !movedFont.fileName) {
                    alert("System fonts cannot be used as the primary font.");
                    setActiveId(null);
                    return;
                }
            }
            // Simulate Check
            const simulatedFonts = [...fonts];
            const [movedFont] = simulatedFonts.splice(oldIndex, 1);
            simulatedFonts.splice(newIndex, 0, movedFont);

            if (simulatedFonts[0].name && !simulatedFonts[0].fontObject && !simulatedFonts[0].fileName) {
                alert("System fonts cannot be used as the primary font.");
                setActiveId(null);
                return;
            }

            reorderFonts(oldIndex, newIndex);
        }
        setActiveId(null);
    };

    const handleRemove = (fontId) => {
        if (fonts.length <= 1) {
            alert("You cannot remove the last font.");
            return;
        }
        if (confirm("Are you sure you want to remove this font?")) {
            removeFallbackFont(fontId);
        }
    };

    const handleSetPrimary = (fontId) => {
        const index = fonts.findIndex(f => f.id === fontId);
        if (index > 0) {
            const font = fonts[index];
            if (font.name && !font.fontObject && !font.fileName) {
                alert("System fonts cannot be used as the primary font.");
                return;
            }
            reorderFonts(index, 0);
        }
    };

    const handleOpenLanguagePicker = (fontId) => {
        setPickingForFontId(fontId);
        setView('picker');
    };

    const handleLanguageSelect = (langId) => {
        if (!pickingForFontId) return;

        // Logic: 
        // 1. Is this intended to be a Primary Override? 
        //    If the user clicks "Assign Language", they likely want this font to be used for that language.
        //    But as Primary? or Fallback?
        //    Deciding: If this font is a "Web Font", it could be Primary.
        //    Let's assume they want to use it as a Primary Override for that language for now, 
        //    OR we can treat it as a Fallback Override if it's lower in the stack.
        //    Actually, "Assign Language" in the import flow usually meant "This font is for Japanese", so it should be used when Japanese is present.
        //    
        //    Let's implement: Add as Primary Override for that language.
        //    Why? because that's the most common "Language Specific Font" usecase (e.g. Noto Sans JP).

        addLanguageSpecificPrimaryFont(langId, pickingForFontId);

        setView('list');
        setPickingForFontId(null);
        setPickerSearchTerm('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        {view === 'picker' && (
                            <button
                                onClick={() => setView('list')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
                                {view === 'list' ? 'Manage Fonts' : `Assign Language for ${pickingFont?.name || 'Font'}`}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {view === 'list' ? 'Add, remove, and reorder your font stack' : `Select a language to use ${pickingFont?.name || 'this font'} as an override`}
                            </p>
                        </div>
                    </div>

                    {view === 'list' && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
                    {view === 'list' ? (
                        <>
                            {/* Font List */}
                            <div className="space-y-4">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={fonts.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {fonts.map((font, index) => (
                                                <SortableFontRow
                                                    key={font.id}
                                                    item={font}
                                                    isPrimary={index === 0}
                                                    onRemove={handleRemove}
                                                    onSetPrimary={handleSetPrimary}
                                                    onOpenLanguagePicker={handleOpenLanguagePicker}
                                                    assignments={assignments}
                                                    languages={languages || []}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                    <DragOverlay>
                                        {activeId ? (
                                            <div className="opacity-90 rotate-2 scale-105 pointer-events-none">
                                                <div className="p-4 bg-white border border-indigo-200 rounded-xl shadow-xl">
                                                    Moving font...
                                                </div>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <div className="mb-3">
                                    <h3 className="text-sm font-bold text-gray-900">Add New Font</h3>
                                    <p className="text-xs text-gray-500">Upload a file or add a system font name</p>
                                </div>
                                <FallbackFontAdder
                                    onClose={() => { }}
                                    onAdd={() => { }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assigning Language To</div>
                                        <div className="text-sm font-bold text-slate-800">{pickingFont?.name}</div>
                                    </div>
                                </div>
                                <div className="hidden sm:block text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-tight">
                                    Single Select
                                </div>
                            </div>
                            <LanguageList
                                selectedIds={assignments[pickingForFontId]}
                                onSelect={handleLanguageSelect}
                                searchTerm={pickerSearchTerm}
                                onSearchChange={setPickerSearchTerm}
                                mode="single"
                                showAuto={false}
                            />
                        </div>
                    )}
                </div>

                {view === 'list' && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

FontManagerModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default FontManagerModal;
