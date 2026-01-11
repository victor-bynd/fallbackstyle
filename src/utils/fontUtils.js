
/**
 * Calculates the numeric line height for a given font and line height setting.
 * Handles 'normal' and unitless line heights by using font metrics if available.
 * 
 * @param {string|number} lineHeight - The line height setting (e.g. 1.2, 'normal', '1.5')
 * @param {Object} fontObject - The parsed opentype.js font object
 * @returns {number} The calculated numeric line height
 */
export const calculateNumericLineHeight = (lineHeight, fontObject) => {
    let numLineHeight = parseFloat(lineHeight);

    if (lineHeight === 'normal' || isNaN(numLineHeight)) {
        if (fontObject) {
            // MATCH LOGIC WITH MetricGuidesOverlay: Prioritize hhea
            const hhea = fontObject.tables?.hhea;
            const os2 = fontObject.tables?.os2;

            let ascender = fontObject.ascender;
            let descender = fontObject.descender;
            let lineGap = 0;

            const isValid = (n) => n !== undefined && n !== null;

            if (isValid(hhea?.ascender)) {
                ascender = hhea.ascender;
                descender = hhea.descender;
                lineGap = hhea.lineGap || 0;
            } else if (isValid(os2?.sTypoAscender)) {
                ascender = os2.sTypoAscender;
                descender = os2.sTypoDescender;
                lineGap = os2.sTypoLineGap || 0;
            }

            // Fallback: root properties are usually from head/hhea but opentype.js normalizes them.
            // But we prefer explicit table access to be sure.

            numLineHeight = (Math.abs(ascender) + Math.abs(descender) + lineGap) / fontObject.unitsPerEm;
        } else {
            numLineHeight = 1.2; // Default fallback
        }
    }

    return numLineHeight;
};
