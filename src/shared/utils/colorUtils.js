import { DEFAULT_PALETTE } from '../data/constants';

/**
 * Get the next unique color from the default palette for a font.
 * 
 * @param {Array} fonts - The current list of fonts
 * @returns {string} - A hex color string
 */
export const getNextUniqueColor = (fonts) => {
    const usedColors = new Set(fonts.filter(f => f && f.color).map(f => f.color));
    for (let i = 0; i < DEFAULT_PALETTE.length; i++) {
        const color = DEFAULT_PALETTE[i];
        if (!usedColors.has(color)) return color;
    }
    // Fallback: cycle if exhausted (unlikely with 53 colors)
    return DEFAULT_PALETTE[fonts.length % DEFAULT_PALETTE.length];
};
