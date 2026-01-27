import { useMemo } from 'react';
import PropTypes from 'prop-types';

const MetricGuidesOverlay = ({
    fontObject,
    fontSizePx,
    lineHeight,
    showAlignmentGuides,
    showBrowserGuides,
    fullWidth = false,
    topOffset = '0px',
    ascentOverride,
    descentOverride,
    lineGapOverride,
    sizeAdjust = 1,
    browserGuideColor = '#3B82F6', // Default to blue
    guideColor = '#000000', // Default to black/primary
}) => {
    // Memoized SVG Generation for Alignment Guides
    const alignmentStyle = useMemo(() => {
        if (!showAlignmentGuides || !fontObject) return {};

        const upm = fontObject.unitsPerEm;

        // PRIORITIZE HHEA metrics as browsers (especially Chrome/Safari on Mac) often favor them.
        const hhea = fontObject.tables?.hhea;
        const os2 = fontObject.tables?.os2;

        let ascender = fontObject.ascender;
        let descender = fontObject.descender;
        let lineGap = 0;

        // helper to check if valid number
        const isValid = (n) => n !== undefined && n !== null && n !== '';

        if (isValid(hhea?.ascender)) {
            ascender = hhea.ascender;
            descender = hhea.descender;
            lineGap = hhea.lineGap || 0;
        } else if (isValid(os2?.sTypoAscender)) {
            ascender = os2.sTypoAscender;
            descender = os2.sTypoDescender;
            lineGap = os2.sTypoLineGap || 0;
        }

        // Apply overrides if present (these take absolute precedence)
        if (isValid(ascentOverride)) {
            ascender = Number(ascentOverride) * upm;
        }
        if (isValid(descentOverride)) {
            descender = -1 * Math.abs(Number(descentOverride) * upm);
        }
        if (isValid(lineGapOverride)) {
            lineGap = Number(lineGapOverride) * upm;
        }

        // Apply sizeAdjust multiplier
        const adj = Number(sizeAdjust) || 1;
        ascender *= adj;
        descender *= adj;
        lineGap *= adj;

        const xHeight = (os2?.sxHeight || 0) * adj;
        const capHeight = (os2?.sCapHeight || 0) * adj;

        // Prevent division by zero
        if (fontSizePx <= 0) return {};

        // Screen Pixel to Font Unit ratio: 1px screen = (upm / fontSizePx) units
        const scale = upm / fontSizePx;
        const strokeWidthUnits = 1 * scale;

        // Dash pattern: 4px dash, 4px gap (in units)
        const dashLen = 4 * scale;
        const dashArrayUnits = `${dashLen} ${dashLen}`;

        // Standard browser line box calculation:
        // Total Height = (ascent - descender) + lineGap
        // Half Leading = (lineHeightUnits - TotalHeight) / 2
        // Baseline = Half Leading + ascent + (lineGap / 2) if using sTypo metrics, 
        // but browsers usually distribute lineGap evenly above and below the (ascender-descender) box.

        const lineHeightUnits = upm * lineHeight;
        const contentHeightUnits = ascender - descender + lineGap;
        const halfLeadingUnits = (lineHeightUnits - contentHeightUnits) / 2;

        // Baseline relative to top of line box
        const baselineYUnits = halfLeadingUnits + ascender + (lineGap / 2);

        const guideLines = [
            { y: baselineYUnits, color: guideColor, width: strokeWidthUnits * 1.5, dash: null }, // Baseline - SOLID
            { y: baselineYUnits - xHeight, color: `${guideColor}66`, width: strokeWidthUnits, dash: dashArrayUnits },
            { y: baselineYUnits - capHeight, color: `${guideColor}66`, width: strokeWidthUnits, dash: dashArrayUnits },
            { y: baselineYUnits - ascender, color: `${guideColor}33`, width: strokeWidthUnits, dash: dashArrayUnits },
            { y: baselineYUnits + Math.abs(descender), color: `${guideColor}33`, width: strokeWidthUnits, dash: dashArrayUnits }
        ];

        // Ensure seamless horizontal tiling
        const tileWidthPx = 16;
        const tileWidthUnits = tileWidthPx * scale;

        const paths = guideLines.map(line => {
            const dashAttr = line.dash ? `stroke-dasharray="${line.dash}"` : '';
            return `<line x1="0" y1="${line.y}" x2="${tileWidthUnits}" y2="${line.y}" stroke="${line.color}" stroke-width="${line.width}" ${dashAttr} />`;
        }).join('');

        const svgString = `<svg xmlns='http://www.w3.org/2000/svg' width='${tileWidthUnits}' height='${lineHeightUnits}' viewBox='0 0 ${tileWidthUnits} ${lineHeightUnits}' preserveAspectRatio='none'>${paths}</svg>`;
        const base64Svg = btoa(svgString);

        return {
            backgroundImage: `url("data:image/svg+xml;base64,${base64Svg}")`,
            backgroundSize: `${tileWidthPx}px ${lineHeight}em`,
            backgroundRepeat: 'repeat',
            backgroundPosition: '0 0'
        };
    }, [showAlignmentGuides, fontObject, lineHeight, fontSizePx, ascentOverride, descentOverride, lineGapOverride, sizeAdjust, guideColor]);

    // Browser Guides (Line Box View)
    const browserGuideStyle = useMemo(() => showBrowserGuides ? {
        backgroundImage: `repeating-linear-gradient(
            to bottom,
            ${browserGuideColor.slice(0, 7)}0D 0em,
            ${browserGuideColor.slice(0, 7)}0D ${lineHeight - 0.05}em,
            ${browserGuideColor.slice(0, 7)}33 ${lineHeight - 0.05}em,
            ${browserGuideColor.slice(0, 7)}33 ${lineHeight}em
        )`,
        backgroundSize: `100% ${lineHeight}em`,
        // Ensure browser guides sit below text but above regular background if needed
    } : {}, [showBrowserGuides, lineHeight, browserGuideColor]);

    if (!showAlignmentGuides && !showBrowserGuides) return null;

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                top: topOffset,
                bottom: fullWidth ? 'auto' : 0,
                left: fullWidth ? '-500vw' : 0,
                right: fullWidth ? '-500vw' : 0,
                height: fullWidth ? '100%' : 'auto',
                pointerEvents: 'none',
                zIndex: fullWidth ? 20 : 10, // Increased to show above text
                fontSize: `${fontSizePx}px`,
                lineHeight: lineHeight,
                ...browserGuideStyle,
                ...alignmentStyle
            }}
        />
    );
};

MetricGuidesOverlay.propTypes = {
    fontObject: PropTypes.object,
    fontSizePx: PropTypes.number.isRequired,
    lineHeight: PropTypes.number.isRequired,
    showAlignmentGuides: PropTypes.bool,
    showBrowserGuides: PropTypes.bool,
    fullWidth: PropTypes.bool,
    topOffset: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ascentOverride: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    descentOverride: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    lineGapOverride: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    guideColor: PropTypes.string
};

export default MetricGuidesOverlay;
