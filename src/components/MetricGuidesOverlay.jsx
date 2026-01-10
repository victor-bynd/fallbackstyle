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
    lineGapOverride
}) => {
    // Memoized SVG Generation for Alignment Guides
    const alignmentStyle = useMemo(() => {
        if (!showAlignmentGuides || !fontObject) return {};

        const upm = fontObject.unitsPerEm;
        const ascender = (ascentOverride !== undefined && ascentOverride !== '') ? Number(ascentOverride) : fontObject.ascender;
        const descender = (descentOverride !== undefined && descentOverride !== '') ? Number(descentOverride) : fontObject.descender;
        const xHeight = fontObject.tables?.os2?.sxHeight || 0;
        const capHeight = fontObject.tables?.os2?.sCapHeight || 0;

        const contentHeightUnits = ascender - descender;

        // Use overriden line gap if provided, or fallback to font metrics
        const lineGap = (lineGapOverride !== undefined && lineGapOverride !== '')
            ? Number(lineGapOverride)
            : (fontObject.tables?.os2?.sTypoLineGap ?? fontObject.hhea?.lineGap ?? 0);

        // Calculate total height based on line height multiplier
        // Browser centering for numeric line-height is based on (ascent - descent + lineGap)
        // actually for numeric line-height = 1.2, totalHeightUnits = upm * 1.2
        const totalHeightUnits = upm * lineHeight;

        // Prevent division by zero
        if (fontSizePx <= 0) return {};

        // Screen Pixel to Font Unit ratio: 1px screen = (upm / fontSizePx) units
        const scale = upm / fontSizePx;
        const strokeWidthUnits = 1 * scale;

        // Dash pattern: 4px dash, 4px gap (in units)
        const dashLen = 4 * scale;
        const dashArrayUnits = `${dashLen} ${dashLen}`;

        const halfLeadingUnits = (totalHeightUnits - contentHeightUnits) / 2;
        const baselineYUnits = halfLeadingUnits + ascender;

        const guideLines = [
            { y: baselineYUnits, color: 'rgba(239, 68, 68, 0.6)', width: strokeWidthUnits, dash: null }, // Baseline - SOLID RED
            { y: baselineYUnits - xHeight, color: 'rgba(0,0,0,0.3)', width: strokeWidthUnits, dash: dashArrayUnits },
            { y: baselineYUnits - capHeight, color: 'rgba(0,0,0,0.3)', width: strokeWidthUnits, dash: dashArrayUnits },
            { y: baselineYUnits - ascender, color: 'rgba(0,0,0,0.1)', width: strokeWidthUnits, dash: dashArrayUnits },
            { y: baselineYUnits + Math.abs(descender), color: 'rgba(0,0,0,0.1)', width: strokeWidthUnits, dash: dashArrayUnits }
        ];

        // Ensure seamless horizontal tiling
        const tileWidthPx = 16;
        const tileWidthUnits = tileWidthPx * scale;

        const paths = guideLines.map(line => {
            const dashAttr = line.dash ? `stroke-dasharray="${line.dash}"` : '';
            return `<line x1="0" y1="${line.y}" x2="${tileWidthUnits}" y2="${line.y}" stroke="${line.color}" stroke-width="${line.width}" ${dashAttr} />`;
        }).join('');

        const svgString = `<svg xmlns='http://www.w3.org/2000/svg' width='${tileWidthUnits}' height='${totalHeightUnits}' viewBox='0 0 ${tileWidthUnits} ${totalHeightUnits}' preserveAspectRatio='none'>${paths}</svg>`;
        const base64Svg = btoa(svgString);

        return {
            backgroundImage: `url("data:image/svg+xml;base64,${base64Svg}")`,
            backgroundSize: `${tileWidthPx}px ${lineHeight}em`,
            backgroundRepeat: 'repeat',
            backgroundPosition: '0 0'
        };
    }, [showAlignmentGuides, fontObject, lineHeight, fontSizePx]);

    // Browser Guides (Line Box View)
    const browserGuideStyle = useMemo(() => showBrowserGuides ? {
        backgroundImage: `repeating-linear-gradient(
            to bottom,
            rgba(59, 130, 246, 0.05) 0em,
            rgba(59, 130, 246, 0.05) ${lineHeight - 0.05}em,
            rgba(59, 130, 246, 0.2) ${lineHeight - 0.05}em,
            rgba(59, 130, 246, 0.2) ${lineHeight}em
        )`,
        backgroundSize: `100% ${lineHeight}em`,
        // Ensure browser guides sit below text but above regular background if needed
    } : {}, [showBrowserGuides, lineHeight]);

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
                zIndex: fullWidth ? 0 : 10,
                fontSize: `${fontSizePx}px`,
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
    lineGapOverride: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default MetricGuidesOverlay;
