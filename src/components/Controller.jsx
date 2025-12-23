
import { useTypo } from '../context/useTypo';
import React from 'react';
import SidebarHeaderConfig from './SidebarHeaderConfig';
import FontTabs, { SortableFontCard } from './FontTabs';
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
        setFallbackLetterSpacing
    } = useTypo();


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

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={getVisualFontIdOrder(fonts, fallbackFontOverrides)}
                            strategy={verticalListSortingStrategy}
                        >
                            {/* Main Font */}
                            <div>
                                <div className="mt-3">
                                    <div>
                                        {primaryFont && (
                                            <>
                                                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                                    Primary Font
                                                </label>
                                                <SortableFontCard
                                                    font={primaryFont}
                                                    index={0}
                                                    isActive={primaryFont.id === activeFont}
                                                    globalWeight={weight}
                                                    globalLineHeight={lineHeight}
                                                    globalLetterSpacing={letterSpacing}
                                                    setGlobalLineHeight={setGlobalLineHeight}
                                                    setGlobalLetterSpacing={setGlobalLetterSpacing}
                                                    hasLineHeightOverrides={hasOverrides}
                                                    lineHeightOverrideCount={Object.keys(lineHeightOverrides).length}
                                                    resetAllLineHeightOverrides={resetAllLineHeightOverrides}
                                                    getFontColor={getFontColor}
                                                    updateFontColor={updateFontColor}
                                                    getEffectiveFontSettings={getEffectiveFontSettings}
                                                    fontScales={fontScales}
                                                    lineHeight={lineHeight}
                                                    updateFallbackFontOverride={updateFallbackFontOverride}
                                                    resetFallbackFontOverrides={resetFallbackFontOverrides}
                                                    setActiveFont={setActiveFont}
                                                    handleRemove={() => { }}
                                                    updateFontWeight={updateFontWeight}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                GLOBAL FALLBACKS
                                            </label>
                                            {(fontScales.fallback !== 100) && (
                                                <button
                                                    onClick={() => {
                                                        setFontScales(prev => ({ ...prev, fallback: 100 }));
                                                        setIsFallbackLinked(false);
                                                    }}
                                                    className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                                                    title="Reset all global fallbacks"
                                                    type="button"
                                                >
                                                    <span className="text-[10px]">Reset</span>
                                                    <span className="text-xs">↺</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                            <div className="flex items-center gap-2">
                                                <span>Size Adjust</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {fontScales.fallback !== 100 && (
                                                    <button
                                                        onClick={() => {
                                                            setFontScales(prev => ({ ...prev, fallback: 100 }));
                                                            setIsFallbackLinked(false);
                                                        }}
                                                        className="text-[10px] text-slate-400 hover:text-rose-500"
                                                        title="Reset to 100%"
                                                        type="button"
                                                    >
                                                        ↺
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="25"
                                                        max="300"
                                                        step="5"
                                                        value={fontScales.fallback === 100 ? '' : fontScales.fallback}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                setFontScales(prev => ({ ...prev, fallback: '' }));
                                                            } else {
                                                                const parsed = parseInt(val);
                                                                setFontScales(prev => ({
                                                                    ...prev,
                                                                    fallback: isNaN(parsed) ? '' : parsed
                                                                }));
                                                            }
                                                            setIsFallbackLinked(false);
                                                        }}
                                                        onBlur={(e) => {
                                                            let val = parseInt(e.target.value);
                                                            if (isNaN(val)) {
                                                                val = 100; // default
                                                            } else {
                                                                val = Math.max(25, Math.min(300, val));
                                                            }
                                                            setFontScales(prev => ({
                                                                ...prev,
                                                                fallback: val
                                                            }));
                                                        }}
                                                        className="w-12 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                                                    />
                                                    <span className="text-xs">%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="25"
                                            max="300"
                                            step="5"
                                            value={fontScales.fallback}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFontScales(prev => ({
                                                    ...prev,
                                                    fallback: val
                                                }));
                                                setIsFallbackLinked(false);
                                            }}
                                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer block ${fontScales.fallback !== 100
                                                ? 'accent-indigo-600'
                                                : 'accent-slate-400'
                                                }`}
                                        />
                                    </div>



                                    <div>
                                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                            Fallback Fonts ({(fonts || []).filter(f => f.type !== 'primary' && !Object.values(fallbackFontOverrides || {}).includes(f.id)).length})
                                        </label>
                                        <FontTabs />
                                    </div>
                                </div>
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Overrides Manager */}
                    <OverridesManager />

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1"></div>

                    {/* Export CSS Button - Bottom of Sidebar */}
                    {/* Config Manager - Import/Export */}
                    <ConfigManager />
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
