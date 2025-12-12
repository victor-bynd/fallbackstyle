import { useState } from 'react';
import { useTypo } from '../context/TypoContext';
import FallbackFontAdder from './FallbackFontAdder';

const FontTabs = () => {
    const { fonts, activeFont, setActiveFont, removeFallbackFont, reorderFonts } = useTypo();
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
        const font = fonts[index];
        // Only allow dragging fallback fonts
        if (font.type === 'fallback') {
            setDraggedIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', index);
            // Make the dragged element semi-transparent
            e.currentTarget.style.opacity = '0.5';
        } else {
            e.preventDefault();
        }
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const font = fonts[index];
        // Only allow dropping on fallback fonts (not primary)
        if (font.type === 'fallback' && draggedIndex !== null && draggedIndex !== index) {
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

        const draggedFont = fonts[draggedIndex];
        const dropFont = fonts[dropIndex];
        
        // Only allow reordering fallback fonts
        if (draggedFont.type === 'fallback' && dropFont.type === 'fallback') {
            reorderFonts(draggedIndex, dropIndex);
        }
        
        setDraggedIndex(null);
    };

    return (
        <div className="pb-6 space-y-3">
            {fonts.map((font, index) => {
                const isActive = font.id === activeFont;
                const isPrimary = font.type === 'primary';
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isDraggable = !isPrimary;

                return (
                    <div
                        key={font.id}
                        draggable={isDraggable}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`
                            bg-slate-50 rounded-lg p-4 border transition-all relative
                            ${isPrimary ? 'cursor-pointer' : 'cursor-move'}
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
                        <div className={`flex items-center gap-2 mb-1 ${!isPrimary ? '-ml-[3px]' : ''}`}>
                            {!isPrimary && (
                                <div className="text-slate-400 cursor-move flex-shrink-0" title="Drag to reorder">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M7 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z" />
                                    </svg>
                                </div>
                            )}
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                {font.type === 'primary' ? 'Primary Font' : 'Fallback Font'}
                            </div>
                        </div>
                        <div className={`font-mono text-sm break-all text-slate-700 font-medium pr-6 ${!isPrimary ? '' : ''}`}>
                            {font.fileName || font.name || 'No font uploaded'}
                        </div>
                        {font.fontObject && (
                            <div className={`text-xs text-slate-400 mt-2 flex items-center gap-1 ${!isPrimary ? '' : ''}`}>
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                {font.fontObject.numGlyphs} glyphs
                            </div>
                        )}
                        {!font.fontObject && font.name && (
                            <div className={`text-xs text-slate-400 mt-2 flex items-center gap-1 ${!isPrimary ? '' : ''}`}>
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                System/Web Font
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add Fallback Font Button */}
            <button
                onClick={() => setShowAdder(!showAdder)}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 border-dashed rounded-lg p-3 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
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
