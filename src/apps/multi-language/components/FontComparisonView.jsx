import React, { useMemo, useState, useEffect } from 'react';
import FontSwapModal from './FontSwapModal';
import { useTypo } from '../../../shared/context/useTypo';
// Unused import removed
import { useTextRenderer } from '../../../shared/hooks/useTextRenderer';
import { useFontStack } from '../../../shared/hooks/useFontStack';
import { calculateNumericLineHeight } from '../../../shared/utils/fontUtils';
import MetricGuidesOverlay from '../../../shared/components/MetricGuidesOverlay';

const FontComparisonView = ({ fontIds, onClose, onSwapFont }) => {
    const {
        fonts,
        supportedLanguages, // Contains sample sentences
        activeStyle, // Access global style configuration
        showAlignmentGuides,
        toggleAlignmentGuides,
        getEffectiveFontSettingsForStyle,
        activeFontStyleId
    } = useTypo();

    // Unused hook removedd

    const { renderText } = useTextRenderer();
    const { buildFallbackFontStackForStyle } = useFontStack();

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

    // Overlay Mode State
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [fontLayerSettings, setFontLayerSettings] = useState({});

    // Initialize font layer settings when fonts change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFontLayerSettings(prev => {
            const newSettings = { ...prev };
            // Colors for layers - cycling through a palette
            const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']; // Black, Red, Blue, Green, Yellow, Purple

            let hasChanges = false;
            fontIds.forEach((id, index) => {
                if (!newSettings[id]) {
                    newSettings[id] = {
                        color: colors[index % colors.length],
                        opacity: 100,
                        visible: true
                    };
                    hasChanges = true;
                }
            });

            return hasChanges ? newSettings : prev;
        });
    }, [fontIds]);

    const selectedFonts = useMemo(() => {
        return fontIds.map(id => fonts.find(f => f.id === id)).filter(Boolean);
    }, [fontIds, fonts]);

    // Generate @font-face rules
    const comparisonFontFaceStyles = useMemo(() => {
        return selectedFonts.map(font => {
            if (!font.fontUrl) return '';
            const settings = getEffectiveFontSettingsForStyle(activeFontStyleId || 'primary', font.id);

            const ascent = (settings?.ascentOverride !== undefined && settings.ascentOverride !== '')
                ? `ascent-override: ${settings.ascentOverride * 100}%;`
                : '';
            const descent = (settings?.descentOverride !== undefined && settings.descentOverride !== '')
                ? `descent-override: ${settings.descentOverride * 100}%;`
                : '';
            const lineGap = (settings?.lineGapOverride !== undefined && settings.lineGapOverride !== '')
                ? `line-gap-override: ${settings.lineGapOverride * 100}%;`
                : '';

            return `
        @font-face {
          font-family: 'CompareFont-${font.id}';
          src: url('${font.fontUrl}');
          ${ascent}
          ${descent}
          ${lineGap}
        }
      `;
        }).join('\n');
    }, [selectedFonts, getEffectiveFontSettingsForStyle, activeFontStyleId]);

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



    // Calculate exact pixel line height for consistent grid
    // lineHeightPx unused


    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in fade-in duration-200">
            <style>{comparisonFontFaceStyles}</style>

            {/* Toolbar Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-[10px] uppercase tracking-wider"
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
                        <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{comparisonFontSize}px</span>
                    </div>

                    <div className="relative border-r border-gray-200 pr-2 mr-2">
                        <select
                            value={selectedLanguageId}
                            onChange={(e) => setSelectedLanguageId(e.target.value)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer border-none appearance-none transition-colors w-64"
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
                            px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border
                            ${showAlignmentGuides
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                                : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:bg-slate-50'
                            }
                        `}
                    >
                        Type Grid
                    </button>
                    {/* View Modes Group */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 ml-2">
                        <button
                            onClick={() => setIsOverlayMode(false)}
                            className={`
                                px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                                ${!isOverlayMode
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }
                            `}
                        >
                            Grid View
                        </button>
                        <button
                            onClick={() => setIsOverlayMode(true)}
                            className={`
                                px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                                ${isOverlayMode
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }
                            `}
                        >
                            Overlay
                        </button>
                    </div>

                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-visible bg-slate-50/50 relative pt-20 pb-8 px-8 flex flex-col h-full">

                {!isOverlayMode ? (
                    /* GRID VIEW */
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

                            const settings = getEffectiveFontSettingsForStyle(activeFontStyleId || 'primary', font.id);

                            // If the global setting is normal, or if we have specific overrides, we want the CSS to potentially be 'normal'
                            // so the browser respects the overrides.
                            const hasOverrides = settings && (
                                (settings.lineGapOverride !== undefined && settings.lineGapOverride !== '') ||
                                (settings.ascentOverride !== undefined && settings.ascentOverride !== '') ||
                                (settings.descentOverride !== undefined && settings.descentOverride !== '')
                            );

                            const cssLineHeight = (activeStyle?.lineHeight === 'normal' || hasOverrides)
                                ? 'normal'
                                : (typeof activeStyle?.lineHeight === 'number' ? activeStyle.lineHeight : 1.2);

                            // Calculate numeric line height for the grid (must match what CSS renders)
                            const localNumericLineHeight = calculateNumericLineHeight(
                                cssLineHeight,
                                font.fontObject,
                                settings
                            );


                            const fontNameDisplay = font.fileName?.replace(/\.[^/.]+$/, '') || font.name || 'Unnamed Font';
                            const generatedFamily = font.fontUrl ? `CompareFont-${font.id}` : (font.name || 'sans-serif');

                            // Determine if this font is the active baseline reference
                            const isBaselineReference = index === baselineSourceIndex;
                            const shouldRenderGrid = (baselineSourceIndex === null && index === 0) || isBaselineReference;


                            const fallbackStack = buildFallbackFontStackForStyle(activeFontStyleId || 'primary', selectedLanguageId);
                            const fallbackStackString = fallbackStack.length > 0
                                ? fallbackStack.map(f => f.fontFamily).join(', ')
                                : 'sans-serif';

                            // Force black color for comparison view as requested
                            const fontColor = '#000000';

                            return (
                                <div key={`${font.id}-${index}`} className="relative group min-w-0 flex flex-col h-full">

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

                                    {/* Main Card Box */}
                                    <div className="border border-slate-200 rounded-lg p-4 flex-1 overflow-visible relative">
                                        {/* Font Context Wrapper */}
                                        <div style={{
                                            fontSize: `${baseFontSize}px`,
                                            lineHeight: cssLineHeight,
                                            fontFamily: `"${generatedFamily}", ${fallbackStackString}`,
                                            position: 'relative'
                                        }}>
                                            {/* Text Content */}
                                            <div className="relative z-20 whitespace-pre-wrap break-words">
                                                {renderText({
                                                    content: sampleText,
                                                    languageId: selectedLanguageId,
                                                    styleId: activeFontStyleId || 'primary',
                                                    primaryFont: font,
                                                    fontSize: baseFontSize,
                                                    lineHeight: cssLineHeight,
                                                    color: fontColor
                                                })}
                                            </div>

                                            {/* Grid attached to reference font */}
                                            {shouldRenderGrid && (() => {
                                                // For calculation, we use the reference font's metrics if we are the reference.
                                                // Wait, if we are the reference, we use OUR metrics.
                                                // The variable `referenceFont` defined outside is correct.
                                                // BUT `localNumericLineHeight` above is for THIS font.
                                                // If we are drawing the grid, we want to draw it based on THIS font's metrics (since we are the reference).
                                                // So passing `fontObject` (which is `font.fontObject`) and `localNumericLineHeight` is correct.

                                                return (
                                                    <MetricGuidesOverlay
                                                        fontObject={font.fontObject}
                                                        fontSizePx={baseFontSize}
                                                        lineHeight={localNumericLineHeight}
                                                        showAlignmentGuides={showAlignmentGuides}
                                                        showBrowserGuides={false}
                                                        fullWidth={true}
                                                        topOffset={0}
                                                        ascentOverride={settings?.ascentOverride}
                                                        descentOverride={settings?.descentOverride}
                                                        lineGapOverride={settings?.lineGapOverride}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* OVERLAY VIEW */
                    <div className="flex flex-row h-full gap-8">
                        {/* Canvas Area - Just the scrollable container */}
                        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 p-8 overflow-auto relative">

                            {/* Layers Container */}
                            <div className="relative z-10 w-full">
                                {/*  Reference Grid (only if reference is set) - Rendered BEHIND text */}
                                {(() => {
                                    if (baselineSourceIndex === null) return null;
                                    const refFont = fonts.find(f => f.id === fontIds[baselineSourceIndex]);
                                    if (!refFont || !refFont.fontObject) return null;

                                    const settings = getEffectiveFontSettingsForStyle(activeFontStyleId || 'primary', refFont.id);
                                    const hasOverrides = settings && (
                                        (settings.lineGapOverride !== undefined && settings.lineGapOverride !== '') ||
                                        (settings.ascentOverride !== undefined && settings.ascentOverride !== '') ||
                                        (settings.descentOverride !== undefined && settings.descentOverride !== '')
                                    );
                                    const cssLineHeight = (activeStyle?.lineHeight === 'normal' || hasOverrides)
                                        ? 'normal'
                                        : (typeof activeStyle?.lineHeight === 'number' ? activeStyle.lineHeight : 1.2);

                                    const localNumericLineHeight = calculateNumericLineHeight(
                                        cssLineHeight,
                                        refFont.fontObject,
                                        settings
                                    );

                                    return (
                                        <MetricGuidesOverlay
                                            fontObject={refFont.fontObject}
                                            fontSizePx={baseFontSize}
                                            lineHeight={localNumericLineHeight}
                                            showAlignmentGuides={showAlignmentGuides}
                                            showBrowserGuides={false}
                                            fullWidth={true}
                                            // No top offset needed because we are now inside the padded container at the correct structure level
                                            topOffset={0}
                                            ascentOverride={settings?.ascentOverride}
                                            descentOverride={settings?.descentOverride}
                                            lineGapOverride={settings?.lineGapOverride}
                                        />
                                    )
                                })()}

                                {/* Font Layers */}
                                {fontIds.map((fontId, index) => {
                                    const font = fonts.find(f => f.id === fontId);
                                    if (!font) return null;

                                    const layerSettings = fontLayerSettings[fontId] || { color: '#000000', opacity: 100, visible: true };
                                    if (!layerSettings.visible) return null;

                                    const settings = getEffectiveFontSettingsForStyle(activeFontStyleId || 'primary', font.id);
                                    const hasOverrides = settings && (
                                        (settings.lineGapOverride !== undefined && settings.lineGapOverride !== '') ||
                                        (settings.ascentOverride !== undefined && settings.ascentOverride !== '') ||
                                        (settings.descentOverride !== undefined && settings.descentOverride !== '')
                                    );
                                    const cssLineHeight = (activeStyle?.lineHeight === 'normal' || hasOverrides)
                                        ? 'normal'
                                        : (typeof activeStyle?.lineHeight === 'number' ? activeStyle.lineHeight : 1.2);

                                    const generatedFamily = font.fontUrl ? `CompareFont-${font.id}` : (font.name || 'sans-serif');
                                    const fallbackStack = buildFallbackFontStackForStyle(activeFontStyleId || 'primary', selectedLanguageId);
                                    const fallbackStackString = fallbackStack.length > 0
                                        ? fallbackStack.map(f => f.fontFamily).join(', ')
                                        : 'sans-serif';

                                    const isReferenceLayer = index === baselineSourceIndex;

                                    return (
                                        <div
                                            key={`overlay-${font.id}`}
                                            style={{
                                                fontSize: `${baseFontSize}px`,
                                                lineHeight: cssLineHeight,
                                                fontFamily: `"${generatedFamily}", ${fallbackStackString}`,
                                                color: layerSettings.color,
                                                opacity: layerSettings.opacity / 100,

                                                // Key Change: Reference layer is relative (in flow), others are absolute (on top)
                                                position: isReferenceLayer ? 'relative' : 'absolute',
                                                top: isReferenceLayer ? 'auto' : 0,
                                                left: isReferenceLayer ? 'auto' : 0,
                                                width: isReferenceLayer ? 'auto' : '100%',

                                                mixBlendMode: 'multiply'
                                            }}
                                            className="whitespace-pre-wrap break-words"
                                        >
                                            {sampleText}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Controls Sidebar */}
                        <div className="w-80 flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Layers</h3>
                            {fontIds.map((fontId, index) => {
                                const font = fonts.find(f => f.id === fontId);
                                if (!font) return null;
                                const isRef = index === baselineSourceIndex;
                                const settings = fontLayerSettings[fontId] || { color: '#000000', opacity: 100, visible: true };

                                return (
                                    <div key={`control-${fontId}`} className="p-3 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.visible}
                                                    onChange={(e) => setFontLayerSettings(prev => ({
                                                        ...prev,
                                                        [fontId]: { ...prev[fontId], visible: e.target.checked }
                                                    }))}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="font-semibold text-sm truncate" title={font.name}>{font.name || 'Unnamed'}</span>
                                            </div>
                                            {font.fontObject && (
                                                <button
                                                    onClick={() => setBaselineSourceIndex(index)}
                                                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${isRef
                                                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {isRef ? 'Ref' : 'Set Ref'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Color</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={settings.color}
                                                    onChange={(e) => setFontLayerSettings(prev => ({
                                                        ...prev,
                                                        [fontId]: { ...prev[fontId], color: e.target.value }
                                                    }))}
                                                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                                                />
                                                <span className="text-[10px] text-slate-500 font-mono">{settings.color}</span>
                                            </div>

                                            <span className="text-[10px] uppercase font-bold text-slate-400">Opacity</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={settings.opacity}
                                                    onChange={(e) => setFontLayerSettings(prev => ({
                                                        ...prev,
                                                        [fontId]: { ...prev[fontId], opacity: Number(e.target.value) }
                                                    }))}
                                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                                <span className="text-[10px] text-slate-500 w-6 text-right">{settings.opacity}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
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
