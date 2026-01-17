
/**
 * Calculates the numeric line height for a given font and line height setting.
 * Handles 'normal' and unitless line heights by using font metrics if available.
 * 
 * @param {string|number} lineHeight - The line height setting (e.g. 1.2, 'normal', '1.5')
 * @param {Object} fontObject - The parsed opentype.js font object
 * @returns {number|string} The calculated numeric line height (or 'normal')
 */
export const calculateNumericLineHeight = (lineHeight, fontObject, overrides = {}) => {
    // ...
    let numLineHeight = parseFloat(lineHeight);

    // Check if any vertical metric overrides are active
    const hasActiveOverrides = overrides && (
        (overrides.ascentOverride !== undefined && overrides.ascentOverride !== '') ||
        (overrides.descentOverride !== undefined && overrides.descentOverride !== '') ||
        (overrides.lineGapOverride !== undefined && overrides.lineGapOverride !== '')
    );

    if (lineHeight === 'normal' || (typeof lineHeight === 'number' && isNaN(lineHeight)) || hasActiveOverrides) {
        if (fontObject) {
            // ...
            // MATCH LOGIC WITH MetricGuidesOverlay: Prioritize hhea
            const hhea = fontObject.tables?.hhea;
            const os2 = fontObject.tables?.os2;
            const upem = fontObject.unitsPerEm || 1000;

            let ascender = fontObject.ascender;
            let descender = fontObject.descender;
            let lineGap = 0;

            // 1. Get Base Metrics
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

            // 2. Apply Overrides (if 'normal' behavior is affected)
            // CSS overrides define these relative to the Em Box (unitsPerEm)
            if (isValid(overrides.ascentOverride)) {
                ascender = overrides.ascentOverride * upem;
            }
            if (isValid(overrides.descentOverride)) {
                // Descent override is a positive magnitude in CSS (height of descent)
                // In font tables, descender is usually negative.
                // Our formula below uses Math.abs(), so we can set it as positive magnitude or negative, 
                // but let's treat it as the 'height' component directly.
                descender = -1 * Math.abs(overrides.descentOverride * upem);
            }
            if (isValid(overrides.lineGapOverride)) {
                lineGap = overrides.lineGapOverride * upem;
            }

            // 3. Calculate Base Metrics (What 'normal' would look like without overrides)
            // const baseAscender = hhea?.ascender ?? os2?.sTypoAscender ?? fontObject.ascender;
            // const baseDescender = Math.abs(hhea?.descender ?? os2?.sTypoDescender ?? fontObject.descender);
            // const baseLineGap = hhea?.lineGap ?? os2?.sTypoLineGap ?? 0;
            // const baseMetricHeight = (Math.abs(baseAscender) + Math.abs(baseDescender) + baseLineGap) / upem;

            // 4. Calculate New Metrics (With Overrides)
            const newMetricHeight = (Math.abs(ascender) + Math.abs(descender) + lineGap) / upem;

            if (typeof lineHeight === 'number' && !isNaN(lineHeight)) {
                // If user provided a specific line height (e.g. 1.2), we ensure the override
                // is sufficient. If the override results in TALLER line height, we use it.
                // If the user's line height is already TALLER, we respect the user's spacious setting.
                numLineHeight = Math.max(lineHeight, newMetricHeight);
            } else {
                // If 'normal' or 'auto', use the full metric height
                numLineHeight = newMetricHeight;
            }
        } else {
            // If fontObject is missing (e.g. System Font), we cannot calculate exact metrics.
            // We should default to the user's setting.
            if (typeof lineHeight === 'number' && !isNaN(lineHeight)) {
                numLineHeight = lineHeight;
            } else {
                // Return 'normal' to allow the browser to determine height (and respect CSS overrides like line-gap-override)
                numLineHeight = 'normal';
            }
        }
    }

    return numLineHeight;
};
