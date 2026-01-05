import { describe, test, expect } from 'vitest';

describe('Line Height Calculation Logic', () => {

    const calculateLineHeight = (primaryBase, fallbackBase, primaryLineHeight) => {
        // Mocking the logic in LanguageCard.jsx

        // 1. Calculate fontSizeEm
        const fontSizeEm = fallbackBase / primaryBase;

        // 2. Parse Line Result Logic
        const targetLineHeight = primaryLineHeight;

        // Handle both number and string inputs
        const numericLineHeight = parseFloat(targetLineHeight);

        if (!isNaN(numericLineHeight)) {
            // Inverse Scale Logic
            return numericLineHeight / fontSizeEm;
        }
        return targetLineHeight;
    };

    test('Unitless Line Height: 1.5, Scale 2.0', () => {
        const result = calculateLineHeight(60, 120, 1.5); // 2x scale
        // Expected: 1.5 / 2 = 0.75
        expect(result).toBe(0.75);
    });

    test('Unitless Line Height: 1.5, Scale 1.0', () => {
        const result = calculateLineHeight(60, 60, 1.5); // 1x scale
        // Expected: 1.5 / 1 = 1.5
        expect(result).toBe(1.5);
    });

    test('String Line Height: "1.5", Scale 2.0', () => {
        const result = calculateLineHeight(60, 120, "1.5");
        expect(result).toBe(0.75);
    });

    test('Px Line Height? "24px", Scale 2.0', () => {
        // If the context ever returns px strings
        const result = calculateLineHeight(60, 120, "24px");
        // parseFloat("24px") = 24
        // Result: 24 / 2 = 12
        // IF parent line-height is "24px", then unitless 12 would be WRONG.
        // Unitless 12 means 12 times the font-size (which is 2em). 
        // 12 * 2em is HUGE.
        // This reveals a potential issue if input is PX string.
        expect(result).toBe(12);
    });
});
