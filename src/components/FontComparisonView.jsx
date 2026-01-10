import React, { useMemo, useState } from 'react';
import FontSwapModal from './FontSwapModal';
import { useTypo } from '../context/useTypo';

const FontComparisonView = ({ fontIds, onClose, onSwapFont }) => {
    const {
        fonts,
        supportedLanguages, // Contains sample sentences
        activeStyle, // Access global style configuration
        showAlignmentGuides,
        toggleAlignmentGuides,
        showBrowserGuides,
        toggleBrowserGuides
    } = useTypo();

    // Language Selection State
    const [selectedLanguageId, setSelectedLanguageId] = useState('en');
    // Local Font Size State (Independent of global app state)
    const [comparisonFontSize, setComparisonFontSize] = useState(activeStyle?.baseFontSize || 60);
    // Align to Source Baseline State (Index of the font to use as baseline reference)
    const [baselineSourceIndex, setBaselineSourceIndex] = useState(() => {
        // Initialize to first valid non-system font
        const idx = fontIds.findIndex(id => {
            const f = fonts.find(fo => fo.id === id);
            return f && f.fontObject; // Only select if it has metrics
        });
        return idx !== -1 ? idx : null;
    });
    // Swap Modal State
    const [swappingFontIndex, setSwappingFontIndex] = useState(null);

    const selectedFonts = useMemo(() => {
        return fontIds.map(id => fonts.find(f => f.id === id)).filter(Boolean);
    }, [fontIds, fonts]);

    // Generate @font-face rules
    const comparisonFontFaceStyles = useMemo(() => {
        return selectedFonts.map(font => {
            if (!font.fontUrl) return '';
            return `
        @font-face {
          font-family: 'CompareFont-${font.id}';
          src: url('${font.fontUrl}');
        }
      `;
        }).join('\n');
    }, [selectedFonts]);

    // Sample Text Logic
    const sampleText = useMemo(() => {
        const lang = supportedLanguages?.find(l => l.id === selectedLanguageId)
            || supportedLanguages?.find(l => l.id === 'en' || l.id === 'en-US');

        if (lang?.sampleSentence) return lang.sampleSentence;
        return "The quick brown fox jumps over the lazy dog";
    }, [supportedLanguages, selectedLanguageId]);

    // Use Local Configuration for Comparison
    const baseFontSize = comparisonFontSize;

    // Resolve Line Height (handle 'normal' or 'auto' logic if needed, but usually it's a number or string)
    // If it's 'normal', we might want a numeric fallback or just let browser handle,
    // but for Grid alignment we need a number.
    // Let's interpret 'normal' as 1.2 for grid calculation purposes if we can't derive it.
    const rawLineHeight = activeStyle?.lineHeight;
    const lineHeightMultiplier = (rawLineHeight === 'normal' || !rawLineHeight) ? 1.2 : parseFloat(rawLineHeight);

    // Calculate exact pixel line height for consistent grid
    const lineHeightPx = baseFontSize * lineHeightMultiplier;

    // Grid Generation Helper
    const generateGridStyle = (font) => {
        if (!font?.fontObject || !showAlignmentGuides) return {};

        const { fontObject } = font;
        const upm = fontObject.unitsPerEm;
        const ascender = fontObject.ascender;
        const descender = fontObject.descender;

        // We need to calculate the Baseline Position relative to the Content Box Top.
        // With half-leading:
        const contentHeightUnits = ascender - descender;
        const totalHeightUnits = upm * lineHeightMultiplier;
        const halfLeadingUnits = (totalHeightUnits - contentHeightUnits) / 2;

        // Important: Ascender is usually positive, Descender negative.
        // Distance from Top of LineBox to Baseline:
        const baselineYUnits = halfLeadingUnits + ascender;

        // Grid Lines (Offsets from Top of Box)
        const xHeight = fontObject.tables?.os2?.sxHeight || 0;
        const capHeight = fontObject.tables?.os2?.sCapHeight || 0;

        const guideLines = [
            { y: baselineYUnits, color: 'rgba(0,0,0,0.6)', width: 1 }, // Baseline
            { y: baselineYUnits - xHeight, color: 'rgba(0,0,0,0.3)', width: 1 },
            { y: baselineYUnits - capHeight, color: 'rgba(0,0,0,0.3)', width: 1 },
            { y: baselineYUnits - ascender, color: 'rgba(0,0,0,0.1)', width: 1 },
            { y: baselineYUnits + Math.abs(descender), color: 'rgba(0,0,0,0.1)', width: 1 }
        ];

        // We draw ONE unit block based on TotalHeightUnits
        // SVG ViewBox Height = totalHeightUnits
        // Then we scale it via background-size to match lineHeightPx

        // Correction: SVG needs to be scalable.
        // Actually, easiest is to use pixels inside SVG if we know them?
        // Or keep units and rely on viewbox.
        // Let's use Units.

        // Stroke width needs to be visible.
        // If 1px at 60px font size...
        // scale = upm / 60.
        // stroke = 1 * scale.
        const scale = upm / baseFontSize;
        const strokeWidth = 1 * scale;
        const dashArray = `${4 * scale} ${4 * scale}`;

        const paths = guideLines.map(line =>
            `<line x1="0" y1="${line.y}" x2="100%" y2="${line.y}" stroke="${line.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" />`
        ).join('');

        const svgString = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='${totalHeightUnits}' viewBox='0 0 100 ${totalHeightUnits}' preserveAspectRatio='none'>${paths}</svg>`;
        const base64Svg = btoa(svgString);

        return {
            backgroundImage: `url("data:image/svg+xml;base64,${base64Svg}")`,
            backgroundSize: `auto ${lineHeightPx}px`, // Fixed pixel height
            backgroundRepeat: 'repeat',
            backgroundPosition: '0 0',
            // Positioning for the "Underlay"
            position: 'absolute',
            top: 'calc(1rem + 1px)', // Offset for p-4 (1rem) + border (1px) inside the cards
            // Span very wide to cover the entire container.
            // The container (grid) has padding-top/bottom but inside the flex-1 container with px-8 (2rem).
            // We want to stretch left/right 2rem to cover that padding "visually" if needed, or just 100% of the grid width.
            // Actually, the user wants it to stretch across the ENTIRE viewport width.
            // But the grid is constrained by px-8. So we need negative margins or left/right: -2rem.
            left: '-2rem',
            right: '-2rem',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
        };
    };

    const referenceFont = baselineSourceIndex !== null ? fonts.find(f => f.id === fontIds[baselineSourceIndex]) : fonts.find(f => f.id === fontIds[0]);
    // Fallback to first font if no baseline selected or font not found, just for grid rendering default.
    const gridStyle = useMemo(() => generateGridStyle(referenceFont || fonts.find(f => f.id === fontIds[0])), [referenceFont, fontIds, fonts, showAlignmentGuides, lineHeightMultiplier, baseFontSize]);


    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in fade-in duration-200">
            <style>{comparisonFontFaceStyles}</style>

            {/* Toolbar Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-2" />
                    <h2 className="text-lg font-bold text-slate-800">
                        Comparing <span className="text-indigo-600">{selectedFonts.length}</span> Fonts
                    </h2>
                </div>

                <div className="flex items-center gap-2">

                    {/* Font Size Slider */}
                    <div className="flex items-center gap-2 mr-2 border-r border-gray-200 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Size</span>
                        <input
                            type="range"
                            min="12"
                            max="120"
                            value={comparisonFontSize}
                            onChange={(e) => setComparisonFontSize(Number(e.target.value))}
                            className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-xs font-bold text-slate-600 w-8 text-right">{comparisonFontSize}px</span>
                    </div>

                    {/* Language Selector */}
                    <div className="relative border-r border-gray-200 pr-2 mr-2">
                        <select
                            value={selectedLanguageId}
                            onChange={(e) => setSelectedLanguageId(e.target.value)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer border-none appearance-none transition-colors w-32"
                            style={{
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.7rem top 50%',
                                backgroundSize: '0.65rem auto'
                            }}
                        >
                            {supportedLanguages?.map(lang => (
                                <option key={lang.id} value={lang.id}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>



                    <button
                        onClick={() => toggleAlignmentGuides()}
                        className={`
                            px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border
                            ${showAlignmentGuides
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                                : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:bg-slate-50'
                            }
                        `}
                    >
                        Type Grid
                    </button>
                    <button
                        onClick={() => toggleBrowserGuides()}
                        className={`
                             px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border
                            ${showBrowserGuides
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                                : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:bg-slate-50'
                            }
                        `}
                    >
                        Linebox View
                    </button>

                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 relative pt-20 pb-8 px-8">

                {/* CSS Grid for Layout */}
                {/* items-baseline is CRITICAL: It ensures the first line of text aligns across columns */}
                <div
                    className="grid gap-8 relative z-10 w-full"
                    style={{
                        gridTemplateColumns: `repeat(${fontIds.length}, minmax(0, 1fr))`,
                        alignItems: 'start'
                    }}
                >
                    {fontIds.map((fontId, index) => {
                        const font = fonts.find(f => f.id === fontId);
                        if (!font) return null;

                        const fontNameDisplay = font.fileName?.replace(/\.[^/.]+$/, '') || font.name || 'Unnamed Font';
                        const generatedFamily = font.fontUrl ? `CompareFont-${font.id}` : (font.name || 'sans-serif');

                        // Determine if this font is the active baseline reference
                        const isBaselineReference = index === baselineSourceIndex;
                        // Fallback: If no baseline selected, use the first one as reference effectively for grid calculation? 
                        // Actually, if baselineSourceIndex is null, we align 'start', so no vertical shifting happens.
                        // But if we want to show grid, it should probably attach to *something*.
                        // If align is 'start', all tops are equal. We can attach to the first valid font.
                        // But let's stick to: If isBaselineReference is true, we attach grid.
                        // If baselineSourceIndex is null, we can attach to index 0.
                        const shouldRenderGrid = (baselineSourceIndex === null && index === 0) || isBaselineReference;


                        // Inline Box Style
                        const inlineBoxStyle = showBrowserGuides ? {
                            outline: '1px solid rgba(59, 130, 246, 0.5)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '2px'
                        } : {};

                        const fontColor = '#0f172a';

                        return (
                            <div key={`${font.id}-${index}`} className="relative group min-w-0">

                                {/* Grid attached to reference font */}
                                {shouldRenderGrid && showAlignmentGuides && (
                                    <div
                                        style={{
                                            ...gridStyle,
                                            // Override positioning to break out of the container but move WITH it vertically
                                            position: 'absolute',
                                            top: 'calc(1rem + 1px)', // align with text inside padding
                                            left: '-500vw',
                                            width: '1000vw',
                                            height: '100%',
                                            zIndex: 0,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                )}

                                {/* Label - Absolute positioning to avoid affecting baseline flow */}
                                <div className="absolute -top-7 left-0 right-0 gap-2 px-0 flex items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate" title={fontNameDisplay}>
                                        {fontNameDisplay}
                                    </span>


                                    {font.fontObject ? (
                                        <button
                                            onClick={() => setBaselineSourceIndex(index)}
                                            className={`
                                                px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap transition-all border
                                                ${isBaselineReference
                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                                    : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'
                                                }
                                            `}
                                            title={isBaselineReference ? "Current Reference" : "Set as Reference Font"}
                                        >
                                            {isBaselineReference ? 'Reference' : 'Set Reference'}
                                        </button>
                                    ) : (
                                        <div className="cursor-help" title="System fonts do not provide the metrics required for baseline alignment.">
                                            <button
                                                disabled
                                                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap border bg-slate-50 text-slate-300 border-transparent cursor-not-allowed"
                                            >
                                                Set Reference
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setSwappingFontIndex(index)}
                                        className="text-slate-300 hover:text-indigo-600 transition-colors ml-auto p-1"
                                        title="Swap Font"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>

                                {/* Text Container */}
                                <div
                                    className="relative leading-none whitespace-pre-wrap break-words z-10 border border-slate-200 rounded-lg p-4 h-full"
                                    style={{
                                        fontSize: `${baseFontSize}px`,
                                        lineHeight: lineHeightMultiplier, // Use global line height
                                        fontFamily: `"${generatedFamily}", sans-serif`,
                                    }}
                                >
                                    {sampleText.split('').map((char, i) => (
                                        <span
                                            key={i}
                                            style={{
                                                color: fontColor,
                                                ...inlineBoxStyle
                                            }}
                                        >
                                            {char}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
            {/* Swap Modal */}
            <FontSwapModal
                isOpen={swappingFontIndex !== null}
                onClose={() => setSwappingFontIndex(null)}
                onSelect={(fontId) => {
                    if (swappingFontIndex !== null && onSwapFont) {
                        onSwapFont(swappingFontIndex, fontId);
                    }
                    setSwappingFontIndex(null);
                }}
            />
        </div>
    );
};

export default FontComparisonView;
