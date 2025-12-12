import { useState } from 'react';
import { useTypo } from '../context/TypoContext';
import FallbackFontAdder from './FallbackFontAdder';

const FontTabs = () => {
    const {
        fonts,
        activeFont,
        setActiveFont,
        removeFallbackFont,
        reorderFonts,
        getFontColor,
        getEffectiveFontSettings,
        fontScales,
        lineHeight,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        colors,
        updateFontColor,
        setColors
    } = useTypo();
    const [showAdder, setShowAdder] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const handleRemove = (e, fontId) => {
        e.stopPropagation();
        if (confirm('Remove this fallback font?')) {
            removeFallbackFont(fontId);
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index);
        // Make the dragged element semi-transparent
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Allow dropping on any position other than self
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        setDragOverIndex(null);

        if (draggedIndex === null || draggedIndex === dropIndex) {
            return;
        }

        // Allow reordering all fonts
        reorderFonts(draggedIndex, dropIndex);

        setDraggedIndex(null);
    };

    return (
        <div className="pb-6 space-y-3">
            {fonts.map((font, index) => {
                const isActive = font.id === activeFont;
                const isPrimary = font.type === 'primary';
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isDraggable = true;

                return (
                    <div
                        key={font.id}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`
                            bg-slate-50 rounded-lg p-4 border transition-all relative
                            ${isPrimary ? 'cursor-pointer' : ''}
                            ${isActive
                                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }
                            ${isDragging ? 'opacity-50' : ''}
                            ${isDragOver ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300' : ''}
                        `}
                        onClick={() => setActiveFont(font.id)}
                    >
                        {!isPrimary && (
                            <button
                                onClick={(e) => handleRemove(e, font.id)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors p-1 z-10"
                                title="Remove font"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                        )}
                        <div className={`flex items-center gap-1 mb-1 ${!isPrimary ? '-ml-[3px]' : ''}`}>
                            <div
                                className="text-slate-400 cursor-move flex-shrink-0 hover:text-indigo-600 transition-colors p-1 -ml-1 rounded hover:bg-slate-100"
                                title="Drag to reorder"
                                draggable={isDraggable}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M7 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z" />
                                </svg>
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                {font.type === 'primary' ? 'Primary Font' : 'Fallback Font'}
                            </div>
                        </div>
                        <div className={`font-mono text-sm break-all text-slate-700 font-medium pr-6 ${!isPrimary ? '' : ''}`}>
                            {font.fileName || font.name || 'No font uploaded'}
                        </div>
                        {font.fontObject && (
                            <div className={`text-xs text-slate-400 mt-2 flex items-center gap-2 ${!isPrimary ? '' : ''}`}>
                                <div className="relative w-3 h-3 flex-shrink-0 cursor-pointer group">
                                    <div
                                        className="absolute inset-0 rounded-full ring-1 ring-slate-200 group-hover:ring-indigo-300 transition-shadow"
                                        style={{ backgroundColor: getFontColor(index) }}
                                    />
                                    <input
                                        type="color"
                                        value={getFontColor(index)}
                                        onChange={(e) => updateFontColor(index, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        title={`Change color for ${isPrimary ? 'Primary' : 'Fallback'} font`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                {font.fontObject.numGlyphs} glyphs
                            </div>
                        )}
                        {!font.fontObject && font.name && (
                            <div className={`text-xs text-slate-400 mt-2 flex items-center gap-2 ${!isPrimary ? '' : ''}`}>
                                <div className="relative w-3 h-3 flex-shrink-0 cursor-pointer group">
                                    <div
                                        className="absolute inset-0 rounded-full ring-1 ring-slate-200 group-hover:ring-indigo-300 transition-shadow"
                                        style={{ backgroundColor: getFontColor(index) }}
                                    />
                                    <input
                                        type="color"
                                        value={getFontColor(index)}
                                        onChange={(e) => updateFontColor(index, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        title={`Change color for ${isPrimary ? 'Primary' : 'Fallback'} font`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                System/Web Font
                            </div>
                        )}

                        {!isPrimary && isActive && (
                            <div className="mt-4 pt-3 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-200">
                                {(() => {
                                    const effectiveSettings = getEffectiveFontSettings(font.id);
                                    const hasOverrides = effectiveSettings && (
                                        (effectiveSettings.scale !== fontScales.fallback) ||
                                        (effectiveSettings.lineHeight !== lineHeight)
                                    );

                                    return (
                                        <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                            {/* Header with Reset */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Overrides
                                                </span>
                                                {hasOverrides && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            resetFallbackFontOverrides(font.id);
                                                        }}
                                                        className="text-[9px] text-rose-500 font-bold hover:text-rose-700 hover:underline"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            {/* Font Scale Slider */}
                                            <div>
                                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                    <span>Size Adjust</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="25"
                                                            max="300"
                                                            step="5"
                                                            value={font.scale !== undefined ? font.scale : fontScales.fallback}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    updateFallbackFontOverride(font.id, 'scale', '');
                                                                } else {
                                                                    const parsed = parseFloat(val);
                                                                    updateFallbackFontOverride(font.id, 'scale', parsed);
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                let val = parseFloat(e.target.value);
                                                                if (isNaN(val)) {
                                                                    // If empty/invalid, reset to undefined to use global fallback
                                                                    resetFallbackFontOverrides(font.id);
                                                                } else {
                                                                    // Clamp value
                                                                    val = Math.max(25, Math.min(300, val));
                                                                    updateFallbackFontOverride(font.id, 'scale', val);
                                                                }
                                                            }}
                                                            onClick={e => e.stopPropagation()}
                                                            className="w-12 text-right font-mono bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                                                        />
                                                        <span className="font-mono">%</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="25"
                                                    max="300"
                                                    step="5"
                                                    value={effectiveSettings?.scale || fontScales.fallback}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        updateFallbackFontOverride(font.id, 'scale', val);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 block"
                                                />
                                            </div>

                                            {/* Line Height Slider */}
                                            <div>
                                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                    <span>Line Height</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="50"
                                                            max="400"
                                                            step="5"
                                                            value={font.lineHeight !== undefined && font.lineHeight !== '' ? Math.round(font.lineHeight * 100) : Math.round(lineHeight * 100)}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    updateFallbackFontOverride(font.id, 'lineHeight', '');
                                                                } else {
                                                                    const parsed = parseFloat(val);
                                                                    // Store as unitless/em for consistency, but allow intermediate states if needed?
                                                                    // Actually update immediately: 150 -> 1.5
                                                                    updateFallbackFontOverride(font.id, 'lineHeight', parsed / 100);
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                let val = parseFloat(e.target.value);
                                                                if (isNaN(val)) {
                                                                    updateFallbackFontOverride(font.id, 'lineHeight', undefined);
                                                                } else {
                                                                    val = Math.max(50, Math.min(400, val));
                                                                    updateFallbackFontOverride(font.id, 'lineHeight', val / 100);
                                                                }
                                                            }}
                                                            onClick={e => e.stopPropagation()}
                                                            className="w-12 text-right font-mono bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                                                        />
                                                        <span className="font-mono">%</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="4.0"
                                                    step="0.05"
                                                    value={font.lineHeight !== undefined && font.lineHeight !== '' ? font.lineHeight : lineHeight}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        updateFallbackFontOverride(font.id, 'lineHeight', val);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 block"
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Static System Fallback Tab */}
            <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200 border-dashed relative select-none">
                <div className="flex items-center gap-2 mb-1">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Final Fallback
                    </div>
                </div>

                <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                    <div className="relative w-3 h-3 flex-shrink-0 cursor-pointer group">
                        <div
                            className="absolute inset-0 rounded-full ring-1 ring-slate-200 group-hover:ring-indigo-300 transition-shadow"
                            style={{ backgroundColor: colors.missing }}
                        />
                        <input
                            type="color"
                            value={colors.missing}
                            onChange={(e) => setColors(prev => ({ ...prev, missing: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Change system fallback color"
                        />
                    </div>
                    System Default
                </div>
            </div>

            {/* Add Fallback Font Button */}
            <button
                onClick={() => setShowAdder(!showAdder)}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 border-dashed rounded-lg p-3 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 transition-transform duration-300 ${showAdder ? 'rotate-45' : 'rotate-0'}`}
                >
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                <span>{showAdder ? 'Cancel' : 'Add Fallback Font'}</span>
            </button>

            {/* Fallback Font Adder */}
            {showAdder && (
                <FallbackFontAdder
                    onClose={() => setShowAdder(false)}
                    onAdd={() => setShowAdder(false)}
                />
            )}
        </div>
    );
};

export default FontTabs;
