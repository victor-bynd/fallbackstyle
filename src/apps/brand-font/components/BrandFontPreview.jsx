
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import MetricGuidesOverlay from '../../../shared/components/MetricGuidesOverlay'; // Cross-component usage or move to Common?
// MetricGuidesOverlay was moved to MultiLanguage. If it is used here, we import it from there.
import { calculateNumericLineHeight } from '../../../shared/utils/fontUtils';

const BrandFontPreview = ({
    primaryFont,
    fallbackFont,
    overrides,
    showBrowserGuides,
    setShowBrowserGuides,
    showPrimaryGuides,
    setShowPrimaryGuides
}) => {
    const [text, setText] = useState("The quick brown fox jumps over the lazy dog");
    const [fontSize, setFontSize] = useState(42);
    const [showGuides, setShowGuides] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [tempText, setTempText] = useState(text);

    // Note: In a real environment, we'd need the @font-face to be active.
    // Since we can't easily inject dynamic @font-face here without a style tag,
    // we will simulate the visual effect or inject a style tag.
    // Injecting a style tag is better for accurate rendering.


    // We need to inject the @font-face into the document to see the overrides applied
    useEffect(() => {
        if (!primaryFont || !fallbackFont || !overrides) return;

        const styleId = 'brand-font-fallback-preview';
        let styleTag = document.getElementById(styleId);

        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        const pct = (n) => `${(n * 100).toFixed(4)}%`;

        const css = `
            @font-face {
                font-family: 'FallbackPreview-${fallbackFont.id}';
                src: ${fallbackFont.filename ? `url('/reference_fonts/${fallbackFont.filename}')` : `local('${fallbackFont.name}')`};
                size-adjust: ${pct(overrides.sizeAdjust)};
                ascent-override: ${pct(overrides.ascentOverride)};
                descent-override: ${pct(overrides.descentOverride)};
                line-gap-override: ${pct(overrides.lineGapOverride)};
            }
            
            @font-face {
                font-family: 'PrimaryPreview';
                src: url('${primaryFont.url}');
            }
        `;

        styleTag.textContent = css;

        return () => {
            // Cleanup? Maybe keep it for smooth transitions, but safer to remove if component unmounts
            // styleTag.remove(); 
        };
    }, [primaryFont, fallbackFont, overrides]);

    const LINE_HEIGHT = 1.5;
    const numericLineHeight = calculateNumericLineHeight(LINE_HEIGHT, primaryFont?.font);

    const openEditModal = () => {
        setTempText(text);
        setIsEditModalOpen(true);
    };

    const saveText = () => {
        setText(tempText);
        setIsEditModalOpen(false);
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-4 bg-gray-50 border-b border-gray-200 gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Preview</span>
                    <button
                        onClick={openEditModal}
                        className="px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white border border-gray-300 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                        Edit Text
                    </button>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Size</label>
                        <input
                            type="range"
                            min="12"
                            max="128"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-24 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-500 w-8 tabular-nums">{fontSize}px</span>
                    </div>

                    <div className="h-6 w-px bg-gray-300"></div>



                    <button
                        onClick={() => setShowGuides(!showGuides)}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border",
                            showGuides
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        Grid
                    </button>
                    <button
                        onClick={() => setShowPrimaryGuides(!showPrimaryGuides)}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border",
                            showPrimaryGuides
                                ? "bg-rose-50 border-rose-200 text-rose-600 ring-1 ring-rose-500/10 shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        BRAND LINEBOX
                    </button>
                    <button
                        onClick={() => setShowBrowserGuides(!showBrowserGuides)}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border",
                            showBrowserGuides
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        FALLBACK LINEBOX
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div className="relative p-8 overflow-hidden flex flex-col justify-center bg-white">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                ></div>

                <div className="grid grid-cols-1 grid-rows-1 items-baseline w-full" style={{ fontSize: `${fontSize}px`, lineHeight: LINE_HEIGHT }}>
                    <div className="col-start-1 row-start-1 relative text-red-500/40 mix-blend-multiply pointer-events-none whitespace-normal break-words z-10" style={{ fontFamily: 'PrimaryPreview' }}>
                        {showPrimaryGuides ? (
                            text.split('').map((char, i) => (
                                <span key={i} style={{
                                    outline: '1px solid rgba(239, 68, 68, 0.5)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '2px'
                                }}>{char}</span>
                            ))
                        ) : (
                            text
                        )}
                        <MetricGuidesOverlay
                            fontObject={primaryFont?.font}
                            fontSizePx={fontSize}
                            lineHeight={numericLineHeight}
                            showAlignmentGuides={showGuides}
                            showBrowserGuides={showBrowserGuides}
                            fullWidth={true}
                        />
                    </div>
                    <div className="col-start-1 row-start-1 text-blue-500/60 mix-blend-multiply whitespace-normal break-words z-0" style={{ fontFamily: `FallbackPreview-${fallbackFont.id}` }}>
                        {showBrowserGuides ? (
                            text.split('').map((char, i) => (
                                <span key={i} style={{
                                    outline: '1px solid rgba(59, 130, 246, 0.5)',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '2px'
                                }}>{char}</span>
                            ))
                        ) : (
                            text
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Text Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                Edit Preview Text
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={tempText}
                                onChange={(e) => setTempText(e.target.value)}
                                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                                placeholder="Type your preview text here..."
                                autoFocus
                            />
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveText}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Save Text
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandFontPreview;
