import React, { useState, useMemo } from 'react';
import { useTypo } from '../context/useTypo';
import { useFontFaceStyles } from '../hooks/useFontFaceStyles';
import { useFontStack } from '../hooks/useFontStack';
import { languageCharacters } from '../data/languageCharacters';

const LivePreview = ({ onClose }) => {
    const {
        visibleLanguages, // Use visible languages for the selector
        activeFontStyleId,
        fontStyles,
        baseRem,
        headerStyles,
        // Global settings
        lineHeight: globalLineHeight,
        letterSpacing: globalLetterSpacing,
        weight: globalWeight,
        textCase,
        getFontsForStyle,
        getPrimaryFontFromStyle,
        getPrimaryFontOverrideForStyle,
        getEffectiveFontSettingsForStyle
    } = useTypo();

    const fontFaceStyles = useFontFaceStyles();
    const { buildFallbackFontStackForStyle } = useFontStack();

    // Default to first visible language or English
    const [selectedLangId, setSelectedLangId] = useState(
        visibleLanguages.length > 0 ? visibleLanguages[0].id : 'en-US'
    );

    const selectedLang = useMemo(() =>
        visibleLanguages.find(l => l.id === selectedLangId) || visibleLanguages[0],
        [visibleLanguages, selectedLangId]);

    // Compute the font stack for the current context
    const fontStack = useMemo(() => {
        if (!selectedLang) return 'sans-serif';
        const stack = buildFallbackFontStackForStyle(activeFontStyleId, selectedLang.id);
        const fallbackString = stack.map(f => f.fontFamily).join(', ');

        const primaryOverrideId = getPrimaryFontOverrideForStyle(activeFontStyleId, selectedLang.id);
        const allFonts = getFontsForStyle(activeFontStyleId);

        const primaryFont = primaryOverrideId
            ? allFonts.find(f => f.id === primaryOverrideId)
            : fontStyles?.[activeFontStyleId]?.fonts?.find(f => f.type === 'primary');

        let primaryFamily = 'sans-serif';

        if (primaryFont) {
            if (primaryFont.isPrimaryOverride) {
                primaryFamily = `'FallbackFont-${activeFontStyleId}-${primaryFont.id}'`;
            } else if (primaryFont.fontUrl) {
                primaryFamily = `'UploadedFont-${activeFontStyleId}'`;
            } else if (primaryFont.name) {
                primaryFamily = primaryFont.name;
            }
        }

        return fallbackString
            ? `${primaryFamily}, ${fallbackString}, sans-serif`
            : `${primaryFamily}, sans-serif`;
    }, [activeFontStyleId, selectedLang, buildFallbackFontStackForStyle, fontStyles, getPrimaryFontOverrideForStyle, getFontsForStyle]);

    // Get effective settings for body content
    const activeStyle = fontStyles?.[activeFontStyleId];
    const primaryOverrideId = selectedLang ? getPrimaryFontOverrideForStyle(activeFontStyleId, selectedLang.id) : null;
    const allFonts = getFontsForStyle(activeFontStyleId);
    const primaryFont = primaryOverrideId
        ? allFonts?.find(f => f.id === primaryOverrideId)
        : activeStyle?.fonts?.find(f => f.type === 'primary');

    const effectiveSettings = getEffectiveFontSettingsForStyle(activeFontStyleId, primaryFont?.id || 'primary') || {
        baseFontSize: activeStyle?.baseFontSize ?? 60,
        scale: activeStyle?.fontScales?.active ?? 100,
        lineHeight: globalLineHeight,
        weight: globalWeight
    };

    const isVariable = primaryFont?.isVariable;
    // Check for primary override specific Line Height
    const primaryOverrideLineHeight = (primaryFont?.isPrimaryOverride && primaryFont?.lineHeight !== undefined && primaryFont?.lineHeight !== '')
        ? primaryFont.lineHeight
        : undefined;

    const effectiveBodyLineHeight = primaryOverrideLineHeight ?? globalLineHeight;

    // Sample content based on language direction
    const dir = selectedLang?.dir || 'ltr';

    const getSampleText = (multiplier = 1) => {
        const text = languageCharacters[selectedLangId] || selectedLang?.pangram || "The quick brown fox jumps over the lazy dog.";
        return text.repeat(multiplier);
    };

    // Helper to get style for a specific header tag
    const getHeaderStyle = (tag) => {
        const hStyle = headerStyles[tag];
        // Apply override logic for Headers too
        const effectiveHeaderLineHeight = primaryOverrideLineHeight ?? hStyle.lineHeight ?? effectiveBodyLineHeight;

        return {
            fontSize: `${hStyle.scale}rem`,
            lineHeight: effectiveHeaderLineHeight === 'normal' ? 'normal' : effectiveHeaderLineHeight,
            letterSpacing: `${hStyle.letterSpacing}em`,
            // Removed forced weight application to restore appropriate header styles (bold)
        };
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
            {/* Dynamic Style Injection */}
            <style>{fontFaceStyles}</style>

            {/* Top Bar */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shadow-sm shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">Live Preview</h2>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Language</label>
                        <select
                            value={selectedLangId}
                            onChange={(e) => setSelectedLangId(e.target.value)}
                            className="bg-slate-50 border border-gray-200 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 min-w-[140px]"
                        >
                            {visibleLanguages.map(lang => (
                                <option key={lang.id} value={lang.id}>{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                        Using standard HTML tags (h1, p)
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-800 transition-colors p-2"
                        title="Close Preview"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Preview Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                {/* Mock Website Container */}
                <div
                    className="max-w-4xl mx-auto bg-white min-h-full shadow-sm border-x border-dashed border-gray-200"
                    dir={dir}
                    style={{
                        fontFamily: fontStack,
                        fontSize: `${baseRem}px`,
                        // Apply GLOBAL override logic
                        lineHeight: effectiveBodyLineHeight === 'normal' ? 'normal' : effectiveBodyLineHeight,
                        letterSpacing: `${globalLetterSpacing}em`,
                        fontWeight: effectiveSettings.weight || globalWeight,
                        fontVariationSettings: isVariable ? `'wght' ${effectiveSettings.weight || globalWeight}` : undefined,
                        textTransform: textCase
                    }}
                >
                    {/* Mock Navigation */}
                    <nav className="border-b border-gray-100 p-6 flex items-center justify-between">
                        <div className="font-bold text-xl tracking-tight">Brand</div>
                        <div className="hidden md:flex gap-6 text-sm font-medium opacity-70">
                            <span>Products</span>
                            <span>Solutions</span>
                            <span>Pricing</span>
                            <span>About</span>
                        </div>
                    </nav>

                    {/* Hero Section */}
                    {/* Note: We remove Tailwind typography classes that conflict with our inline styles */}
                    <header className="px-6 py-20 md:py-32 max-w-3xl mx-auto text-center">
                        <h1 className="mb-6 text-slate-900" style={getHeaderStyle('h1')}>
                            {selectedLang?.pangram || "Make typography better."}
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto">
                            {getSampleText(2)}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button className="bg-slate-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-slate-800 transition-colors" style={{ fontFamily: 'sans-serif' }}>
                                Get Started
                            </button>
                            <button className="bg-white text-slate-900 border border-slate-200 px-8 py-3 rounded-full font-semibold hover:bg-slate-50 transition-colors" style={{ fontFamily: 'sans-serif' }}>
                                Learn More
                            </button>
                        </div>
                    </header>

                    {/* Content Section */}
                    <main className="px-6 py-16 max-w-2xl mx-auto border-t border-gray-50">
                        <article className="prose prose-slate prose-lg max-w-none">
                            {/* Override prose headers with our custom styles */}
                            <h2 className="mb-4 text-slate-900" style={getHeaderStyle('h2')}>Introduction</h2>
                            <p className="mb-6 text-slate-700">
                                {getSampleText(5)}
                            </p>

                            <h3 className="mb-3 text-slate-800" style={getHeaderStyle('h3')}>Typography Matters</h3>
                            <p className="mb-6 text-slate-700">
                                {getSampleText(3)}
                            </p>
                            <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-8 text-slate-600 text-xl">
                                "{selectedLang?.pangram}"
                            </blockquote>
                            <p className="mb-6 text-slate-700">
                                {getSampleText(4)}
                            </p>
                        </article>
                    </main>

                    {/* Footer */}
                    <footer className="bg-slate-50 border-t border-gray-100 py-12 text-center text-sm text-slate-500">
                        <p>&copy; 2024 Localize Type. All rights reserved.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default LivePreview;
