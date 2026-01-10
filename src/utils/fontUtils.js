
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
            const { ascender, descender, unitsPerEm } = fontObject;
            // Try to find safe line gap, checking OS/2 table then hhea
            const lineGap = fontObject.tables?.os2?.sTypoLineGap ?? fontObject.hhea?.lineGap ?? 0;
            numLineHeight = (Math.abs(ascender) + Math.abs(descender) + lineGap) / unitsPerEm;
        } else {
            numLineHeight = 1.2; // Default fallback
        }
    }

    return numLineHeight;
};
