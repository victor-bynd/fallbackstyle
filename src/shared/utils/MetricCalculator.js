
/**
 * MetricCalculator.js
 * 
 * Utility to calculate CSS override values to match a fallback font to a primary font.
 * 
 * Goals:
 * 1. Match x-height (using size-adjust).
 * 2. Match ascent/descent/line-gap (using overrides).
 * 3. Ensure no layout shift (CLS).
 */

/**
 * Extracts normalized metrics from an opentype.js font object.
 * Handles missing tables and fallbacks.
 */
export const extractFontMetrics = (font) => {
    if (!font) return null;

    const upem = font.unitsPerEm;
    const hhea = font.tables.hhea;
    const os2 = font.tables.os2;

    const ascender = hhea?.ascender ?? font.ascender;
    const descender = hhea?.descender ?? font.descender;
    const lineGap = hhea?.lineGap ?? os2?.sTypoLineGap ?? 0;

    // Measure x-height (approximate if missing)
    let xHeight = os2?.sxHeight;
    if (!xHeight) {
        const xGlyph = font.charToGlyph('x');
        if (xGlyph) xHeight = xGlyph.yMax;
    }
    if (!xHeight) xHeight = upem * 0.5;

    const metrics = {
        unitsPerEm: upem,
        ascent: ascender,
        descent: descender,
        lineGap: lineGap,
        xHeight: xHeight
    };

    const normalized = {
        ascent: ascender / upem,
        descent: Math.abs(descender) / upem,
        lineGap: lineGap / upem,
        xHeight: xHeight / upem
    };

    return { metrics, normalized };
};

export const calculateOverrides = (primaryMetrics, fallbackMetrics) => {
    if (!primaryMetrics || !fallbackMetrics) return null;

    // 1. Calculate Size Adjust
    // We want the fallback's x-height to match the primary's x-height.
    // Formula: size-adjust = primary.xHeight / fallback.xHeight
    // Note: We use normalized values (0-1) if available, or raw values scaled by UPEM.

    // Helper to get normalized value
    const getNorm = (m, key) => m.normalized ? m.normalized[key] : (m.metrics[key] / m.metrics.unitsPerEm);

    const primaryX = getNorm(primaryMetrics, 'xHeight');
    const fallbackX = getNorm(fallbackMetrics, 'xHeight');

    if (!primaryX || !fallbackX) return null;

    const sizeAdjust = primaryX / fallbackX;

    // 2. Calculate Vertical Metric Overrides
    // The goal is to make the fallback font occupy the SAME vertical space as the primary font
    // relative to the em square, AFTER size-adjust is applied.

    // CSS Syntax: 
    // ascent-override: <percentage> 
    // descent-override: <percentage>
    // line-gap-override: <percentage>

    // These overrides are applied to the "font metrics" of the fallback font.
    // But wait, the `size-adjust` scales the GLYPHS, not the em-box?
    // MDN: "The size-adjust descriptor defines a multiplier for glyph outlines and metrics associated with this font."
    // So if size-adjust is 90%, the effective x-height becomes 0.9 * original.
    // Which matches our primary x-height.

    // However, we want the FINAL box to match the primary font's box.
    // So: (FallbackAscent * sizeAdjust) should ideally be close to PrimaryAscent?
    // No, usually we want to explicit set the metrics to match the primary exactly, 
    // so that the line-height calculation (which is based on ascent+descent+lineGap) is identical.

    // So we just iterate:
    // Target Ascent = Primary Ascent
    // But we express it as a percentage of the fallback's "size-adjusted" em-box?
    // Actually, ascent-override is relative to the *used* font size.
    // If we use `size-adjust`, the "font size" effectively changes?
    // MDN says: "The metrics are calculated as if the font size were scaled by this factor."

    // So if we simply set:
    // ascent-override = PrimaryAscent (normalized)
    // descent-override = PrimaryDescent (normalized)
    // line-gap-override = PrimaryLineGap (normalized)

    // And we set `size-adjust` to match x-heights.

    // Let's verify:
    // Text is 16px.
    // Primary has x-height 0.5em (8px). Ascent 1.0em.
    // Fallback has x-height 0.6em (9.6px). 
    // We set size-adjust = 0.5/0.6 = 0.8333.
    // Now Fallback x-height = 16px * 0.6 * 0.8333 = 8px. (Matches!)
    // Now what about Ascent?
    // If we set ascent-override: 100% (of primary). 
    // Does size-adjust affect ascent-override?
    // Spec says: "The ascent-override descriptor defines the ascent metric for the font... This value is used *instead* of the font's intrinsic ascent."
    // And size-adjust scales "metrics associated with this font".
    // 
    // If I set `ascent-override: 100%` and `size-adjust: 50%`.
    // Does the browser see effective ascent as 50%? Yes.
    // So we need to PRE-COMPENSATE for size-adjust?
    // TargetAscent = EffectiveAscent
    // EffectiveAscent = AscentOverride * SizeAdjust
    // PrimaryAscent = x * SizeAdjust
    // x = PrimaryAscent / SizeAdjust

    const primaryAscent = getNorm(primaryMetrics, 'ascent');
    const primaryDescent = getNorm(primaryMetrics, 'descent'); // Magnitude usually
    const primaryLineGap = getNorm(primaryMetrics, 'lineGap');

    const ascentOverride = primaryAscent / sizeAdjust;
    const descentOverride = primaryDescent / sizeAdjust;
    const lineGapOverride = primaryLineGap / sizeAdjust;

    return {
        sizeAdjust: sizeAdjust, // Multiplier (e.g. 0.957)
        ascentOverride: ascentOverride,
        descentOverride: descentOverride,
        lineGapOverride: lineGapOverride
    };
};

export const formatCSS = (overrides) => {
    if (!overrides) return '';

    // Convert to percentages
    const pct = (n) => `${(n * 100).toFixed(2)}%`;

    return {
        'size-adjust': pct(overrides.sizeAdjust),
        'ascent-override': pct(overrides.ascentOverride),
        'descent-override': pct(overrides.descentOverride),
        'line-gap-override': pct(overrides.lineGapOverride)
    };
};
