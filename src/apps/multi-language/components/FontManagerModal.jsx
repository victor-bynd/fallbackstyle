
import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useFontManagement } from '../../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../../shared/context/useLanguageMapping';
import { normalizeFontName } from '../../../shared/utils/fontNameUtils';
import FallbackFontAdder from './FallbackFontAdder';
import SortableFontRow from './SortableFontRow';
import LanguageList from './LanguageList';
import { parseFontFile, createFontUrl } from '../../../shared/services/FontLoader';

const FontManagerModal = ({ onClose }) => {
    // Font Management Context
    const {
        fonts,
        reorderFonts,
        removeFallbackFont,
        toggleFontGlobalStatus,
        loadFont,
    } = useFontManagement();

    // Language Mapping Context
    const {
        supportedLanguages: languages,
        fallbackFontOverrides,
        primaryFontOverrides,
        assignFontToMultipleLanguages,
    } = useLanguageMapping();

    const [activeId, setActiveId] = useState(null);
    const [view, setView] = useState('list'); // 'list' or 'picker'
    const [pickingForFontId, setPickingForFontId] = useState(null);
    const [pickerSearchTerm, setPickerSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const primaryFileInputRef = useRef(null);

    const scrollContainerRef = useRef(null);
    const scrollPositionRef = useRef(0);

    // Manage scroll position between views
    useLayoutEffect(() => {
        if (!scrollContainerRef.current) return;

        if (view === 'list') {
            scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        } else if (view === 'picker') {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [view]);

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

    // Filter out language-specific clones if a global version exists
    const visibleFonts = useMemo(() => {
        const globalFonts = fonts.filter(f => !f.isLangSpecific && !f.isPrimaryOverride);
        const specificFonts = fonts.filter(f => f.isLangSpecific || f.isPrimaryOverride);

        // Create a set of global font identifiers for deduplication
        // We use fileName (most precise for uploads) and normalized name
        const globalIdentifiers = new Set();
        globalFonts.forEach(f => {
            if (f.fileName) globalIdentifiers.add(f.fileName);
            if (f.name) globalIdentifiers.add(normalizeFontName(f.name));
        });

        const visitedSpecifics = new Set();

        const uniqueSpecificFonts = specificFonts.filter(f => {
            // If strictly mapped (no global equivalent), show it.
            // If it has a global equivalent, HIDE it (it's a duplicate entry).
            if (f.fileName && globalIdentifiers.has(f.fileName)) return false;
            if (f.name && globalIdentifiers.has(normalizeFontName(f.name))) return false;

            // Deduplicate within specific list to prevent multiple rows for the same font
            // Use filename or normalized name as unique key
            const uniqueKey = f.fileName || normalizeFontName(f.name);
            if (visitedSpecifics.has(uniqueKey)) return false;

            visitedSpecifics.add(uniqueKey);
            return true;
        });

        // Combine: Global first, then orphan specific fonts
        let combined = [...globalFonts, ...uniqueSpecificFonts];

        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            combined = combined.filter(f =>
                (f.name && f.name.toLowerCase().includes(lower)) ||
                (f.fileName && f.fileName.toLowerCase().includes(lower))
            );
        }

        return combined;
    }, [fonts, searchTerm]);

    // Compute Mappings map: fontId/Name/FileName -> [langId, ...]
    const Mappings = useMemo(() => {
        const map = {};

        const registerMapping = (fontId, langId) => {
            // Ensure map entry is array
            if (!map[fontId]) map[fontId] = [];
            if (!map[fontId].includes(langId)) map[fontId].push(langId);

            // Also map the Name and FileName to handle hidden duplicates/clones.
            // This ensures that if we hide a "Clone" because a "Global" exists, 
            // the "Global" row will still see the mapping via Name match.
            const font = fonts.find(f => f.id === fontId);
            if (font) {
                if (font.fileName) {
                    if (!map[font.fileName]) map[font.fileName] = [];
                    if (!map[font.fileName].includes(langId)) map[font.fileName].push(langId);
                }
                if (font.name) {
                    if (!map[font.name]) map[font.name] = [];
                    if (!map[font.name].includes(langId)) map[font.name].push(langId);
                }
                const normalized = normalizeFontName(font.name);
                if (normalized) {
                    if (!map[normalized]) map[normalized] = [];
                    if (!map[normalized].includes(langId)) map[normalized].push(langId);
                }
            }
        };

        // Check fallback overrides
        Object.entries(fallbackFontOverrides || {}).forEach(([langId, overrides]) => {
            if (typeof overrides === 'object') {
                Object.entries(overrides).forEach(([baseFontId, overrideFontId]) => {
                    if (overrideFontId) registerMapping(overrideFontId, langId);
                    if (baseFontId) registerMapping(baseFontId, langId);
                });
            } else if (typeof overrides === 'string') {
                registerMapping(overrides, langId);
            }
        });

        // Check primary overrides
        Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
            if (fontId) registerMapping(fontId, langId);
        });

        return map;
    }, [fallbackFontOverrides, primaryFontOverrides, fonts]);

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
        const fontToRemove = fonts.find(f => f.id === fontId);
        if (!fontToRemove) return;

        // Identify all instances (clones/mapped versions) of this font to ensure clean removal
        const fontsToRemove = fonts.filter(f => {
            if (f.id === fontId) return true;
            // Match by filename for uploaded fonts
            if (fontToRemove.fileName && f.fileName === fontToRemove.fileName) return true;
            // Match by normalized name for system fonts
            if (!fontToRemove.fileName && !f.fileName && normalizeFontName(f.name) === normalizeFontName(fontToRemove.name)) return true;
            return false;
        });

        if (fonts.length - fontsToRemove.length < 1) {
            alert("You cannot remove the last font.");
            return;
        }

        if (confirm("Are you sure you want to remove this font?")) {
            fontsToRemove.forEach(f => removeFallbackFont(f.id));
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
        if (scrollContainerRef.current) {
            scrollPositionRef.current = scrollContainerRef.current.scrollTop;
        }
        setPickingForFontId(fontId);
        setView('picker');
    };

    const handleReplacePrimary = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { font, metadata, buffer } = await parseFontFile(file);
            const url = createFontUrl(file);
            loadFont(font, url, file.name, metadata, buffer);
        } catch (err) {
            console.error('Error replacing primary font:', err);
            alert('Error replacing primary font: ' + err.message);
        } finally {
            e.target.value = '';
        }
    };

    const handleLanguageSelect = (langId) => {
        if (!pickingForFontId) return;

        // Multi-select Logic: Toggle ID
        const currentSelected = Mappings[pickingForFontId] || [];
        let newSelected;
        if (currentSelected.includes(langId)) {
            newSelected = currentSelected.filter(id => id !== langId);
        } else {
            newSelected = [...currentSelected, langId];
        }

        assignFontToMultipleLanguages(pickingForFontId, newSelected);

        // Don't close view, keep picker open for multi-select
        // setView('list');
        // setPickingForFontId(null);
        // setPickerSearchTerm('');
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        {(view === 'picker' || view === 'add') && (
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
                                {view === 'list' && 'Manage Fonts'}
                                {view === 'picker' && `Map Language for ${pickingFont?.name || 'Font'}`}
                                {view === 'add' && 'Add New Font'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {view === 'list' && 'Add, remove, and reorder your font stack'}
                                {view === 'picker' && `Select a language to use ${pickingFont?.name || 'this font'} as an override`}
                                {view === 'add' && 'Upload a file or add a system font name'}
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

                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white"
                >
                    {view === 'list' ? (
                        <>
                            {/* Search Input */}
                            <div className="mb-2 relative">
                                <input
                                    ref={primaryFileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".ttf,.otf,.woff,.woff2"
                                    onChange={handleReplacePrimary}
                                />
                                <input
                                    type="text"
                                    placeholder="Search fonts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4">
                                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                                </svg>
                            </div>

                            {/* Font List */}
                            <div className="space-y-4">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={visibleFonts.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {visibleFonts.length > 0 ? (
                                                <>
                                                    {/* PRIMARY SECTION */}
                                                    {visibleFonts.some(f => fonts.length > 0 && f.id === fonts[0].id) && (
                                                        <>
                                                            <div className="px-1 pt-2 pb-1">
                                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Primary</h3>
                                                            </div>
                                                            {visibleFonts
                                                                .filter(f => fonts.length > 0 && f.id === fonts[0].id)
                                                                .map((font) => (
                                                                    <SortableFontRow
                                                                        key={font.id}
                                                                        item={font}
                                                                        isPrimary={true}
                                                                        onRemove={handleRemove}
                                                                        onSetPrimary={handleSetPrimary}
                                                                        onOpenLanguagePicker={handleOpenLanguagePicker}
                                                                        onToggleGlobal={toggleFontGlobalStatus}
                                                                        mappings={Mappings}
                                                                        languages={languages || []}
                                                                        onReplace={() => primaryFileInputRef.current?.click()}
                                                                    />
                                                                ))}
                                                        </>
                                                    )}

                                                    {/* GLOBAL FALLBACKS SECTION: Global fonts that are NOT the primary */}
                                                    {visibleFonts.some(f => !f.isLangSpecific && !f.isPrimaryOverride && (fonts.length === 0 || f.id !== fonts[0].id)) && (
                                                        <>
                                                            <div className="px-1 pt-4 pb-1">
                                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Fallbacks</h3>
                                                            </div>
                                                            {visibleFonts
                                                                .filter(f => !f.isLangSpecific && !f.isPrimaryOverride && (fonts.length === 0 || f.id !== fonts[0].id))
                                                                .map((font) => (
                                                                    <SortableFontRow
                                                                        key={font.id}
                                                                        item={font}
                                                                        isPrimary={false}
                                                                        onRemove={handleRemove}
                                                                        onSetPrimary={handleSetPrimary}
                                                                        onOpenLanguagePicker={handleOpenLanguagePicker}
                                                                        onToggleGlobal={toggleFontGlobalStatus}
                                                                        mappings={Mappings}
                                                                        languages={languages || []}
                                                                    />
                                                                ))}
                                                        </>
                                                    )}

                                                    {/* MAPPED SECTION: Contains items that ARE isLangSpecific/isPrimaryOverride */}
                                                    {visibleFonts.some(f => f.isLangSpecific || f.isPrimaryOverride) && (
                                                        <>
                                                            <div className="px-1 pt-4 pb-1">
                                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mapped</h3>
                                                            </div>
                                                            {visibleFonts
                                                                .filter(f => f.isLangSpecific || f.isPrimaryOverride)
                                                                .map((font) => (
                                                                    <SortableFontRow
                                                                        key={font.id}
                                                                        item={font}
                                                                        isPrimary={false} // Mapped fonts are never main Primary in ui sense
                                                                        onRemove={handleRemove}
                                                                        onSetPrimary={handleSetPrimary}
                                                                        onOpenLanguagePicker={handleOpenLanguagePicker}
                                                                        onToggleGlobal={toggleFontGlobalStatus}
                                                                        mappings={Mappings}
                                                                        languages={languages || []}
                                                                    />
                                                                ))}
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-center py-8 text-slate-400 text-sm italic">
                                                    No fonts found matching "{searchTerm}"
                                                </div>
                                            )}
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
                        </>
                    ) : view === 'picker' ? (
                        <div className="h-full flex flex-col">
                            <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mapping Language To</div>
                                        <div className="text-sm font-bold text-slate-800">{pickingFont?.name}</div>
                                    </div>
                                </div>
                                <div className="hidden sm:block text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-tight">
                                    Multi-Select
                                </div>
                            </div>
                            <LanguageList
                                selectedIds={Mappings[pickingForFontId]}
                                onSelect={handleLanguageSelect}
                                searchTerm={pickerSearchTerm}
                                onSearchChange={setPickerSearchTerm}
                                mode="multi"
                                showAuto={false}
                            />
                        </div>
                    ) : view === 'add' ? (
                        <div className="h-full flex flex-col">
                            <FallbackFontAdder
                                onClose={() => setView('list')}
                                onAdd={() => setView('list')}
                            />
                        </div>
                    ) : null}
                </div>

                {view === 'list' && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <button
                            onClick={() => setView('add')}
                            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-bold"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            Add New Font
                        </button>
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

    return createPortal(modalContent, document.body);
};

FontManagerModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default FontManagerModal;
