import { useMemo } from 'react';
import { useTypo } from '../context/useTypo';
import { useUI } from '../context/UIContext';
import { useTextRenderer } from '../hooks/useTextRenderer.jsx';
import MetricGuidesOverlay from './MetricGuidesOverlay';
import { calculateNumericLineHeight } from '../utils/fontUtils';

const HeaderPreviewRow = ({ tag, language, headerStyle, hideLabel }) => {
    const {
        // Unused variable removed
        fontStyles,
        // colors removed from here
        showAlignmentGuides,
        showBrowserGuides,
        getFontsForStyle,
        getPrimaryFontFromStyle,
        getPrimaryFontOverrideForStyle,
        getEffectiveFontSettingsForStyle,
        getFallbackFontOverrideForStyle,
        activeFontStyleId,
        headerFontStyleMap,
        textOverrides
    } = useTypo();

    const { colors } = useUI();

    const contentToRender = textOverrides[language.id] || language.sampleSentence;

    const getStyleIdForHeader = (tag) => {
        if (tag && headerFontStyleMap?.[tag]) return headerFontStyleMap[tag];
        return activeFontStyleId || 'primary';
    };

    const resolveStyleIdForHeader = (tag) => {
        const requested = getStyleIdForHeader(tag);
        const requestedPrimary = getPrimaryFontFromStyle(requested);
        if (requestedPrimary?.fontObject) return requested;
        return 'primary';
    };

    const styleIdForTag = resolveStyleIdForHeader(tag);

    // Memoizing logic to determine fonts and settings
    const { primaryFont, primarySettings, finalSizePx, isGlobalPrimary, numericLineHeight, cssLineHeight } = useMemo(() => {
        const fonts = getFontsForStyle(styleIdForTag);
        const primaryOverrideId = getPrimaryFontOverrideForStyle(styleIdForTag, language.id);
        const currentFallbackFontId = getFallbackFontOverrideForStyle(styleIdForTag, language.id);

        let pFont = null;
        if (currentFallbackFontId && currentFallbackFontId !== 'cascade' && currentFallbackFontId !== 'legacy') {
            pFont = fonts.find(f => f && f.id === currentFallbackFontId);
        }

        if (!pFont && primaryOverrideId) {
            pFont = fonts.find(f => f && f.id === primaryOverrideId);
        }

        if (!pFont) {
            pFont = fonts.find(f => f && f.type === 'primary');
        }

        const globalPrimary = fonts.find(f => f && f.type === 'primary');
        const isGlobal = pFont && globalPrimary && pFont.id === globalPrimary.id;

        const style = fontStyles?.[styleIdForTag];
        const pSettings = getEffectiveFontSettingsForStyle(styleIdForTag, pFont?.id || 'primary') || {
            baseFontSize: style?.baseFontSize ?? 16,
            scale: style?.fontScales?.active ?? 100,
            lineHeight: style?.lineHeight ?? 1.2,
            weight: 400
        };

        const styleBaseRem = pSettings.baseFontSize;

        let sizePx = headerStyle.scale * styleBaseRem;
        if (tag === 'h1' && pFont?.isPrimaryOverride && pSettings?.h1Rem) {
            sizePx = pSettings.h1Rem * styleBaseRem;
        }

        const hasLineHeightOverride = pFont?.isPrimaryOverride && (
            pFont?.lineHeight !== undefined && pFont?.lineHeight !== null
        );

        const primaryOverrideLineHeight = hasLineHeightOverride
            ? pSettings.lineHeight
            : undefined;

        const forcedLineHeight = currentFallbackFontId && currentFallbackFontId !== 'cascade' && currentFallbackFontId !== 'legacy'
            ? getEffectiveFontSettingsForStyle(styleIdForTag, currentFallbackFontId)?.lineHeight
            : undefined;

        const effLineHeight = primaryOverrideLineHeight ?? headerStyle.lineHeight ?? forcedLineHeight ?? style?.lineHeight ?? 1.2;

        const numLineHeight = calculateNumericLineHeight(effLineHeight, pFont?.fontObject);

        // Fix: Use explicit 'normal' for CSS if the effective setting is 'normal' or if we have overrides that might rely on it.
        const cssIsNormal = effLineHeight === 'normal' ||
            (typeof effLineHeight === 'string' && effLineHeight === 'normal');

        const cssLineHeight = cssIsNormal ? 'normal' : numLineHeight;

        return {
            primaryFont: pFont,
            primarySettings: pSettings,
            // Unused variable removed,
            finalSizePx: sizePx,
            isGlobalPrimary: isGlobal,
            numericLineHeight: numLineHeight,
            cssLineHeight: cssLineHeight
        };
    }, [styleIdForTag, language.id, headerStyle, fontStyles, getFontsForStyle, getPrimaryFontOverrideForStyle, getFallbackFontOverrideForStyle, getEffectiveFontSettingsForStyle, tag]);

    // Reconstruct style settings
    const combinedStyle = {
        fontFamily: !isGlobalPrimary && primaryFont
            ? `'FallbackFont-${styleIdForTag}-${primaryFont.id}'`
            : `UploadedFont-${styleIdForTag}`,
        color: primaryFont?.color || colors.primary,
        fontSize: `${finalSizePx}px`,
        fontWeight: primarySettings.weight || 400,
        fontVariationSettings: primaryFont?.isVariable ? `'wght' ${primarySettings.weight || 400}` : undefined,
        lineHeight: cssLineHeight,
        letterSpacing: `${primarySettings.letterSpacing || 0}em`,
        position: 'relative'
    };

    const { renderText } = useTextRenderer();

    // Generate rendered content with color guides
    const renderedContent = useMemo(() => {
        return renderText({
            content: contentToRender,
            languageId: language.id,
            styleId: styleIdForTag
        });
    }, [renderText, contentToRender, language.id, styleIdForTag]);

    return (
        <div key={tag}>
            {!hideLabel && <span className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">{tag}</span>}
            <div
                dir={language.dir || 'ltr'}
                style={combinedStyle}
                className="break-words"
            >
                <div className="relative z-20">{renderedContent}</div>
                {/* Guides Overlay */}
                <MetricGuidesOverlay
                    fontObject={primaryFont?.fontObject}
                    fontSizePx={finalSizePx}
                    lineHeight={numericLineHeight}
                    showAlignmentGuides={showAlignmentGuides}
                    showBrowserGuides={showBrowserGuides}
                    ascentOverride={primarySettings?.ascentOverride}
                    descentOverride={primarySettings?.descentOverride}
                    lineGapOverride={primarySettings?.lineGapOverride}
                />
            </div>
        </div>
    );
};

export default HeaderPreviewRow;
