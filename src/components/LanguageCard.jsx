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
        fallbackScaleOverrides,
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
        getEffectiveFontSettings,
        getFontColor,
        headerStyles
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
                            fontObject: overrideFont.fontObject,
                            settings: getEffectiveFontSettings(overrideFont.id)
                        }];
                    } else if (overrideFont.name) {
                        return [{
                            fontFamily: overrideFont.name,
                            fontId: overrideFont.id,
                            fontObject: overrideFont.fontObject,
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
                    fontObject: font.fontObject,
                    settings: getEffectiveFontSettings(font.id)
                });
            } else if (font.name) {
                fontStack.push({
                    fontFamily: font.name,
                    fontId: font.id,
                    fontObject: font.fontObject,
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
        const primaryFont = fonts.find(f => f.type === 'primary');
        // Fallback to 'primary' ID if not found (though should be found)
        const primarySettings = getEffectiveFontSettings(primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight };
        const primaryFontSize = primarySettings.baseFontSize * (primarySettings.scale / 100);

        // Use the dynamic content
        return contentToRender.split('').map((char, index) => {
            const glyphIndex = fontObject.charToGlyphIndex(char);
            const isMissing = glyphIndex === 0;

            if (isMissing && fallbackFontStack.length > 0) {
                // Find the first fallback font that supports this character
                let usedFallback = null;

                for (const fallback of fallbackFontStack) {
                    // If we have the font object, we can check if it supports the char
                    if (fallback.fontObject) {
                        try {
                            const fallbackGlyphIndex = fallback.fontObject.charToGlyphIndex(char);
                            if (fallbackGlyphIndex !== 0) {
                                usedFallback = fallback;
                                break;
                            }
                        } catch (e) {
                            // Ignore errors, continue to next
                        }
                    } else {
                        // If we encounter a font without a fontObject (e.g., System font),
                        // we MUST assume the browser will use it here (since previous fonts missed).
                        // We cannot verify it, but we also shouldn't attribute it to an earlier font.
                        // This fixes the "false positive color" issue.
                        usedFallback = fallback;
                        break;
                    }
                }

                // If we still haven't found a winner, it means all uploaded fonts missed, 
                // and there were no system fonts in the stack? Or something else.
                // Default to the last one or the first one? 
                // Using fallbackFontStack[0] caused the bug.
                // Let's use the last one (safest fallback assumption) or just null logic.
                if (!usedFallback) {
                    usedFallback = fallbackFontStack[fallbackFontStack.length - 1];
                }

                const fallbackSettings = usedFallback.settings || { baseFontSize, scale: fontScales.fallback, lineHeight };
                const fallbackFontSize = fallbackSettings.baseFontSize * (fallbackSettings.scale / 100);

                // Find index of this font in the global fonts array to get its color
                // If legacy/system, it might not be in the array in the same way, but 
                // usedFallback.fontId should match.
                const fontIndex = fonts.findIndex(f => f.id === usedFallback.fontId);
                const fontColor = fontIndex >= 0 ? getFontColor(fontIndex) : colors.missing;

                // Apply language-specific fallback scale override
                const scaleMultiplier = (fallbackScaleOverrides[language.id] || 100) / 100;

                return (
                    <span
                        key={index}
                        style={{
                            fontFamily: fallbackFontStackString,
                            color: fontColor,
                            fontSize: `${(fallbackFontSize / primaryFontSize) * scaleMultiplier}em`,
                            lineHeight: fallbackSettings.lineHeight,
                        }}
                    >
                        {char}
                    </span>
                );
            }

            return <span key={index} style={{ color: getFontColor(0) }}>{char}</span>;
        });
    }, [fontObject, contentToRender, fallbackFontStack, fallbackFontStackString, colors, baseFontSize, fontScales, fallbackScaleOverrides, language.id, getEffectiveFontSettings, getFallbackFontForLanguage, getFontColor, fonts]);

    if (!fontObject) return null;

    // Stats based on current content
    // Stats based on current content
    const totalChars = contentToRender.replace(/\s/g, '').length;
    const missingChars = contentToRender.replace(/\s/g, '').split('').filter(char => {
        // 1. Check primary font
        if (fontObject.charToGlyphIndex(char) !== 0) return false;

        // 2. Check fallback stack
        // If we have fallback fonts with fontObjects, we can check if they support it.
        // If a fallback font has no fontObject (e.g. system font), we can't be sure, 
        // but for "stress testing" we probably shouldn't count it as "supported" unless verified.
        // However, if the user explicitly selected a system font, they might expect it to work.
        // But since we can't verify 'sans-serif' support via opentype.js, we'll assume NO support 
        // for metrics purposes to encourage uploading a real font, OR we just accept we can't measure it.
        // Given the prompt "show actual support for the selected font", verified support is safer.

        for (const fallback of fallbackFontStack) {
            if (fallback.fontObject) {
                if (fallback.fontObject.charToGlyphIndex(char) !== 0) return false;
            }
            // If fallback has no fontObject, we skip it. It assumes "not supported by verifiable fonts".
        }

        return true; // Still missing from known fonts
    }).length;

    // We only show "Unknown Support" if we are using a System font as the primary fallback strategy,
    // meaning we have NO verifiable font in the specific fallback stack.
    // If we are in Cascade, and we have uploaded fonts, we show the % supported by those fonts.
    const isSystemFont = fallbackFontStack.every(f => !f.fontObject);

    // Calculate metric based only on known verifiable fonts
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
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Override</span>
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
                            className="text-[10px] bg-white border border-gray-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer w-auto max-w-[120px]"
                            title="Select Fallback Font"
                        >
                            <option value="cascade">Default</option>
                            {fonts.filter(f => f.type === 'fallback').map(font => (
                                <option key={font.id} value={font.id}>
                                    {font.fileName || font.name || 'Unnamed Font'}
                                </option>
                            ))}
                            {fallbackFont && (
                                <option value="legacy">System: {fallbackOptions.find(opt => opt.value === fallbackFont)?.label || fallbackFont}</option>
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

                    <div
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${isSystemFont
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : isFullSupport
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                    >
                        {isSystemFont ? 'Unknown Support' : `${supportedPercent}% Supported`}
                    </div>
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





            {/* Set Base Font Size on Container */}
            {(() => {
                const primaryFont = fonts.find(f => f.type === 'primary');
                // Fallback to 'primary' if somehow not found
                const primarySettings = getEffectiveFontSettings(primaryFont?.id || 'primary') || { baseFontSize, scale: fontScales.active, lineHeight };
                const primaryFontSize = primarySettings.baseFontSize * (primarySettings.scale / 100);
                return (
                    <div className="p-4" style={{ fontSize: `${primaryFontSize}px` }}>
                        {viewMode === 'all' && (
                            <div className="space-y-2">
                                {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => {
                                    const headerStyle = headerStyles[tag];
                                    return (
                                        <div key={tag}>
                                            <span className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">{tag}</span>
                                            <div
                                                dir={language.dir || 'ltr'}
                                                style={{
                                                    fontFamily: 'UploadedFont',
                                                    color: colors.primary,
                                                    fontSize: `${headerStyle.scale}em`,
                                                    fontWeight: 700,
                                                    lineHeight: headerStyle.lineHeight,
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
                                    fontSize: `${headerStyles[viewMode].scale}em`,
                                    fontWeight: 700,
                                    lineHeight: headerStyles[viewMode].lineHeight,
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
