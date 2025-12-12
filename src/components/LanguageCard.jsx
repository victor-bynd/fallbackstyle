import { useMemo, useState } from 'react';
import { useTypo } from '../context/TypoContext';

const LanguageCard = ({ language }) => {
    const {
        fontObject,
        fallbackFont,
        fonts,
        colors,
        fontSizes,
        lineHeight,
        baseFontSize,
        fontScales,
        lineHeightOverrides,
        updateLineHeightOverride,
        fallbackScaleOverrides,
        updateFallbackScaleOverride,
        fallbackFontOverrides,
        setFallbackFontOverride,
        clearFallbackFontOverride,
        getFallbackFontForLanguage,
        textCase,
        fallbackOptions,
        viewMode,
        headerScales,
        textOverrides,
        setTextOverride,
        resetTextOverride,
        getEffectiveFontSettings
    } = useTypo();

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    if (!fontSizes || !headerScales) return null;

    const fallbackLabel = fallbackOptions.find(opt => opt.value === fallbackFont)?.label || fallbackFont;

    // Build fallback font stack from fonts array with their settings
    // If language has override, use only that font; otherwise use cascade
    const buildFallbackFontStack = () => {
        const overrideFontId = getFallbackFontForLanguage(language.id);
        
        // If language has override, use only that font
        if (overrideFontId) {
            if (overrideFontId === 'legacy') {
                // Legacy fallback font
                return [{
                    fontFamily: fallbackFont || 'sans-serif',
                    fontId: 'legacy',
                    settings: { baseFontSize, scale: fontScales.fallback, lineHeight }
                }];
            } else {
                // Find the override font in fonts array
                const overrideFont = fonts.find(f => f.id === overrideFontId);
                if (overrideFont) {
                    if (overrideFont.fontUrl) {
                        return [{
                            fontFamily: `'FallbackFont-${overrideFont.id}'`,
                            fontId: overrideFont.id,
                            settings: getEffectiveFontSettings(overrideFont.id)
                        }];
                    } else if (overrideFont.name) {
                        return [{
                            fontFamily: overrideFont.name,
                            fontId: overrideFont.id,
                            settings: getEffectiveFontSettings(overrideFont.id)
                        }];
                    }
                }
            }
        }
        
        // No override - use cascade (original behavior)
        const fallbackFonts = fonts.filter(f => f.type === 'fallback');
        const fontStack = [];
        
        fallbackFonts.forEach(font => {
            if (font.fontUrl) {
                fontStack.push({
                    fontFamily: `'FallbackFont-${font.id}'`,
                    fontId: font.id,
                    settings: getEffectiveFontSettings(font.id)
                });
            } else if (font.name) {
                fontStack.push({
                    fontFamily: font.name,
                    fontId: font.id,
                    settings: getEffectiveFontSettings(font.id)
                });
            }
        });
        
        // Add the legacy fallback font at the end
        if (fallbackFont) {
            fontStack.push({
                fontFamily: fallbackFont,
                fontId: 'legacy',
                settings: { baseFontSize, scale: fontScales.fallback, lineHeight }
            });
        }
        
        return fontStack;
    };

    const fallbackFontStack = buildFallbackFontStack();
    const fallbackFontStackString = fallbackFontStack.length > 0 
        ? fallbackFontStack.map(f => f.fontFamily).join(', ') 
        : 'sans-serif';
    
    // Get current fallback font selection for this language
    const currentFallbackFontId = getFallbackFontForLanguage(language.id);

    // Determine the content to render: Override > Pangram
    const contentToRender = textOverrides[language.id] || language.pangram;

    // Handle entering edit mode
    const handleStartEdit = () => {
        setEditText(contentToRender);
        setIsEditing(true);
    };

    // Handle saving
    const handleSave = () => {
        if (editText.trim() === '' || editText === language.pangram) {
            resetTextOverride(language.id);
        } else {
            setTextOverride(language.id, editText);
        }
        setIsEditing(false);
    };

    // Handle cancel
    const handleCancel = () => {
        setIsEditing(false);
    };

    const renderedText = useMemo(() => {
        if (!fontObject) return null;

        // Get primary font effective settings
        const primarySettings = getEffectiveFontSettings('primary') || { baseFontSize, scale: fontScales.active, lineHeight };
        const primaryFontSize = primarySettings.baseFontSize * (primarySettings.scale / 100);

        // Use the dynamic content
        return contentToRender.split('').map((char, index) => {
            const glyphIndex = fontObject.charToGlyphIndex(char);
            const isMissing = glyphIndex === 0;

            if (isMissing && fallbackFontStack.length > 0) {
                // Use the first fallback font's settings
                const firstFallback = fallbackFontStack[0];
                const fallbackSettings = firstFallback.settings || { baseFontSize, scale: fontScales.fallback, lineHeight };
                const fallbackFontSize = fallbackSettings.baseFontSize * (fallbackSettings.scale / 100);
                
                // Apply language-specific fallback scale override
                const scaleMultiplier = (fallbackScaleOverrides[language.id] || 100) / 100;

                return (
                    <span
                        key={index}
                        style={{
                            fontFamily: fallbackFontStackString,
                            color: colors.missing,
                            fontSize: `${(fallbackFontSize / primaryFontSize) * scaleMultiplier}em`,
                        }}
                    >
                        {char}
                    </span>
                );
            }

            return <span key={index}>{char}</span>;
        });
    }, [fontObject, contentToRender, fallbackFontStack, fallbackFontStackString, colors, baseFontSize, fontScales, fallbackScaleOverrides, language.id, getEffectiveFontSettings, getFallbackFontForLanguage]);

    if (!fontObject) return null;

    // Stats based on current content
    const totalChars = contentToRender.replace(/\s/g, '').length;
    const missingChars = contentToRender.replace(/\s/g, '').split('').filter(char => fontObject.charToGlyphIndex(char) === 0).length;
    const supportedPercent = totalChars > 0 ? Math.round(((totalChars - missingChars) / totalChars) * 100) : 100;
    const isFullSupport = missingChars === 0;

    return (
        <div className="bg-white border border-gray-200/60 rounded-xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] transition-shadow duration-300">
            <div className="bg-slate-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm text-slate-800 tracking-tight">{language.name}</h3>

                    {/* Edit Toggle */}
                    <button
                        onClick={handleStartEdit}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit text"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                    </button>
                    {textOverrides[language.id] && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Custom</span>
                    )}
                </div>
                <div
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${isFullSupport
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}
                >
                    {supportedPercent}% Supported
                </div>
            </div>

            {/* Edit Mode Panel */}
            {isEditing && (
                <div className="p-4 bg-slate-50 border-b border-gray-100">
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none mb-3"
                        placeholder="Type something..."
                        dir={language.dir || 'ltr'}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setEditText(language.pangram);
                                setTextOverride(language.id, language.pangram); // Effectively reset but viewing default
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 mr-auto"
                        >
                            Reset to Default
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Fallback Font Selector */}
            <div className="px-5 py-2 bg-slate-50/30 border-b border-gray-100/50 flex flex-wrap items-center gap-x-[42px] gap-y-3 overflow-hidden group hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap min-w-[120px]">
                        Fallback Font:
                    </span>
                    <select
                        value={currentFallbackFontId || 'cascade'}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'cascade') {
                                clearFallbackFontOverride(language.id);
                            } else {
                                setFallbackFontOverride(language.id, value);
                            }
                        }}
                        className="text-[10px] bg-white border border-gray-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer min-w-[140px]"
                    >
                        <option value="cascade">Cascade (Default)</option>
                        {fonts.filter(f => f.type === 'fallback').map(font => (
                            <option key={font.id} value={font.id}>
                                {font.fileName || font.name || 'Unnamed Font'}
                            </option>
                        ))}
                        {fallbackFont && (
                            <option value="legacy">Legacy: {fallbackOptions.find(opt => opt.value === fallbackFont)?.label || fallbackFont}</option>
                        )}
                    </select>
                    {currentFallbackFontId && currentFallbackFontId !== 'cascade' && (
                        <button
                            onClick={() => clearFallbackFontOverride(language.id)}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold px-1"
                            title="Reset to cascade"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Local Line Height & Fallback Scale Override Sliders */}
            <div className="px-5 py-2 bg-slate-50/30 border-b border-gray-100/50 flex flex-wrap items-center gap-x-[42px] gap-y-3 overflow-hidden group hover:bg-slate-50/80 transition-colors">
                {/* Line Height Slider */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap min-w-[80px]">
                        Line Height: {lineHeightOverrides[language.id] || 'Global'}
                    </span>

                    <input
                        type="range"
                        min="0.8"
                        max="3.0"
                        step="0.1"
                        value={lineHeightOverrides[language.id] || lineHeight}
                        onChange={(e) => updateLineHeightOverride(language.id, parseFloat(e.target.value))}
                        className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"
                        title="Override line height for this language"
                    />

                    <div className="w-4 flex justify-end">
                        {lineHeightOverrides[language.id] !== undefined && (
                            <button
                                onClick={() => updateLineHeightOverride(language.id, undefined)}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-bold px-1"
                                title="Reset to global default"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Fallback Scale Slider */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap min-w-[100px]">
                        Fallback Scale: {fallbackScaleOverrides[language.id] ? `${fallbackScaleOverrides[language.id]}%` : 'Global'}
                    </span>

                    <input
                        type="range"
                        min="50"
                        max="200"
                        step="5"
                        value={fallbackScaleOverrides[language.id] || 100}
                        onChange={(e) => updateFallbackScaleOverride(language.id, parseFloat(e.target.value))}
                        className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"
                        title="Override fallback font scale for this language"
                    />

                    <div className="w-4 flex justify-end">
                        {fallbackScaleOverrides[language.id] !== undefined && (
                            <button
                                onClick={() => updateFallbackScaleOverride(language.id, undefined)}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-bold px-1"
                                title="Reset to global default"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Set Base Font Size on Container */}
            {(() => {
                const primarySettings = getEffectiveFontSettings('primary') || { baseFontSize, scale: fontScales.active, lineHeight };
                const primaryFontSize = primarySettings.baseFontSize * (primarySettings.scale / 100);
                return (
            <div className="p-4" style={{ fontSize: `${primaryFontSize}px` }}>
                {viewMode === 'all' && (
                    <div className="space-y-2">
                        {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag, i) => {
                            const scale = 2 - (i * 0.2); // Simple scale: 2em down to 1em
                            return (
                                <div key={tag}>
                                    <span className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">{tag}</span>
                                    <div
                                        dir={language.dir || 'ltr'}
                                        style={{
                                            fontFamily: 'UploadedFont',
                                            color: colors.primary,
                                            fontSize: `${headerScales[tag]}em`, // Use EM from context
                                            fontWeight: 700,
                                            lineHeight: lineHeightOverrides[language.id] || lineHeight,
                                            textTransform: textCase
                                        }}
                                    >
                                        {renderedText}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode.startsWith('h') && (
                    <div
                        dir={language.dir || 'ltr'}
                        style={{
                            fontFamily: 'UploadedFont',
                            color: colors.primary,
                            fontSize: `${headerScales[viewMode]}em`, // Use EM from context
                            fontWeight: 700,
                            lineHeight: lineHeightOverrides[language.id] || lineHeight,
                            textTransform: textCase
                        }}
                    >
                        {renderedText}
                    </div>
                )}
            </div>
                );
            })()}
        </div>
    );
};

export default LanguageCard;
