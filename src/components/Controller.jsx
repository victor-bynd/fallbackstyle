import { useTypo } from '../context/useTypo';
import React, { useState } from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontTabs, { SortableFontCard } from './FontTabs';
import LanguageMultiSelectModal from './LanguageMultiSelectModal';
import languagesData from '../data/languages.json';
import ConfigManager from './ConfigManager';
import OverridesManager from './OverridesManager';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { getVisualFontIdOrder } from '../utils/fontSortUtils';

const Controller = ({ sidebarMode, setPreviewMode }) => {
    const {
        activeFontStyleId,
        fonts,
        activeFont,
        setActiveFont,
        reorderFonts,
        fontObject,
        lineHeight,
        setLineHeight,
        letterSpacing,
        setLetterSpacing,
        lineHeightOverrides,
        resetAllLineHeightOverrides,
        setIsFallbackLinked,
        baseFontSize,
        fontScales,
        setFontScales,

        headerFontStyleMap,
        updateHeaderStyle,
        fontStyles,
        loadFont,
        weight,
        updateFontWeight,
        getFontColor,
        updateFontColor,
        getEffectiveFontSettings,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        fallbackFontOverrides,
        fallbackLineHeight,
        setFallbackLineHeight,
        fallbackLetterSpacing,
        setFallbackLetterSpacing,
        primaryFontOverrides,
        addPrimaryLanguageOverrides,
        clearPrimaryFontOverride,
        removeLanguageSpecificFont,
        activeConfigTab,
        setActiveConfigTab,
        configuredLanguages,
        addConfiguredLanguage,
        removeConfiguredLanguage
    } = useTypo();

    const activeTab = activeConfigTab;
    const setActiveTab = setActiveConfigTab;
    const [showLanguageModal, setShowLanguageModal] = useState(false);


    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    if (!fontObject) return null;

    const hasOverrides = Object.keys(lineHeightOverrides).length > 0;

    const setGlobalLineHeight = (val) => {
        setLineHeight(val);
        Object.keys(headerFontStyleMap || {}).forEach(tag => {
            const assignedStyle = headerFontStyleMap[tag] || 'primary';
            if (assignedStyle === activeFontStyleId) {
                updateHeaderStyle(tag, 'lineHeight', val, 'sync');
            }
        });
    };

    const setGlobalLetterSpacing = (val) => {
        setLetterSpacing(val);
        Object.keys(headerFontStyleMap || {}).forEach(tag => {
            const assignedStyle = headerFontStyleMap[tag] || 'primary';
            if (assignedStyle === activeFontStyleId) {
                updateHeaderStyle(tag, 'letterSpacing', val, 'sync');
            }
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over) return;

        if (active.id !== over.id) {
            const oldIndex = (fonts || []).findIndex((f) => f.id === active.id);
            const newIndex = (fonts || []).findIndex((f) => f.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                // Check if the move would result in a "System Font" (manual name, no fontObject) 
                // becoming the primary font (index 0).
                const simulatedFonts = [...fonts];
                const [movedFont] = simulatedFonts.splice(oldIndex, 1);
                simulatedFonts.splice(newIndex, 0, movedFont);

                const newPrimary = simulatedFonts[0];

                // If the new primary has a name (is not empty placeholder) but no font object,
                // it is a system font. Prevent this move.
                if (newPrimary.name && !newPrimary.fontObject) {
                    // Optional: You could show a toast/alert here if desired
                    // alert("System fonts cannot be used as the primary font.");
                    return;
                }

                reorderFonts(oldIndex, newIndex);
                // Only set active if not primary font
                const activeFontObj = fonts.find(f => f.id === active.id);
                if (activeFontObj && activeFontObj.type !== 'primary') {
                    setActiveFont(active.id);
                }
            }
        }
    };

    const primaryFont = (fonts || []).find(f => f.type === 'primary');
    return (
        <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 h-screen sticky top-0 overflow-y-auto z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
            {sidebarMode === 'main' && (
                <>
                    {/* Static Header */}
                    <div className="pb-4">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fallback Styles</h2>
                        <button
                            onClick={() => setPreviewMode(true)}
                            className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 8.201 2.66 9.336 6.41.147.481.147.974 0 1.455C18.201 14.66 14.257 17.335 10 17.335s-8.201-2.675-9.336-6.745zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                            </svg>
                            Live Website Preview
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Tabs at the Top */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
                            <button
                                onClick={() => setActiveTab('primary')}
                                className={`
                                    px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap
                                    ${activeTab === 'primary'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }
                                `}
                            >
                                Primary
                            </button>
                            {/* Compute unique language IDs from configured languages and existing overrides */}
                            {Array.from(new Set([
                                ...(configuredLanguages || []),
                                ...Object.keys(primaryFontOverrides || {}),
                                ...Object.keys(fallbackFontOverrides || {})
                            ])).map(langId => {
                                const lang = languagesData.find(l => l.id === langId);
                                const label = lang ? (lang.shortName || lang.id.split('-')[0].toUpperCase()) : langId;
                                return (
                                    <div key={langId} className="relative group">
                                        <button
                                            onClick={() => setActiveTab(langId)}
                                            className={`
                                                px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap pr-5
                                                ${activeTab === langId
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }
                                            `}
                                            title={lang?.name || langId}
                                        >
                                            {label}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Remove overrides for ${lang?.name || langId}?`)) {
                                                    removeConfiguredLanguage(langId);

                                                    // If we were on this tab, go back to primary
                                                    if (activeTab === langId) setActiveTab('primary');
                                                }
                                            }}
                                            className={`
                                                absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors
                                                ${activeTab === langId
                                                    ? 'text-indigo-200 hover:bg-white/20 hover:text-white'
                                                    : 'text-slate-400 hover:bg-slate-200 hover:text-rose-500'
                                                }
                                            `}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => setShowLanguageModal(true)}
                                className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                </svg>
                                Add Language
                            </button>
                        </div>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={getVisualFontIdOrder(fonts, fallbackFontOverrides)}
                                strategy={verticalListSortingStrategy}
                            >
                                <FontTabs activeTab={activeTab} />
                            </SortableContext>
                        </DndContext>
                    </div>

                    {/* Overrides Manager */}
                    <OverridesManager />

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1"></div>

                    {/* Export CSS Button - Bottom of Sidebar */}
                    {/* Config Manager - Import/Export */}
                    <ConfigManager />

                    {showLanguageModal && (
                        <LanguageMultiSelectModal
                            onClose={() => setShowLanguageModal(false)}
                            onConfirm={(selectedIds) => {
                                selectedIds.forEach(id => addConfiguredLanguage(id));
                                if (selectedIds.length > 0) {
                                    setActiveTab(selectedIds[0]);
                                }
                                setShowLanguageModal(false);
                            }}
                            title="Add Language Configuration"
                            confirmLabel="Add Languages"
                            initialSelectedIds={configuredLanguages}
                        />
                    )}
                </>
            )}

            {/* Header Editor - Full Replacement */}
            {sidebarMode === 'headers' && (
                <SidebarHeaderConfig />
            )}
        </div>
    );
};

export default Controller;
