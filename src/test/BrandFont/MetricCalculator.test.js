import { calculateOverrides, formatCSS, extractFontMetrics } from '../../shared/utils/MetricCalculator';

describe('MetricCalculator', () => {
    describe('extractFontMetrics', () => {
        it('returns null if font is missing', () => {
            expect(extractFontMetrics(null)).toBeNull();
        });

        it('extracts metrics from valid font object', () => {
            const mockFont = {
                unitsPerEm: 1000,
                tables: {
                    hhea: { ascender: 800, descender: -200, lineGap: 0 },
                    os2: { sxHeight: 500, sTypoLineGap: 0 }
                },
                charToGlyph: () => null
            };

            const result = extractFontMetrics(mockFont);

            expect(result.metrics.unitsPerEm).toBe(1000);
            expect(result.metrics.ascent).toBe(800);
            expect(result.normalized.ascent).toBe(0.8);
            expect(result.metrics.xHeight).toBe(500);
        });

        it('uses fallback x-height from glyph measurement', () => {
            const mockFont = {
                unitsPerEm: 1000,
                tables: {
                    hhea: { ascender: 800, descender: -200 },
                    os2: { /* missing sxHeight */ }
                },
                charToGlyph: (char) => char === 'x' ? { yMax: 450 } : null
            };

            const result = extractFontMetrics(mockFont);
            expect(result.metrics.xHeight).toBe(450);
        });

        it('uses fallback x-height 0.5em if no data available', () => {
            const mockFont = {
                unitsPerEm: 1000,
                tables: {
                    hhea: { ascender: 800, descender: -200 },
                    os2: { /* missing sxHeight */ }
                },
                charToGlyph: () => null // no x glyph
            };

            const result = extractFontMetrics(mockFont);
            expect(result.metrics.xHeight).toBe(500); // 0.5 * 1000
        });
    });

    describe('calculateOverrides', () => {
        it('returns null if inputs are missing', () => {
            expect(calculateOverrides(null, {})).toBeNull();
            expect(calculateOverrides({}, null)).toBeNull();
        });

        it('calculates sizeAdjust and overrides based on raw metrics', () => {
            // Setup
            // Primary: Upem 1000, xHeight 500, Ascent 800, Descent -200, LineGap 0
            // Fallback: Upem 2048, xHeight 1024, Ascent 1900, Descent -500, LineGap 0

            // Expected Size Adjust:
            // P_norm_x = 500/1000 = 0.5
            // F_norm_x = 1024/2048 = 0.5
            // Size Adjust = 0.5 / 0.5 = 1.0

            const primary = {
                metrics: { unitsPerEm: 1000, xHeight: 500, ascent: 800, descent: -200, lineGap: 100 }
            };
            const fallback = {
                metrics: { unitsPerEm: 2048, xHeight: 1024, ascent: 1900, descent: -500, lineGap: 0 }
            };

            const result = calculateOverrides(primary, fallback);

            expect(result.sizeAdjust).toBeCloseTo(1.0, 4);
            // Ascent Override = P_norm_asc / sizeAdjust = (800/1000) / 1.0 = 0.8
            expect(result.ascentOverride).toBeCloseTo(0.8, 4);
            // Descent Override = P_norm_desc / sizeAdjust = (-200/1000) / 1.0 = -0.2
            expect(result.descentOverride).toBeCloseTo(-0.2, 4);
            // LineGap Override = P_norm_lg / sizeAdjust = (100/1000) / 1.0 = 0.1
            expect(result.lineGapOverride).toBeCloseTo(0.1, 4);
        });

        it('calculates complex size adjust correctly', () => {
            // Case where fallback x-height is larger, so we need to shrink it
            // Primary: xHeight 500 (normalized 0.5)
            // Fallback: xHeight 600 (normalized 0.6)
            // Size Adjust = 0.5 / 0.6 = 0.8333...

            const primary = { metrics: { unitsPerEm: 1000, xHeight: 500, ascent: 1000, descent: -200, lineGap: 0 } };
            const fallback = { metrics: { unitsPerEm: 1000, xHeight: 600, ascent: 1000, descent: -200, lineGap: 0 } };

            const result = calculateOverrides(primary, fallback);

            expect(result.sizeAdjust).toBeCloseTo(0.8333, 4);

            // Ascent Override = P_norm_asc (1.0) / 0.8333 = 1.2
            expect(result.ascentOverride).toBeCloseTo(1.2, 4);
        });

        it('uses normalized values if available', () => {
            const primary = {
                metrics: { unitsPerEm: 1000 },
                normalized: { xHeight: 0.5, ascent: 0.8, descent: 0.2, lineGap: 0 }
            };
            const fallback = {
                metrics: { unitsPerEm: 1000 },
                normalized: { xHeight: 0.5, ascent: 0.9, descent: 0.3, lineGap: 0 }
            };

            const result = calculateOverrides(primary, fallback);
            expect(result.sizeAdjust).toBe(1.0);
            expect(result.ascentOverride).toBe(0.8);
        });
    });

    describe('formatCSS', () => {
        it('returns empty string for null overrides', () => {
            expect(formatCSS(null)).toBe('');
        });

        it('formats overrides to percentage strings', () => {
            const overrides = {
                sizeAdjust: 0.957,
                ascentOverride: 0.98,
                descentOverride: 0.25,
                lineGapOverride: 0.0
            };

            const css = formatCSS(overrides);
            expect(css['size-adjust']).toBe('95.70%');
            expect(css['ascent-override']).toBe('98.00%');
            expect(css['descent-override']).toBe('25.00%');
            expect(css['line-gap-override']).toBe('0.00%');
        });
    });
});
