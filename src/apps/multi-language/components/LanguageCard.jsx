import { useMemo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useFontManagement } from '../../../shared/context/useFontManagement';
import { useLanguageMapping } from '../../../shared/context/useLanguageMapping';
import { useTypography } from '../../../shared/context/useTypography';
import { useUI } from '../../../shared/context/UIContext';
import { useFontStack } from '../../../shared/hooks/useFontStack';
import { useTextRenderer } from '../../../shared/hooks/useTextRenderer.jsx';
import HeaderPreviewRow from './HeaderPreviewRow';
import LanguageCardHeader from './LanguageCardHeader';
import LanguageEditPanel from './LanguageEditPanel';
import { languageCharacters } from '../../../shared/data/languageCharacters';
import MetricGuidesOverlay from '../../../shared/components/MetricGuidesOverlay';
import { calculateNumericLineHeight } from '../../../shared/utils/fontUtils';
import { TOOLTIPS } from '../../../shared/constants/tooltips';

const LanguageCard = ({ language, isHighlighted, isMenuOpen, onToggleMenu, setHighlitLanguageId }) => {
    // Font Management Context
    const {
        getFontsForStyle,
        getPrimaryFontFromStyle,
        activeFontStyleId,
    } = useFontManagement();

    // Language Mapping Context
    const {
        primaryLanguages,
        removeConfiguredLanguage,
        mapLanguageToFont,
        unmapLanguage,
        getPrimaryFontOverrideForStyle,
        getFallbackFontOverrideForStyle,
        setFallbackFontOverrideForStyle,
        addLanguageSpecificFallbackFont,
    } = useLanguageMapping();

    // Typography Context
    const {
        headerStyles,
        textOverrides,
        setTextOverride,
        resetTextOverride,
        headerFontStyleMap,
        getEffectiveFontSettingsForStyle,
    } = useTypography();

    const {
        viewMode,
        activeConfigTab,
        setActiveConfigTab,
        showBrowserGuides,
        showAlignmentGuides,
        showFallbackOrder,
        showFallbackColors
    } = useUI();

    const { buildFallbackFontStackForStyle } = useFontStack();



    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    // Controlled vs Uncontrolled Logic for Menu
    const [internalConfigDropdownOpen, setInternalConfigDropdownOpen] = useState(false);
    const isControlled = isMenuOpen !== undefined;
    const configDropdownOpen = isControlled ? isMenuOpen : internalConfigDropdownOpen;

    const handleToggleMenu = () => {
        if (isControlled) {
            onToggleMenu?.(!configDropdownOpen);
        } else {
            setInternalConfigDropdownOpen(!internalConfigDropdownOpen);
        }
    };

    const handleCloseMenu = () => {
        if (isControlled) {
            onToggleMenu?.(false);
        } else {
            setInternalConfigDropdownOpen(false);
        }
    };
    const cardRef = useRef(null);



    const getStyleIdForHeader = (tag) => {
        if (tag && headerFontStyleMap?.[tag]) return headerFontStyleMap[tag];
        return activeFontStyleId || 'primary';
    };

    const resolveStyleIdForHeader = (tag) => {
        const requested = getStyleIdForHeader(tag);
        // We used to fallback to 'primary' if the requested style didn't have a loaded primary font.
        // However, this prevents viewing fallback configs for styles that rely on system primary fonts.
        // We should just return the requested style.
        return requested;
    };

    const handleUnmap = () => {
        unmapLanguage(language.id);
        handleCloseMenu();
    };



    // Determine the content to render: Override > Sample Sentence
    const contentToRender = textOverrides[language.id] || language.sampleSentence;

    // Handle entering edit mode
    const handleStartEdit = () => {
        setEditText(contentToRender);
        setIsEditing(true);
    };

    // Handle saving
    const handleSave = () => {
        if (editText.trim() === '' || editText === language.sampleSentence) {
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

    const { renderText } = useTextRenderer();

    const renderedContent = useMemo(() => {
        return renderText({
            content: contentToRender,
            languageId: language.id,
            styleId: activeFontStyleId || 'primary'
        });
    }, [renderText, contentToRender, language.id, activeFontStyleId]);

    // Stats based on current content (moved check to end of render)

    // Stats based on current content
    // Stats based on current content

    const activeMetricsStyleId = resolveStyleIdForHeader(viewMode === 'all' ? 'h1' : viewMode);
    const metricsPrimaryFont = getPrimaryFontFromStyle(activeMetricsStyleId);
    const metricsPrimaryFontObject = metricsPrimaryFont?.fontObject;
    const metricsFallbackFontStack = useMemo(() =>
        buildFallbackFontStackForStyle(activeMetricsStyleId, language.id),
        [buildFallbackFontStackForStyle, activeMetricsStyleId, language.id]);

    let fallbackOverrideFontId = getFallbackFontOverrideForStyle(activeMetricsStyleId, language.id) || '';

    // Fallback to global primary overrides for FALLBACK overrides as well
    if (!fallbackOverrideFontId && activeMetricsStyleId !== 'primary') {
        const globalFallback = getFallbackFontOverrideForStyle('primary', language.id);
        if (globalFallback) fallbackOverrideFontId = globalFallback;
    }

    let primaryOverrideId = getPrimaryFontOverrideForStyle(activeMetricsStyleId, language.id);

    // Fallback to global primary overrides if not found in active style (e.g. detached header style)
    if (!primaryOverrideId && activeMetricsStyleId !== 'primary') {
        const globalOverride = getPrimaryFontOverrideForStyle('primary', language.id);
        if (globalOverride) primaryOverrideId = globalOverride;
    }

    // If primary language and no explicit override, default to mapping to primary font
    const isMapped = !!fallbackOverrideFontId || !!primaryOverrideId;

    if (!fallbackOverrideFontId) {
        if (primaryOverrideId) {
            fallbackOverrideFontId = primaryOverrideId;
        } else if (primaryLanguages?.includes(language.id) && metricsPrimaryFont) {
            fallbackOverrideFontId = metricsPrimaryFont.id;
        }
    }

    const fallbackOverrideOptions = useMemo(() => {
        const fonts = getFontsForStyle(activeMetricsStyleId) || [];

        // Map to store unique font entities by signature (fileName or name)
        const uniqueFonts = new Map();

        fonts.forEach(f => {
            if (!f) return;
            // Identifier for the font file/entity
            const signature = f.fileName || f.name;
            if (!signature) return;

            // Check if we already have a candidate for this font
            const existing = uniqueFonts.get(signature);

            // Definition of a "Better" candidate:
            // We prefer global fonts (not lang-specific) because mapping to them is cleaner.
            // If we only have a lang-specific version (e.g. uploaded directly to a language), we use that.

            const isGlobal = !f.isLangSpecific && !f.isPrimaryOverride;

            if (!existing) {
                uniqueFonts.set(signature, f);
            } else {
                const existingIsGlobal = !existing.isLangSpecific && !existing.isPrimaryOverride;
                // If existing is NOT global, but current IS global, replace with current.
                if (!existingIsGlobal && isGlobal) {
                    uniqueFonts.set(signature, f);
                }
            }
        });

        return Array.from(uniqueFonts.values())
            .map(f => ({
                id: f.id,
                label: f.fileName?.replace(/\.[^/.]+$/, '') || f.name || 'Unnamed Font',
                fileName: f.fileName,
                name: f.name
            }));
    }, [activeMetricsStyleId, getFontsForStyle]);

    const missingChars = useMemo(() => {
        const textToCheck = languageCharacters[language.id] || contentToRender;
        const charsToCheck = textToCheck.replace(/\s/g, '').split('');

        if (!metricsPrimaryFontObject && metricsFallbackFontStack.every(f => !f.fontObject)) {
            return 0; // Or handling for no fonts loaded
        }

        return charsToCheck.filter(char => {
            // Check primary
            if (metricsPrimaryFontObject && metricsPrimaryFontObject.charToGlyphIndex(char) !== 0) return false;

            // Check fallbacks
            for (const fallback of metricsFallbackFontStack) {
                if (fallback.fontObject) {
                    // Some fonts might throw on charToGlyphIndex
                    try {
                        if (fallback.fontObject.charToGlyphIndex(char) !== 0) return false;
                    } catch {
                        // ignore
                    }
                }
            }
            return true;
        }).length;
    }, [language.id, contentToRender, metricsPrimaryFontObject, metricsFallbackFontStack]);

    // We only show "Unknown Support" if we have NO verifiable font (neither primary nor fallback).
    // If we have uploaded fonts (primary or fallbacks with objects), we show the % supported by those fonts.
    const hasVerifiableFont = !!metricsPrimaryFontObject || metricsFallbackFontStack.some(f => !!f.fontObject);

    // Calculate metric based only on known verifiable fonts
    const totalCharsToCheck = (languageCharacters[language.id] || contentToRender).replace(/\s/g, '').length;
    const supportedPercent = totalCharsToCheck > 0 ? Math.round(((totalCharsToCheck - missingChars) / totalCharsToCheck) * 100) : 100;
    const isFullSupport = missingChars === 0;

    const currentFallbackFont = useMemo(() => {
        if (!fallbackOverrideFontId || fallbackOverrideFontId === 'legacy') return null;
        const fonts = getFontsForStyle(activeMetricsStyleId) || [];

        let foundFont = null;

        if (typeof fallbackOverrideFontId === 'string') {
            foundFont = fonts.find(f => f && f.id === fallbackOverrideFontId);
        } else if (typeof fallbackOverrideFontId === 'object') {
            // Pick the first one for the color indicator/badge logic
            const firstId = Object.values(fallbackOverrideFontId)[0];
            foundFont = fonts.find(f => f && f.id === firstId);
        }

        if (foundFont && foundFont.hidden) return null;
        return foundFont;
    }, [fallbackOverrideFontId, activeMetricsStyleId, getFontsForStyle]);

    const currentFallbackLabel = useMemo(() => {
        if (fallbackOverrideFontId === 'legacy') return 'System';

        const fonts = getFontsForStyle(activeMetricsStyleId) || [];

        // Helper to determine label from stack (Auto behavior)
        const getAutoLabel = () => {
            const realFallbacks = metricsFallbackFontStack.filter(f => f.fontId !== 'legacy');
            if (realFallbacks.length === 0) return null; // No fallbacks -> Hide badge
            return 'Default';
        };

        if (!fallbackOverrideFontId) {
            return getAutoLabel();
        }

        if (typeof fallbackOverrideFontId === 'string') {
            if (!currentFallbackFont) {
                // Broken mapping -> Fallback to Auto behavior
                return getAutoLabel();
            }
            return currentFallbackFont?.label || currentFallbackFont?.fileName?.replace(/\.[^/.]+$/, '') || currentFallbackFont?.name || 'Unknown';
        } else if (typeof fallbackOverrideFontId === 'object') {
            const mappedNames = Object.values(fallbackOverrideFontId)
                .map(id => {
                    const f = fonts.find(font => font.id === id);
                    return f?.label || f?.fileName?.replace(/\.[^/.]+$/, '') || f?.name;
                })
                .filter(Boolean);

            if (mappedNames.length === 0) return getAutoLabel();
            if (mappedNames.length === 1) return mappedNames[0];
            return `${mappedNames[0]} (+${mappedNames.length - 1})`;
        }
        return getAutoLabel();
    }, [fallbackOverrideFontId, currentFallbackFont, activeMetricsStyleId, getFontsForStyle, metricsFallbackFontStack]);

    const effectiveFallbackFont = useMemo(() => {
        let effectiveFont = currentFallbackFont;
        if (!effectiveFont) {
            const realFallbacks = metricsFallbackFontStack.filter(f => f.fontId !== 'legacy');
            if (realFallbacks.length > 0) {
                const fonts = getFontsForStyle(activeMetricsStyleId) || [];
                effectiveFont = fonts.find(f => f.id === realFallbacks[0].fontId);
            }
        }
        return effectiveFont;
    }, [currentFallbackFont, metricsFallbackFontStack, activeMetricsStyleId, getFontsForStyle]);

    const handleSelectFallback = (val) => {
        if (!val) {
            unmapLanguage(language.id);
        } else if (val === 'legacy') {
            setFallbackFontOverrideForStyle(activeMetricsStyleId, language.id, 'legacy');
        } else {
            mapLanguageToFont(language.id, val);
        }
    };

    const handleResetEdit = () => {
        setEditText(language.sampleSentence);
        resetTextOverride(language.id);
    };

    const supportHelpText = useMemo(() => {
        const isCJK = ['zh-Hans', 'zh-Hant', 'ja-JP', 'ko-KR'].includes(language.id);
        if (isCJK) {
            return TOOLTIPS.SUPPORT_CJK;
        }
        return TOOLTIPS.SUPPORT_GENERAL;
    }, [language.id]);

    // if (!fontObject) return null; // Removed to allow system font mode




    const isPrimary = primaryLanguages?.includes(language.id);
    const isActive = isHighlighted || activeConfigTab === language.id || (activeConfigTab === 'primary' && isPrimary);

    // Determine the actual font being used for the main view to get its metrics
    const mainViewStyleId = activeFontStyleId || 'primary';
    const mainViewAllFonts = getFontsForStyle(mainViewStyleId);

    // Start with the specific choice for this language (the font shown in the badge)
    let mainViewEffectiveFont = effectiveFallbackFont;

    // If no specific choice, check for primary override (lang-specific split)
    if (!mainViewEffectiveFont) {
        const mainViewPrimaryOverrideId = getPrimaryFontOverrideForStyle(mainViewStyleId, language.id);
        if (mainViewPrimaryOverrideId) {
            console.log('[LanguageCard] Override ID:', mainViewPrimaryOverrideId, 'Fonts:', mainViewAllFonts);
            mainViewEffectiveFont = mainViewAllFonts.find(f => {
                if (!f) console.error('[LanguageCard] Found undefined font in mainViewAllFonts!');
                return f && f.id === mainViewPrimaryOverrideId;
            });
        }
    }

    // Fallback to global primary
    if (!mainViewEffectiveFont) {
        mainViewEffectiveFont = getPrimaryFontFromStyle(mainViewStyleId);
    }

    // Get effective settings - getEffectiveFontSettingsForStyle is recreated when fontStyles changes
    const mainViewSettings = useMemo(() => {
        return getEffectiveFontSettingsForStyle(mainViewStyleId, mainViewEffectiveFont?.id || 'primary');
    }, [getEffectiveFontSettingsForStyle, mainViewStyleId, mainViewEffectiveFont?.id]);
    
    const mainViewFontSize = (mainViewSettings?.baseFontSize || 16) * (mainViewSettings?.scale || 100) / 100;
    const mainViewLineHeight = mainViewSettings?.lineHeight || 'normal';

    const useNormalLineHeight = (mainViewLineHeight === 'normal');

    const mainViewNumericLineHeight = useMemo(() => {
        // If we are forcing normal line height for rendering, we must also calculate the numeric value as 'normal'
        // so that the metric guides overlay matches the actual rendered text height.
        const effectiveLineHeight = useNormalLineHeight ? 'normal' : mainViewLineHeight;
        return calculateNumericLineHeight(effectiveLineHeight, mainViewEffectiveFont?.fontObject, mainViewSettings);
    }, [mainViewLineHeight, mainViewEffectiveFont, mainViewSettings, useNormalLineHeight]);

    return (
        <div
            id={'language-card-' + language.id}
            ref={cardRef}
            onClick={(e) => {
                e.stopPropagation(); // Prevent background click from firing
                if (isActive) {
                    setActiveConfigTab('ALL');
                    if (setHighlitLanguageId) setHighlitLanguageId(null);
                } else {
                    setActiveConfigTab(isPrimary ? 'primary' : language.id);
                    if (setHighlitLanguageId) setHighlitLanguageId(language.id);
                }
            }}
            className={`
                bg-white border rounded-xl transition-all duration-300 relative
                ${configDropdownOpen ? 'z-50' : 'z-0'}
                ${isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg'
                    : 'border-gray-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)]'
                }
            `}
        >
            <LanguageCardHeader
                language={language}
                isPrimary={isPrimary}
                hasVerifiableFont={hasVerifiableFont}
                supportHelpText={supportHelpText}
                supportedPercent={supportedPercent}
                isFullSupport={isFullSupport}
                textOverride={textOverrides[language.id]}
                showFallbackOrder={showFallbackOrder}
                metricsPrimaryFont={metricsPrimaryFont}
                currentFallbackFont={currentFallbackFont}
                effectiveFallbackFont={effectiveFallbackFont}
                fallbackOverrideFontId={fallbackOverrideFontId}
                currentFallbackLabel={currentFallbackLabel}
                isMapped={isMapped}
                fallbackOverrideOptions={fallbackOverrideOptions}
                onSelectFallback={handleSelectFallback}
                menuOpen={configDropdownOpen}
                onToggleMenu={handleToggleMenu}
                onCloseMenu={handleCloseMenu}
                addLanguageSpecificFallbackFont={addLanguageSpecificFallbackFont}
                onStartEdit={handleStartEdit}
                onRemove={() => removeConfiguredLanguage(language.id)}
                onUnmap={handleUnmap}
                useNormalLineHeight={useNormalLineHeight}
            />

            {isEditing && (
                <LanguageEditPanel
                    editText={editText}
                    setEditText={setEditText}
                    languageDir={language.dir}
                    onCancel={handleCancel}
                    onSave={handleSave}
                    onReset={handleResetEdit}
                />
            )}

            {/* Set Base Font Size on Container */}
            <div className="p-6">
                {/* Standard Body Text View (Fallback for 'simple', 'paragraph', or any non-header mode) */}
                {!viewMode.startsWith('h') && viewMode !== 'all' && (
                    <div
                        id={`language-card-text-${language.id}`}
                        dir={language.dir || 'ltr'}
                        style={{
                            fontSize: `${mainViewFontSize}px`,
                            lineHeight: useNormalLineHeight ? 'normal' : mainViewNumericLineHeight,
                            fontWeight: mainViewSettings?.weight || 400,
                            color: showFallbackColors ? (mainViewSettings?.color || 'inherit') : 'inherit',
                            position: 'relative'
                        }}
                    >
                        <div
                            className="relative z-20"
                            style={{ lineHeight: 'inherit' }}
                        >
                            {renderedContent}
                        </div>
                        {/* Guides Overlay */}
                        <MetricGuidesOverlay
                            fontObject={mainViewEffectiveFont?.fontObject}
                            fontSizePx={mainViewFontSize}
                            lineHeight={mainViewNumericLineHeight}
                            showAlignmentGuides={showAlignmentGuides}
                            showBrowserGuides={showBrowserGuides}
                            ascentOverride={mainViewSettings?.ascentOverride}
                            descentOverride={mainViewSettings?.descentOverride}
                            lineGapOverride={mainViewSettings?.lineGapOverride}
                        />
                    </div>
                )}

                {/* DEBUG: Check viewMode */}

                {viewMode === 'all' && (
                    <div className="space-y-2">
                        {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => {
                            const headerStyle = headerStyles?.[tag];
                            // Safety check: ensure headerStyle exists
                            if (!headerStyle) return null;

                            return (
                                <HeaderPreviewRow
                                    key={tag}
                                    tag={tag}
                                    language={language}
                                    headerStyle={headerStyle}
                                />
                            );
                        })}
                    </div>
                )}

                {viewMode.startsWith('h') && headerStyles?.[viewMode] && (
                    <div className="p-0">
                        <HeaderPreviewRow
                            tag={viewMode}
                            language={language}
                            headerStyle={headerStyles[viewMode]}
                            hideLabel={true}
                        />
                    </div>
                )}
            </div>
        </div >
    );
};



LanguageCard.propTypes = {
    language: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        sampleSentence: PropTypes.string.isRequired
    }).isRequired,
    isHighlighted: PropTypes.bool,
    isMenuOpen: PropTypes.bool,
    onToggleMenu: PropTypes.func
};

export default LanguageCard; // Re-export
