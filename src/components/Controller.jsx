
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

const Controller = ({ sidebarMode }) => {
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
        copyFontsFromPrimaryToSecondary
    } = useTypo();

    const enableSecondary = false;
    const isSecondaryEmpty = enableSecondary && activeFontStyleId === 'secondary' && (!fontStyles?.secondary?.fonts || fontStyles.secondary.fonts.length === 0);



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
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={(fonts || []).map(f => f.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {/* Main Font (primary/secondary style toggle hidden) */}
                            <div>
                                <div className="mt-3">
                                    {isSecondaryEmpty ? (
                                        <div className="space-y-2">
                                            <label className="flex items-center justify-center w-full py-2 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 cursor-pointer transition-colors bg-white">
                                                Add Secondary Font
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".ttf,.otf,.woff,.woff2"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        try {
                                                            const { font, metadata } = await parseFontFile(file);
                                                            const url = createFontUrl(file);
                                                            loadFont(font, url, file.name, metadata);
                                                            e.target.value = '';
                                                        } catch (err) {
                                                            console.error('Error loading font:', err);
                                                            alert('Failed to load font file.');
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={copyFontsFromPrimaryToSecondary}
                                                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 border-dashed rounded-lg p-2.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                                                type="button"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                                    <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a.5.5 0 00-.146-.354l-.854-.853A.5.5 0 0011.646 9.5H8.379a1.5 1.5 0 01-1.06-.44L4.5 6z" />
                                                </svg>
                                                <span>Copy Stack from Primary</span>
                                            </button>
                                        </div>
                                    ) : (
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
                                    )}
                                </div>
                            </div>



                            {!isSecondaryEmpty && (
                                <div>
                                    <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                        Fallback Fonts
                                    </label>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                                                <span>Fallback Size Adjust</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-mono text-[10px]">{Math.round(baseFontSize * (fontScales.fallback / 100))}px</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="25"
                                                            max="300"
                                                            step="5"
                                                            value={fontScales.fallback}
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
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>

                                        <FontTabs />
                                    </div>
                                </div>
                            )}
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
