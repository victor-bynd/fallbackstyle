import React, { useState } from 'react';
import { createFontUrl } from '../services/FontLoader';
import { safeParseFontFile } from '../services/SafeFontLoader';
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

import { useTypo } from '../context/useTypo';
import LanguageList from './LanguageList';
import SortableFontRow from './SortableFontRow';

const FontLanguageModal = ({ pendingFonts, onConfirm, onCancel, initialMappings = {} }) => {
    const { languages } = useTypo();
    const [fonts, setFonts] = useState(() =>
        pendingFonts.map((f, i) => ({ ...f, id: `pending-${i}` }))
    );
    const [mappings, setMappings] = useState(() => {
        const initial = {};
        pendingFonts.forEach(f => {
            initial[f.file.name] = initialMappings[f.file.name] || 'auto';
        });
        return initial;
    });

    // Sync mappings when initialMappings changes (e.g. if config is parsed after mount)
    React.useEffect(() => {
        if (!initialMappings || Object.keys(initialMappings).length === 0) return;

        setMappings(prev => {
            const next = { ...prev };
            let hasChanges = false;
            pendingFonts.forEach(f => {
                const prefilled = initialMappings[f.file.name];
                // Only overwrite if currently 'auto' (don't overwrite user choices) 
                // OR if we assume this is the initialization phase.
                // Given the use case (drop config + fonts), overwriting 'auto' is safe and desired.
                if (prefilled && next[f.file.name] === 'auto') {
                    next[f.file.name] = prefilled;
                    hasChanges = true;
                }
            });
            return hasChanges ? next : prev;
        });
    }, [initialMappings, pendingFonts]);

    const [view, setView] = useState('list'); // 'list' or 'picker'
    const [pickingForFont, setPickingForFont] = useState(null);
    const [pickerSearchTerm, setPickerSearchTerm] = useState('');

    const scrollContainerRef = React.useRef(null);
    const scrollPositionRef = React.useRef(0);
    const addFontInputRef = React.useRef(null);

    const handleAdditionalFonts = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Get currently listed fonts (in modal) to check for duplicates
        const currentFontNames = new Set(
            fonts.map(f => (f.file ? f.file.name : f.fileName || f.name).toLowerCase())
        );

        const newFonts = [];
        let duplicateCount = 0;

        for (const file of files) {
            const fileName = file.name.toLowerCase();
            if (currentFontNames.has(fileName)) {
                duplicateCount++;
                continue;
            }
            try {
                const { font, metadata } = await safeParseFontFile(file);
                const url = createFontUrl(file);
                // Create a pending font object structure matching FontUploader
                newFonts.push({
                    font,
                    metadata,
                    url,
                    file,
                    id: `pending-added-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                });
            } catch (err) {
                console.error("Failed to parse added font", err);
            }
        }

        if (duplicateCount > 0) {
            alert(`Skipped ${duplicateCount} duplicate font(s).`);
        }

        if (newFonts.length > 0) {
            setFonts(prev => [...prev, ...newFonts]);
            // Default mapping for new fonts is 'auto'
            setMappings(prev => {
                const update = { ...prev };
                newFonts.forEach(f => {
                    update[f.file.name] = 'auto';
                });
                return update;
            });
        }

        // Reset input
        e.target.value = '';
    };

    React.useLayoutEffect(() => {
        if (!scrollContainerRef.current) return;

        if (view === 'list') {
            scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        } else if (view === 'picker') {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [view]);

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

        setMappings(prev => {
            const current = prev[pickingForFont];
            let newSelection;

            if (current === 'auto') {
                // If currently auto, selecting a language replaces it with [langId]
                newSelection = [langId];
            } else if (Array.isArray(current)) {
                if (current.includes(langId)) {
                    // Remove if exists
                    newSelection = current.filter(id => id !== langId);
                } else {
                    // Add if not exists
                    newSelection = [...current, langId];
                }
            } else {
                // If string but not auto (legacy/single logic backup)
                if (current === langId) newSelection = [];
                else newSelection = [current, langId];
            }

            // If empty, revert to 'auto'? Or keep empty (No mapping)?
            // Usually if I clear selection, I might mean "None" or "Auto".
            // Let's assume if I explicitly uncheck everything, I might mean "None" or "Auto".
            // For now, let's allow empty array meaning "Explicitly mapped to nothing" (effectively disabled for overrides?)
            // Or should it revert to 'auto'?
            // Providing an "Auto" option in the list effectively handles "Auto".
            // If user unchecks everything, let's leave it as empty array.

            return {
                ...prev,
                [pickingForFont]: newSelection
            };
        });
        // Remove automatic return to list view for multi-select
        // setView('list'); 
        // setPickingForFont(null);
        // setPickerSearchTerm('');
    };

    const handleOpenLanguagePicker = (fontId) => {
        const font = fonts.find(f => f && f.id === fontId);
        if (font) {
            if (scrollContainerRef.current) {
                scrollPositionRef.current = scrollContainerRef.current.scrollTop;
            }
            setPickingForFont(font.file.name);
            setView('picker');
        }
    };



    // Primary Language Management
    const [primaryLanguages, setPrimaryLanguages] = useState([]);

    const handleTogglePrimary = (langId) => {
        setPrimaryLanguages(prev => {
            // Enforce single primary language for this flow
            if (prev.includes(langId)) {
                // If clicking functionality to remove vs strictly replace?
                // Usually if single select, clicking active one might do nothing or remove.
                // Let's implement toggle.
                return [];
            }
            return [langId];
        });
    };

    const handleConfirm = () => {
        onConfirm({
            orderedFonts: fonts,
            mappings,
            primaryLanguages // Pass selected primary languages to parent
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
                                {view === 'list' ? 'Fallback Order and Language Mappings' : 'Select Language'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {view === 'list'
                                    ? 'Drag to reorder. Map fonts to specific languages if needed.'
                                    : <span>Mapping language for <strong>{pickingForFont}</strong></span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-auto flex-1 p-6 custom-scrollbar bg-white min-h-0"
                >
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
                                        mappings={mappings}
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
                                selectedIds={mappings[pickingForFont]}
                                onSelect={handleLanguageSelect}
                                searchTerm={pickerSearchTerm}
                                onSearchChange={setPickerSearchTerm}
                                mode="multi"
                                showAuto={false}
                                primaryLanguages={primaryLanguages}
                                onTogglePrimary={handleTogglePrimary}
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
                            <input
                                type="file"
                                ref={addFontInputRef}
                                className="hidden"
                                multiple
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={handleAdditionalFonts}
                            />
                            <button
                                onClick={() => addFontInputRef.current?.click()}
                                className="px-4 py-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                + Add Font
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md shadow-indigo-100"
                            >
                                Confirm Mappings
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                setView('list');
                                setPickerSearchTerm('');
                            }}
                            className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md"
                        >
                            Confirm Selection
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FontLanguageModal;
