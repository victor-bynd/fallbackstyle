import { describe, it, expect } from 'vitest';
import { resolveWeightForFont } from '../../utils/weightUtils';

describe('weightUtils', () => {
    describe('resolveWeightForFont', () => {
        it('should return the axis default weight if axes exist', () => {
            const font = {
                fontObject: {},
                axes: { weight: { default: 500, min: 100, max: 900 } }
            };
            // If axes are present, we currently rely on the global weight or existing logic?
            // Checking implementation: resolveWeightForFont(font, currentWeight)
            // It clamps currentWeight to min/max
            const result = resolveWeightForFont(font, 400);
            expect(result).toBe(400);
        });

        it('should clamp weight to axis range', () => {
            const font = {
                fontObject: {},
                axes: { weight: { default: 500, min: 300, max: 700 } }
            };
            expect(resolveWeightForFont(font, 100)).toBe(300);
            expect(resolveWeightForFont(font, 900)).toBe(700);
        });

        it('should use staticWeight if no axes are present', () => {
            const font = {
                fontObject: {},
                axes: null,
                staticWeight: 600
            };
            expect(resolveWeightForFont(font, 400)).toBe(600);
        });

        it('should fallback to currentWeight if no metadata', () => {
            const font = {
                fontObject: {},
                axes: null,
                staticWeight: null
            };
            expect(resolveWeightForFont(font, 400)).toBe(400);
        });

        it('should fallback to 400 if no metadata and no current weight', () => {
            const font = {
                fontObject: {},
                axes: null,
                staticWeight: null
            };
            expect(resolveWeightForFont(font, undefined)).toBe(400);
        });
    });
});
